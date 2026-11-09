"use client";

import { useRef, useState } from "react";
import { Database, Download, Upload, ShieldCheck, RefreshCw } from "lucide-react";
import { api, downloadFile } from "@/lib/client-api";
import { shortDate } from "@/lib/format";
import type { Customer, Invoice, Product } from "@/lib/types";

type Props = {
  products: Product[];
  customers: Customer[];
  invoices: Invoice[];
  onRefresh: () => Promise<void> | void;
  onToast: (message: string, error?: boolean) => void;
};

export default function BackupScreen({ products, customers, invoices, onRefresh, onToast }: Props) {
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const exportBackup = async () => {
    setBusy(true);
    try {
      const data = await api<Record<string, unknown>>("/api/backup");
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
      downloadFile(`algamal-backup-${stamp}.json`, JSON.stringify(data, null, 2));
      onToast("تم إنشاء ملف النسخة الاحتياطية وتنزيله");
    } catch (error) {
      onToast(error instanceof Error ? error.message : "تعذر إنشاء النسخة", true);
    } finally { setBusy(false); }
  };

  const importBackup = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    try {
      const parsed = JSON.parse(await file.text()) as Record<string, unknown>;
      const result = await api<{ restored: { products: number; customers: number; settings: number } }>("/api/backup", {
        method: "POST",
        body: JSON.stringify(parsed),
      });
      onToast(`تمت الاستعادة: ${result.restored.products} صنف، ${result.restored.customers} عميل، ${result.restored.settings} إعداد`);
      await onRefresh();
    } catch (error) {
      onToast(error instanceof Error ? error.message : "ملف النسخة غير صالح", true);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div>
      <h2 className="page-title"><Database size={20} style={{ verticalAlign: "middle", marginLeft: 6 }} /> النسخ الاحتياطي واستعادة البيانات</h2>
      <p className="page-desc">إنشاء نسخة كاملة من قاعدة البيانات بصيغة JSON، واستعادة الأصناف والعملاء والإعدادات والثيمات والتخصيص.</p>

      <div className="stat-grid">
        <div className="stat-card"><div className="k">الأصناف</div><div className="v">{products.length}</div></div>
        <div className="stat-card"><div className="k">العملاء</div><div className="v">{customers.length}</div></div>
        <div className="stat-card"><div className="k">الفواتير</div><div className="v">{invoices.length}</div></div>
        <div className="stat-card"><div className="k">آخر فاتورة</div><div className="v" style={{ fontSize: 16 }}>{shortDate(invoices[0]?.createdAt) || "—"}</div></div>
      </div>

      <div className="two-col" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <div className="panel">
          <div className="panel-head"><span>إنشاء نسخة احتياطية</span><Download size={17} /></div>
          <div className="panel-body">
            <div className="info-box" style={{ marginBottom: 14 }}>
              يتم تصدير الأصناف، العملاء، الفواتير مع تفاصيلها، المدفوعات وتوزيعها على الفواتير، المجموعات والتصنيفات، الإعدادات، الثيمات، تصميم الفواتير، التخصيص، ورسائل الدعم الفني في ملف واحد بصيغة UTF-8.
            </div>
            <button className="btn green tall" disabled={busy} onClick={() => void exportBackup()}><Download size={17} /> تنزيل نسخة احتياطية كاملة</button>
            <button className="btn tall" style={{ marginRight: 8 }} onClick={() => void onRefresh()}><RefreshCw size={16} /> تحديث العدادات</button>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head"><span>استعادة نسخة سابقة</span><Upload size={17} /></div>
          <div className="panel-body">
            <div className="info-box" style={{ marginBottom: 14 }}>
              اختر ملف <b dir="ltr">algamal-backup-*.json</b>. سيتم تحديث الأصناف والعملاء المطابقين وإضافة الجديد دون حذف الفواتير الحالية.
            </div>
            <input ref={fileRef} type="file" accept="application/json,.json" className="field" style={{ width: "100%" }} onChange={(event) => void importBackup(event.target.files?.[0])} />
            <button className="btn blue tall" style={{ marginTop: 10 }} disabled={busy} onClick={() => fileRef.current?.click()}><Upload size={17} /> اختيار ملف واستعادة</button>
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 12 }}>
        <div className="panel-head"><span>خطة حماية البيانات</span><ShieldCheck size={17} /></div>
        <div className="panel-body">
          <div className="feature-list">
            <div><span>✔</span> احفظ نسخة يومية بعد إغلاق الوردية</div>
            <div><span>✔</span> احتفظ بنسخة خارجية على USB أو قرص سحابي</div>
            <div><span>✔</span> لا تحذف ملفات قاعدة البيانات يدوياً</div>
            <div><span>✔</span> اختبر الاستعادة على نسخة تجريبية بشكل دوري</div>
          </div>
        </div>
      </div>
    </div>
  );
}
