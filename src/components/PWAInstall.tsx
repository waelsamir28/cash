"use client";

import { useEffect, useState } from "react";
import { Download, X, MonitorDown, Smartphone } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function PWAInstall() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // لا تظهر لو مفتوح كـ PWA بالفعل
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || (window.navigator as unknown as { standalone?: boolean }).standalone;
    if (isStandalone) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      if (!localStorage.getItem("pwa-dismissed")) setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // لو المتصفح لا يدعم beforeinstallprompt (فايرفوكس/سفاري) أظهر زر يدوي بعد 3 ثواني
    const timer = setTimeout(() => {
      if (!deferred && !localStorage.getItem("pwa-dismissed") && !isStandalone) {
        // أظهر تلميح يدوي فقط على الديسك توب
        const isDesktop = window.innerWidth >= 900;
        if (isDesktop) setVisible(true);
      }
    }, 3500);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      clearTimeout(timer);
    };
  }, [deferred]);

  const install = async () => {
    if (deferred) {
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      if (outcome === "accepted") setVisible(false);
      setDeferred(null);
    } else {
      // تعليمات يدوية
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      if (isIOS) {
        alert("على الآيفون: اضغط زر المشاركة ⎙ ثم اختر 'إضافة إلى الشاشة الرئيسية'");
      } else {
        alert("اضغط ⋮ في المتصفح ثم اختر 'تثبيت التطبيق' أو 'Install app' — سيظهر أيقونة الجمال على سطح المكتب");
      }
    }
  };

  const dismiss = () => {
    localStorage.setItem("pwa-dismissed", "1");
    setDismissed(true);
    setVisible(false);
  };

  if (!visible || dismissed) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 18,
        insetInlineStart: 18,
        zIndex: 9999,
        background: "linear-gradient(135deg,#0b3c80 0%,#12346a 100%)",
        color: "#fff",
        borderRadius: 14,
        padding: "14px 16px",
        display: "flex",
        gap: 14,
        alignItems: "center",
        boxShadow: "0 12px 32px rgba(0,0,0,.35)",
        maxWidth: 420,
        border: "1px solid rgba(255,255,255,.15)",
      }}
      dir="rtl"
    >
      <span style={{ background: "#fff", color: "#0b3c80", borderRadius: 10, width: 42, height: 42, display: "grid", placeItems: "center", flexShrink: 0 }}>
        <MonitorDown size={22} />
      </span>
      <div style={{ flex: 1, lineHeight: 1.5 }}>
        <b style={{ display: "block", fontSize: 13 }}>ثبّت برنامج الجمال على الكمبيوتر</b>
        <span style={{ fontSize: 11, opacity: 0.9 }}>يشتغل كأنه برنامج ويندوز — أيقونة على سطح المكتب ويفتح بدون متصفح</span>
      </div>
      <button
        onClick={() => void install()}
        style={{ background: "#fff", color: "#0b3c80", border: 0, borderRadius: 10, padding: "8px 14px", fontWeight: 900, fontSize: 13, cursor: "pointer", display: "flex", gap: 6, alignItems: "center", whiteSpace: "nowrap" }}
      >
        <Download size={14} /> تثبيت الآن
      </button>
      <button onClick={dismiss} aria-label="إخفاء" style={{ background: "rgba(255,255,255,.15)", border: 0, color: "#fff", borderRadius: 8, width: 28, height: 28, display: "grid", placeItems: "center", cursor: "pointer" }}>
        <X size={14} />
      </button>
    </div>
  );
}
