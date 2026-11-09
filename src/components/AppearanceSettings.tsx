"use client";

import { BUTTON_RADIUS_OPTIONS, BUTTON_STYLE_OPTIONS, DENSITY_OPTIONS, FONT_OPTIONS, getFontFamily } from "@/lib/appearance";
import type { StoreSettings } from "@/lib/types";
import AppSelect from "@/components/AppSelect";

type Props = {
  value: Pick<StoreSettings, "fontFamily" | "homeFontScale" | "sidebarFontScale" | "buttonRadius" | "buttonStyle" | "uiDensity" | "tableStriped" | "reduceMotion">;
  onChange: (key: keyof Props["value"], value: string) => void;
};

export default function AppearanceSettings({ value, onChange }: Props) {
  return (
    <div className="appearance-settings">
      <div className="panel">
        <div className="panel-head"><span>خط البرنامج</span><span className="head-chip">خطوط محلية تعمل بدون إنترنت</span></div>
        <div className="panel-body">
          <div className="font-option-grid">
            {FONT_OPTIONS.map((font) => (
              <button key={font.key} className={`font-option ${value.fontFamily === font.key ? "active" : ""}`} onClick={() => onChange("fontFamily", font.key)} style={{ fontFamily: font.family }}>
                <b>{font.label}</b>
                <span>نص تجريبي — أدوات مدرسية 123</span>
                <small>{font.description}</small>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="two-col" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 12 }}>
        <div className="panel">
          <div className="panel-head"><span>حجم الخطوط والكثافة</span></div>
          <div className="panel-body">
            <label className="label">حجم خط أزرار الرئيسية: {value.homeFontScale}%</label>
            <input type="range" min="70" max="120" step="2" className="appearance-range" value={value.homeFontScale} onChange={(event) => onChange("homeFontScale", event.target.value)} />
            <label className="label" style={{ marginTop: 10 }}>حجم خط القائمة الجانبية: {value.sidebarFontScale}%</label>
            <input type="range" min="70" max="120" step="2" className="appearance-range" value={value.sidebarFontScale} onChange={(event) => onChange("sidebarFontScale", event.target.value)} />
            <label className="label" style={{ marginTop: 10 }}>كثافة الواجهة والجداول</label>
            <AppSelect value={value.uiDensity} onChange={(v) => onChange("uiDensity", v)} options={DENSITY_OPTIONS.map((item) => ({ value: item.key, label: item.label }))} />
            <div className="flag-grid" style={{ marginTop: 12 }}>
              <label className="module-row"><span>تلوين صفوف الجداول بالتبادل</span><input type="checkbox" checked={value.tableStriped !== "false"} onChange={() => onChange("tableStriped", value.tableStriped === "false" ? "true" : "false")} /></label>
              <label className="module-row"><span>تقليل الحركة والتأثيرات</span><input type="checkbox" checked={value.reduceMotion === "true"} onChange={() => onChange("reduceMotion", value.reduceMotion === "true" ? "false" : "true")} /></label>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head"><span>شكل الأزرار</span></div>
          <div className="panel-body">
            <label className="label">حواف الأزرار</label>
            <div className="button-choice-row">
              {BUTTON_RADIUS_OPTIONS.map((option) => <button key={option.key} className={`btn choice-chip ${value.buttonRadius === option.key ? "active" : ""}`} style={{ borderRadius: Number(option.key) }} onClick={() => onChange("buttonRadius", option.key)}>{option.label}</button>)}
            </div>
            <label className="label" style={{ marginTop: 12 }}>نمط الأزرار</label>
            <AppSelect value={value.buttonStyle} onChange={(v) => onChange("buttonStyle", v)} options={BUTTON_STYLE_OPTIONS.map((item) => ({ value: item.key, label: item.label }))} />
            <div className="appearance-preview" style={{ fontFamily: getFontFamily(value.fontFamily), "--control-radius": `${Number(value.buttonRadius) || 0}px` } as React.CSSProperties} data-button-style={value.buttonStyle}>
              <b>معاينة مباشرة</b>
              <p>هذا نص تجريبي بالخط المختار لقياس وضوح القراءة داخل البرنامج.</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className="btn blue">حفظ</button><button className="btn green">إضافة</button><button className="btn red">حذف</button><button className="btn">إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
