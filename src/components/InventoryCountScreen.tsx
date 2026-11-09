"use client";

import { useCallback, useEffect, useState } from "react";
import { Barcode, CheckCircle, ClipboardList, Package, Plus, ScanLine, Trash2, XCircle } from "lucide-react";
import { api } from "@/lib/client-api";
import { fmt } from "@/lib/format";
import type { InventoryCount } from "@/lib/types";

type Props = {
  onToast: (msg: string, error?: boolean) => void;
};

export default function InventoryCountScreen({ onToast }: Props) {
  const [counts, setCounts] = useState<InventoryCount[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [scanCode, setScanCode] = useState("");
  const [scanQty, setScanQty] = useState("1");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api<{ counts: InventoryCount[] }>("/api/inventory-counts");
      setCounts(data.counts);
      if (activeId === null && data.counts.length > 0) {
        const open = data.counts.find((c) => c.status === "جارية");
        if (open) setActiveId(open.id);
      }
    } catch (e) {
      onToast(e instanceof Error ? e.message : "تعذر تحميل الجرد", true);
    }
  }, [onToast, activeId]);

  useEffect(() => {
    void load();
  }, [load]);

  const active = counts.find((c) => c.id === activeId) || null;

  const createCount = async () => {
    if (!title.trim()) return onToast("اكتب عنوان الجرد", true);
    setBusy(true);
    try {
      const data = await api<{ count: InventoryCount }>("/api/inventory-counts", { method: "POST", body: JSON.stringify({ title }) });
      onToast("تم إنشاء عملية جرد جديدة");
      setTitle("");
      await load();
      setActiveId(data.count.id);
    } catch (e) {
      onToast(e instanceof Error ? e.message : "تعذر الإنشاء", true);
    } finally {
      setBusy(false);
    }
  };

  const scan = async () => {
    if (!activeId) return onToast("اختر عملية جرد أولاً", true);
    if (!scanCode.trim()) return onToast("اكتب كود الصنف أو امسحه", true);
    try {
      await api("/api/inventory-counts", {
        method: "PATCH",
        body: JSON.stringify({ id: activeId, action: "scan", productCode: scanCode.trim(), quantity: Number(scanQty) || 1 }),
      });
      onToast(`تم تسجيل ${scanCode}`);
      setScanCode("");
      await load();
    } catch (e) {
      onToast(e instanceof Error ? e.message : "الصنف غير موجود", true);
    }
  };

  const finish = async () => {
    if (!activeId) return;
    if (!confirm("إنهاء الجرد واستخراج تقرير الفروقات؟")) return;
    try {
      await api("/api/inventory-counts", { method: "PATCH", body: JSON.stringify({ id: activeId, status: "مكتملة" }) });
      onToast("تم إنهاء الجرد ✅");
      await load();
    } catch (e) {
      onToast(e instanceof Error ? e.message : "تعذر الإنهاء", true);
    }
  };

  const deleteCount = async (id: number) => {
    if (!confirm("حذف عملية الجرد؟")) return;
    try {
      await api(`/api/inventory-counts?id=${id}`, { method: "DELETE" });
      onToast("تم حذف الجرد");
      if (activeId === id) setActiveId(null);
      await load();
    } catch (e) {
      onToast(e instanceof Error ? e.message : "تعذر الحذف", true);
    }
  };

  return (
    <div>
      <h2 className="page-title">
        <ClipboardList size={20} style={{ verticalAlign: "middle", marginLeft: 6 }} /> الجرد بالباركود — بالموبايل
      </h2>
      <p className="page-desc">استخدم موبايلك كماسح باركود للجرد: افتح الجرد على الكمبيوتر، وامسح الأصناف من الموبايل — الفروقات تُحسب تلقائياً.</p>

      <div className="two-col" style={{ gridTemplateColumns: "320px 1fr", gap: 12 }}>
        <div>
          <div className="panel">
            <div className="panel-head">
              <span>إنشاء جرد جديد</span>
              <Plus size={14} />
            </div>
            <div className="panel-body">
              <label className="label">عنوان الجرد</label>
              <input className="field" style={{ width: "100%", marginBottom: 8 }} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثال: جرد مخزن الأدوات - نوفمبر" />
              <button className="btn green" disabled={busy} onClick={() => void createCount()} style={{ width: "100%" }}>
                <Plus size={14} /> بدء جرد جديد
              </button>
            </div>
          </div>

          <div className="panel" style={{ marginTop: 12 }}>
            <div className="panel-head">
              <span>قائمة الجرد</span>
              <span className="head-chip">{counts.length}</span>
            </div>
            <div style={{ maxHeight: 360, overflow: "auto" }}>
              {counts.map((c) => (
                <div
                  key={c.id}
                  onClick={() => setActiveId(c.id)}
                  style={{
                    padding: "10px 12px",
                    borderBottom: "1px solid #e1eaf3",
                    cursor: "pointer",
                    background: activeId === c.id ? "#e6f2ff" : "#fff",
                    borderRight: activeId === c.id ? "4px solid #0b4c9e" : "4px solid transparent",
                  }}
                >
                  <div style={{ fontWeight: 900, fontSize: 13, color: "#0b3c80" }}>{c.title}</div>
                  <div style={{ fontSize: 11, color: "#6b7e93", display: "flex", justifyContent: "space-between" }}>
                    <span>{c.countNo}</span>
                    <span style={{ color: c.status === "جارية" ? "#d98213" : c.status === "مكتملة" ? "#128349" : "#6b7280", fontWeight: 800 }}>{c.status}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "#334e6c", marginTop: 4 }}>
                    الأصناف: {c.items?.length ?? 0} • الفروقات: {c.totalVariance}
                  </div>
                </div>
              ))}
              {counts.length === 0 && <div className="empty-row">لا توجد عمليات جرد</div>}
            </div>
          </div>
        </div>

        <div className="panel">
          {!active ? (
            <div className="panel-body" style={{ textAlign: "center", padding: 40 }}>
              <ClipboardList size={40} color="#9fb6cd" />
              <div style={{ fontWeight: 900, marginTop: 10 }}>اختر عملية جرد أو أنشئ واحدة جديدة</div>
              <div style={{ fontSize: 12, color: "#6b7e93", marginTop: 6 }}>بعد فتح الجرد يمكنك المسح من الكمبيوتر أو مباشرة من الموبايل عبر ربط الموبايل.</div>
              <div className="info-box" style={{ marginTop: 14, textAlign: "right" }}>
                <b>الجرد بالموبايل:</b> من أعلى الشاشة اضغط <b>ربط الموبايل</b> → امسح QR → افتح <code>/scan/inventory</code> على الموبايل → اختر الجرد النشط → امسح الأصناف.
              </div>
            </div>
          ) : (
            <>
              <div className="panel-head">
                <span>
                  {active.title} — {active.countNo}
                </span>
                <span className="head-chip" style={{ background: active.status === "جارية" ? "#fff3d6" : "#e2f6e8", color: active.status === "جارية" ? "#7a4b05" : "#128349" }}>
                  {active.status}
                </span>
              </div>
              <div className="panel-body">
                {active.status === "جارية" && (
                  <div style={{ display: "flex", gap: 8, alignItems: "end", marginBottom: 12, flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 160 }}>
                      <label className="label">كود الصنف / الباركود</label>
                      <input
                        className="field"
                        style={{ width: "100%" }}
                        value={scanCode}
                        onChange={(e) => setScanCode(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && void scan()}
                        placeholder="امسح أو اكتب الكود ثم Enter"
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="label">الكمية</label>
                      <input className="field" type="number" style={{ width: 80, textAlign: "center" }} value={scanQty} onChange={(e) => setScanQty(e.target.value)} />
                    </div>
                    <button className="btn blue" onClick={() => void scan()}>
                      <ScanLine size={14} /> تسجيل
                    </button>
                    <button className="btn green" onClick={() => void finish()}>
                      <CheckCircle size={14} /> إنهاء الجرد
                    </button>
                    <button className="btn red small" onClick={() => void deleteCount(active.id)}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                )}

                <div className="table-wrap" style={{ maxHeight: 380 }}>
                  <table className="win-table">
                    <thead>
                      <tr>
                        <th>الصنف</th>
                        <th>النظام</th>
                        <th>المعدود</th>
                        <th>الفرق</th>
                        <th>الحالة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(active.items || []).map((it) => {
                        const variance = Number(it.variance) || 0;
                        return (
                          <tr key={it.id} style={variance !== 0 ? { background: variance < 0 ? "#fff0f0" : "#fff8e8" } : {}}>
                            <td className="right">
                              {it.productName}
                              <br />
                              <small>{it.productCode}</small>
                            </td>
                            <td>{fmt(it.systemQuantity, 0)}</td>
                            <td>
                              <b>{fmt(it.countedQuantity, 0)}</b>
                            </td>
                            <td style={{ color: variance === 0 ? "#128349" : variance < 0 ? "#c01212" : "#d98213", fontWeight: 900 }}>{variance > 0 ? `+${variance}` : variance}</td>
                            <td>{variance === 0 ? <CheckCircle size={14} color="#128349" /> : <XCircle size={14} color="#c01212" />}</td>
                          </tr>
                        );
                      })}
                      {(active.items || []).length === 0 && (
                        <tr>
                          <td colSpan={5} className="empty-row">
                            لم يتم مسح أي صنف بعد — ابدأ المسح الآن
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {active.status === "مكتملة" && (
                  <div className="info-box" style={{ marginTop: 12 }}>
                    تم إنهاء الجرد. الفروقات: {active.totalVariance} صنف. يمكنك مراجعة التقرير وتصحيح المخزون يدوياً من شاشة المخازن.
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
