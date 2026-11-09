import type { ScreenKey, StoreSettings } from "@/lib/types";

export type ThemeKey = "blue" | "red" | "green" | "purple" | "night";

export const FONT_OPTIONS = [
  { key: "tahoma", label: "Tahoma كلاسيكي", family: 'Tahoma, "Segoe UI", Arial, sans-serif', description: "خفيف ومألوف لشاشات البيع" },
  { key: "cairo", label: "Cairo القاهرة", family: '"Cairo", Tahoma, sans-serif', description: "عربي واضح وعصري" },
  { key: "tajawal", label: "Tajawal تجوال", family: '"Tajawal", Tahoma, sans-serif', description: "انسيابي ومناسب للعناوين" },
  { key: "almarai", label: "Almarai المرعي", family: '"Almarai", Tahoma, sans-serif', description: "مقروءة ممتازة للجداول" },
  { key: "ibm", label: "IBM Plex Arabic", family: '"IBM Plex Sans Arabic", Tahoma, sans-serif', description: "احترافي للأنظمة الإدارية" },
  { key: "kufi", label: "Noto Kufi كوفي", family: '"Noto Kufi Arabic", Tahoma, sans-serif', description: "طابع رسمي وهوية قوية" },
] as const;

export const BUTTON_RADIUS_OPTIONS = [
  { key: "0", label: "حواف حادة" },
  { key: "4", label: "انحناء خفيف" },
  { key: "8", label: "حواف دائرية" },
  { key: "999", label: "كبسولة دائرية" },
];

export const BUTTON_STYLE_OPTIONS = [
  { key: "gradient", label: "متدرج لامع" },
  { key: "flat", label: "مسطح حديث" },
  { key: "outline", label: "حدود فقط" },
];

export const DENSITY_OPTIONS = [
  { key: "compact", label: "مضغوط" },
  { key: "comfortable", label: "مريح" },
  { key: "spacious", label: "واسع" },
];

export const INVOICE_TEMPLATES = [
  { key: "modern", label: "احترافي حديث", description: "شريط علوي ملون، بيانات منظمة، وجدول واضح" },
  { key: "classic", label: "كلاسيكي رسمي", description: "إطار تقليدي مناسب للفواتير المختومة" },
  { key: "minimal", label: "بسيط ونظيف", description: "مساحات بيضاء وتركيز على الإجمالي" },
  { key: "compact", label: "مضغوط حراري", description: "مناسب لطابعات 80mm والمساحات الصغيرة" },
] as const;

export function getFontFamily(key?: string): string {
  return FONT_OPTIONS.find((font) => font.key === key)?.family ?? FONT_OPTIONS[1].family;
}

export type ThemePreset = {
  key: ThemeKey;
  label: string;
  description: string;
  primary: string;
  dark: string;
  deep: string;
  accent: string;
  accentDark: string;
};

export const THEME_PRESETS: ThemePreset[] = [
  {
    key: "blue",
    label: "أزرق كلاسيكي",
    description: "نفس طابع الشاشة الأصلية",
    primary: "#1a67bd", dark: "#0a4194", deep: "#062c6c",
    accent: "#d91414", accentDark: "#a90909",
  },
  {
    key: "red",
    label: "أحمر مميز",
    description: "هوية جريئة للمكتبات",
    primary: "#d33b32", dark: "#a51d1d", deep: "#6d0f0f",
    accent: "#0b4fa2", accentDark: "#07366f",
  },
  {
    key: "green",
    label: "أخضر زمردي",
    description: "مريح للعين في الوردية الطويلة",
    primary: "#159c67", dark: "#0b6f4b", deep: "#06432f",
    accent: "#d97706", accentDark: "#a45304",
  },
  {
    key: "purple",
    label: "بنفسجي عصري",
    description: "مظهر حديث للأدوات المدرسية",
    primary: "#7b4bc4", dark: "#5a2f9e", deep: "#36196c",
    accent: "#e11d48", accentDark: "#a30d32",
  },
  {
    key: "night",
    label: "ليلي داكن",
    description: "تقليل الإضاءة مع الحفاظ على التباين",
    primary: "#334155", dark: "#1e293b", deep: "#0f172a",
    accent: "#38bdf8", accentDark: "#0284c7",
  },
];

export function getThemeKey(value?: string): ThemeKey {
  return THEME_PRESETS.find((theme) => theme.key === value)?.key ?? "blue";
}

export function getThemePreset(value?: string): ThemePreset {
  return THEME_PRESETS.find((theme) => theme.key === getThemeKey(value)) ?? THEME_PRESETS[0];
}

function shade(hex: string, amount: number): string {
  const clean = hex.replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return hex;
  const factor = 1 - amount;
  const parts = [0, 2, 4].map((index) => {
    const channel = Math.round(parseInt(clean.slice(index, index + 2), 16) * factor);
    return Math.max(0, Math.min(255, channel)).toString(16).padStart(2, "0");
  });
  return `#${parts.join("")}`;
}

export function getThemeVars(settings: StoreSettings): Record<string, string> {
  const preset = getThemePreset(settings.theme);
  const primary = settings.customPrimary || preset.primary;
  const accent = settings.customAccent || preset.accent;
  return {
    "--theme-primary": primary,
    "--theme-dark": settings.customPrimary ? shade(primary, 0.25) : preset.dark,
    "--theme-deep": settings.customPrimary ? shade(primary, 0.5) : preset.deep,
    "--theme-accent": accent,
    "--theme-accent-dark": settings.customAccent ? shade(accent, 0.3) : preset.accentDark,
    "--app-font-family": getFontFamily(settings.fontFamily),
    "--control-radius": `${Number(settings.buttonRadius ?? 6) || 0}px`,
    "--home-font-scale": String(Math.max(70, Math.min(120, Number(settings.homeFontScale) || 88)) / 100),
    "--sidebar-font-scale": String(Math.max(70, Math.min(120, Number(settings.sidebarFontScale) || 88)) / 100),
    "--row-padding": settings.uiDensity === "compact" ? "3px" : settings.uiDensity === "spacious" ? "9px" : "6px",
  };
}

export type InvoiceDesign = {
  header: string;
  subtitle: string;
  accent: string;
  tableHeader: string;
  logoUrl: string;
  showLogo: boolean;
  showBarcode: boolean;
  showTax: boolean;
  showBalance: boolean;
  paper: "A4" | "thermal";
  fontSize: number;
  footer: string;
  phone: string;
  address: string;
  taxNumber: string;
  currency: string;
  template: string;
};

export function toBool(value: string | undefined, fallback = true): boolean {
  if (value === undefined || value === "") return fallback;
  return value === "true" || value === "1" || value === "on";
}

export function getInvoiceDesign(settings: StoreSettings): InvoiceDesign {
  return {
    header: settings.invoiceHeader || settings.storeName,
    subtitle: settings.invoiceSubtitle || settings.subtitle,
    accent: settings.invoiceAccent || "#0b4fa2",
    tableHeader: settings.invoiceTableHeader || "#e4f0fc",
    logoUrl: settings.invoiceLogoUrl || "",
    showLogo: toBool(settings.invoiceShowLogo),
    showBarcode: toBool(settings.invoiceShowBarcode),
    showTax: toBool(settings.invoiceShowTax),
    showBalance: toBool(settings.invoiceShowBalance),
    paper: settings.invoicePaper === "thermal" ? "thermal" : "A4",
    fontSize: Math.max(9, Math.min(18, Number(settings.invoiceFontSize) || 12)),
    footer: settings.invoiceFooter || settings.footer,
    phone: settings.phone,
    address: settings.address,
    taxNumber: settings.taxNumber,
    currency: settings.currency,
    template: settings.invoiceTemplate || "modern",
  };
}

export type UiFlags = {
  showHeroSlogan: boolean;
  showFooterPhone: boolean;
  showSeal: boolean;
  showSidebarNote: boolean;
  showStatusBar: boolean;
  showClock: boolean;
  showDbStatus: boolean;
  showProductImage: boolean;
  showQuickTotals: boolean;
  showHomeStats: boolean;
};

export const DEFAULT_UI_FLAGS: UiFlags = {
  showHeroSlogan: true,
  showFooterPhone: true,
  showSeal: true,
  showSidebarNote: true,
  showStatusBar: true,
  showClock: true,
  showDbStatus: true,
  showProductImage: true,
  showQuickTotals: true,
  showHomeStats: true,
};

export const ALL_MODULES: ScreenKey[] = [
  "home", "sales", "purchases", "purchaseRequests", "returns", "expenses", "inventory", "inventoryCount", "catalog", "reports", "customers",
  "settings", "backup", "support", "about", "help", "statements", "installments", "preview", "customize", "labels", "shifts",
];

export const LOCKED_MODULES: ScreenKey[] = ["home", "settings", "help", "customize"];

export const MODULE_LABELS: Record<ScreenKey, string> = {
  home: "الرئيسية",
  sales: "المبيعات",
  purchases: "المشتريات",
  inventory: "المخازن",
  catalog: "الأصناف والمجموعات",
  reports: "التقارير",
  customers: "العملاء",
  settings: "الإعدادات",
  backup: "النسخ الاحتياطي",
  support: "الدعم الفني",
  about: "معلومات عن البرنامج",
  help: "المساعدة",
  statements: "كشف حساب",
  installments: "الأقساط",
  preview: "معاينة الفواتير",
  customize: "تخصيص البرنامج",
  labels: "ملصقات الباركود",
  purchaseRequests: "طلبات الشراء الذكية",
  returns: "المرتجعات",
  expenses: "المصاريف",
  shifts: "الورديات والكاشير",
  inventoryCount: "جرد بالباركود",
};

export type CustomModule = {
  id: string;
  label: string;
  target: ScreenKey;
  icon: string;
  color: string;
  content: string;
};

export const CUSTOM_ICON_OPTIONS = [
  "NotebookPen", "Pencil", "BookOpen", "Boxes", "Star", "ClipboardList",
  "GraduationCap", "Printer", "Calculator", "FileText", "Tags", "Palette",
];

export function parseVisibleModules(value?: string): ScreenKey[] {
  if (!value) return [...ALL_MODULES];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [...ALL_MODULES];
    const selected = parsed.filter((item): item is ScreenKey => ALL_MODULES.includes(item as ScreenKey));
    return Array.from(new Set([...LOCKED_MODULES, ...selected]));
  } catch {
    return [...ALL_MODULES];
  }
}

export function parseCustomModules(value?: string): CustomModule[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is CustomModule =>
      Boolean(item && typeof item === "object" && (item as CustomModule).label));
  } catch {
    return [];
  }
}

export function parseUiFlags(value?: string): UiFlags {
  if (!value) return { ...DEFAULT_UI_FLAGS };
  try {
    const parsed = JSON.parse(value) as Partial<UiFlags>;
    return { ...DEFAULT_UI_FLAGS, ...parsed };
  } catch {
    return { ...DEFAULT_UI_FLAGS };
  }
}
