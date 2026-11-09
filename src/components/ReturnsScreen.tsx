"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RotateCcw, Search, Trash2, Undo2, AlertTriangle, Save } from "lucide-react";
import { api } from "@/lib/client-api";
import { fmt, shortDate } from "@/lib/format";
import type { Customer, Invoice, Product, ReturnRecord } from "@/lib/types";

type Props = {
  products: Product[];
  customers: Customer[];
  invoices: Invoice[];
  onRefresh: () => Promise<void> | void;
  onToast: (msg: string, error?: boolean) => void;
};

type Cart = { productId: number | null; productCode: string; productName: string; quantity: number; price: number };

export default function ReturnsScreen({ products, customers, invoices, onRefresh, onToast }: Props) {
  const [tab, setTab] = useState<"new" | "list">("new");
  const [returns, setReturns] = useState<ReturnRecord[]>([]);
  const [type, setType] = useState<"مرتجع مبيعات" | "مرتجع مشتريات">("مرتجع مبيعات");
  const [invoiceId, setInvoiceId] = useState<string>("");
  const [reason, setReason] = useState("");
  const [cart, setCart] = useState<Cart[]>([]);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);

  const loadReturns = useCallback(async () => {
    try {
      const data = await api<{ returns: ReturnRecord[] }>("/api/returns");
      setReturns(data.returns);
    } catch {}
  }, []);
  useEffect(() => { void loadReturns(); }, [loadReturns]);

  const selectedInvoice = useMemo(() => invoices.find((i) => String(i.id) === invoiceId), [invoices, invoiceId]);

  const addFromInvoice = async () => {
    if (!selectedInvoice) return;
    const data = await api<{ invoice: Invoice }>(`/api/invoices/${selectedInvoice.id}`);
    const inv = data.invoice;
    if (!inv.items?.length) { onToast("الفاتورة بلا أصناف", true); return; }
    setCart(inv.items.map((it) => ({ productId: it.productId, productCode: it.productCode, productName: it.productName, quantity: it.quantity, price: it.price })));
    setType(inv.type === "sale" ? "مرتجع مبيعات" : "مرتجع مشتريات");
  };

  const addProduct = (p: Product) => {
    const isSale = type === "مرتجع مبيعات";
    const price = isSale ? p.salePrice : p.purchasePrice;
    const found = cart.find((c) => c.productCode === p.code);
    if (found) setCart((prev) => prev.map((c) => c.productCode === p.code ? { ...c, quantity: c.quantity + 1 } : c));
    else setCart((prev) => [...prev, { productId: p.id, productCode: p.code, productName: p.name, quantity: 1, price }]);
  };

  const total = useMemo(() => cart.reduce((s, c) => s + c.quantity * c.price, 0), [cart]);

  const submit = async () => {
    if (cart.length === 0) return onToast("أضف صنفاً واحداً للمرتجع", true);
    if (cart.some((c) => c.quantity <= 0)) return onToast("الكمية يجب أن تكون أكبر من صفر", true);
    setBusy(true);
    try {
      const custName = type === "مرتجع مبيعات" ? selectedInvoice?.customerName : selectedInvoice?.customerName ?? "مورد نقدي";
      await api("/api/returns", {
        method: "POST",
        body: JSON.stringify({
          type,
          originalInvoiceId: invoiceId ? Number(invoiceId) : undefined,
          customerId: selectedInvoice?.customerId ?? undefined,
          customerName: custName,
          reason,
          items: cart,
        }),
      });
      onToast(`تم تسجيل ${type} بقيمة ${fmt(total, 2)} ✅ المخزون تحدث تلقائياً`);
      setCart([]); setReason(""); setInvoiceId("");
      await loadReturns(); await onRefresh();
      setTab("list");
    } catch (e) {
      onToast(e instanceof Error ? e.message : "تعذر حفظ المرتجع", true);
    } finally { setBusy(false); }
  };

  const del = async (id: number) => {
    if (!confirm("حذف المرتجع سيعكس حركة المخزون — متأكد؟")) return;
    try {
      await api(`/api/returns?id=${id}`, { method: "DELETE" });
      onToast("تم حذف المرتجع وعكس المخزون");
      await loadReturns(); await onRefresh();
    } catch (e) { onToast(e instanceof Error ? e.message : "تعذر الحذف", true); }
  };

  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products.slice(0, 30);
    return products.filter((p) => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q) || p.barcode.includes(q)).slice(0, 30);
  }, [products, query]);

  return (
    <div>
      <h2 className="page-title"><RotateCcw size={20} style={{ verticalAlign: "middle", marginLeft: 6 }} /> المرتجعات</h2>
      <p className="page-desc">مرتجع مبيعات يرجع الأصناف للمخزون ويخصم من حساب العميل — مرتجع مشتريات ينقص المخزون.</p>

      <div className="settings-tabs">
        <button className={`settings-tab ${tab === "new" ? "active" : ""}`} onClick={() => setTab("new")}><Undo2 size={13} style={{ verticalAlign: "middle", marginLeft: 4 }} /> تسجيل مرتجع</button>
        <button className={`settings-tab ${tab === "list" ? "active" : ""}`} onClick={() => setTab("list")}> السجل ({returns.length})</button>
      </div>

      {tab === "new" && (
        <>
          <div className="panel">
            <div className="panel-head"><span>بيانات المرتجع</span><span className="head-chip">{type} — {fmt(total, 2)} ج.م</span></div>
            <div className="panel-body">
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end" }}>
                <div>
                  <label className="label">نوع المرتجع</label>
                  <select className="field" value={type} onChange={(e) => setType(e.target.value as typeof type)}>
                    <option value="مرتجع مبيعات">مرتجع مبيعات (يرجع للمخزون)</option>
                    <option value="مرتجع مشتريات">مرتجع مشتريات (ينقص المخزون)</option>
                  </select>
                </div>
                <div style={{ minWidth: 220 }}>
                  <label className="label">من فاتورة سابقة (اختياري)</label>
                  <select className="field" style={{ width: "100%" }} value={invoiceId} onChange={(e) => setInvoiceId(e.target.value)}>
                    <option value="">— بدون ربط —</option>
                    {invoices.filter((i) => type === "مرتجع مبيعات" ? i.type === "sale" : i.type === "purchase").slice(0, 100).map((inv) => (
                      <option key={inv.id} value={inv.id}>{inv.invoiceNo} — {inv.customerName} — {fmt(inv.total, 0)}</option>
                    ))}
                  </select>
                </div>
                <button className="btn blue" disabled={!invoiceId} onClick={() => void addFromInvoice()}>سحب أصناف الفاتورة</button>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <label className="label">السبب</label>
                  <input className="field" style={{ width: "100%" }} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="تالف / خطأ / استبدال..." />
                </div>
              </div>
            </div>
          </div>

          <div className="two-col" style={{ gridTemplateColumns: "1fr 360px", marginTop: 12 }}>
            <div className="panel">
              <div className="panel-head"><span>أصناف المرتجع</span><span className="head-chip">{cart.length} صنف — الإجمالي {fmt(total, 2)}</span></div>
              <div className="table-wrap" style={{ maxHeight: 300 }}>
                <table className="win-table">
                  <thead><tr><th>الصنف</th><th>الكمية</th><th>السعر</th><th>القيمة</th><th></th></tr></thead>
                  <tbody>
                    {cart.map((c, idx) => (
                      <tr key={idx}>
                        <td className="right">{c.productName}<br /><small>{c.productCode}</small></td>
                        <td><input className="field" style={{ width: 70, textAlign: "center" }} type="number" min={0.01} step={1} value={c.quantity} onChange={(e) => setCart((prev) => prev.map((x, i) => i === idx ? { ...x, quantity: Number(e.target.value) || 0 } : x))} /></td>
                        <td><input className="field" style={{ width: 80, textAlign: "center" }} type="number" value={c.price} onChange={(e) => setCart((prev) => prev.map((x, i) => i === idx ? { ...x, price: Number(e.target.value) || 0 } : x))} /></td>
                        <td><b>{fmt(c.quantity * c.price, 2)}</b></td>
                        <td><button className="btn small red" onClick={() => setCart((p) => p.filter((_, i) => i !== idx))}><Trash2 size={11} /></button></td>
                      </tr>
                    ))}
                    {cart.length === 0 && <tr><td colSpan={5} className="empty-row">أضف أصناف من البحث → أو اسحب من فاتورة</td></tr>}
                  </tbody>
                </table>
              </div>
              <div className="panel-body">
                <button className="btn green" disabled={busy || cart.length === 0} onClick={() => void submit()}><Save size={14} /> حفظ المرتجع وتحديث المخزون</button>
                <span style={{ marginRight: 10, fontWeight: 900, color: "#0b4c9e" }}>الإجمالي: {fmt(total, 2)} ج.م</span>
                {type === "مرتجع مبيعات" && <span className="info-box" style={{ marginTop: 10, fontSize: 11 }}>سيتم زيادة المخزون وخصم المبلغ من رصيد العميل إن كان مرتبطاً.</span>}
              </div>
            </div>

            <div className="panel">
              <div className="panel-head"><span>بحث الأصناف</span><Search size={13} /></div>
              <div className="panel-body">
                <input className="field" style={{ width: "100%", marginBottom: 6 }} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث بالاسم أو الكود أو الباركود" />
                <div style={{ maxHeight: 300, overflow: "auto" }}>
                  {filteredProducts.map((p) => (
                    <div key={p.id} onClick={() => addProduct(p)} style={{ padding: "7px 8px", borderBottom: "1px solid #e6eef8", cursor: "pointer", display: "flex", justifyContent: "space-between" }}>
                      <span>{p.name}<br /><small style={{ color: "#6b7e93" }}>{p.code} — متوفر {fmt(p.quantity, 0)}</small></span>
                      <b style={{ color: "#0b4c9e" }}>{fmt(type === "مرتجع مبيعات" ? p.salePrice : p.purchasePrice, 2)}</b>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {tab === "list" && (
        <div className="panel">
          <div className="panel-head"><span>سجل المرتجعات</span><span className="head-chip">{returns.length} حركة</span></div>
          <div className="table-wrap">
            <table className="win-table">
              <thead><tr><th>الرقم</th><th>النوع</th><th>الفاتورة الأصلية</th><th>العميل</th><th>التاريخ</th><th>القيمة</th><th>السبب</th><th></th></tr></thead>
              <tbody>
                {returns.map((r) => (
                  <tr key={r.id}>
                    <td>{r.returnNo}</td>
                    <td><span className={`status-pill ${r.type === "مرتجع مبيعات" ? "paid" : "active"}`} style={{ padding: "2px 8px", borderRadius: 12, fontWeight: 900, fontSize: 11, background: r.type === "مرتجع مبيعات" ? "#ffe9c7" : "#e4f2ff", color: r.type === "مرتجع مبيعات" ? "#8a4a00" : "#0b4c9e", border: "1px solid #ccc" }}>{r.type}</span></td>
                    <td>{r.originalInvoiceNo || "—"}</td>
                    <td>{r.customerName}</td>
                    <td>{shortDate(r.createdAt)}</td>
                    <td><b>{fmt(r.total, 2)}</b></td>
                    <td>{r.reason || "—"}</td>
                    <td><button className="btn small red" onClick={() => void del(r.id)}><Trash2 size={11} /></button></td>
                  </tr>
                ))}
                {returns.length === 0 && <tr><td colSpan={8} className="empty-row">لا توجد مرتجعات مسجلة</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
