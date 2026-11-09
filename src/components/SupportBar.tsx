"use client";

import { MessageCircle } from "lucide-react";
import { SUPPORT, whatsappLink } from "@/lib/support";

/** الشريط الإعلاني السفلي في شاشات الدخول والتفعيل. الضغط على الرقم يفتح واتساب مباشرة. */
export default function SupportBar() {
  return (
    <footer className="gate-ad">
      <div className="gate-ad-text">
        <span className="gate-ad-tag">الدعم الفني والتفعيل</span>
        <b>{SUPPORT.name}</b>
        <span>{SUPPORT.title}</span>
      </div>
      <a
        className="gate-ad-cta"
        href={whatsappLink("السلام عليكم م. وائل، محتاج مساعدة في برنامج الجمال.")}
        target="_blank"
        rel="noreferrer"
      >
        <MessageCircle size={22} />
        <span className="gate-ad-phone" dir="ltr">{SUPPORT.phone}</span>
        <small>واتساب</small>
      </a>
    </footer>
  );
}
