"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/client-api";
import { Barcode, ScanLine, CheckCircle } from "lucide-react";

type CountOpt = { id: number; title: string; status: string };

export default function InventoryScanPage() {
  const [counts, setCounts] = useState<CountOpt[]>([]);
  const [selected, setSelected] = useState<number | "">("");
  const [code, setCode] = useState("");
  const [qty, setQty] = useState("1");
  const [msg, setMsg] = useState("");

  const load = async () => {
    try {
      const data = await api<{ counts: Array<{ id: number; title: string; status: string }> }>("/api/inventory-counts");
      setCounts(data.counts.filter((c) => c.status === "جارية"));
      if (!selected && data.counts.find((c) => c.status === "جارية")) setSelected(data.counts.find((c) => c.status === "جارية")!.id);
    } catch {}
  };
  useEffect(() => { void load(); }, []);

  const scan = async () => {
    if (!selected) { setMsg("اختر عملية الجرد أولا"); return; }
    if (!code.trim()) { setMsg("اكتب الكود"); return; }
    try {
      await api("/api/inventory-counts", { method: "PATCH", body: JSON.stringify({ id: selected, action: "scan", productCode: code.trim(), quantity: Number(qty) || 1 }) });
      setMsg(`تم تسجيل ${code} ✅`);
      setCode("");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "خطأ");
    }
  };

  return (
    <div style={{ maxWidth: 500, margin: "20px auto", padding: 16, fontFamily: "Tahoma, sans-serif", direction: "rtl" }}>
      <h2 style={{ fontWeight: 900, color: "#0b4b9e" }}><ScanLine size={20} style={{ verticalAlign: "middle", marginLeft: 6 }} /> جرد بالباركود - الموبايل</h2>
      <p style={{ fontSize: 12, color: "#6b7e93" }}>امسح الأصناف من هنا وسيتم تسجيلها فورا في الجرد النشط على الكمبيوتر.</p>
      <label style={{ fontWeight: 900, fontSize: 13 }}>اختر عملية الجرد</label>
      <select value={selected} onChange={(e) => setSelected(e.target.value ? Number(e.target.value) : "")} style={{ width: "100%", padding: 8, marginBottom: 12, borderRadius: 8, border: "1px solid #ccc" }}>
        <option value="">-- اختر --</option>
        {counts.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
      </select>
      <label style={{ fontWeight: 900, fontSize: 13 }}>كود الصنف</label>
      <input value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void scan()} placeholder="امسح الباركود هنا" style={{ width: "100%", padding: 10, borderRadius: 8, border: "2px solid #0b4b9e", fontSize: 18, textAlign: "center" }} autoFocus />
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <input type="number" value={qty} onChange={(e) => setQty(e.target.value)} style={{ width: 80, textAlign: "center", padding: 8, borderRadius: 8, border: "1px solid #ccc" }} />
        <button onClick={() => void scan()} style={{ flex: 1, background: "#0b4b9e", color: "#fff", border: 0, borderRadius: 8, fontWeight: 900, padding: 10 }}><Barcode size={16} /> تسجيل</button>
      </div>
      {msg && <div style={{ marginTop: 12, padding: 10, background: msg.includes("✅") ? "#e2f6e8" : "#fff3d6", borderRadius: 8, fontWeight: 800 }}>{msg}</div>}
      <div style={{ marginTop: 16, fontSize: 11, color: "#6b7e93" }}>نصيحة: استخدم كاميرا الموبايل للمسح السريع أو لوحة مفاتيح الباركود.</div>
    </div>
  );
}
