"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import { Camera, CameraOff, CheckCircle2, Keyboard, ScanLine, Send, TriangleAlert, XCircle } from "lucide-react";
import { playSelectSound } from "@/lib/sound";
import { fmt } from "@/lib/format";

type PushResponse = {
  ok?: boolean;
  duplicate?: boolean;
  found?: boolean;
  blocked?: boolean;
  product?: { id: number; name: string; salePrice: number; unit: string; quantity: number } | null;
  error?: string;
};

type Feedback = { tone: "ok" | "warn" | "bad"; title: string; detail: string; at: number };

/** صفحة الماسح على الموبايل: كاميرا الموبايل تقرأ الباركود وترسله لبرنامج الكمبيوتر فوراً. */
export default function MobileScanner() {
  const [token, setToken] = useState<string | null>(null);
  const [camera, setCamera] = useState<"idle" | "starting" | "on" | "error">("idle");
  const [cameraError, setCameraError] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [manual, setManual] = useState("");
  const [sent, setSent] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const tokenRef = useRef("");
  const lastRef = useRef({ code: "", at: 0 });

  useEffect(() => {
    const timer = setTimeout(() => {
      const value = new URLSearchParams(window.location.search).get("t") ?? "";
      tokenRef.current = value;
      setToken(value);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    return () => {
      controlsRef.current?.stop();
    };
  }, []);

  const send = async (raw: string) => {
    const code = raw.trim();
    if (!code) return;
    const now = Date.now();
    if (code === lastRef.current.code && now - lastRef.current.at < 1500) return;
    lastRef.current = { code, at: now };

    try {
      const response = await fetch("/api/scan/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: tokenRef.current, code }),
      });
      const data = (await response.json()) as PushResponse;
      if (!response.ok) {
        setFeedback({ tone: "bad", title: "تعذر الإرسال", detail: data.error ?? "حدث خطأ غير متوقع", at: now });
        return;
      }
      setSent((count) => count + 1);
      playSelectSound();
      if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(60);

      if (data.found && data.product) {
        setFeedback({
          tone: "ok",
          title: data.product.name,
          detail: `${fmt(data.product.salePrice, 2)} ج.م · متوفر ${fmt(data.product.quantity, 0)} ${data.product.unit}`,
          at: now,
        });
      } else if (data.blocked) {
        setFeedback({ tone: "warn", title: "غير متاح في النسخة التجريبية", detail: code, at: now });
      } else {
        setFeedback({ tone: "bad", title: "الصنف غير موجود", detail: code, at: now });
      }
    } catch {
      setFeedback({ tone: "bad", title: "انقطع الاتصال بالكمبيوتر", detail: "تأكد أن الموبايل والكمبيوتر على نفس الواي فاي", at: now });
    }
  };

  const startCamera = async () => {
    if (!videoRef.current) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setCamera("error");
      setCameraError("المتصفح يحتاج اتصالاً آمناً لتشغيل الكاميرا. من شاشة الربط على الكمبيوتر افتح الرابط، واقبل تحذير الأمان مرة واحدة، أو اكتب الكود يدوياً بالأسفل.");
      return;
    }
    setCamera("starting");
    setCameraError("");
    try {
      const reader = new BrowserMultiFormatReader();
      controlsRef.current = await reader.decodeFromConstraints(
        { video: { facingMode: { ideal: "environment" } }, audio: false },
        videoRef.current,
        (result) => {
          if (result) void send(result.getText());
        },
      );
      setCamera("on");
    } catch (error) {
      setCamera("error");
      const denied = error instanceof Error && (error.name === "NotAllowedError" || error.name === "SecurityError");
      setCameraError(denied
        ? "تم رفض إذن الكاميرا. اسمح للمتصفح بالكاميرا من إعدادات الموقع ثم حاول مرة أخرى."
        : "تعذر فتح الكاميرا. أغلق التطبيقات الأخرى التي تستخدمها ثم حاول مرة أخرى.");
    }
  };

  const stopCamera = () => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setCamera("idle");
  };

  const submitManual = () => {
    void send(manual);
    setManual("");
  };

  const tokenMissing = token !== null && token === "";

  return (
    <div className="scan-page" dir="rtl">
      <header className="scan-header">
        <div className="scan-brand"><ScanLine size={22} /> ماسح الجمال</div>
        <span className="scan-count">تم إرسال {sent}</span>
      </header>

      {tokenMissing && (
        <div className="scan-alert" role="alert">
          <TriangleAlert size={18} /> الرابط غير مكتمل. امسح الكود من جديد من شاشة الكمبيوتر.
        </div>
      )}

      <section className="scan-camera-card">
        <div className={`scan-camera ${camera === "on" ? "live" : ""}`}>
          <video ref={videoRef} playsInline muted autoPlay className="scan-video" />
          {camera !== "on" && (
            <div className="scan-camera-placeholder">
              <Camera size={46} />
              <span>{camera === "starting" ? "جارٍ تشغيل الكاميرا…" : "الكاميرا متوقفة"}</span>
            </div>
          )}
          {camera === "on" && <div className="scan-frame" aria-hidden><span /></div>}
        </div>

        <div className="scan-camera-actions">
          {camera !== "on" ? (
            <button className="scan-btn primary" onClick={() => void startCamera()} disabled={camera === "starting" || tokenMissing}>
              <Camera size={18} /> تشغيل الكاميرا
            </button>
          ) : (
            <button className="scan-btn ghost" onClick={stopCamera}>
              <CameraOff size={18} /> إيقاف الكاميرا
            </button>
          )}
        </div>
        {cameraError && <div className="scan-alert" role="alert"><TriangleAlert size={18} /> {cameraError}</div>}
      </section>

      {feedback && (
        <section className={`scan-feedback ${feedback.tone}`} role="status" key={feedback.at}>
          {feedback.tone === "ok" ? <CheckCircle2 size={34} /> : feedback.tone === "warn" ? <TriangleAlert size={34} /> : <XCircle size={34} />}
          <div>
            <b>{feedback.title}</b>
            <span dir="ltr">{feedback.detail}</span>
          </div>
        </section>
      )}

      <section className="scan-manual">
        <label className="scan-label" htmlFor="scan-manual-input"><Keyboard size={16} /> أو اكتب الكود يدوياً</label>
        <div className="scan-manual-row">
          <input
            id="scan-manual-input"
            dir="ltr"
            inputMode="text"
            autoCapitalize="characters"
            value={manual}
            placeholder="الباركود أو كود الصنف"
            onChange={(event) => setManual(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") submitManual();
            }}
          />
          <button className="scan-btn primary" onClick={submitManual} disabled={!manual.trim() || tokenMissing} aria-label="إرسال">
            <Send size={18} />
          </button>
        </div>
      </section>

      <footer className="scan-footer">امسح الصنف، يظهر سعره ويضاف للفاتورة على الكمبيوتر تلقائياً</footer>
    </div>
  );
}
