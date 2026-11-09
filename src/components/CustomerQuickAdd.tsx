"use client";

import { useEffect, useState } from "react";
import { Save, UserPlus, X } from "lucide-react";
import { api } from "@/lib/client-api";
import type { Customer } from "@/lib/types";

type Props = {
  defaultInstallment?: boolean;
  onClose: () => void;
  onCreated: (customer: Customer) => void;
  onToast: (message: string, error?: boolean) => void;
};

export default function CustomerQuickAdd({ defaultInstallment = false, onClose, onCreated, onToast }: Props) {
  const [form, setForm] = useState({ name: "", phone: "", address: "", customerType: defaultInstallment ? "قسط" : "عادي", balance: "0", installmentEnabled: defaultInstallment });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const handler = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const save = async () => {
    if (!form.name.trim()) { setError("اكتب اسم العميل أولاً"); return; }
    setBusy(true);
    setError("");
    try {
      const result = await api<{ customer: Customer }>("/api/customers", {
        method: "POST",
        body: JSON.stringify({ ...form, balance: Number(form.balance) || 0 }),
      });
      onToast(`تمت إضافة العميل «${result.customer.name}» بنجاح`);
      onCreated(result.customer);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر إضافة العميل");
    } finally { setBusy(false); }
  };

  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="quick-customer-title" style={{ width: 560 }}>
        <div className="modal-head"><span id="quick-customer-title"><UserPlus size={17} style={{ verticalAlign: "middle", marginLeft: 6 }} /> إضافة عميل جديد</span><button className="btn small" onClick={onClose} aria-label="إغلاق"><X size={14} /></button></div>
        <div className="modal-body">
          <div className="form-grid">
            <div className="full"><label className="label" htmlFor="quick-customer-name">اسم العميل *</label><input id="quick-customer-name" autoFocus className="field customer-name-input" style={{ width: "100%" }} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} onKeyDown={(event) => { if (event.key === "Enter") void save(); }} placeholder="الاسم بالكامل" /></div>
            <div><label className="label">رقم الهاتف</label><input className="field" style={{ width: "100%" }} dir="ltr" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></div>
            <div><label className="label">نوع العميل</label><select className="field" style={{ width: "100%" }} value={form.customerType} onChange={(event) => setForm({ ...form, customerType: event.target.value })}><option>عادي</option><option>قسط</option><option>جملة</option><option>مدرسة</option><option>مورد</option></select></div>
            <div className="full"><label className="label">العنوان</label><input className="field" style={{ width: "100%" }} value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /></div>
            <div><label className="label">رصيد قسط سابق (اختياري)</label><input type="number" min="0" step="0.01" className="field" style={{ width: "100%" }} value={form.balance} onChange={(event) => setForm({ ...form, balance: event.target.value })} /></div>
            <label className="module-row" style={{ alignSelf: "end", minHeight: 36 }}><span>عميل أقساط بدون موعد محدد</span><input type="checkbox" checked={form.installmentEnabled} onChange={(event) => setForm({ ...form, installmentEnabled: event.target.checked })} /></label>
          </div>
          <div className="info-box" style={{ marginTop: 12 }}>بعد الحفظ هيظهر العميل مباشرة في الفاتورة. تقدر تسدد أي مبلغ في أي وقت من شاشة الأقساط.</div>
          {error && <div className="inline-error" role="alert">{error}</div>}
        </div>
        <div className="modal-foot"><button className="btn green" disabled={busy} onClick={() => void save()}><Save size={15} /> {busy ? "جارٍ الحفظ..." : "حفظ العميل"}</button><button className="btn" onClick={onClose}>إلغاء</button></div>
      </div>
    </div>
  );
}
