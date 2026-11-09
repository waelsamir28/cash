"use client";

import { useState, type CSSProperties } from "react";
import {
  ArrowDown, ArrowUp, Boxes, Calculator, ClipboardList, FileText, GraduationCap,
  NotebookPen, Palette, Pencil, Plus, Printer, RotateCcw, Save, Settings2,
  Star, Tags, Trash2, BookOpen, type LucideIcon,
} from "lucide-react";
import { api } from "@/lib/client-api";
import {
  ALL_MODULES, CUSTOM_ICON_OPTIONS, DEFAULT_UI_FLAGS, LOCKED_MODULES, MODULE_LABELS,
  parseCustomModules, parseUiFlags, parseVisibleModules,
  type CustomModule, type UiFlags,
} from "@/lib/appearance";
import type { ScreenKey, StoreSettings } from "@/lib/types";
import { DEFAULT_SETTINGS } from "@/lib/types";
import AppearanceSettings from "@/components/AppearanceSettings";

type Props = {
  settings: StoreSettings;
  onRefresh: () => Promise<void> | void;
  onToast: (message: string, error?: boolean) => void;
  onNavigate: (screen: "settings") => void;
};

const ICONS: Record<string, LucideIcon> = {
  NotebookPen, Pencil, BookOpen, Boxes, Star, ClipboardList, GraduationCap,
  Printer, Calculator, FileText, Tags, Palette,
};

const FLAG_OPTIONS: { key: keyof UiFlags; label: string; hint: string }[] = [
  { key: "showHeroSlogan", label: "شعار الجملة الدعائية", hint: "إظهار الشريط الأزرق أعلى الشاشة الرئيسية" },
  { key: "showFooterPhone", label: "رقم الهاتف في الفوتر", hint: "إظهار رقم الدعم في الشريط السفلي" },
  { key: "showSeal", label: "شارة الاختيار الأفضل", hint: "إظهار الختم الذهبي على الخلفية" },
  { key: "showSidebarNote", label: "ملخص القائمة الجانبية", hint: "عدد الأصناف والفواتير والمبيعات" },
  { key: "showStatusBar", label: "شريط الحالة", hint: "شريط أسفل النافذة" },
  { key: "showClock", label: "الساعة والتاريخ", hint: "في الشريط العلوي وشريط الحالة" },
  { key: "showDbStatus", label: "حالة قاعدة البيانات", hint: "مؤشر الاتصال في الشريط العلوي" },
  { key: "showProductImage", label: "صورة الصنف في المبيعات", hint: "اللوحة الرمادية بجوار قائمة الأصناف" },
  { key: "showQuickTotals", label: "أشرطة الإجماليات السريعة", hint: "وفور / مدي أعلى شاشة المبيعات" },
  { key: "showHomeStats", label: "مبيعات اليوم في الرئيسية", hint: "البطاقة الصغيرة داخل الفوتر" },
];

export default function CustomizationScreen({ settings, onRefresh, onToast, onNavigate }: Props) {
  const [visible, setVisible] = useState<ScreenKey[]>(() => parseVisibleModules(settings.visibleModules));
  const [custom, setCustom] = useState<CustomModule[]>(() => parseCustomModules(settings.customModules));
  const [flags, setFlags] = useState<UiFlags>(() => parseUiFlags(settings.uiFlags));
  const [draft, setDraft] = useState({
    label: "", target: "sales" as ScreenKey, icon: "NotebookPen", color: "#1565c0", content: "",
  });
  const [busy, setBusy] = useState(false);
  const [appearance, setAppearance] = useState({
    fontFamily: settings.fontFamily || DEFAULT_SETTINGS.fontFamily,
    homeFontScale: settings.homeFontScale || DEFAULT_SETTINGS.homeFontScale,
    sidebarFontScale: settings.sidebarFontScale || DEFAULT_SETTINGS.sidebarFontScale,
    buttonRadius: settings.buttonRadius || DEFAULT_SETTINGS.buttonRadius,
    buttonStyle: settings.buttonStyle || DEFAULT_SETTINGS.buttonStyle,
    uiDensity: settings.uiDensity || DEFAULT_SETTINGS.uiDensity,
    tableStriped: settings.tableStriped || DEFAULT_SETTINGS.tableStriped,
    reduceMotion: settings.reduceMotion || DEFAULT_SETTINGS.reduceMotion,
  });

  const toggleModule = (key: ScreenKey) => {
    if (LOCKED_MODULES.includes(key)) return;
    setVisible((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]);
  };

  const addCustom = () => {
    if (!draft.label.trim()) { onToast("اكتب اسم الاختصار أولاً", true); return; }
    const customModule: CustomModule = {
      id: `cm-${Date.now()}`,
      label: draft.label.trim(),
      target: draft.target,
      icon: draft.icon,
      color: draft.color,
      content: draft.content.trim(),
    };
    setCustom((current) => [...current, customModule]);
    setDraft({ label: "", target: "sales", icon: "NotebookPen", color: "#1565c0", content: "" });
    onToast("تمت إضافة الاختصار — احفظ التخصيص لتطبيقه");
  };

  const move = (index: number, direction: number) => {
    setCustom((current) => {
      const next = [...current];
      const target = index + direction;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const reset = () => {
    setVisible([...ALL_MODULES]);
    setCustom([]);
    setFlags({ ...DEFAULT_UI_FLAGS });
    setAppearance({ fontFamily: DEFAULT_SETTINGS.fontFamily, homeFontScale: DEFAULT_SETTINGS.homeFontScale, sidebarFontScale: DEFAULT_SETTINGS.sidebarFontScale, buttonRadius: DEFAULT_SETTINGS.buttonRadius, buttonStyle: DEFAULT_SETTINGS.buttonStyle, uiDensity: DEFAULT_SETTINGS.uiDensity, tableStriped: DEFAULT_SETTINGS.tableStriped, reduceMotion: DEFAULT_SETTINGS.reduceMotion });
    onToast("تمت استعادة الوضع الافتراضي — اضغط حفظ التخصيص");
  };

  const save = async () => {
    setBusy(true);
    try {
      await api("/api/settings", {
        method: "PUT",
        body: JSON.stringify({
          visibleModules: JSON.stringify(Array.from(new Set([...LOCKED_MODULES, ...visible]))),
          customModules: JSON.stringify(custom),
          uiFlags: JSON.stringify(flags),
          ...appearance,
        }),
      });
      onToast("تم حفظ تخصيص البرنامج وتطبيقه على كل الشاشات");
      await onRefresh();
    } catch (error) {
      onToast(error instanceof Error ? error.message : "تعذر حفظ التخصيص", true);
    } finally { setBusy(false); }
  };

  return (
    <div>
      <h2 className="page-title"><Settings2 size={20} style={{ verticalAlign: "middle", marginLeft: 6 }} /> تخصيص البرنامج</h2>
      <p className="page-desc">اخفِ أي شاشة لا تحتاجها، أضف اختصارات ومحتوى خاص بك، احذفها أو أعد ترتيبها، وتحكم في عناصر الواجهة.</p>

      <div style={{ display: "flex", gap: 7, marginBottom: 12, flexWrap: "wrap" }}>
        <button className="btn green" disabled={busy} onClick={() => void save()}><Save size={15} /> حفظ التخصيص</button>
        <button className="btn" onClick={() => setVisible([...ALL_MODULES])}>إظهار كل الوحدات</button>
        <button className="btn" onClick={() => setVisible([...LOCKED_MODULES])}>إخفاء الوحدات الاختيارية</button>
        <button className="btn red" onClick={() => setCustom([])}><Trash2 size={15} /> حذف كل الاختصارات</button>
        <button className="btn" onClick={reset}><RotateCcw size={15} /> استعادة الافتراضي</button>
        <button className="btn blue" onClick={() => onNavigate("settings")}><Palette size={15} /> الثيمات وتصميم الفاتورة</button>
      </div>

      <div className="panel" style={{ marginBottom: 12 }}><div className="panel-head"><span>المظهر والخطوط والأزرار</span><span className="head-chip">احفظ التخصيص لتطبيق التغييرات</span></div><div className="panel-body"><AppearanceSettings value={appearance} onChange={(key, value) => setAppearance((current) => ({ ...current, [key]: value }))} /></div></div>

      <div className="customization-grid">
        <div className="panel">
          <div className="panel-head"><span>الوحدات والشاشات</span><span className="head-chip">{visible.length} / {ALL_MODULES.length}</span></div>
          <div className="panel-body">
            <div className="module-list">
              {ALL_MODULES.map((key) => {
                const locked = LOCKED_MODULES.includes(key);
                return (
                  <label key={key} className="module-row" title={locked ? "وحدة أساسية لا يمكن إخفاؤها" : ""}>
                    <span>{MODULE_LABELS[key]} {locked && <small style={{ color: "#a00" }}>(أساسي)</small>}</span>
                    <input type="checkbox" checked={visible.includes(key)} disabled={locked} onChange={() => toggleModule(key)} />
                  </label>
                );
              })}
            </div>
            <div className="info-box" style={{ marginTop: 12 }}>
              الوحدات الأساسية (الرئيسية، الإعدادات، المساعدة، التخصيص) لا تُخفى حتى لا تفقد الوصول للبرنامج. التخصيص يُطبق على القائمة الجانبية ومربعات الشاشة الرئيسية معاً.
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head"><span>إضافة عنصر / اختصار مخصص</span><Plus size={17} /></div>
          <div className="panel-body">
            <div className="form-grid">
              <div><label className="label">اسم الاختصار *</label><input className="field" style={{ width: "100%" }} value={draft.label} onChange={(event) => setDraft({ ...draft, label: event.target.value })} placeholder="مثال: تجهيز طلبات المدارس" /></div>
              <div><label className="label">يفتح شاشة</label><select className="field" style={{ width: "100%" }} value={draft.target} onChange={(event) => setDraft({ ...draft, target: event.target.value as ScreenKey })}>{ALL_MODULES.map((key) => <option key={key} value={key}>{MODULE_LABELS[key]}</option>)}</select></div>
              <div><label className="label">الأيقونة</label><select className="field" style={{ width: "100%" }} value={draft.icon} onChange={(event) => setDraft({ ...draft, icon: event.target.value })}>{CUSTOM_ICON_OPTIONS.map((icon) => <option key={icon} value={icon}>{icon}</option>)}</select></div>
              <div><label className="label">اللون</label><input type="color" className="field" style={{ width: "100%", height: 34 }} value={draft.color} onChange={(event) => setDraft({ ...draft, color: event.target.value })} /></div>
              <div className="full"><label className="label">محتوى يظهر عند الضغط (اختياري)</label><textarea className="field" style={{ width: "100%" }} value={draft.content} onChange={(event) => setDraft({ ...draft, content: event.target.value })} placeholder="تعليمات، ملاحظة، أو وصف إجراء مخصص..." /></div>
            </div>
            <button className="btn blue" style={{ marginTop: 10 }} onClick={addCustom}><Plus size={15} /> إضافة الاختصار</button>

            <div className="custom-module-list" style={{ marginTop: 14 }}>
              {custom.map((module, index) => {
                const Icon = ICONS[module.icon] ?? Star;
                return (
                  <div key={module.id} className="custom-module-row">
                    <span className="custom-icon-preview" style={{ background: module.color } as CSSProperties}><Icon size={18} /></span>
                    <span style={{ flex: 1 }}><b>{module.label}</b><br /><small>يفتح: {MODULE_LABELS[module.target] ?? module.target}</small></span>
                    <button className="btn small" onClick={() => move(index, -1)} title="أعلى"><ArrowUp size={12} /></button>
                    <button className="btn small" onClick={() => move(index, 1)} title="أسفل"><ArrowDown size={12} /></button>
                    <button className="btn small red" onClick={() => setCustom((current) => current.filter((item) => item.id !== module.id))}><Trash2 size={12} /></button>
                  </div>
                );
              })}
              {custom.length === 0 && <div className="empty-row">لا توجد اختصارات مخصصة</div>}
            </div>
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 12 }}>
        <div className="panel-head"><span>إظهار / إخفاء عناصر الواجهة</span></div>
        <div className="panel-body">
          <div className="flag-grid">
            {FLAG_OPTIONS.map((option) => (
              <label key={option.key} className="module-row">
                <span><b>{option.label}</b><br /><small style={{ color: "#71849a" }}>{option.hint}</small></span>
                <input type="checkbox" checked={flags[option.key]} onChange={() => setFlags((current) => ({ ...current, [option.key]: !current[option.key] }))} />
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
