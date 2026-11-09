"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Wallet, TrendingDown, Calendar, PieChart, Search } from "lucide-react";
import { api } from "@/lib/client-api";
import { fmt, shortDate } from "@/lib/format";
import type { Expense } from "@/lib/types";

type Props = { onRefresh: () => Promise<void> | void; onToast: (m: string, e?: boolean) => void; };

const CATS = ["إيجار", "كهرباء", "مرتبات", "توصيل", "صيانة", "دعاية", "أخرى"];

export default function ExpensesScreen({ onRefresh, onToast }: Props) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [form, setForm] = useState({ title: "", category: "إيجار", amount: "", expenseDate: new Date().toISOString().slice(0, 10), paymentMethod: "نقدي", notes: "" });
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState("الكل");
  const [q, setQ] = useState("");
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));

  const load = useCallback(async () => {
    try {
      const data = await api<{ expenses: Expense[] }>("/api/expenses");
      setExpenses(data.expenses);
    } catch (e) { onToast(e instanceof Error ? e.message : "تعذر التحميل", true); }
  }, [onToast]);
  useEffect(() => { void load(); }, [load]);

  const total = useMemo(() => expenses.reduce((s, e) => s + Number(e.amount), 0), [expenses]);
  const monthTotal = useMemo(() => expenses.filter((e) => e.expenseDate.slice(0, 7) === month).reduce((s, e) => s + Number(e.amount), 0), [expenses, month]);
  const byCat = useMemo(() => {
    const m = new Map<string, number>();
    expenses.filter((e) => e.expenseDate.slice(0, 7) === month).forEach((e) => m.set(e.category, (m.get(e.category) ?? 0) + Number(e.amount)));
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [expenses, month]);

  const filtered = useMemo(() => expenses.filter((e) => {
    if (filter !== "الكل" && e.category !== filter) return false;
    if (q.trim() && !`${e.title} ${e.category} ${e.notes}`.toLowerCase().includes(q.trim().toLowerCase())) return false;
    return true;
  }), [expenses, filter, q]);

  const submit = async () => {
    if (!form.title.trim()) return onToast("اكتب وصف المصروف", true);
    const amt = Number(form.amount);
    if (!amt || amt <= 0) return onToast("المبلغ غير صحيح", true);
    setBusy(true);
    try {
      await api("/api/expenses", { method: "POST", body: JSON.stringify({ ...form, amount: amt }) });
      onToast("تم تسجيل المصروف");
      setForm((f) => ({ ...f, title: "", amount: "", notes: "" }));
      await load(); await onRefresh();
    } catch (e) { onToast(e instanceof Error ? e.message : "تعذر الحفظ", true); }
    finally { setBusy(false); }
  };

  const del = async (id: number) => {
    if (!confirm("حذف المصروف؟")) return;
    try { await api(`/api/expenses?id=${id}`, { method: "DELETE" }); onToast("تم الحذف"); await load(); await onRefresh(); }
    catch (e) { onToast(e instanceof Error ? e.message : "تعذر الحذف", true); }
  };

  return (
    <div>
      <h2 className="page-title"><Wallet size={20} style={{ verticalAlign: "middle", marginLeft: 6 }} /> المصاريف اليومية</h2>
      <p className="page-desc">سجل الإيجار، الكهرباء، المرتبات والشحن — تُخصم تلقائياً من صافي الربح في التقارير.</p>

      <div className="stat-grid">
        <div className="stat-card"><div className="k">إجمالي المصاريف</div><div className="v red">{fmt(total, 2)}</div></div>
        <div className="stat-card"><div className="k">هذا الشهر ({month})</div><div className="v">{fmt(monthTotal, 2)}</div></div>
        <div className="stat-card">
          <div className="k">أكبر بند</div><div className="v" style={{ fontSize: 14 }}>{byCat[0] ? `${byCat[0][0]} — ${fmt(byCat[0][1], 2)}` : "—"}</div>
        </div>
        <div className="stat-card">
          <div className="k">عدد الحركات</div><div className="v">{expenses.length}</div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head"><span><Plus size={13} /> إضافة مصروف جديد</span><Calendar size={13} /></div>
        <div className="panel-body">
          <div className="form-grid" style={{ gridTemplateColumns: "1.5fr 1fr 1fr 1fr", gap: 8 }}>
            <div>
              <label className="label">الوصف</label>
              <input className="field" style={{ width: "100%" }} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="إيجار المحل - نوفمبر" />
            </div>
            <div>
              <label className="label">الفئة</label>
              <select className="field" style={{ width: "100%" }} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {CATS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">المبلغ</label>
              <input className="field" style={{ width: "100%" }} type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="1500" />
            </div>
            <div>
              <label className="label">التاريخ</label>
              <input className="field" style={{ width: "100%" }} type="date" value={form.expenseDate} onChange={(e) => setForm({ ...form, expenseDate: e.target.value })} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "end", flexWrap: "wrap" }}>
            <div>
              <label className="label">طريقة الدفع</label>
              <select className="field" value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}>
                <option>نقدي</option><option>تحويل</option><option>آجل</option>
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 160 }}>
              <label className="label">ملاحظات</label>
              <input className="field" style={{ width: "100%" }} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <button className="btn green" disabled={busy} onClick={() => void submit()}><Plus size={14} /> تسجيل المصروف</button>
          </div>
        </div>
      </div>

      <div className="two-col" style={{ gridTemplateColumns: "1fr 340px", marginTop: 12 }}>
        <div className="panel">
          <div className="panel-head"><span>سجل المصاريف</span>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <Search size={13} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث..." style={{ width: 120, padding: "3px 6px", borderRadius: 6, border: "1px solid #c5d3e8" }} />
              <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ padding: "3px 6px", borderRadius: 6, border: "1px solid #c5d3e8" }}>
                <option>الكل</option>{CATS.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="table-wrap" style={{ maxHeight: 380 }}>
            <table className="win-table">
              <thead><tr><th>التاريخ</th><th>الوصف</th><th>الفئة</th><th>المبلغ</th><th>الدفع</th><th></th></tr></thead>
              <tbody>
                {filtered.map((e) => (
                  <tr key={e.id}>
                    <td>{shortDate(e.expenseDate)}</td>
                    <td className="right">{e.title}<br /><small style={{ color: "#6b7e93" }}>{e.notes}</small></td>
                    <td><span style={{ background: "#e8f0fe", color: "#0b4b9e", padding: "2px 8px", borderRadius: 12, fontWeight: 900, fontSize: 11 }}>{e.category}</span></td>
                    <td className="red" style={{ fontWeight: 900 }}>{fmt(e.amount, 2)}</td>
                    <td>{e.paymentMethod}</td>
                    <td><button className="btn small red" onClick={() => void del(e.id)}><Trash2 size={11} /></button></td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={6} className="empty-row">لا توجد مصاريف</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head"><span>توزيع مصاريف الشهر</span><PieChart size={13} /></div>
          <div className="panel-body">
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
              <label className="label">الشهر</label><input type="month" className="field" value={month} onChange={(e) => setMonth(e.target.value)} />
            </div>
            <table className="win-table">
              <thead><tr><th>الفئة</th><th>المبلغ</th><th>النسبة</th></tr></thead>
              <tbody>
                {byCat.map(([cat, amt]) => (
                  <tr key={cat}><td>{cat}</td><td>{fmt(amt, 2)}</td><td>{monthTotal ? `${Math.round((amt / monthTotal) * 100)}%` : "0%"}</td></tr>
                ))}
                {byCat.length === 0 && <tr><td colSpan={3} className="empty-row">لا مصاريف هذا الشهر</td></tr>}
              </tbody>
            </table>
            <div style={{ marginTop: 10, fontWeight: 900, color: "#c01212" }}><TrendingDown size={13} style={{ verticalAlign: "middle", marginLeft: 4 }} /> الإجمالي: {fmt(monthTotal, 2)} ج.م</div>
            <div className="info-box" style={{ marginTop: 8, fontSize: 11 }}>صافي الربح = المبيعات - تكلفة البضاعة - المصاريف — يظهر في التقارير الآن.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
