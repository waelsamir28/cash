"use client";

import { useState } from "react";
import { Clock, Headset, LifeBuoy, MessageCircle, Phone, Send } from "lucide-react";
import { api } from "@/lib/client-api";
import { dateTime } from "@/lib/format";
import { SUPPORT, whatsappLink } from "@/lib/support";
import { useSession } from "@/lib/session-context";
import LicenseCard from "@/components/LicenseCard";
import type { SupportTicket } from "@/lib/types";

type Props = {
  tickets: SupportTicket[];
  onRefresh: () => Promise<void> | void;
  onToast: (message: string, error?: boolean) => void;
};

export default function SupportScreen({ tickets, onRefresh, onToast }: Props) {
  const { userName, license } = useSession();
  const [form, setForm] = useState({ name: userName, phone: "", subject: "استفسار عام", message: "" });
  const [busy, setBusy] = useState(false);
  const chatLink = whatsappLink(`السلام عليكم م. وائل، أنا ${userName} من برنامج الجمال.`);

  const send = async () => {
    if (!form.name.trim() || !form.message.trim()) {
      onToast("اكتب اسمك ووصف المشكلة أولاً", true);
      return;
    }
    setBusy(true);
    try {
      await api("/api/tickets", { method: "POST", body: JSON.stringify(form) });
      onToast("تم تسجيل طلبك في الدعم الفني");
      setForm({ name: userName, phone: "", subject: "استفسار عام", message: "" });
      await onRefresh();
    } catch (error) {
      onToast(error instanceof Error ? error.message : "تعذر إرسال الطلب", true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="support-page">
      <section className="support-hero">
        <div className="support-avatar"><Headset size={44} /></div>
        <div className="support-hero-info">
          <span className="support-tag">الدعم الفني الرسمي</span>
          <h2>{SUPPORT.name}</h2>
          <p>{SUPPORT.title}</p>
          <a className="support-phone" href={whatsappLink()} target="_blank" rel="noreferrer" dir="ltr">
            {SUPPORT.phone}
          </a>
          <small><Clock size={13} /> {SUPPORT.hours}</small>
        </div>
        <div className="support-hero-actions">
          <a className="btn whatsapp-btn big" href={chatLink} target="_blank" rel="noreferrer">
            <MessageCircle size={20} /> راسلني على واتساب
          </a>
          <a className="btn" href={`tel:+${SUPPORT.whatsappNumber}`}>
            <Phone size={16} /> اتصال مباشر
          </a>
        </div>
      </section>

      <div className="support-grid">
        <section className="panel">
          <div className="panel-head"><span><Send size={15} style={{ verticalAlign: "middle", marginLeft: 5 }} /> إرسال طلب دعم</span></div>
          <div className="panel-body">
            <div className="form-grid">
              <div>
                <label className="label">الاسم</label>
                <input className="field" style={{ width: "100%" }} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
              </div>
              <div>
                <label className="label">رقم هاتفك</label>
                <input className="field" style={{ width: "100%" }} dir="ltr" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
              </div>
              <div className="full">
                <label className="label">نوع الطلب</label>
                <select className="field" style={{ width: "100%" }} value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })}>
                  <option>استفسار عام</option>
                  <option>مشكلة في الفواتير</option>
                  <option>مشكلة في المخزون أو الأصناف</option>
                  <option>النسخ الاحتياطي</option>
                  <option>التفعيل والترخيص</option>
                  <option>طلب ميزة جديدة</option>
                </select>
              </div>
              <div className="full">
                <label className="label">تفاصيل المشكلة</label>
                <textarea className="field" style={{ width: "100%", minHeight: 90 }} value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} placeholder="اشرح المشكلة أو الطلب بالتفصيل..." />
              </div>
            </div>
            <button className="btn green tall" style={{ marginTop: 10 }} disabled={busy} onClick={() => void send()}>
              <Send size={16} /> {busy ? "جارٍ الإرسال..." : "إرسال الطلب"}
            </button>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head"><span><LifeBuoy size={15} style={{ verticalAlign: "middle", marginLeft: 5 }} /> الترخيص والتفعيل</span></div>
          <div className="panel-body"><LicenseCard license={license} /></div>
        </section>
      </div>

      <section className="panel" style={{ marginTop: 12 }}>
        <div className="panel-head"><span>سجل طلبات الدعم</span><span className="head-chip">{tickets.length}</span></div>
        <div className="table-wrap" style={{ maxHeight: 240 }}>
          <table className="win-table">
            <thead><tr><th>م</th><th>الاسم</th><th>الهاتف</th><th>النوع</th><th>الرسالة</th><th>التاريخ</th><th>الحالة</th></tr></thead>
            <tbody>
              {tickets.map((ticket) => (
                <tr key={ticket.id}>
                  <td>{ticket.id}</td><td>{ticket.name}</td><td dir="ltr">{ticket.phone || "—"}</td><td>{ticket.subject}</td>
                  <td className="right">{ticket.message}</td><td>{dateTime(ticket.createdAt)}</td><td>{ticket.status}</td>
                </tr>
              ))}
              {tickets.length === 0 && <tr><td colSpan={7} className="empty-row">لا توجد طلبات دعم حتى الآن</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
