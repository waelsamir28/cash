"use client";

import { useCallback, useEffect, useState } from "react";
import { Banknote, CalendarRange, Download, FilePlus2, Printer, RefreshCw, Trash2, Wallet } from "lucide-react";
import { api, downloadFile } from "@/lib/client-api";
import { dateTime, fmt } from "@/lib/format";
import type { Customer, Payment, StatementData, StoreSettings } from "@/lib/types";

type Props = {
  customers: Customer[];
  settings: StoreSettings;
  initialCustomerId?: number | null;
  onRefresh: () => Promise<void> | void;
  onToast: (message: string, error?: boolean) => void;
  onNavigate: (screen: "sales" | "customers") => void;
};

export default function StatementsScreen({ customers, settings, initialCustomerId, onRefresh, onToast, onNavigate }: Props) {
  const [customerId, setCustomerId] = useState<number>(initialCustomerId ?? customers.find((c) => !c.name.includes("نقدي"))?.id ?? customers[0]?.id ?? 0);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [data, setData] = useState<StatementData | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [payForm, setPayForm] = useState({
    amount: "", method: "نقدي", note: "", paymentDate: new Date().toISOString().slice(0, 10),
  });

  const load = useCallback(async () => {
    if (!customerId) return;
    try {
      const params = new URLSearchParams({ customerId: String(customerId) });
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const [statement, paymentData] = await Promise.all([
        api<StatementData>(`/api/statements?${params.toString()}`),
        api<{ payments: Payment[] }>(`/api/payments?customerId=${customerId}`),
      ]);
      setData(statement);
      setPayments(paymentData.payments);
    } catch (error) {
      onToast(error instanceof Error ? error.message : "تعذر تحميل كشف الحساب", true);
    }
  }, [customerId, from, to, onToast]);

  useEffect(() => {
    const timer = setTimeout(() => { void load(); }, 0);
    return () => clearTimeout(timer);
  }, [load]);

  const addPayment = async () => {
    const amount = Number(payForm.amount);
    if (!amount || amount <= 0) { onToast("أدخل مبلغ الدفعة", true); return; }
    try {
      await api("/api/payments", {
        method: "POST",
        body: JSON.stringify({ customerId, amount, method: payForm.method, note: payForm.note, paymentDate: payForm.paymentDate }),
      });
      onToast("تم تسجيل الدفعة وتحديث رصيد العميل");
      setPayForm({ amount: "", method: "نقدي", note: "", paymentDate: new Date().toISOString().slice(0, 10) });
      await onRefresh();
      await load();
    } catch (error) {
      onToast(error instanceof Error ? error.message : "تعذر تسجيل الدفعة", true);
    }
  };

  const deletePayment = async (id: number) => {
    if (!window.confirm("حذف هذه الدفعة وإعادتها لرصيد العميل؟")) return;
    try {
      await api(`/api/payments?id=${id}`, { method: "DELETE" });
      onToast("تم حذف الدفعة");
      await onRefresh();
      await load();
    } catch (error) {
      onToast(error instanceof Error ? error.message : "تعذر حذف الدفعة", true);
    }
  };

  const print = () => {
    document.body.classList.add("print-mode");
    window.print();
    setTimeout(() => document.body.classList.remove("print-mode"), 800);
  };

  const exportCsv = () => {
    if (!data) return;
    const header = ["التاريخ", "البيان", "المرجع", "مدين", "دائن", "الرصيد"];
    const rows = data.transactions.map((row) => [dateTime(row.date), row.description, row.reference, row.debit, row.credit, row.balance]);
    const csv = "\uFEFF" + [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    downloadFile(`algamal-statement-${customerId}.csv`, csv, "text/csv");
    onToast("تم تصدير كشف الحساب CSV");
  };

  const setRange = (days: number | null) => {
    if (days === null) { setFrom(""); setTo(""); return; }
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    setFrom(start.toISOString().slice(0, 10));
    setTo(end.toISOString().slice(0, 10));
  };

  return (
    <div>
      <h2 className="page-title"><Wallet size={20} style={{ verticalAlign: "middle", marginLeft: 6 }} /> كشف حساب العملاء</h2>
      <p className="page-desc">كل فواتير العميل ومدفوعاته في كشف واحد، مع رصيد افتتاحي وحركة ورصيد نهائي قابل للطباعة.</p>

      <div className="statement-layout">
        <div className="statement-side">
          <div className="panel statement-card">
            <div className="panel-head"><span>بيانات الكشف</span><CalendarRange size={17} /></div>
            <div className="panel-body statement-card">
              <div><label className="label">العميل</label>
                <select className="field" style={{ width: "100%" }} value={customerId} onChange={(event) => setCustomerId(Number(event.target.value))}>
                  {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
                </select>
              </div>
              <div className="statement-filters" style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
                <div><label className="label">من تاريخ</label><input type="date" dir="ltr" className="field" style={{ width: "100%" }} value={from} onChange={(event) => setFrom(event.target.value)} /></div>
                <div><label className="label">إلى تاريخ</label><input type="date" dir="ltr" className="field" style={{ width: "100%" }} value={to} onChange={(event) => setTo(event.target.value)} /></div>
              </div>
              <div className="statement-filters">
                <button className="btn small" onClick={() => setRange(0)}>اليوم</button>
                <button className="btn small" onClick={() => setRange(7)}>7 أيام</button>
                <button className="btn small" onClick={() => setRange(30)}>شهر</button>
                <button className="btn small" onClick={() => setRange(null)}>الكل</button>
              </div>
              <button className="btn blue" onClick={() => void load()}><RefreshCw size={14} /> تحديث الكشف</button>
              <div className="info-box">
                الرصيد الحالي للعميل:<br /><b style={{ fontSize: 18 }}>{fmt(data?.customer?.balance ?? 0, 2)} {settings.currency}</b>
              </div>
            </div>
          </div>

          <div className="panel statement-card">
            <div className="panel-head"><span>تسجيل دفعة / تحصيل</span><Banknote size={17} /></div>
            <div className="panel-body statement-card">
              <div><label className="label">المبلغ</label><input type="number" className="field" style={{ width: "100%" }} value={payForm.amount} onChange={(event) => setPayForm({ ...payForm, amount: event.target.value })} /></div>
              <div><label className="label">طريقة التحصيل</label><select className="field" style={{ width: "100%" }} value={payForm.method} onChange={(event) => setPayForm({ ...payForm, method: event.target.value })}><option>نقدي</option><option>تحويل بنكي</option><option>شبكة / بطاقة</option><option>شيك</option></select></div>
              <div><label className="label">التاريخ</label><input type="date" dir="ltr" className="field" style={{ width: "100%" }} value={payForm.paymentDate} onChange={(event) => setPayForm({ ...payForm, paymentDate: event.target.value })} /></div>
              <div><label className="label">ملاحظة</label><input className="field" style={{ width: "100%" }} value={payForm.note} onChange={(event) => setPayForm({ ...payForm, note: event.target.value })} placeholder="مثال: دفعة تحت الحساب" /></div>
              <button className="btn green" onClick={() => void addPayment()}><Banknote size={15} /> حفظ الدفعة</button>
              <button className="btn small" onClick={() => onNavigate("sales")}><FilePlus2 size={13} /> فاتورة آجلة جديدة</button>
            </div>
          </div>

          <div className="panel">
            <div className="panel-head"><span>آخر المدفوعات</span><span className="head-chip">{payments.length}</span></div>
            <div className="panel-body" style={{ padding: 7 }}>
              {payments.slice(0, 5).map((payment) => (
                <div key={payment.id} className="custom-module-row" style={{ marginBottom: 5 }}>
                  <span><b>{fmt(payment.amount, 2)}</b><br /><small>{dateTime(payment.paymentDate)} — {payment.method}</small></span>
                  <button className="btn small red" onClick={() => void deletePayment(payment.id)}><Trash2 size={12} /></button>
                </div>
              ))}
              {payments.length === 0 && <div className="empty-row">لا توجد مدفوعات مسجلة</div>}
            </div>
          </div>
        </div>

        <div className="statement-printable">
          <div className="statement-summary">
            <div className="stat-card"><div className="k">رصيد افتتاحي</div><div className="v">{fmt(data?.opening ?? 0, 2)}</div></div>
            <div className="stat-card"><div className="k">إجمالي مدين</div><div className="v red">{fmt(data?.debitTotal ?? 0, 2)}</div></div>
            <div className="stat-card"><div className="k">إجمالي دائن</div><div className="v green">{fmt(data?.creditTotal ?? 0, 2)}</div></div>
            <div className="stat-card"><div className="k">الرصيد النهائي</div><div className="v">{fmt(data?.closing ?? 0, 2)}</div></div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <span>حركة الحساب — {data?.customer?.name ?? ""}</span>
              <span style={{ display: "flex", gap: 6 }}>
                <button className="btn small" onClick={print}><Printer size={13} /> طباعة</button>
                <button className="btn small" onClick={exportCsv}><Download size={13} /> CSV</button>
              </span>
            </div>
            <div className="table-wrap" style={{ maxHeight: 470 }}>
              <table className="win-table">
                <thead><tr><th>التاريخ</th><th>البيان</th><th>المرجع</th><th>مدين</th><th>دائن</th><th>الرصيد</th></tr></thead>
                <tbody>
                  <tr><td colSpan={5} className="right"><b>رصيد افتتاحي</b></td><td><b>{fmt(data?.opening ?? 0, 2)}</b></td></tr>
                  {(data?.transactions ?? []).map((row) => (
                    <tr key={row.id} className={row.kind === "payment" ? "alert" : ""}>
                      <td>{dateTime(row.date)}</td><td className="right">{row.description}</td><td>{row.reference}</td>
                      <td>{fmt(row.debit, 2)}</td><td>{fmt(row.credit, 2)}</td><td><b>{fmt(row.balance, 2)}</b></td>
                    </tr>
                  ))}
                  {(data?.transactions ?? []).length === 0 && <tr><td colSpan={6} className="empty-row">لا توجد حركات في الفترة المحددة</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="panel-body">
              <div className="info-box">
                المدين = قيمة الفاتورة، الدائن = ما تم دفعه، والرصيد = المتبقي على العميل. عند تسجيل دفعة جديدة ينخفض الرصيد ويظهر الكشف فوراً.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
