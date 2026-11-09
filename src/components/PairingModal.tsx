"use client";
/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import { Check, Copy, Smartphone, StopCircle, TriangleAlert, Wifi, X } from "lucide-react";

export type ScanSession = {
  enabled: boolean;
  reason: string;
  ips: string[];
  port: number | null;
  urls: string[];
  primaryUrl: string | null;
  qr: string | null;
  linked: boolean;
  lastPhoneAt: number;
  lastId: number;
};

type Props = {
  session: ScanSession | null;
  receiving: boolean;
  linked: boolean;
  onClose: () => void;
  onRotate: () => void;
  onStop: () => void;
};

/** نافذة ربط الموبايل: QR يفتح صفحة الماسح على الموبايل، مع حالة الاتصال والتعليمات. */
export default function PairingModal({ session, receiving, linked, onClose, onRotate, onStop }: Props) {
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    if (!session?.primaryUrl) return;
    try {
      await navigator.clipboard.writeText(session.primaryUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  const confirmRotate = () => {
    if (window.confirm("إلغاء الربط سيفصل أي موبايل مربوط حالياً، وستحتاج لمسح الكود الجديد. متابعة؟")) onRotate();
  };

  const status = !receiving
    ? { tone: "idle", text: "الاستقبال متوقف" }
    : linked
      ? { tone: "ok", text: "الموبايل متصل ✔ امسح أي صنف وسيظهر في الفاتورة" }
      : { tone: "wait", text: "في انتظار مسح الكود من الموبايل…" };

  return (
    <div className="price-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="pairing-modal" role="dialog" aria-modal="true" aria-label="ربط الموبايل ككاميرا باركود">
        <div className="pairing-head">
          <span><Smartphone size={18} /> ربط الموبايل كماسح باركود</span>
          <button className="btn small" onClick={onClose} aria-label="إغلاق"><X size={15} /></button>
        </div>

        {!session && <div className="pairing-loading">جارٍ تجهيز الربط…</div>}

        {session && !session.enabled && (
          <div className="pairing-disabled"><TriangleAlert size={34} /><b>{session.reason}</b></div>
        )}

        {session && session.enabled && (
          <div className="pairing-body">
            <div className="pairing-qr-card">
              {session.qr ? <img src={session.qr} alt="رمز QR للربط مع الموبايل" className="pairing-qr" /> : (
                <div className="pairing-qr-missing"><Wifi size={36} /> {session.reason || "لا يوجد اتصال شبكة"}</div>
              )}
              <span className="pairing-qr-hint">افتح الكاميرا العادية في الموبايل ووجّهها على الكود</span>
            </div>

            <div className="pairing-info">
              <div className={`pairing-status ${status.tone}`}>
                <span className="pairing-dot" /> {status.text}
              </div>

              <ol className="pairing-steps">
                <li>وصّل الموبايل بنفس شبكة الواي فاي التي عليها الكمبيوتر.</li>
                <li>افتح الكاميرا على الموبايل واسكان كود QR.</li>
                <li>أول مرة هيظهر تحذير &quot;الاتصال غير آمن&quot;: اضغط <b>متقدم</b> ثم <b>متابعة</b> (ده طبيعي للشبكة المحلية).</li>
                <li>اسمح للمتصفح باستخدام الكاميرا، واضغط <b>تشغيل الكاميرا</b>.</li>
              </ol>

              {session.primaryUrl && (
                <div className="pairing-url">
                  <code dir="ltr">{session.primaryUrl}</code>
                  <button className="btn small" onClick={() => void copyLink()}>
                    {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? "تم النسخ" : "نسخ"}
                  </button>
                </div>
              )}
              {session.ips.length > 1 && (
                <div className="pairing-note">عناوين أخرى للكمبيوتر: {session.ips.slice(1).join("، ")}</div>
              )}
            </div>
          </div>
        )}

        <div className="pairing-foot">
          {session?.enabled && (
            <>
              <button className="btn" onClick={confirmRotate}><TriangleAlert size={14} /> إلغاء الربط القديم</button>
              {receiving && <button className="btn red" onClick={onStop}><StopCircle size={14} /> إيقاف الاستقبال</button>}
            </>
          )}
          <span style={{ flex: 1 }} />
          <button className="btn" onClick={onClose}>إغلاق</button>
        </div>
      </div>
    </div>
  );
}
