"use client";

import { useMemo, useState } from "react";
import { FileText, Phone, Search, UserPlus, Users } from "lucide-react";
import { api } from "@/lib/client-api";
import { fmt, shortDate } from "@/lib/format";
import type { Customer, Invoice } from "@/lib/types";

type Props = {
  customers: Customer[];
  invoices: Invoice[];
  onOpenStatement: (customerId: number | null) => void;
  onRefresh: () => Promise<void> | void;
  onToast: (message: string, error?: boolean) => void;
};

export default function CustomersScreen({ customers, invoices, onOpenStatement, onRefresh, onToast }: Props) {
  const [query, setQuery] = useState("");
  const [form, setForm] = useState({ name: "", phone: "", address: "", customerType: "عادي", balance: "0", installmentEnabled: false });
  const [busy, setBusy] = useState(false);

  const filtered = customers.filter((customer) => {
    const q = query.trim().toLowerCase();
    return !q || [customer.name, customer.phone, customer.code].some((value) => value.toLowerCase().includes(q));
  });

  const stats = useMemo(() => customers.map((customer) => {
    const customerInvoices = invoices.filter((invoice) => invoice.customerId === customer.id && invoice.type === "sale");
    return {
      ...customer,
      invoiceCount: customerInvoices.length,
      purchases: customerInvoices.reduce((sum, invoice) => sum + invoice.total, 0),
      last: customerInvoices[0]?.createdAt,
    };
  }), [customers, invoices]);

  const add = async () => {
    if (!form.name.trim()) { onToast("اسم العميل مطلوب", true); return; }
    setBusy(true);
    try {
      await api("/api/customers", { method: "POST", body: JSON.stringify({ ...form, balance: Number(form.balance) || 0 }) });
      onToast("تمت إضافة العميل بنجاح");
      setForm({ name: "", phone: "", address: "", customerType: "عادي", balance: "0", installmentEnabled: false });
      await onRefresh();
    } catch (error) {
      onToast(error instanceof Error ? error.message : "تعذر إضافة العميل", true);
    } finally { setBusy(false); }
  };

  return (
    <div>
      <h2 className="page-title"><Users size={20} style={{ verticalAlign: "middle", marginLeft: 6 }} /> بيانات العملاء والموردين</h2>
      <p className="page-desc">إدارة العملاء، أرصدة الآجل، وملخص تعاملات كل عميل من الفواتير المحفوظة.</p>

      <div className="stat-grid">
        <div className="stat-card"><div className="k">عدد العملاء</div><div className="v">{customers.length}</div></div>
        <div className="stat-card"><div className="k">عملاء عليهم رصيد</div><div className="v red">{customers.filter((c) => c.balance > 0).length}</div></div>
        <div className="stat-card"><div className="k">إجمالي أرصدة الآجل</div><div className="v red">{fmt(customers.reduce((s, c) => s + c.balance, 0), 2)}</div></div>
        <div className="stat-card"><div className="k">فواتير مسجلة</div><div className="v">{invoices.length}</div></div>
      </div>

      <div className="two-col wide-left">
        <div className="panel">
          <div className="panel-head">
            <span>دليل العملاء</span>
            <div className="field-row"><Search size={15} /><input placeholder="بحث بالاسم / الهاتف / الكود" value={query} onChange={(event) => setQuery(event.target.value)} style={{ width: 210 }} /></div>
          </div>
          <div className="table-wrap" style={{ maxHeight: 440 }}>
            <table className="win-table">
              <thead><tr><th>الكود</th><th>اسم العميل</th><th>الهاتف</th><th>النوع</th><th>الرصيد</th><th>الفواتير</th><th>إجمالي التعاملات</th><th>آخر تعامل</th><th>كشف حساب</th></tr></thead>
              <tbody>
                {stats.filter((customer) => !query.trim() || [customer.name, customer.phone, customer.code].some((v) => v.toLowerCase().includes(query.trim().toLowerCase()))).map((customer) => (
                  <tr key={customer.id} className={customer.balance > 0 ? "alert" : ""}>
                    <td>{customer.code}</td><td className="right"><b>{customer.name}</b></td><td dir="ltr">{customer.phone || "—"}</td>
                    <td>{customer.customerType}</td><td>{fmt(customer.balance, 2)}</td><td>{customer.invoiceCount}</td>
                    <td>{fmt(customer.purchases, 2)}</td><td>{shortDate(customer.last) || "—"}</td>
                    <td><button className="btn small blue" onClick={() => onOpenStatement(customer.id)}><FileText size={12} /> الكشف</button></td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={9} className="empty-row">لا يوجد عملاء مطابقون</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head"><span>إضافة عميل جديد</span><UserPlus size={17} /></div>
          <div className="panel-body">
            <div className="form-grid" style={{ gridTemplateColumns: "1fr" }}>
              <div><label className="label">اسم العميل *</label><input className="field" style={{ width: "100%" }} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><label className="label">رقم الهاتف</label><input className="field" style={{ width: "100%" }} dir="ltr" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div><label className="label">العنوان</label><input className="field" style={{ width: "100%" }} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
              <div><label className="label">نوع العميل</label><select className="field" style={{ width: "100%" }} value={form.customerType} onChange={(e) => setForm({ ...form, customerType: e.target.value })}><option>عادي</option><option>قسط</option><option>جملة</option><option>مدرسة</option><option>مورد</option></select></div>
              <div><label className="label">رصيد افتتاحي / قسط سابق</label><input type="number" min="0" className="field" style={{ width: "100%" }} value={form.balance} onChange={(e) => setForm({ ...form, balance: e.target.value })} /></div>
              <label className="module-row"><span>عميل أقساط بدون موعد محدد</span><input type="checkbox" checked={form.installmentEnabled} onChange={(e) => setForm({ ...form, installmentEnabled: e.target.checked })} /></label>
            </div>
            <button className="btn green" style={{ width: "100%", marginTop: 14 }} disabled={busy} onClick={() => void add()}><UserPlus size={15} /> حفظ العميل</button>
            <div className="info-box" style={{ marginTop: 14 }}>
              <Phone size={14} style={{ verticalAlign: "middle" }} /> لإضافة رصيد آجل تلقائياً: اختر العميل وطريقة الدفع «آجل» في شاشة المبيعات ثم احفظ الفاتورة.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
