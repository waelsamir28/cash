"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Eye, FileText, Printer, Search, Settings2, Trash2, RefreshCw } from "lucide-react";
import { api } from "@/lib/client-api";
import { fmt, shortDate } from "@/lib/format";
import InvoiceDocument from "@/components/InvoiceDocument";
import type { Customer, Invoice, StoreSettings } from "@/lib/types";

type Props = {
  invoices: Invoice[];
  customers: Customer[];
  settings: StoreSettings;
  onRefresh: () => Promise<void> | void;
  onToast: (message: string, error?: boolean) => void;
  onNavigate: (screen: "settings" | "sales") => void;
  initialInvoiceId?: number | null;
  onBack?: () => void;
  backLabel?: string;
};

export default function InvoicePreviewScreen({ invoices, customers, settings, onRefresh, onToast, onNavigate, initialInvoiceId, onBack, backLabel = "الرجوع للفاتورة" }: Props) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<number | null>(initialInvoiceId ?? null);
  const [detail, setDetail] = useState<Invoice | null>(null);
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => invoices.filter((invoice) => {
    const q = query.trim().toLowerCase();
    const matchesType = typeFilter === "all" || invoice.type === typeFilter;
    const matchesQuery = !q || [invoice.invoiceNo, invoice.customerName, invoice.status].some((value) => value.toLowerCase().includes(q));
    return matchesType && matchesQuery;
  }), [invoices, query, typeFilter]);

  useEffect(() => {
    if (selectedId || filtered.length === 0) return;
    const timer = setTimeout(() => setSelectedId(filtered[0].id), 0);
    return () => clearTimeout(timer);
  }, [selectedId, filtered]);

  useEffect(() => {
    let active = true;
    if (!selectedId) {
      const timer = setTimeout(() => { if (active) setDetail(null); }, 0);
      return () => { active = false; clearTimeout(timer); };
    }
    fetch(`/api/invoices/${selectedId}`, { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { invoice?: Invoice }) => { if (active) setDetail(data.invoice ?? null); })
      .catch(() => { if (active) setDetail(null); });
    return () => { active = false; };
  }, [selectedId]);

  const print = () => {
    document.body.classList.add("print-mode");
    window.print();
    setTimeout(() => document.body.classList.remove("print-mode"), 800);
  };

  const remove = async () => {
    if (!detail || !window.confirm(`حذف الفاتورة ${detail.invoiceNo}؟ سيتم إرجاع الكميات للمخزون.`)) return;
    setBusy(true);
    try {
      await api(`/api/invoices/${detail.id}`, { method: "DELETE" });
      onToast("تم حذف الفاتورة");
      setDetail(null);
      setSelectedId(null);
      await onRefresh();
    } catch (error) {
      onToast(error instanceof Error ? error.message : "تعذر حذف الفاتورة", true);
    } finally { setBusy(false); }
  };

  const customer = customers.find((item) => item.id === detail?.customerId) ?? customers.find((item) => item.name === detail?.customerName);


  return (
    <div>
      <h2 className="page-title"><Eye size={20} style={{ verticalAlign: "middle", marginLeft: 6 }} /> معاينة الفواتير</h2>
      <p className="page-desc">استعرض أي فاتورة بتصميمها النهائي قبل الطباعة، مع إمكانية حفظها PDF أو تعديل التصميم من الإعدادات.</p>

      <div className="invoice-preview-toolbar">
        <button className="btn blue preview-back-btn" onClick={() => (onBack ? onBack() : onNavigate("sales"))} title="العودة إلى الشاشة السابقة مع الحفاظ على الفاتورة المفتوحة"><ArrowRight size={16} /> {backLabel}</button>
        <button className="btn" onClick={() => void onRefresh()}><RefreshCw size={15} /> تحديث القائمة</button>
        <button className="btn green" onClick={print} disabled={!detail}><Printer size={15} /> طباعة / حفظ PDF</button>
        <button className="btn" onClick={() => onNavigate("settings")}><Settings2 size={15} /> تصميم الفاتورة والثيمات</button>
        <button className="btn" onClick={() => onNavigate("sales")}><FileText size={15} /> فاتورة جديدة</button>
        <button className="btn red" onClick={() => void remove()} disabled={!detail || busy}><Trash2 size={15} /> حذف الفاتورة</button>
      </div>

      <div className="invoice-preview-screen">
        <div className="panel">
          <div className="panel-head"><span>الفواتير المحفوظة</span><span className="head-chip">{filtered.length}</span></div>
          <div className="panel-body" style={{ padding: 8 }}>
            <div className="field-row" style={{ marginBottom: 8 }}>
              <Search size={15} />
              <input placeholder="بحث برقم الفاتورة أو العميل" value={query} onChange={(event) => setQuery(event.target.value)} style={{ flex: 1 }} />
              <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} style={{ width: 105 }}>
                <option value="all">الكل</option><option value="sale">مبيعات</option><option value="purchase">مشتريات</option>
              </select>
            </div>
          </div>
          <div className="invoice-preview-list">
            {filtered.map((invoice) => (
              <div key={invoice.id} className={`invoice-row ${selectedId === invoice.id ? "active" : ""}`} onClick={() => setSelectedId(invoice.id)}>
                <span><b>{invoice.invoiceNo}</b><br /><small>{invoice.customerName}</small></span>
                <span style={{ textAlign: "left" }}><b>{fmt(invoice.total, 2)}</b><br /><small>{shortDate(invoice.createdAt)}</small></span>
              </div>
            ))}
            {filtered.length === 0 && <div className="empty-row">لا توجد فواتير مطابقة</div>}
          </div>
        </div>

        <div className="invoice-preview-printable">
          {detail ? (
            <InvoiceDocument invoice={detail} settings={settings} customerBalance={customer?.balance ?? detail.remaining} />
          ) : (
            <div className="empty-row" style={{ alignSelf: "center" }}>اختر فاتورة من القائمة لعرض المعاينة</div>
          )}
        </div>
      </div>
    </div>
  );
}
