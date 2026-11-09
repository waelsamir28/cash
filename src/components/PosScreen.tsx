"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, ChevronLeft, ChevronRight, Eye, FilePlus2, HandCoins,
  PackageSearch, Plus, Printer, Save, Search, Trash2, UserPlus, X,
} from "lucide-react";
import { api } from "@/lib/client-api";
import { fmt, num, round, shortDate } from "@/lib/format";
import type { UiFlags } from "@/lib/appearance";
import type { Customer, Invoice, Product, StoreSettings } from "@/lib/types";
import CustomerQuickAdd from "@/components/CustomerQuickAdd";
import AppSelect from "@/components/AppSelect";
import ProductSearchModal from "@/components/ProductSearchModal";
import InvoiceDocument from "@/components/InvoiceDocument";
import { playSelectSound } from "@/lib/sound";

type Props = {
  mode: "sale" | "purchase";
  active?: boolean;
  products: Product[];
  customers: Customer[];
  invoices: Invoice[];
  settings: StoreSettings;
  uiFlags: UiFlags;
  onRefresh: () => Promise<void> | void;
  onToast: (message: string, error?: boolean) => void;
};

type CartLine = {
  key: string;
  productId: number | null;
  productCode: string;
  productName: string;
  barcode: string;
  unit: string;
  quantity: number;
  price: number;
  discount: number;
};

type PrintState = { invoice: Invoice; paidActual: number; change: number };
const lineKey = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

export default function PosScreen({ mode, products, customers, invoices, settings, uiFlags, onRefresh, onToast, active = true }: Props) {
  const isSale = mode === "sale";
  const [items, setItems] = useState<CartLine[]>([]);
  const [invoiceNo, setInvoiceNo] = useState(settings.invoiceStartNumber || "1001");
  const [barcode, setBarcode] = useState("");
  const [catalogQuery, setCatalogQuery] = useState("");
  const [group, setGroup] = useState("الكل");
  const [category, setCategory] = useState("الكل");
  const [quantity, setQuantity] = useState("1");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [customerId, setCustomerId] = useState<number | "">("");
  const [paymentType, setPaymentType] = useState("نقدي");
  const [paidText, setPaidText] = useState("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [includeTax, setIncludeTax] = useState(false);
  const [autoPrint, setAutoPrint] = useState(false);
  const [showImage, setShowImage] = useState(true);
  const [busy, setBusy] = useState(false);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [productSearchOpen, setProductSearchOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);
  const [printData, setPrintData] = useState<PrintState | null>(null);
  const barcodeRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const defaultCustomer = useMemo(() => customers.find((customer) => customer.name.includes("نقدي")) ?? customers[0], [customers]);
  const selectedCustomer = customers.find((customer) => customer.id === Number(customerId)) ?? defaultCustomer;
  const isCredit = paymentType === "قسط" || paymentType === "آجل";
  const groups = useMemo(() => ["الكل", ...Array.from(new Set(products.map((product) => product.categoryGroup || "أدوات مدرسية")))], [products]);
  const categories = useMemo(() => ["الكل", ...Array.from(new Set(products.filter((product) => group === "الكل" || product.categoryGroup === group).map((product) => product.category)))], [products, group]);
  const filteredProducts = useMemo(() => {
    const query = catalogQuery.trim().toLowerCase();
    return products.filter((product) => product.active
      && (group === "الكل" || product.categoryGroup === group)
      && (category === "الكل" || product.category === category)
      && (!query || [product.name, product.code, product.barcode, product.category, product.categoryGroup].some((value) => value.toLowerCase().includes(query))));
  }, [products, catalogQuery, group, category]);

  const subtotal = round(items.reduce((sum, item) => sum + item.quantity * item.price, 0));
  const tax = includeTax ? round(subtotal * (num(settings.defaultTax) / 100)) : 0;
  const total = round(subtotal + tax);
  const rawPaid = paidText.trim() === "" ? (isCredit ? 0 : total) : round(num(paidText));
  const paid = round(Math.min(total, Math.max(0, rawPaid)));
  const remaining = round(total - paid);
  const change = isCredit ? 0 : round(Math.max(0, rawPaid - total));
  const totalQuantity = round(items.reduce((sum, item) => sum + item.quantity, 0));

  const fetchNextNumber = useCallback(async () => {
    try {
      const data = await api<{ invoiceNo: string }>("/api/invoices/next");
      setInvoiceNo(data.invoiceNo);
    } catch { setInvoiceNo(settings.invoiceStartNumber || "1001"); }
  }, [settings.invoiceStartNumber]);

  const newInvoice = useCallback(() => {
    setItems([]); setBarcode(""); setCatalogQuery(""); setQuantity("1"); setSelectedProduct(null);
    setPaidText(""); setNotes(""); setIncludeTax(false); setPaymentType("نقدي"); setPrintData(null);
    void fetchNextNumber();
    setTimeout(() => barcodeRef.current?.focus(), 50);
  }, [fetchNextNumber]);

  useEffect(() => { void fetchNextNumber(); }, [mode, fetchNextNumber]);
  useEffect(() => {
    if (!customerId && defaultCustomer) setCustomerId(defaultCustomer.id);
  }, [defaultCustomer, customerId]);

  const addProduct = useCallback((product: Product, qty = 1) => {
    const amount = round(Math.max(0.001, num(qty) || 1));
    if (settings.selectSound !== "false") playSelectSound();
    setSelectedProduct(product);
    setItems((current) => {
      const index = current.findIndex((item) => item.productId === product.id);
      if (index >= 0) {
        const copy = [...current];
        copy[index] = { ...copy[index], quantity: round(copy[index].quantity + amount) };
        return copy;
      }
      return [...current, {
        key: lineKey(), productId: product.id, productCode: product.code, productName: product.name,
        barcode: product.barcode, unit: product.unit, quantity: amount,
        price: isSale ? product.salePrice : product.purchasePrice, discount: 0,
      }];
    });
  }, [isSale, settings.selectSound]);

  // أصناف تُقرأ بالموبايل تُضاف للفاتورة الحالية مباشرة
  useEffect(() => {
    if (!active) return;
    const onScan = (event: Event) => {
      const item = (event as CustomEvent<{ code: string; blocked: boolean; product: { id: number } | null }>).detail;
      const local = item.product ? products.find((product) => product.id === item.product?.id) : undefined;
      if (local) {
        addProduct(local, num(quantity));
        onToast(`تمت إضافة ${local.name} من الموبايل`);
        return;
      }
      onToast(item.blocked ? "هذا الصنف غير متاح في النسخة التجريبية" : `الصنف غير موجود: ${item.code}`, true);
    };
    window.addEventListener("algamal:scan", onScan);
    return () => window.removeEventListener("algamal:scan", onScan);
  }, [active, products, addProduct, quantity, onToast]);

  const handleBarcode = () => {
    const value = barcode.trim().toLowerCase();
    if (!value) { searchRef.current?.focus(); return; }
    const exact = products.find((product) => product.active && (product.barcode.toLowerCase() === value || product.code.toLowerCase() === value));
    if (exact) { addProduct(exact, num(quantity)); setBarcode(""); barcodeRef.current?.focus(); return; }
    const matches = products.filter((product) => product.active && product.name.toLowerCase().includes(value));
    if (matches.length === 1) { addProduct(matches[0], num(quantity)); setBarcode(""); barcodeRef.current?.focus(); }
    else {
      setCatalogQuery(barcode.trim());
      onToast(matches.length ? "اختر الصنف المطلوب من نتائج البحث" : "لم يتم العثور على صنف مطابق", matches.length === 0);
    }
  };

  const toggleSelectSound = async () => {
    const next = settings.selectSound === "false" ? "true" : "false";
    try {
      await api("/api/settings", { method: "PUT", body: JSON.stringify({ selectSound: next }) });
      await onRefresh();
      if (next === "true") playSelectSound();
    } catch (error) {
      onToast(error instanceof Error ? error.message : "تعذر حفظ إعداد الصوت", true);
    }
  };

  const updateLine = (key: string, patch: Partial<CartLine>) => setItems((current) => current.map((item) => item.key === key ? { ...item, ...patch } : item));

  const buildDraftInvoice = useCallback((): Invoice => ({
    id: 0, invoiceNo, type: mode, customerId: selectedCustomer?.id ?? null,
    customerName: selectedCustomer?.name ?? (isSale ? "عميل نقدي" : "مورد نقدي"),
    paymentType, subtotal, discount: 0, tax, total, paid, remaining, notes,
    status: remaining > 0 ? (paymentType === "قسط" ? "قسط" : "آجل") : "محفوظة",
    invoiceDate: date, createdAt: date,
    items: items.map((item, index) => ({
      id: index + 1, invoiceId: 0, productId: item.productId, productCode: item.productCode,
      productName: item.productName, barcode: item.barcode, unit: item.unit,
      quantity: item.quantity, price: item.price, discount: 0, total: round(item.quantity * item.price),
    })),
  }), [invoiceNo, mode, selectedCustomer, isSale, paymentType, subtotal, tax, total, paid, remaining, notes, date, items]);

  const printInvoice = useCallback((invoice: Invoice, paidActual = invoice.paid, changeAmount = 0) => {
    setPrintData({ invoice, paidActual, change: changeAmount });
    setTimeout(() => window.print(), 180);
  }, []);

  const printCurrent = useCallback(() => {
    if (items.length > 0) printInvoice(buildDraftInvoice(), rawPaid, change);
    else if (printData) window.print();
    else onToast("لا توجد فاتورة للطباعة — أضف أصنافاً أو افتح فاتورة محفوظة", true);
  }, [items.length, printInvoice, buildDraftInvoice, rawPaid, change, printData, onToast]);

  const saveInvoice = useCallback(async () => {
    if (busy) return;
    if (items.length === 0) { onToast("أضف أصنافاً إلى الفاتورة قبل الحفظ", true); return; }
    if (items.some((item) => item.quantity <= 0)) { onToast("راجع الكميات؛ يجب أن تكون أكبر من صفر", true); return; }
    if (isSale && paymentType === "قسط" && (!selectedCustomer || selectedCustomer.name.includes("نقدي"))) {
      onToast("اختر عميلاً باسمه أو أضف عميلاً جديداً من علامة + قبل البيع بالقسط", true);
      return;
    }
    setBusy(true);
    try {
      const result = await api<{ invoice: Invoice }>("/api/invoices", {
        method: "POST",
        body: JSON.stringify({
          type: mode, customerId: selectedCustomer?.id ?? null,
          customerName: selectedCustomer?.name ?? (isSale ? "عميل نقدي" : "مورد نقدي"),
          paymentType, discount: 0, tax, paid, notes, invoiceDate: date,
          items: items.map((item) => ({ ...item, discount: 0 })),
        }),
      });
      const savedPrint: PrintState = { invoice: result.invoice, paidActual: rawPaid, change };
      setPrintData(savedPrint);
      onToast(`تم حفظ الفاتورة رقم ${result.invoice.invoiceNo}${remaining > 0 ? ` — المتبقي على العميل ${fmt(remaining, 2)} ${settings.currency}` : ""}`);
      await onRefresh();
      setItems([]); setSelectedProduct(null); setPaidText(""); setNotes(""); setBarcode("");
      void fetchNextNumber();
      if (autoPrint) setTimeout(() => window.print(), 250);
    } catch (error) {
      onToast(error instanceof Error ? error.message : "تعذر حفظ الفاتورة", true);
    } finally { setBusy(false); }
  }, [busy, items, isSale, paymentType, selectedCustomer, mode, tax, paid, notes, date, rawPaid, change, remaining, settings.currency, onRefresh, onToast, fetchNextNumber, autoPrint]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (!active || customerOpen || listOpen || productSearchOpen) return;
      if (event.key === "F3") { event.preventDefault(); setProductSearchOpen(true); }
      if (event.key === "F2") { event.preventDefault(); newInvoice(); }
      if (event.key === "F4") { event.preventDefault(); void saveInvoice(); }
      if (event.key === "F8") { event.preventDefault(); printCurrent(); }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "f") { event.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [active, newInvoice, saveInvoice, customerOpen, listOpen, productSearchOpen, printCurrent]);

  const modeInvoices = invoices.filter((invoice) => invoice.type === mode);
  const viewInvoiceById = async (id: number) => {
    try {
      const data = await api<{ invoice: Invoice }>(`/api/invoices/${id}`);
      setViewInvoice(data.invoice); setListOpen(true);
    } catch (error) { onToast(error instanceof Error ? error.message : "تعذر عرض الفاتورة", true); }
  };
  const deleteInvoice = async (id: number) => {
    if (!window.confirm("هل تريد حذف الفاتورة وإرجاع الكميات للمخزون؟")) return;
    try {
      await api(`/api/invoices/${id}`, { method: "DELETE" });
      setViewInvoice(null); onToast("تم حذف الفاتورة وإرجاع الكميات للمخزون"); await onRefresh();
    } catch (error) { onToast(error instanceof Error ? error.message : "تعذر حذف الفاتورة", true); }
  };
  const stepInvoice = (direction: number) => {
    if (modeInvoices.length === 0) return;
    const index = viewInvoice ? modeInvoices.findIndex((invoice) => invoice.id === viewInvoice.id) : -1;
    const target = modeInvoices[(index + direction + modeInvoices.length) % modeInvoices.length];
    if (target) void viewInvoiceById(target.id);
  };

  return (
    <div className="pos-screen pos-clean">
      <div className="pos-clean-toolbar">
        <div className="pos-clean-invoice-no"><span>رقم الفاتورة</span><b dir="ltr">{invoiceNo}</b></div>
        <button className="btn" onClick={newInvoice}><FilePlus2 size={16} /> جديد <kbd>F2</kbd></button>
        <button className="btn blue" onClick={() => setProductSearchOpen(true)}><Search size={16} /> بحث الأصناف <kbd>F3</kbd></button>
        <button className="btn" onClick={() => setListOpen(true)}><ArrowLeft size={16} /> الفواتير السابقة</button>
        <div className="spacer" />
        <button className="btn" onClick={printCurrent}><Printer size={16} /> طباعة <kbd>F8</kbd></button>
        <button className="btn green pos-clean-save" disabled={busy} onClick={() => void saveInvoice()}><Save size={18} /> {busy ? "جارٍ الحفظ..." : "حفظ الفاتورة"} <kbd>F4</kbd></button>
      </div>

      <div className="panel pos-clean-customer">
        <div className="pos-clean-customer-grid">
          <div className="pos-clean-field pos-clean-customer-name">
            <label className="label" htmlFor="invoice-customer">{isSale ? "العميل" : "المورد"}</label>
            <div className="customer-select-wrap">
              <AppSelect id="invoice-customer" ariaLabel={isSale ? "اسم العميل" : "اسم المورد"} value={customerId ? String(customerId) : ""} onChange={(value) => setCustomerId(Number(value))} searchable buttonClassName="customer-name-input" placeholder="اختر العميل" options={customers.map((customer) => ({ value: String(customer.id), label: customer.name, hint: `${customer.code}${customer.installmentEnabled ? " · عميل قسط" : ""}` }))} />
              <button className="customer-add-inside" title="إضافة عميل جديد" aria-label="إضافة عميل جديد" onClick={() => setCustomerOpen(true)}><UserPlus size={17} /></button>
            </div>
          </div>
          <div className="pos-clean-field"><label className="label">طريقة الدفع</label><AppSelect ariaLabel="طريقة الدفع" value={paymentType} onChange={(value) => { setPaymentType(value); setPaidText(""); }} buttonClassName={paymentType === "قسط" ? "installment-select" : ""} options={[{ value: "نقدي", label: "نقدي" }, { value: "قسط", label: "قسط بدون موعد" }, { value: "آجل", label: "آجل" }, { value: "شبكة", label: "شبكة / بطاقة" }]} /></div>
          <div className="pos-clean-field"><label className="label">التاريخ</label><input type="date" className="field" value={date} max={new Date().toISOString().slice(0, 10)} onChange={(event) => setDate(event.target.value)} dir="ltr" /></div>
          <div className="pos-clean-field"><label className="label">رصيد العميل</label><input className="field readonly" readOnly value={fmt(selectedCustomer?.balance ?? 0, 2)} /></div>
          <div className="pos-clean-field pos-clean-notes"><label className="label">ملاحظات</label><input className="field" placeholder="ملاحظة اختيارية على الفاتورة" value={notes} onChange={(event) => setNotes(event.target.value)} /></div>
        </div>
        <div className="pos-clean-options">
          <label className="toggle-item">تطبيق الضريبة ({settings.defaultTax || 0}%) <button className={`switch ${includeTax ? "on" : ""}`} onClick={() => setIncludeTax(!includeTax)} aria-label="تطبيق الضريبة" /></label>
          <label className="toggle-item">طباعة بعد الحفظ <button className={`switch ${autoPrint ? "on" : ""}`} onClick={() => setAutoPrint(!autoPrint)} aria-label="طباعة بعد الحفظ" /></label>
          <label className="toggle-item">بطاقة الصنف <button className={`switch ${showImage ? "on" : ""}`} onClick={() => setShowImage(!showImage)} aria-label="بطاقة الصنف" /></label>
          <label className="toggle-item">صوت عند اختيار الصنف <button className={`switch ${settings.selectSound !== "false" ? "on" : ""}`} onClick={() => void toggleSelectSound()} aria-label="صوت عند اختيار الصنف" /></label>
          {paymentType === "قسط" && <span className="installment-hint"><HandCoins size={14} /> المتبقي يضاف لرصيد العميل والسداد في أي وقت.</span>}
        </div>
      </div>

      <div className="panel pos-clean-entry">
        <div className="pos-clean-field pos-clean-barcode"><label className="label">باركود / كود الصنف</label><input ref={barcodeRef} className="field accent-input" value={barcode} placeholder="امسح الباركود ثم Enter" onChange={(event) => setBarcode(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") handleBarcode(); }} /></div>
        <div className="pos-clean-field pos-clean-selected-name"><label className="label">الصنف المختار</label><input className="field readonly" readOnly value={selectedProduct?.name ?? ""} placeholder="اختر صنفاً من القائمة أو البحث" title={selectedProduct?.name} /></div>
        <div className="pos-clean-field"><label className="label">الكمية</label><input className="field compact-number" type="number" min="0.001" step="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && selectedProduct) addProduct(selectedProduct, num(quantity)); }} /></div>
        <div className="pos-clean-field"><label className="label">السعر</label><input className="field readonly compact-number" readOnly value={selectedProduct ? fmt(isSale ? selectedProduct.salePrice : selectedProduct.purchasePrice, 2) : "0.00"} /></div>
        <div className="pos-clean-field"><label className="label">الوحدة</label><input className="field readonly" readOnly value={selectedProduct?.unit ?? ""} /></div>
        <button className="btn blue pos-clean-add" disabled={!selectedProduct} onClick={() => selectedProduct && addProduct(selectedProduct, num(quantity))}><Plus size={17} /> إضافة</button>
      </div>

      <div className="pos-clean-main">
        <section className="panel pos-clean-cart">
          <div className="panel-head">
            <span>أصناف الفاتورة <b className="pos-clean-count">{items.length}</b></span>
            <span className="head-chip">إجمالي الكمية: {fmt(totalQuantity, 0)}</span>
            <button className="btn small red" disabled={items.length === 0} onClick={() => { if (window.confirm("مسح كل أصناف الفاتورة الحالية؟")) setItems([]); }}><Trash2 size={13} /> مسح الكل</button>
          </div>
          <div className="scroll-table pos-clean-cart-table">
            <table className="win-table invoice-lines-table">
              <colgroup><col style={{ width: "4%" }} /><col style={{ width: "9%" }} /><col style={{ width: "38%" }} /><col style={{ width: "8%" }} /><col style={{ width: "12%" }} /><col style={{ width: "12%" }} /><col style={{ width: "12%" }} /><col style={{ width: "5%" }} /></colgroup>
              <thead><tr><th>م</th><th>الكود</th><th>اسم الصنف</th><th>الوحدة</th><th>الكمية</th><th>السعر</th><th>القيمة</th><th></th></tr></thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={item.key} className={selectedProduct?.id === item.productId ? "selected" : ""} onClick={() => setSelectedProduct(products.find((product) => product.id === item.productId) ?? null)}>
                    <td>{index + 1}</td><td>{item.productCode}</td><td className="right product-name-cell">{item.productName}</td><td>{item.unit}</td>
                    <td><input className="line-quantity" type="number" min="0.001" step="1" value={item.quantity} onChange={(event) => updateLine(item.key, { quantity: Math.max(0, num(event.target.value)) })} /></td>
                    <td><input className="line-price" type="number" min="0" step="0.01" value={item.price} onChange={(event) => updateLine(item.key, { price: Math.max(0, num(event.target.value)) })} /></td>
                    <td><b>{fmt(item.quantity * item.price, 2)}</b></td>
                    <td><button className="btn small red" title="حذف الصنف" onClick={(event) => { event.stopPropagation(); setItems((current) => current.filter((line) => line.key !== item.key)); }}><X size={12} /></button></td>
                  </tr>
                ))}
                {items.length === 0 && <tr><td colSpan={8} className="pos-clean-empty"><PackageSearch size={34} /><b>الفاتورة فارغة</b><span>امسح باركود الصنف، أو اضغط على صنف من القائمة، أو استخدم بحث الأصناف F3</span></td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="panel pos-clean-catalog">
          <div className="panel-head"><span>دليل الأصناف</span><span className="head-chip">{filteredProducts.length} صنف</span></div>
          <div className="pos-clean-catalog-filters">
            <div className="pos-clean-catalog-search"><Search size={15} /><input ref={searchRef} placeholder="بحث سريع..." value={catalogQuery} onChange={(event) => setCatalogQuery(event.target.value)} /></div>
            <AppSelect ariaLabel="المجموعة الرئيسية" value={group} onChange={(value) => { setGroup(value); setCategory("الكل"); }} options={groups.map((item) => ({ value: item, label: item === "الكل" ? "كل المجموعات" : item }))} />
            <AppSelect ariaLabel="التصنيف الفرعي" value={category} onChange={setCategory} options={categories.map((item) => ({ value: item, label: item === "الكل" ? "كل التصنيفات" : item }))} />
          </div>
          <div className="scroll-table pos-clean-catalog-table">
            <table className="win-table catalog-table">
              <colgroup><col style={{ width: "14%" }} /><col style={{ width: "50%" }} /><col style={{ width: "18%" }} /><col style={{ width: "18%" }} /></colgroup>
              <thead><tr><th>الكود</th><th>الصنف</th><th>السعر</th><th>المتوفر</th></tr></thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <tr key={product.id} className={selectedProduct?.id === product.id ? "selected" : product.quantity <= product.minQuantity ? "alert" : ""} onClick={() => addProduct(product, 1)} title="اضغط لإضافة قطعة واحدة">
                    <td>{product.code}</td><td className="right product-name-cell">{product.name}</td>
                    <td>{fmt(isSale ? product.salePrice : product.purchasePrice, 2)}</td><td>{fmt(product.quantity, 0)}</td>
                  </tr>
                ))}
                {filteredProducts.length === 0 && <tr><td colSpan={4} className="empty-row">لا توجد أصناف مطابقة</td></tr>}
              </tbody>
            </table>
          </div>
          {uiFlags.showProductImage && showImage && selectedProduct && <div className="pos-clean-selected-card">
            <b>{selectedProduct.name}</b>
            <span>{selectedProduct.categoryGroup} / {selectedProduct.category}</span>
            <span>المتوفر: {fmt(selectedProduct.quantity, 0)} {selectedProduct.unit} — السعر: {fmt(isSale ? selectedProduct.salePrice : selectedProduct.purchasePrice, 2)} {settings.currency}</span>
          </div>}
        </aside>
      </div>

      <div className="pos-clean-totals">
        <div className="pos-clean-grand"><span>الإجمالي النهائي</span><b>{fmt(total, 2)} <small>{settings.currency}</small></b></div>
        <div className="pos-clean-total-box"><span>الأصناف</span><b>{fmt(subtotal, 2)}</b></div>
        <div className="pos-clean-total-box"><span>الضريبة</span><b>{fmt(tax, 2)}</b></div>
        <div className="pos-clean-total-box pos-clean-paid"><span>المدفوع</span><input type="number" min="0" step="0.01" value={paidText} onChange={(event) => setPaidText(event.target.value)} placeholder={fmt(isCredit ? 0 : total, 2)} /></div>
        <div className="pos-clean-total-box"><span>{isCredit ? "المتبقي على العميل" : "المتبقي"}</span><b className={remaining > 0 ? "due" : ""}>{fmt(remaining, 2)}</b></div>
        <div className="pos-clean-total-box"><span>الباقي للعميل</span><b>{fmt(change, 2)}</b></div>
        <div className="pos-clean-pay-actions">
          <button className="btn small" onClick={() => setPaidText(String(total))}>دفع كامل</button>
          <button className="btn small" onClick={() => setPaidText("0")}>بدون دفع</button>
        </div>
      </div>

      {productSearchOpen && <ProductSearchModal products={products} isSale={isSale} currency={settings.currency} onAdd={(product, qty) => { addProduct(product, qty); onToast(`تمت إضافة ${product.name}`); }} onClose={() => setProductSearchOpen(false)} />}
      {customerOpen && <CustomerQuickAdd defaultInstallment={paymentType === "قسط"} onClose={() => setCustomerOpen(false)} onCreated={(customer) => { setCustomerId(customer.id); void onRefresh(); }} onToast={onToast} />}

      {listOpen && <div className="modal-backdrop"><div className="modal wide">
        <div className="modal-head"><span>{isSale ? "فواتير المبيعات السابقة" : "فواتير المشتريات السابقة"}</span><button className="btn small" onClick={() => { setListOpen(false); setViewInvoice(null); }}><X size={14} /></button></div>
        <div className="modal-body">
          <div className="field-row" style={{ marginBottom: 8 }}>
            <button className="btn small" onClick={() => stepInvoice(1)}><ChevronRight size={14} /> السابقة</button>
            <button className="btn small" onClick={() => stepInvoice(-1)}>التالية <ChevronLeft size={14} /></button>
          </div>
          <div className="table-wrap" style={{ maxHeight: 250 }}><table className="win-table"><thead><tr><th>رقم الفاتورة</th><th>العميل / المورد</th><th>التاريخ</th><th>الإجمالي</th><th>المتبقي</th><th>الدفع</th><th>الحالة</th><th>إجراء</th></tr></thead><tbody>
            {modeInvoices.map((invoice) => <tr key={invoice.id} className={viewInvoice?.id === invoice.id ? "selected" : ""}><td>{invoice.invoiceNo}</td><td>{invoice.customerName}</td><td>{shortDate(invoice.invoiceDate)}</td><td>{fmt(invoice.total, 2)}</td><td>{fmt(invoice.remaining, 2)}</td><td>{invoice.paymentType}</td><td>{invoice.status}</td><td style={{ whiteSpace: "nowrap" }}><button className="btn small blue" onClick={() => void viewInvoiceById(invoice.id)}><Eye size={12} /> عرض</button>{" "}<button className="btn small red" onClick={() => void deleteInvoice(invoice.id)}><Trash2 size={12} /></button></td></tr>)}
            {modeInvoices.length === 0 && <tr><td colSpan={8} className="empty-row">لا توجد فواتير محفوظة بعد</td></tr>}
          </tbody></table></div>
          {viewInvoice && <div className="panel" style={{ marginTop: 12 }}><div className="panel-head"><span>تفاصيل الفاتورة {viewInvoice.invoiceNo}</span><button className="btn small green" onClick={() => printInvoice(viewInvoice)}><Printer size={13} /> طباعة هذه الفاتورة</button></div><div className="panel-body">
            <table className="win-table"><thead><tr><th>الصنف</th><th>الكمية</th><th>السعر</th><th>القيمة</th></tr></thead><tbody>{(viewInvoice.items ?? []).map((item) => <tr key={item.id}><td className="right">{item.productName}</td><td>{fmt(item.quantity, 0)}</td><td>{fmt(item.price, 2)}</td><td>{fmt(item.total, 2)}</td></tr>)}</tbody></table>
            <div style={{ display: "flex", gap: 15, marginTop: 10, fontWeight: 900, color: "#0b4b96", flexWrap: "wrap" }}><span>الإجمالي: {fmt(viewInvoice.total, 2)}</span><span>المدفوع: {fmt(viewInvoice.paid, 2)}</span><span>المتبقي: {fmt(viewInvoice.remaining, 2)}</span></div>
          </div></div>}
        </div>
        <div className="modal-foot"><button className="btn" onClick={() => { setListOpen(false); setViewInvoice(null); }}>إغلاق</button></div>
      </div></div>}

      {printData && <div className="print-sheet invoice-document-sheet"><InvoiceDocument settings={settings} invoice={printData.invoice} /></div>}
    </div>
  );
}
