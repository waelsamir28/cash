"use client";

import { useState } from "react";
import { Check, Copy, KeyRound, MessageCircle } from "lucide-react";
import { api } from "@/lib/client-api";
import { shortDate } from "@/lib/format";
import { whatsappLink } from "@/lib/support";
import type { LicenseStatus } from "@/lib/license/types";

const STATE_LABEL: Record<LicenseStatus["state"], string> = {
  full: "مفعّل",
  trial: "نسخة تجريبية",
  expired: "منتهي",
  tampered: "يحتاج ضبط الجهاز",
};

/** بطاقة الترخيص: الحالة، كود الجهاز، إدخال كود التفعيل، وطلب الكود من الدعم. */
export default function LicenseCard({ license }: { license: LicenseStatus }) {
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const requestMessage = `السلام عليكم م. وائل، أرجو تزويدي بكود تفعيل برنامج الجمال.\nكود الجهاز: ${license.machineCode}`;

  const copyMachineCode = async () => {
    try {
      await navigator.clipboard.writeText(license.machineCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setError("تعذر النسخ تلقائياً، انسخ كود الجهاز يدوياً");
    }
  };

  const activate = async () => {
    if (!key.trim()) {
      setError("الصق كود التفعيل أولاً");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api("/api/license/activate", { method: "POST", body: JSON.stringify({ key }) });
      // إعادة التحميل تقرأ حالة الترخيص من جديد وتفتح البرنامج
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر تفعيل البرنامج");
      setBusy(false);
    }
  };

  return (
    <div className="license-card">
      <div className="license-status-row">
        <span className={`license-pill ${license.state}`}>{STATE_LABEL[license.state]}</span>
        {license.state === "trial" && (
          <span>متبقي {license.daysLeft} يوم — الأصناف المتاحة: {license.trialProductCount}</span>
        )}
        {license.state === "full" && license.expiresAt && <span>ينتهي في {shortDate(license.expiresAt)}</span>}
        {license.state === "full" && !license.expiresAt && <span>ترخيص دائم</span>}
        {license.licensee && <span>المرخّص له: {license.licensee}</span>}
      </div>
      <p className="license-message">{license.message}</p>

      <div className="machine-box">
        <span>كود الجهاز</span>
        <b>{license.machineCode}</b>
        <button className="btn small" onClick={() => void copyMachineCode()}>
          {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? "تم النسخ" : "نسخ"}
        </button>
      </div>

      <label className="label" htmlFor="license-key-input">كود التفعيل</label>
      <textarea
        id="license-key-input"
        className="field license-input"
        dir="ltr"
        value={key}
        placeholder="ALG1.xxxxxxxx.xxxxxxxx"
        onChange={(event) => setKey(event.target.value)}
      />
      <div className="license-actions">
        <button className="btn green" disabled={busy} onClick={() => void activate()}>
          <KeyRound size={15} /> {busy ? "جارٍ التفعيل..." : "تفعيل البرنامج"}
        </button>
        <a className="btn whatsapp-btn" href={whatsappLink(requestMessage)} target="_blank" rel="noreferrer">
          <MessageCircle size={15} /> اطلب كود التفعيل واتساب
        </a>
      </div>
      {error && <div className="inline-error" role="alert">{error}</div>}
    </div>
  );
}
