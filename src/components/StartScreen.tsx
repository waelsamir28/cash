"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, BarChart3, Barcode, Boxes, LogOut, ReceiptText, Sparkles, UserRound } from "lucide-react";
import SupportBar from "@/components/SupportBar";
import type { LicenseStatus } from "@/lib/license/types";

type Props = {
  license: LicenseStatus;
  onEnter: (name: string) => void;
  onExit: () => void;
};

const FEATURES = [
  { icon: Barcode, label: "بيع بالباركود" },
  { icon: ReceiptText, label: "فواتير وطباعة" },
  { icon: Boxes, label: "أصناف ومخازن" },
  { icon: BarChart3, label: "تقارير وأقساط" },
];

function formatDate(date: Date): string {
  return date.toLocaleDateString("ar-EG", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
}

/** شاشة البداية: دخول بالاسم فقط، تصميم زجاجي حديث، ورسالة ترحيب تظهر في المنتصف قبل الدخول. */
export default function StartScreen({ license, onEnter, onExit }: Props) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [welcome, setWelcome] = useState<string | null>(null);
  const [now, setNow] = useState<Date | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const first = setTimeout(() => setNow(new Date()), 0);
    const interval = setInterval(() => setNow(new Date()), 30_000);
    return () => {
      clearTimeout(first);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const enter = () => {
    if (welcome) return;
    const clean = name.trim().replace(/\s+/g, " ");
    if (clean.length < 2) {
      setError("اكتب اسمك للدخول (حرفين على الأقل)");
      return;
    }
    if (clean.length > 40) {
      setError("الاسم طويل جداً (40 حرفاً كحد أقصى)");
      return;
    }
    setError("");
    setWelcome(clean);
    timer.current = setTimeout(() => onEnter(clean), 2400);
  };

  return (
    <div className="start-root" dir="rtl">
      <div className="start-bg" aria-hidden>
        <span className="start-orb orb-a" />
        <span className="start-orb orb-b" />
        <span className="start-orb orb-c" />
        <span className="start-grid" />
      </div>

      <header className="start-topbar">
        <span className="start-chip"><span className="start-live" />{now ? `${formatDate(now)} · ${formatTime(now)}` : "\u00a0"}</span>
        <span className="start-chip">الإصدار 2.1.0</span>
      </header>

      <main className="start-main">
        <section className="start-card" aria-label="تسجيل الدخول">
          <div className="start-logo-wrap">
            <span className="start-logo-ring" />
            <img className="start-logo" src="/images/app-icon.png" alt="شعار برنامج الجمال" />
          </div>
          <h1 className="start-brand">برنامج الجمال</h1>
          <p className="start-tagline">للأدوات المدرسية والمكتبية</p>

          <label className="start-label" htmlFor="start-name">اكتب اسمك للدخول</label>
          <div className={`start-input ${error ? "has-error" : ""}`}>
            <UserRound size={21} />
            <input
              id="start-name"
              autoFocus
              value={name}
              maxLength={60}
              disabled={Boolean(welcome)}
              placeholder="مثال: أحمد علي"
              onChange={(event) => {
                setName(event.target.value);
                if (error) setError("");
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") enter();
              }}
            />
          </div>
          {error && <div className="start-error" role="alert">{error}</div>}

          <button className="start-enter" onClick={enter} disabled={Boolean(welcome)}>
            <span>دخول إلى البرنامج</span>
            <ArrowLeft size={20} />
          </button>
          <button className="start-exit" onClick={onExit}>
            <LogOut size={16} /> خروج
          </button>

          {license.state === "trial" && (
            <div className="start-trial">نسخة تجريبية — متبقي {license.daysLeft} يوم</div>
          )}
        </section>

        <ul className="start-features" aria-label="مميزات البرنامج">
          {FEATURES.map(({ icon: Icon, label }) => (
            <li key={label}><Icon size={18} /> {label}</li>
          ))}
        </ul>
      </main>

      {welcome && (
        <div className="start-welcome" role="status" aria-live="polite">
          <div className="start-welcome-icon"><Sparkles size={28} /></div>
          <div className="start-welcome-hello">أهلاً وسهلاً</div>
          <div className="start-welcome-name">{welcome}</div>
          <div className="start-welcome-sub">نتمنى لك يوم عمل موفق</div>
        </div>
      )}

      <SupportBar />
    </div>
  );
}
