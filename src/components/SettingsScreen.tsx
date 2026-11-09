"use client";
/* eslint-disable @next/next/no-img-element */

import { useState, type CSSProperties } from "react";
import { Eye, MonitorCog, Palette, Save, Settings as SettingsIcon, Settings2, Store, WandSparkles } from "lucide-react";
import { api } from "@/lib/client-api";
import {
  THEME_PRESETS, getInvoiceDesign, getThemePreset, LOCKED_MODULES,
  parseUiFlags, parseVisibleModules, toBool, type UiFlags,
} from "@/lib/appearance";
import type { ScreenKey, StoreSettings } from "@/lib/types";
import AppearanceSettings from "@/components/AppearanceSettings";
import { INVOICE_TEMPLATES } from "@/lib/appearance";
import { SUPPORT } from "@/lib/support";

type Props = {
  settings: StoreSettings;
  onRefresh: () => Promise<void> | void;
  onToast: (message: string, error?: boolean) => void;
  onNavigate: (screen: "customize" | "preview") => void;
};

type Tab = "general" | "invoice" | "themes" | "appearance" | "customize";

const TABS: { key: Tab; label: string }[] = [
  { key: "general", label: "البيانات العامة" },
  { key: "invoice", label: "تصميم الفواتير" },
  { key: "themes", label: "الثيمات والألوان" },
  { key: "appearance", label: "الخطوط والأزرار" },
  { key: "customize", label: "تخصيص البرنامج" },
];

const GENERAL_KEYS: (keyof StoreSettings)[] = [
  "storeName", "subtitle", "phone", "address", "taxNumber", "currency", "defaultTax", "printer", "footer", "invoiceStartNumber", "installmentAlertMonths",
];
const INVOICE_KEYS: (keyof StoreSettings)[] = [
  "invoiceHeader", "invoiceSubtitle", "invoiceAccent", "invoiceTableHeader", "invoiceLogoUrl",
  "invoiceShowLogo", "invoiceShowBarcode", "invoiceShowTax", "invoiceShowBalance",
  "invoicePaper", "invoiceFontSize", "invoiceFooter", "invoiceTemplate",
];
const THEME_KEYS: (keyof StoreSettings)[] = ["theme", "customPrimary", "customAccent"];
const APPEARANCE_KEYS: (keyof StoreSettings)[] = ["fontFamily", "homeFontScale", "sidebarFontScale", "buttonRadius", "buttonStyle", "uiDensity", "tableStriped", "reduceMotion"];
const QUICK_MODULES: ScreenKey[] = ["statements", "preview", "backup", "support", "about", "customers"];

function pick(form: StoreSettings, keys: (keyof StoreSettings)[]) {
  return Object.fromEntries(keys.map((key) => [key, form[key]])) as Partial<StoreSettings>;
}

export default function SettingsScreen({ settings, onRefresh, onToast, onNavigate }: Props) {
  const [tab, setTab] = useState<Tab>("general");
  const [form, setForm] = useState<StoreSettings>(settings);
  const [visible, setVisible] = useState<ScreenKey[]>(() => parseVisibleModules(settings.visibleModules));
  const [flags, setFlags] = useState<UiFlags>(() => parseUiFlags(settings.uiFlags));
  const [busy, setBusy] = useState(false);

  const update = (key: keyof StoreSettings, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const design = getInvoiceDesign(form);
  const preset = getThemePreset(form.theme);

  const sendSettings = async (body: Partial<StoreSettings>, message = "تم حفظ الإعدادات") => {
    setBusy(true);
    try {
      await api("/api/settings", { method: "PUT", body: JSON.stringify(body) });
      onToast(message);
      await onRefresh();
    } catch (error) {
      onToast(error instanceof Error ? error.message : "تعذر حفظ الإعدادات", true);
    } finally { setBusy(false); }
  };

  const save = () => {
    if (tab === "general") return void sendSettings(pick(form, GENERAL_KEYS));
    if (tab === "invoice") return void sendSettings(pick(form, INVOICE_KEYS), "تم حفظ تصميم الفاتورة");
    if (tab === "themes") return void sendSettings(pick(form, THEME_KEYS), "تم تطبيق الثيم");
    if (tab === "appearance") return void sendSettings(pick(form, APPEARANCE_KEYS), "تم حفظ الخطوط وشكل الأزرار");
    return void sendSettings({
      visibleModules: JSON.stringify(Array.from(new Set([...LOCKED_MODULES, ...visible]))),
      customModules: settings.customModules,
      uiFlags: JSON.stringify(flags),
    }, "تم حفظ التخصيص السريع");
  };

  const chooseTheme = (key: string) => {
    setForm((current) => ({ ...current, theme: key }));
    void sendSettings({ theme: key }, "تم تطبيق الثيم الجديد");
  };

  const applyCustomColors = () => void sendSettings({ customPrimary: form.customPrimary, customAccent: form.customAccent }, "تم تطبيق الألوان المخصصة");
  const resetColors = () => {
    setForm((current) => ({ ...current, customPrimary: "", customAccent: "" }));
    void sendSettings({ customPrimary: "", customAccent: "" }, "تمت استعادة ألوان الثيم");
  };

  const miniStyle = {
    "--invoice-accent": design.accent,
    "--invoice-table": design.tableHeader,
    borderTopColor: design.accent,
  } as CSSProperties;

  return (
    <div>
      <h2 className="page-title"><SettingsIcon size={20} style={{ verticalAlign: "middle", marginLeft: 6 }} /> إعدادات البرنامج</h2>
      <p className="page-desc">بيانات المحل، تصميم الفواتير، الثيمات، وتخصيص الوحدات — كلها محفوظة في قاعدة البيانات وتظهر فوراً في كل الشاشات.</p>

      <div className="settings-tabs">
        {TABS.map((item) => <button key={item.key} className={`settings-tab ${tab === item.key ? "active" : ""}`} onClick={() => setTab(item.key)}>{item.label}</button>)}
      </div>

      {tab === "general" && (
        <div className="two-col" style={{ gridTemplateColumns: "1.3fr 1fr" }}>
          <div className="panel">
            <div className="panel-head"><span>بيانات المنشأة</span><Store size={17} /></div>
            <div className="panel-body">
              <div className="form-grid">
                <div><label className="label">اسم البرنامج / المحل</label><input className="field" style={{ width: "100%" }} value={form.storeName} onChange={(e) => update("storeName", e.target.value)} /></div>
                <div><label className="label">الوصف / النشاط</label><input className="field" style={{ width: "100%" }} value={form.subtitle} onChange={(e) => update("subtitle", e.target.value)} /></div>
                <div><label className="label">رقم هاتف المحل (يظهر في الفواتير)</label><input className="field" style={{ width: "100%" }} dir="ltr" value={form.phone} onChange={(e) => update("phone", e.target.value)} /></div>
                <div><label className="label">الرقم الضريبي</label><input className="field" style={{ width: "100%" }} value={form.taxNumber} onChange={(e) => update("taxNumber", e.target.value)} /></div>
                <div className="full"><label className="label">العنوان</label><input className="field" style={{ width: "100%" }} value={form.address} onChange={(e) => update("address", e.target.value)} /></div>
                <div><label className="label">العملة</label><input className="field" style={{ width: "100%" }} value={form.currency} onChange={(e) => update("currency", e.target.value)} /></div>
                <div><label className="label">الضريبة الافتراضية %</label><input type="number" className="field" style={{ width: "100%" }} value={form.defaultTax} onChange={(e) => update("defaultTax", e.target.value)} /></div>
                <div className="full"><label className="label">الطابعة</label><input className="field" style={{ width: "100%" }} value={form.printer} onChange={(e) => update("printer", e.target.value)} /></div>
                <div><label className="label">بداية ترقيم الفواتير</label><input type="number" min="1" className="field" style={{ width: "100%" }} value={form.invoiceStartNumber} onChange={(e) => update("invoiceStartNumber", e.target.value)} /></div>
                <div><label className="label">تنبيه الأقساط بعد (شهور)</label><input type="number" min="1" max="24" className="field" style={{ width: "100%" }} value={form.installmentAlertMonths} onChange={(e) => update("installmentAlertMonths", e.target.value)} /></div>
                <div className="full"><label className="label">رسالة ذيل الفاتورة القديمة</label><input className="field" style={{ width: "100%" }} value={form.footer} onChange={(e) => update("footer", e.target.value)} /></div>
              </div>
            </div>
          </div>
          <div className="panel">
            <div className="panel-head"><span>بيئة التشغيل</span><MonitorCog size={17} /></div>
            <div className="panel-body">
              <div className="kv">
                <b>اسم البرنامج</b><span>{form.storeName}</span>
                <b>التخصص</b><span>الأدوات المدرسية والمكتبية</span>
                <b>الإصدار</b><span>2.0.0</span>
                <b>قاعدة البيانات</b><span>PostgreSQL عبر Drizzle ORM</span>
                <b>حالة الاتصال</b><span style={{ color: "#128349", fontWeight: 900 }}>متصلة ✔</span>
                <b>ملف تنفيذي</b><span>جاهز للتحزيم إلى EXE</span>
              </div>
              <div className="info-box" style={{ marginTop: 12 }}>الدعم الفني ثابت في البرنامج ولا يمكن تغييره: <b dir="ltr">{SUPPORT.phone}</b>. رقم هاتف المحل يظهر في الفواتير ويمكنك تغييره من الحقل أعلاه.</div>
            </div>
          </div>
        </div>
      )}

      {tab === "invoice" && (
        <div className="two-col" style={{ gridTemplateColumns: "1fr 1fr" }}>
          <div className="panel">
            <div className="panel-head"><span>تصميم الفاتورة</span><WandSparkles size={17} /></div>
            <div className="panel-body">
              <div className="invoice-template-grid">
                {INVOICE_TEMPLATES.map((template) => <button key={template.key} className={`invoice-template-card ${form.invoiceTemplate === template.key ? "active" : ""}`} onClick={() => update("invoiceTemplate", template.key)}><span className={`invoice-template-thumb thumb-${template.key}`} /><b>{template.label}</b><small>{template.description}</small></button>)}
              </div>
              <div className="form-grid" style={{ marginTop: 12 }}>
                <div className="full"><label className="label">عنوان الفاتورة</label><input className="field" style={{ width: "100%" }} value={form.invoiceHeader} onChange={(e) => update("invoiceHeader", e.target.value)} /></div>
                <div className="full"><label className="label">وصف تحت العنوان</label><input className="field" style={{ width: "100%" }} value={form.invoiceSubtitle} onChange={(e) => update("invoiceSubtitle", e.target.value)} /></div>
                <div><label className="label">لون العنوان والحدود</label><input type="color" className="field" style={{ width: "100%", height: 34 }} value={form.invoiceAccent} onChange={(e) => update("invoiceAccent", e.target.value)} /></div>
                <div><label className="label">لون رأس الجدول</label><input type="color" className="field" style={{ width: "100%", height: 34 }} value={form.invoiceTableHeader} onChange={(e) => update("invoiceTableHeader", e.target.value)} /></div>
                <div><label className="label">مقاس الورق</label><select className="field" style={{ width: "100%" }} value={form.invoicePaper} onChange={(e) => update("invoicePaper", e.target.value)}><option value="A4">A4 فاتورة كبيرة</option><option value="thermal">حراري 80mm</option></select></div>
                <div><label className="label">حجم الخط</label><input type="number" min="9" max="18" className="field" style={{ width: "100%" }} value={form.invoiceFontSize} onChange={(e) => update("invoiceFontSize", e.target.value)} /></div>
                <div className="full"><label className="label">رابط شعار مخصص (اتركه فارغاً لشعار البرنامج)</label><input className="field" style={{ width: "100%" }} dir="ltr" value={form.invoiceLogoUrl} onChange={(e) => update("invoiceLogoUrl", e.target.value)} placeholder="https://..." /></div>
                <div className="full"><label className="label">نص أسفل الفاتورة</label><input className="field" style={{ width: "100%" }} value={form.invoiceFooter} onChange={(e) => update("invoiceFooter", e.target.value)} /></div>
              </div>
              <div className="flag-grid" style={{ marginTop: 12 }}>
                {([
                  ["invoiceShowLogo", "إظهار الشعار"],
                  ["invoiceShowBarcode", "إظهار الباركود"],
                  ["invoiceShowTax", "إظهار الرقم الضريبي"],
                  ["invoiceShowBalance", "إظهار رصيد العميل"],
                ] as [keyof StoreSettings, string][]).map(([key, label]) => (
                  <label key={key} className="module-row"><span>{label}</span><input type="checkbox" checked={toBool(form[key])} onChange={() => update(key, toBool(form[key]) ? "false" : "true")} /></label>
                ))}
              </div>
              <button className="btn blue" style={{ marginTop: 12 }} onClick={() => onNavigate("preview")}><Eye size={15} /> معاينة الفاتورة النهائية</button>
            </div>
          </div>
          <div className="panel">
            <div className="panel-head"><span>معاينة سريعة للتصميم</span></div>
            <div className="panel-body">
              <div className="mini-invoice" style={miniStyle}>
                <div className="mini-invoice-head">
                  {design.showLogo && <img src={design.logoUrl || "/images/app-icon.png"} alt="شعار" />}
                  <div><b style={{ color: design.accent }}>{design.header}</b><div style={{ fontSize: 10, color: "#6b7e93" }}>{design.subtitle}</div></div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#536780" }}>
                  <span>فاتورة: 1041003847</span><span>العميل: مكتبة النور</span>
                </div>
                <table className="win-table" style={{ marginTop: 8, fontSize: `${design.fontSize}px` }}>
                  <thead><tr><th style={{ background: design.tableHeader }}>الصنف</th><th style={{ background: design.tableHeader }}>الكمية</th><th style={{ background: design.tableHeader }}>القيمة</th></tr></thead>
                  <tbody><tr><td>كراسة مسطرة 100 ورقة</td><td>2</td><td>36.00</td></tr><tr><td>ألوان خشب 12 لون</td><td>1</td><td>48.00</td></tr></tbody>
                </table>
                <div style={{ textAlign: "left", marginTop: 9, fontWeight: 900, color: design.accent }}>الإجمالي: 84.00 {design.currency}</div>
                {design.showBarcode && <div className="invoice-barcode" style={{ fontSize: 12 }}>|||| || |||| || 1041003847</div>}
                <div style={{ textAlign: "center", fontSize: 10, color: "#7b8a9d", marginTop: 8 }}>{design.footer}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "themes" && (
        <div>
          <div className="panel">
            <div className="panel-head"><span>اختر ثيم البرنامج</span><Palette size={17} /></div>
            <div className="panel-body">
              <div className="theme-grid">
                {THEME_PRESETS.map((theme) => (
                  <button key={theme.key} className={`theme-card ${form.theme === theme.key ? "active" : ""}`} onClick={() => chooseTheme(theme.key)}>
                    <div className="theme-swatch" style={{ background: `linear-gradient(135deg, ${theme.primary} 0 65%, ${theme.accent} 65%)` }} />
                    <b>{theme.label}</b>
                    <small>{theme.description}</small>
                    <span className="btn small" style={{ marginTop: 7 }}>{form.theme === theme.key ? "مفعّل ✔" : "تفعيل"}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="two-col" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 12 }}>
            <div className="panel">
              <div className="panel-head"><span>ألوان مخصصة</span></div>
              <div className="panel-body">
                <div className="form-grid">
                  <div><label className="label">اللون الأساسي</label><div className="color-row"><input type="color" value={form.customPrimary || preset.primary} onChange={(e) => update("customPrimary", e.target.value)} /><span>{form.customPrimary || preset.primary}</span></div></div>
                  <div><label className="label">لون الإبراز</label><div className="color-row"><input type="color" value={form.customAccent || preset.accent} onChange={(e) => update("customAccent", e.target.value)} /><span>{form.customAccent || preset.accent}</span></div></div>
                </div>
                <div style={{ display: "flex", gap: 7, marginTop: 12 }}>
                  <button className="btn blue" onClick={applyCustomColors}>تطبيق الألوان</button>
                  <button className="btn" onClick={resetColors}>استعادة ألوان الثيم</button>
                </div>
                <div className="info-box" style={{ marginTop: 12 }}>الثيم يغيّر القائمة الجانبية، الأزرار، العناوين، رؤوس الجداول، والشاشة الرئيسية فوراً. الوضع الليلي يحوّل الخلفيات للداكن أيضاً.</div>
              </div>
            </div>
            <div className="panel">
              <div className="panel-head"><span>معاينة الثيم الحالي</span></div>
              <div className="panel-body">
                <div style={{ background: "linear-gradient(160deg, var(--theme-primary), var(--theme-deep))", padding: 16, borderRadius: 6, color: "#fff", fontWeight: 900 }}>
                  {form.storeName}<div style={{ fontSize: 11, fontWeight: 500, marginTop: 4 }}>{form.subtitle}</div>
                  <button className="btn small" style={{ marginTop: 12 }}>زر بالثيم الحالي</button>
                  <span style={{ display: "inline-block", marginRight: 7, background: "var(--theme-accent)", padding: "4px 9px", borderRadius: 4 }}>لون الإبراز</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "appearance" && <AppearanceSettings value={form} onChange={(key, value) => update(key as keyof StoreSettings, value)} />}

      {tab === "customize" && (
        <div className="two-col" style={{ gridTemplateColumns: "1fr 1fr" }}>
          <div className="panel">
            <div className="panel-head"><span>إظهار / إخفاء الوحدات</span><Settings2 size={17} /></div>
            <div className="panel-body">
              <div className="module-list">
                {QUICK_MODULES.map((key) => (
                  <label key={key} className="module-row">
                    <span>{({ statements: "كشف حساب", preview: "معاينة الفواتير", backup: "النسخ الاحتياطي", support: "الدعم الفني", about: "معلومات عن البرنامج", customers: "العملاء" } as Record<string, string>)[key]}</span>
                    <input type="checkbox" checked={visible.includes(key)} onChange={() => setVisible((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key])} />
                  </label>
                ))}
              </div>
              <button className="btn blue" style={{ marginTop: 12 }} onClick={() => onNavigate("customize")}>فتح شاشة التخصيص الكاملة</button>
            </div>
          </div>
          <div className="panel">
            <div className="panel-head"><span>عناصر الواجهة</span></div>
            <div className="panel-body">
              <div className="flag-grid">
                {([
                  ["showHeroSlogan", "الجملة الدعائية"],
                  ["showFooterPhone", "رقم الهاتف"],
                  ["showSeal", "شارة الاختيار الأفضل"],
                  ["showSidebarNote", "ملخص القائمة"],
                  ["showProductImage", "صورة الصنف"],
                  ["showQuickTotals", "أشرطة الإجماليات"],
                ] as [keyof UiFlags, string][]).map(([key, label]) => (
                  <label key={key} className="module-row"><span>{label}</span><input type="checkbox" checked={flags[key]} onChange={() => setFlags((current) => ({ ...current, [key]: !current[key] }))} /></label>
                ))}
              </div>
              <div className="info-box" style={{ marginTop: 12 }}>من شاشة التخصيص الكاملة تقدر تضيف اختصارات جديدة بمحتوى خاص، تحذفها، ترتبها، وتتحكم في كل عناصر الواجهة.</div>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <button className="btn green tall" disabled={busy} onClick={save}><Save size={16} /> حفظ إعدادات هذا التبويب</button>
        <button className="btn tall" onClick={() => setForm(settings)}>إلغاء التعديلات</button>
        <span className="head-chip">كل التغييرات تُطبق بعد الحفظ أو الضغط على «تفعيل» في الثيمات</span>
      </div>
    </div>
  );
}
