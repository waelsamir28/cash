"use client";

import { useMemo, useState } from "react";
import { Banknote, BellRing, CalendarClock, Download, FileText, HandCoins, Plus, Printer, RefreshCw, Search, UserPlus, Users, X } from "lucide-react";
import { api, downloadFile } from "@/lib/client-api";
import { fmt, shortDate } from "@/lib/format";
import { elapsedLabel, type InstallmentAccount, type InstallmentsData } from "@/lib/installments";
import type { Customer, StoreSettings } from "@/lib/types";
import CustomerQuickAdd from "@/components/CustomerQuickAdd";

type Props = {
  data: InstallmentsData | null;
  customers: Customer[];
  settings: StoreSettings;
  onRefresh: () => Promise<void> | void;
  onToast: (message: string, error?: boolean) => void;
  onOpenStatement: (customerId: number) => void;
};

export default function InstallmentsScreen({ data, customers, settings, onRefresh, onToast, onOpenStatement }: Props) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"open" | "overdue" | "all">("open");
  const [selected, setSelected] = useState<InstallmentAccount | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [activateOpen, setActivateOpen] = useState(false);
  const [activateId, setActivateId] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ amount: "", paymentDate: new Date().toISOString().slice(0, 10), method: "نقدي", note: "" });
  const accounts = useMemo(() => data?.accounts ?? [], [data]);
  const openAccounts = accounts.filter((account) => account.outstanding > 0);
  const filtered = useMemo(() => accounts.filter((account) => {
    const matchesFilter = filter === "all" || (filter === "overdue" ? account.overdue : account.outstanding > 0);
    const q = query.trim().toLowerCase();
    return matchesFilter && (!q || [account.customer.name, account.customer.phone, account.customer.code].some((value) => value.toLowerCase().includes(q)));
  }), [accounts, filter, query]);

  const openPayment = (account: InstallmentAccount) => {
    setSelected(account);
    setForm({ amount: "", paymentDate: new Date().toISOString().slice(0, 10), method: "نقدي", note: "" });
  };

  const savePayment = async () => {
    if (!selected) return;
    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > selected.outstanding) {
      onToast(`أدخل مبلغاً أكبر من صفر ولا يزيد عن ${fmt(selected.outstanding, 2)}`, true);
      return;
    }
    setBusy(true);
    try {
      await api("/api/payments", { method: "POST", body: JSON.stringify({ customerId: selected.customer.id, ...form, amount }) });
      onToast(`تم تحصيل ${fmt(amount, 2)} ${settings.currency} من ${selected.customer.name}`);
      setSelected(null);
      await onRefresh();
    } catch (error) {
      onToast(error instanceof Error ? error.message : "تعذر تسجيل الدفعة", true);
    } finally { setBusy(false); }
  };

  const activate = async () => {
    if (!activateId) { onToast("اختر العميل أولاً", true); return; }
    setBusy(true);
    try {
      await api("/api/customers", { method: "PATCH", body: JSON.stringify({ id: Number(activateId), installmentEnabled: true, customerType: "قسط" }) });
      onToast("تم تفعيل نظام الأقساط للعميل");
      setActivateOpen(false);
      await onRefresh();
    } catch (error) {
      onToast(error instanceof Error ? error.message : "تعذر تفعيل العميل", true);
    } finally { setBusy(false); }
  };

  const exportCsv = () => {
    const header = ["العميل", "الهاتف", "الرصيد المستحق", "آخر دفعة", "تاريخ آخر دفعة", "أيام بدون سداد", "تنبيه"];
    const rows = filtered.map((account) => [account.customer.name, account.customer.phone, account.outstanding, account.lastPaymentAmount ?? "", shortDate(account.lastPaymentDate), account.daysSincePayment ?? "", account.overdue ? "متأخر شهرين أو أكثر" : "منتظم"]);
    const csv = "\uFEFF" + [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    downloadFile("algamal-installments.csv", csv, "text/csv");
    onToast("تم تصدير كشف الأقساط");
  };

  const print = () => {
    document.body.classList.add("print-mode");
    window.print();
    setTimeout(() => document.body.classList.remove("print-mode"), 800);
  };

  return (
    <div>
      <h2 className="page-title"><HandCoins size={21} style={{ verticalAlign: "middle", marginLeft: 6 }} /> الأقساط والتحصيل</h2>
      <p className="page-desc">بيع بالقسط بدون موعد إجباري، وتسجيل أي دفعة في أي وقت. التنبيه يظهر بعد {data?.alertMonths ?? 2} شهرين من آخر سداد، أو من أول فاتورة غير مسددة إذا لم يدفع العميل بعد.</p>

      <div className="stat-grid">
        <div className="stat-card"><div className="k">عملاء عليهم رصيد</div><div className="v">{openAccounts.length}</div></div>
        <div className="stat-card"><div className="k">إجمالي المبالغ المستحقة</div><div className="v red">{fmt(data?.totalOutstanding ?? 0, 2)}</div></div>
        <div className="stat-card"><div className="k">متأخرون عن مدة التنبيه</div><div className="v red">{data?.overdueCount ?? 0}</div></div>
        <div className="stat-card"><div className="k">إجمالي المحصل</div><div className="v green">{fmt(data?.totalPaid ?? 0, 2)}</div></div>
      </div>

      <div className="invoice-preview-toolbar">
        <button className="btn green" onClick={() => setAddOpen(true)}><UserPlus size={15} /> إضافة عميل قسط</button>
        <button className="btn" onClick={() => setActivateOpen(true)}><Users size={15} /> تفعيل عميل موجود</button>
        <button className="btn blue" onClick={() => void onRefresh()}><RefreshCw size={15} /> تحديث</button>
        <button className="btn" onClick={exportCsv}><Download size={15} /> تصدير CSV</button>
        <button className="btn" onClick={print}><Printer size={15} /> طباعة الكشف</button>
        <span className="head-chip"><CalendarClock size={14} /> لا يوجد ميعاد سداد ثابت</span>
      </div>

      <div className="panel statement-printable">
        <div className="panel-head">
          <span>حسابات الأقساط — {settings.storeName}</span>
          <div className="field-row">
            <Search size={15} />
            <input placeholder="بحث بالاسم أو الهاتف" value={query} onChange={(event) => setQuery(event.target.value)} style={{ width: 190 }} />
            <select value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)} style={{ width: 155 }}>
              <option value="open">عليهم رصيد</option><option value="overdue">المتأخرون فقط</option><option value="all">كل عملاء الأقساط</option>
            </select>
          </div>
        </div>
        <div className="table-wrap" style={{ maxHeight: 470 }}>
          <table className="win-table installments-table">
            <thead><tr><th>م</th><th>اسم العميل</th><th>الهاتف</th><th>عليه كام؟</th><th>آخر دفعة</th><th>تاريخ آخر دفعة</th><th>مدفعش بقاله</th><th>الحالة</th><th>إجراءات</th></tr></thead>
            <tbody>
              {filtered.map((account, index) => (
                <tr key={account.customer.id} className={account.overdue ? "overdue-row" : ""}>
                  <td>{index + 1}</td>
                  <td className="right"><b>{account.customer.name}</b><br /><small>{account.openInvoices} فاتورة مفتوحة</small></td>
                  <td dir="ltr">{account.customer.phone || "—"}</td>
                  <td><b className="amount-red">{fmt(account.outstanding, 2)}</b><br /><small>{settings.currency}</small></td>
                  <td>{account.lastPaymentAmount === null ? "لم يدفع بعد" : fmt(account.lastPaymentAmount, 2)}</td>
                  <td>{shortDate(account.lastPaymentDate) || "—"}</td>
                  <td><b>{elapsedLabel(account.daysSincePayment)}</b>{!account.lastPaymentDate && account.referenceDate && <><br /><small>من أول فاتورة: {shortDate(account.referenceDate)}</small></>}</td>
                  <td>{account.outstanding <= 0 ? <span className="status-pill paid">مسدد</span> : account.overdue ? <span className="status-pill late"><BellRing size={11} /> متأخر</span> : <span className="status-pill active">قسط جارٍ</span>}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {account.outstanding > 0 && <button className="btn small green" onClick={() => openPayment(account)}><Banknote size={13} /> دفعة</button>}{" "}
                    <button className="btn small blue" onClick={() => onOpenStatement(account.customer.id)}><FileText size={13} /> كشف</button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={9} className="empty-row">لا توجد حسابات مطابقة. أضف عميل قسط أو سجّل فاتورة بطريقة دفع «قسط».</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="panel-body"><div className="info-box"><b>طريقة الحساب:</b> المتبقي = الفواتير + أي رصيد سابق − الدفعات. عند تسجيل دفعة تتسدد أقدم فاتورة أولاً. لو العميل لم يدفع نهائياً، تُحسب المدة من تاريخ أول فاتورة غير مسددة.</div></div>
      </div>

      {selected && (
        <div className="modal-backdrop">
          <div className="modal" role="dialog" aria-modal="true" style={{ width: 520 }}>
            <div className="modal-head"><span>تسجيل دفعة — {selected.customer.name}</span><button className="btn small" onClick={() => setSelected(null)}><X size={14} /></button></div>
            <div className="modal-body">
              <div className="payment-summary"><span>الرصيد المستحق</span><b>{fmt(selected.outstanding, 2)} {settings.currency}</b></div>
              <div className="form-grid">
                <div><label className="label">المبلغ المدفوع *</label><input autoFocus type="number" min="0.01" max={selected.outstanding} step="0.01" className="field" style={{ width: "100%" }} value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} /></div>
                <div><label className="label">تاريخ الدفع</label><input type="date" dir="ltr" max={new Date().toISOString().slice(0, 10)} className="field" style={{ width: "100%" }} value={form.paymentDate} onChange={(event) => setForm({ ...form, paymentDate: event.target.value })} /></div>
                <div><label className="label">طريقة الدفع</label><select className="field" style={{ width: "100%" }} value={form.method} onChange={(event) => setForm({ ...form, method: event.target.value })}><option>نقدي</option><option>تحويل بنكي</option><option>شبكة / بطاقة</option><option>شيك</option></select></div>
                <div><label className="label">ملاحظة</label><input className="field" style={{ width: "100%" }} value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} /></div>
              </div>
              <button className="btn small" style={{ marginTop: 10 }} onClick={() => setForm({ ...form, amount: String(selected.outstanding) })}><Plus size={12} /> سداد كامل الرصيد</button>
              <div className="info-box" style={{ marginTop: 12 }}>بعد الحفظ يتحدث الرصيد وتاريخ آخر دفعة فوراً، ويختفي التنبيه إذا تم السداد.</div>
            </div>
            <div className="modal-foot"><button className="btn green" disabled={busy} onClick={() => void savePayment()}><Banknote size={15} /> {busy ? "جارٍ الحفظ..." : "حفظ الدفعة"}</button><button className="btn" onClick={() => setSelected(null)}>إلغاء</button></div>
          </div>
        </div>
      )}

      {activateOpen && (
        <div className="modal-backdrop"><div className="modal" style={{ width: 450 }}>
          <div className="modal-head"><span>تفعيل الأقساط لعميل موجود</span><button className="btn small" onClick={() => setActivateOpen(false)}><X size={14} /></button></div>
          <div className="modal-body"><label className="label">اختر العميل</label><select className="field" style={{ width: "100%" }} value={activateId} onChange={(event) => setActivateId(event.target.value)}><option value="">— اختر —</option>{customers.filter((customer) => !customer.name.includes("نقدي")).map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></div>
          <div className="modal-foot"><button className="btn green" disabled={busy} onClick={() => void activate()}>تفعيل الأقساط</button><button className="btn" onClick={() => setActivateOpen(false)}>إلغاء</button></div>
        </div></div>
      )}
      {addOpen && <CustomerQuickAdd defaultInstallment onClose={() => setAddOpen(false)} onCreated={() => { setFilter("all"); void onRefresh(); }} onToast={onToast} />}
    </div>
  );
}
