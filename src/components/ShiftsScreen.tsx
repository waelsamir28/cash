"use client";

import { useCallback, useEffect, useState } from "react";
import { Clock3, LogIn, LogOut, Plus, Shield, Trash2, UserPlus, Users, Wallet } from "lucide-react";
import { api } from "@/lib/client-api";
import { fmt, shortDate } from "@/lib/format";
import type { AppUser, Shift } from "@/lib/types";
import { ROLE_LABELS, getRoleColor } from "@/lib/permissions";

type Props = {
  onToast: (msg: string, error?: boolean) => void;
};

export default function ShiftsScreen({ onToast }: Props) {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [curShift, setCurShift] = useState<Shift | null>(null);
  const [tab, setTab] = useState<"shifts" | "users">("shifts");
  const [formUser, setFormUser] = useState({ name: "", phone: "", role: "cashier", password: "1234" });
  const [shiftForm, setShiftForm] = useState({ userId: "", startingCash: "500" });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [uData, sData] = await Promise.all([api<{ users: AppUser[] }>("/api/users"), api<{ shifts: Shift[]; openShift: Shift | null }>("/api/shifts")]);
      setUsers(uData.users);
      setShifts(sData.shifts);
      setCurShift(sData.openShift);
      if (!shiftForm.userId && uData.users.length > 0) {
        const active = uData.users.find((u) => u.active);
        if (active) setShiftForm((p) => ({ ...p, userId: String(active.id) }));
      }
    } catch (e) {
      onToast(e instanceof Error ? e.message : "تعذر تحميل الورديات", true);
    }
  }, [onToast, shiftForm.userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const createUser = async () => {
    if (!formUser.name.trim()) return onToast("اكتب اسم المستخدم", true);
    setBusy(true);
    try {
      await api("/api/users", { method: "POST", body: JSON.stringify(formUser) });
      onToast("تمت إضافة المستخدم");
      setFormUser({ name: "", phone: "", role: "cashier", password: "1234" });
      await load();
    } catch (e) {
      onToast(e instanceof Error ? e.message : "تعذر الإضافة", true);
    } finally {
      setBusy(false);
    }
  };

  const deleteUser = async (id: number) => {
    if (!confirm("حذف المستخدم؟")) return;
    try {
      await api(`/api/users?id=${id}`, { method: "DELETE" });
      onToast("تم حذف المستخدم");
      await load();
    } catch (e) {
      onToast(e instanceof Error ? e.message : "تعذر الحذف", true);
    }
  };

  const toggleActive = async (u: AppUser) => {
    try {
      await api("/api/users", { method: "PATCH", body: JSON.stringify({ id: u.id, active: !u.active }) });
      await load();
    } catch (e) {
      onToast(e instanceof Error ? e.message : "تعذر التحديث", true);
    }
  };

  const doOpenShift = async () => {
    if (!shiftForm.userId) return onToast("اختر المستخدم", true);
    setBusy(true);
    try {
      await api("/api/shifts", { method: "POST", body: JSON.stringify({ userId: Number(shiftForm.userId), startingCash: Number(shiftForm.startingCash) }) });
      onToast("تم فتح الوردية ✅");
      await load();
    } catch (e) {
      onToast(e instanceof Error ? e.message : "تعذر فتح الوردية", true);
    } finally {
      setBusy(false);
    }
  };

  const doCloseShift = async () => {
    if (!curShift) return;
    const ending = prompt("رصيد الدرج عند الإغلاق (اختياري سيُحسب تلقائياً):", "");
    if (ending === null) return;
    try {
      await api("/api/shifts", { method: "PATCH", body: JSON.stringify({ id: curShift.id, endingCash: ending ? Number(ending) : undefined }) });
      onToast("تم إغلاق الوردية بنجاح");
      await load();
    } catch (e) {
      onToast(e instanceof Error ? e.message : "تعذر الإغلاق", true);
    }
  };

  return (
    <div>
      <h2 className="page-title">
        <Clock3 size={20} style={{ verticalAlign: "middle", marginLeft: 6 }} /> الورديات والكاشير
      </h2>
      <p className="page-desc">إدارة المستخدمين بصلاحيات (مدير/كاشير) وفتح وإغلاق الورديات مع تقرير مبيعات كل وردية.</p>

      <div className="settings-tabs">
        <button className={`settings-tab ${tab === "shifts" ? "active" : ""}`} onClick={() => setTab("shifts")}>
          <Clock3 size={14} style={{ verticalAlign: "middle", marginLeft: 5 }} /> الورديات ({shifts.length})
        </button>
        <button className={`settings-tab ${tab === "users" ? "active" : ""}`} onClick={() => setTab("users")}>
          <Users size={14} style={{ verticalAlign: "middle", marginLeft: 5 }} /> المستخدمون ({users.length})
        </button>
      </div>

      {tab === "shifts" && (
        <>
          {curShift ? (
            <div className="panel" style={{ borderRight: "5px solid #128349", marginBottom: 12 }}>
              <div className="panel-head" style={{ background: "linear-gradient(#e2f6e8,#c7ebd3)", color: "#0b4c1e" }}>
                <span>
                  <Clock3 size={15} style={{ verticalAlign: "middle", marginLeft: 6 }} /> وردية مفتوحة: {curShift.userName} — منذ {new Date(curShift.startAt).toLocaleTimeString("ar-EG")}
                </span>
                <button className="btn red small" onClick={() => void doCloseShift()}>
                  <LogOut size={13} /> إغلاق الوردية
                </button>
              </div>
              <div className="panel-body" style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <span className="head-chip">رصيد البداية: {fmt(curShift.startingCash, 2)} ج.م</span>
                <span className="head-chip">الحالة: مفتوحة 🟢</span>
                <span className="head-chip">الدور: {ROLE_LABELS[curShift.role as keyof typeof ROLE_LABELS] || curShift.role}</span>
              </div>
            </div>
          ) : (
            <div className="panel" style={{ marginBottom: 12 }}>
              <div className="panel-head">
                <span>فتح وردية جديدة</span>
                <LogIn size={15} />
              </div>
              <div className="panel-body" style={{ display: "flex", gap: 8, alignItems: "end", flexWrap: "wrap" }}>
                <div>
                  <label className="label">المستخدم</label>
                  <select className="field" value={shiftForm.userId} onChange={(e) => setShiftForm({ ...shiftForm, userId: e.target.value })} style={{ minWidth: 180 }}>
                    {users.filter((u) => u.active).map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} — {ROLE_LABELS[u.role as keyof typeof ROLE_LABELS] || u.role}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">رصيد البداية</label>
                  <input className="field" type="number" value={shiftForm.startingCash} onChange={(e) => setShiftForm({ ...shiftForm, startingCash: e.target.value })} style={{ width: 120 }} />
                </div>
                <button className="btn green" disabled={busy} onClick={() => void doOpenShift()}>
                  <LogIn size={14} /> فتح الوردية
                </button>
              </div>
            </div>
          )}

          <div className="panel">
            <div className="panel-head">
              <span>سجل الورديات</span>
              <span className="head-chip">{shifts.length}</span>
            </div>
            <div className="table-wrap" style={{ maxHeight: 380 }}>
              <table className="win-table">
                <thead>
                  <tr>
                    <th>المستخدم</th>
                    <th>البداية</th>
                    <th>النهاية</th>
                    <th>البداية</th>
                    <th>النهاية</th>
                    <th>المبيعات</th>
                    <th>الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {shifts.map((s) => (
                    <tr key={s.id} style={s.status === "مفتوحة" ? { background: "#e2f6e8" } : {}}>
                      <td className="right">
                        {s.userName} <small style={{ color: getRoleColor(s.role) }}>({ROLE_LABELS[s.role as keyof typeof ROLE_LABELS] || s.role})</small>
                      </td>
                      <td>{shortDate(s.startAt)}</td>
                      <td>{s.endAt ? shortDate(s.endAt) : "—"}</td>
                      <td>{fmt(s.startingCash, 2)}</td>
                      <td>{s.endingCash ? fmt(s.endingCash, 2) : "—"}</td>
                      <td>
                        <b>{fmt(s.totalSales, 2)}</b> <small>({s.salesCount} فاتورة)</small>
                      </td>
                      <td>
                        <span style={{ color: s.status === "مفتوحة" ? "#128349" : "#6b7280", fontWeight: 900 }}>{s.status}</span>
                      </td>
                    </tr>
                  ))}
                  {shifts.length === 0 && (
                    <tr>
                      <td colSpan={7} className="empty-row">
                        لا توجد ورديات بعد
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {tab === "users" && (
        <>
          <div className="panel" style={{ marginBottom: 12 }}>
            <div className="panel-head">
              <span>إضافة مستخدم جديد</span>
              <UserPlus size={15} />
            </div>
            <div className="panel-body">
              <div className="form-grid" style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
                <div>
                  <label className="label">الاسم</label>
                  <input className="field" style={{ width: "100%" }} value={formUser.name} onChange={(e) => setFormUser({ ...formUser, name: e.target.value })} placeholder="أحمد - كاشير" />
                </div>
                <div>
                  <label className="label">الهاتف</label>
                  <input className="field" style={{ width: "100%" }} value={formUser.phone} onChange={(e) => setFormUser({ ...formUser, phone: e.target.value })} />
                </div>
                <div>
                  <label className="label">الدور</label>
                  <select className="field" style={{ width: "100%" }} value={formUser.role} onChange={(e) => setFormUser({ ...formUser, role: e.target.value })}>
                    <option value="admin">مدير عام</option>
                    <option value="manager">مدير فرع</option>
                    <option value="cashier">كاشير</option>
                    <option value="viewer">مشاهدة فقط</option>
                  </select>
                </div>
                <div>
                  <label className="label">كلمة المرور</label>
                  <input className="field" style={{ width: "100%" }} value={formUser.password} onChange={(e) => setFormUser({ ...formUser, password: e.target.value })} />
                </div>
              </div>
              <button className="btn green" style={{ marginTop: 10 }} disabled={busy} onClick={() => void createUser()}>
                <Plus size={14} /> إضافة المستخدم
              </button>
              <div className="info-box" style={{ marginTop: 10 }}>
                <b>الصلاحيات:</b> مدير عام = كل شيء، مدير فرع = مبيعات ومخازن وتقارير، كاشير = مبيعات وجرد فقط، مشاهدة فقط = تقارير فقط.
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <span>قائمة المستخدمين</span>
              <Shield size={15} />
            </div>
            <div className="table-wrap">
              <table className="win-table">
                <thead>
                  <tr>
                    <th>الكود</th>
                    <th>الاسم</th>
                    <th>الهاتف</th>
                    <th>الدور</th>
                    <th>الحالة</th>
                    <th>إجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td>{u.code}</td>
                      <td className="right">{u.name}</td>
                      <td>{u.phone || "—"}</td>
                      <td>
                        <span style={{ background: getRoleColor(u.role), color: "#fff", padding: "2px 8px", borderRadius: 12, fontSize: 11, fontWeight: 900 }}>
                          {ROLE_LABELS[u.role as keyof typeof ROLE_LABELS] || u.role}
                        </span>
                      </td>
                      <td>
                        <button className={`btn small ${u.active ? "green" : ""}`} onClick={() => void toggleActive(u)}>
                          {u.active ? "نشط" : "موقوف"}
                        </button>
                      </td>
                      <td>
                        <button className="btn small red" onClick={() => void deleteUser(u.id)}>
                          <Trash2 size={11} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={6} className="empty-row">
                        لا يوجد مستخدمون
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
