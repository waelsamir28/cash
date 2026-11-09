"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { Barcode, CheckSquare, Printer, Search, Square, Tags } from "lucide-react";
import { fmt } from "@/lib/format";
import type { Product, StoreSettings } from "@/lib/types";
import BarcodeSvg from "@/components/BarcodeSvg";
import AppSelect from "@/components/AppSelect";

type Props = {
  products: Product[];
  settings: StoreSettings;
  onToast: (message: string, error?: boolean) => void;
};

const SIZES = [
  { key: "38x25", label: "38 × 25 مم", width: 38, height: 25, columns: 5 },
  { key: "50x30", label: "50 × 30 مم", width: 50, height: 30, columns: 4 },
  { key: "60x40", label: "60 × 40 مم", width: 60, height: 40, columns: 3 },
];

export default function BarcodeLabelsScreen({ products, settings, onToast }: Props) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Record<number, number>>({});
  const [sizeKey, setSizeKey] = useState("50x30");
  const [defaultCopies, setDefaultCopies] = useState("1");
  const [showPrice, setShowPrice] = useState(true);
  const [showStore, setShowStore] = useState(true);
  const size = SIZES.find((item) => item.key === sizeKey) ?? SIZES[1];
  const filtered = useMemo(() => products.filter((product) => {
    const q = query.trim().toLowerCase();
    return !q || [product.name, product.code, product.barcode, product.category].some((value) => value.toLowerCase().includes(q));
  }), [products, query]);
  const labels = useMemo(() => products.flatMap((product) => Array.from({ length: selected[product.id] ?? 0 }, (_, index) => ({ product, index }))), [products, selected]);

  const toggle = (id: number) => setSelected((current) => {
    const next = { ...current };
    if (next[id]) delete next[id];
    else next[id] = Math.max(1, Number(defaultCopies) || 1);
    return next;
  });
  const setCopies = (id: number, value: string) => setSelected((current) => ({ ...current, [id]: Math.max(0, Math.min(200, Number(value) || 0)) }));
  const selectAll = () => setSelected(Object.fromEntries(filtered.map((product) => [product.id, Math.max(1, Number(defaultCopies) || 1)])));
  const clear = () => setSelected({});
  const print = () => {
    if (labels.length === 0) { onToast("اختر صنفاً واحداً على الأقل للطباعة", true); return; }
    document.body.classList.add("print-labels");
    window.print();
    setTimeout(() => document.body.classList.remove("print-labels"), 900);
  };

  return (
    <div className="labels-screen">
      <h2 className="page-title"><Barcode size={21} style={{ verticalAlign: "middle", marginLeft: 6 }} /> ملصقات الباركود</h2>
      <p className="page-desc">اختر الأصناف والكميات، عاين الملصقات، ثم اطبعها على ورق ملصقات A4 أو طابعة ملصقات.</p>

      <div className="two-col labels-layout labels-no-print" style={{ gridTemplateColumns: "360px 1fr" }}>
        <div className="panel">
          <div className="panel-head"><span>إعدادات الملصق</span><Tags size={16} /></div>
          <div className="panel-body">
            <label className="label">مقاس الملصق</label>
            <AppSelect value={sizeKey} onChange={setSizeKey} options={SIZES.map((item) => ({ value: item.key, label: item.label }))} />
            <div className="form-grid" style={{ marginTop: 10 }}>
              <div><label className="label">الكمية الافتراضية</label><input type="number" min="1" max="200" className="field" style={{ width: "100%" }} value={defaultCopies} onChange={(event) => setDefaultCopies(event.target.value)} /></div>
              <div><label className="label">عدد الملصقات</label><input className="field readonly" style={{ width: "100%" }} readOnly value={labels.length} /></div>
            </div>
            <div className="flag-grid" style={{ marginTop: 10 }}>
              <label className="module-row"><span>إظهار السعر</span><input type="checkbox" checked={showPrice} onChange={() => setShowPrice(!showPrice)} /></label>
              <label className="module-row"><span>إظهار اسم المحل</span><input type="checkbox" checked={showStore} onChange={() => setShowStore(!showStore)} /></label>
            </div>
            <div style={{ display: "flex", gap: 7, marginTop: 12, flexWrap: "wrap" }}>
              <button className="btn" onClick={selectAll}><CheckSquare size={14} /> تحديد النتائج</button>
              <button className="btn" onClick={clear}><Square size={14} /> مسح التحديد</button>
              <button className="btn green" onClick={print}><Printer size={15} /> طباعة الملصقات</button>
            </div>
            <div className="info-box" style={{ marginTop: 12 }}>الباركود من نوع CODE128 وقابل للمسح بقارئ الباركود. اضبط مقاس الورق في نافذة الطباعة على A4 بدون هوامش كبيرة للحصول على أفضل نتيجة.</div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head"><span>اختر الأصناف</span><div className="field-row"><Search size={14} /><input placeholder="بحث..." value={query} onChange={(event) => setQuery(event.target.value)} style={{ width: 190 }} /></div></div>
          <div className="table-wrap" style={{ maxHeight: 330 }}>
            <table className="win-table"><thead><tr><th>تحديد</th><th>الكود</th><th>الصنف</th><th>الباركود</th><th>السعر</th><th>عدد النسخ</th></tr></thead><tbody>
              {filtered.map((product) => (
                <tr key={product.id} className={selected[product.id] ? "selected" : ""}>
                  <td><input type="checkbox" checked={Boolean(selected[product.id])} onChange={() => toggle(product.id)} /></td>
                  <td>{product.code}</td><td className="right">{product.name}</td><td dir="ltr">{product.barcode || product.code}</td><td>{fmt(product.salePrice, 2)}</td>
                  <td><input type="number" min="0" max="200" style={{ width: 65 }} value={selected[product.id] ?? 0} onChange={(event) => setCopies(product.id, event.target.value)} /></td>
                </tr>
              ))}
            </tbody></table>
          </div>
        </div>
      </div>

      <div className="panel labels-print-area" style={{ marginTop: 12 }}>
        <div className="panel-head labels-no-print"><span>معاينة الملصقات — {labels.length} ملصق</span><span className="head-chip">{size.label}</span></div>
        <div className="labels-sheet" style={{ "--label-w": `${size.width}mm`, "--label-h": `${size.height}mm`, "--label-columns": size.columns } as CSSProperties}>
          {labels.map(({ product, index }) => (
            <div className="barcode-label" key={`${product.id}-${index}`}>
              {showStore && <div className="barcode-label-store">{settings.storeName}</div>}
              <div className="barcode-label-name">{product.name}</div>
              <BarcodeSvg value={product.barcode || product.code} height={size.height >= 40 ? 34 : 24} width={size.width >= 60 ? 1.5 : 1.2} fontSize={10} />
              {showPrice && <div className="barcode-label-price">{fmt(product.salePrice, 2)} {settings.currency}</div>}
            </div>
          ))}
          {labels.length === 0 && <div className="empty-row labels-no-print">اختر أصنافاً من القائمة لعرض المعاينة هنا</div>}
        </div>
      </div>
    </div>
  );
}
