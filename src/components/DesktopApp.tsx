"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  BadgeCheck, BarChart3, Barcode, BookOpen, Boxes, Calculator, ChevronLeft, ClipboardList,
  Clock3, Database, FileSearch, FileText, GraduationCap, HandCoins, Headset, HelpCircle, Home,
  Info, LogOut, Minus, NotebookPen, Package, Palette, Pencil, Phone, Printer,
  Save, Settings, ShoppingBasket, ShoppingCart, SlidersHorizontal, Square, Star,
  Tags, Users, Wallet, Warehouse, Wifi, X, type LucideIcon,
} from "lucide-react";
import { api } from "@/lib/client-api";
import { dateTime, money, num } from "@/lib/format";
import {
  getThemeKey, getThemeVars, MODULE_LABELS, parseCustomModules, parseUiFlags,
  parseVisibleModules, type CustomModule, type UiFlags,
} from "@/lib/appearance";
import {
  DEFAULT_SETTINGS, type Customer, type Invoice, type Product, type ReportsData,
  type ScreenKey, type StoreSettings, type SupportTicket, type ProductCategory, type ProductGroup,
} from "@/lib/types";
import PosScreen from "@/components/PosScreen";
import InventoryScreen from "@/components/InventoryScreen";
import CustomersScreen from "@/components/CustomersScreen";
import ReportsScreen from "@/components/ReportsScreen";
import SettingsScreen from "@/components/SettingsScreen";
import BackupScreen from "@/components/BackupScreen";
import SupportScreen from "@/components/SupportScreen";
import InfoScreen from "@/components/InfoScreen";
import { useSession } from "@/lib/session-context";
import PriceLookupPanel from "@/components/PriceLookupPanel";
import PairingModal, { type ScanSession } from "@/components/PairingModal";
import { Monitor, Smartphone, Tag } from "lucide-react";
import PurchaseRequestsScreen from "@/components/PurchaseRequestsScreen";
import ShiftsScreen from "@/components/ShiftsScreen";
import InventoryCountScreen from "@/components/InventoryCountScreen";
import { SUPPORT, whatsappLink } from "@/lib/support";
import StatementsScreen from "@/components/StatementsScreen";
import InvoicePreviewScreen from "@/components/InvoicePreviewScreen";
import CustomizationScreen from "@/components/CustomizationScreen";
import InstallmentsScreen from "@/components/InstallmentsScreen";
import BarcodeLabelsScreen from "@/components/BarcodeLabelsScreen";
import type { InstallmentsData } from "@/lib/installments";

type Props = {
  initialProducts: Product[];
  initialCustomers: Customer[];
  initialInvoices: Invoice[];
  initialSettings: StoreSettings;
};

type ToastState = { message: string; error: boolean } | null;
type TileKey = ScreenKey | "exit";
// قراءة باركود قادمة من الموبايل (نفس شكل ScanItem في الخادم)
type ScanItemDto = { id: number; code: string; found: boolean; blocked: boolean; product: { id: number } | null };

const MODULE_ICONS: Record<ScreenKey, LucideIcon> = {
  home: Home, sales: ShoppingCart, purchases: Package, inventory: Warehouse,
  reports: BarChart3, customers: Users, settings: Settings, backup: Database,
  support: Headset, about: Info, help: HelpCircle, statements: Wallet,
  preview: FileSearch, customize: SlidersHorizontal, installments: HandCoins, catalog: Boxes, labels: Barcode,
  purchaseRequests: ShoppingBasket, shifts: Clock3, inventoryCount: ClipboardList,
};

const CUSTOM_ICONS: Record<string, LucideIcon> = {
  NotebookPen, Pencil, BookOpen, Boxes, Star, ClipboardList, GraduationCap,
  Printer, Calculator, FileText, Tags, Palette,
};

const NAV_ORDER: ScreenKey[] = [
  "home", "sales", "purchases", "purchaseRequests", "inventory", "inventoryCount", "catalog", "labels", "reports", "statements", "installments", "preview",
  "customers", "shifts", "backup", "support", "settings", "customize", "help",
];

const TILE_DEFS: { key: TileKey; label: string; icon: LucideIcon; color: string }[] = [
  { key: "settings", label: "الإعدادات", icon: Settings, color: "linear-gradient(#2f9cef,#0754a8)" },
  { key: "reports", label: "التقارير", icon: BarChart3, color: "linear-gradient(#f6a14a,#d9531e)" },
  { key: "inventory", label: "المخازن", icon: Warehouse, color: "linear-gradient(#3b92e8,#0b4b9d)" },
  { key: "catalog", label: "الأصناف والمجموعات", icon: Boxes, color: "linear-gradient(#8b6fd8,#5a35a8)" },
  { key: "labels", label: "ملصقات الباركود", icon: Barcode, color: "linear-gradient(#4aa3df,#155a9b)" },
  { key: "purchases", label: "المشتريات", icon: Package, color: "linear-gradient(#f5bb54,#c87912)" },
  { key: "sales", label: "المبيعات", icon: ShoppingCart, color: "linear-gradient(#48bd6b,#13873c)" },
  { key: "statements", label: "كشف حساب", icon: Wallet, color: "linear-gradient(#38b6a8,#0d766e)" },
  { key: "installments", label: "الأقساط", icon: HandCoins, color: "linear-gradient(#e9a84c,#b86a12)" },
  { key: "preview", label: "معاينة الفواتير", icon: FileSearch, color: "linear-gradient(#a37ae6,#6335a8)" },
  { key: "customers", label: "العملاء", icon: Users, color: "linear-gradient(#f3a75f,#c66b1d)" },
  { key: "backup", label: "النسخ الاحتياطي", icon: Database, color: "linear-gradient(#5bca8c,#128649)" },
  { key: "support", label: "الدعم الفني", icon: Headset, color: "linear-gradient(#4595e2,#0b408a)" },
  { key: "customize", label: "تخصيص البرنامج", icon: SlidersHorizontal, color: "linear-gradient(#627fa8,#243d63)" },
  { key: "purchaseRequests", label: "طلبات الشراء الذكية", icon: ShoppingBasket, color: "linear-gradient(#e68a1a,#a85d00)" },
  { key: "shifts", label: "الورديات والكاشير", icon: Clock3, color: "linear-gradient(#4b7edb,#103a8a)" },
  { key: "inventoryCount", label: "جرد بالباركود", icon: ClipboardList, color: "linear-gradient(#36b58a,#0d6648)" },
  { key: "about", label: "معلومات عن البرنامج", icon: Info, color: "linear-gradient(#38a7ec,#0b5eae)" },
  { key: "help", label: "المساعدة", icon: HelpCircle, color: "linear-gradient(#f0c04a,#b77c0b)" },
  { key: "exit", label: "خروج", icon: LogOut, color: "linear-gradient(#ef6565,#b51010)" },
];

const SCREEN_TITLES: Record<ScreenKey, { title: string; sub: string; icon: LucideIcon }> = {
  home: { title: "الشاشة الرئيسية", sub: "الجمال للأدوات المدرسية والمكتبية", icon: Home },
  sales: { title: "شاشة المبيعات", sub: "نقطة البيع وفواتير العملاء", icon: ShoppingCart },
  purchases: { title: "شاشة المشتريات", sub: "تسجيل فواتير الموردين وتحديث المخزون", icon: Package },
  inventory: { title: "المخازن والأصناف", sub: "إدارة الأدوات المدرسية والمكتبية", icon: Warehouse },
  catalog: { title: "الأصناف والمجموعات", sub: "عرض وتعديل كل الأصناف والمجموعات والتصنيفات", icon: Boxes },
  labels: { title: "ملصقات الباركود", sub: "إنشاء ومعاينة وطباعة ملصقات الأسعار والباركود", icon: Barcode },
  reports: { title: "التقارير والإحصائيات", sub: "ملخص الأداء المالي والمخزون", icon: BarChart3 },
  customers: { title: "العملاء", sub: "بيانات المكتبات والمدارس والأرصدة", icon: Users },
  settings: { title: "الإعدادات", sub: "البيانات، تصميم الفواتير، الثيمات والتخصيص", icon: Settings },
  backup: { title: "النسخ الاحتياطي", sub: "تصدير واستعادة قاعدة البيانات", icon: Database },
  support: { title: "الدعم الفني", sub: "التواصل مع فريق الدعم", icon: Headset },
  about: { title: "معلومات عن البرنامج", sub: "الإصدار والمميزات", icon: Info },
  help: { title: "المساعدة ودليل التشغيل", sub: "الاختصارات، الاقتراحات وتجهيز ملف EXE", icon: HelpCircle },
  statements: { title: "كشف حساب العملاء", sub: "الفواتير، المتحصلات والأرصدة", icon: Wallet },
  installments: { title: "الأقساط والتحصيل", sub: "أرصدة العملاء وآخر دفعة وتنبيهات التأخير", icon: HandCoins },
  preview: { title: "معاينة الفواتير", sub: "معاينة التصميم النهائي قبل الطباعة", icon: FileSearch },
  customize: { title: "تخصيص البرنامج", sub: "إخفاء وإضافة وحذف الوحدات وعناصر الواجهة", icon: SlidersHorizontal },
  purchaseRequests: { title: "طلبات الشراء الذكية", sub: "مراقبة النواقص واقتراح كميات الشراء تلقائياً", icon: ShoppingBasket },
  shifts: { title: "الورديات والكاشير", sub: "إدارة المستخدمين والورديات مع تقرير كل وردية", icon: Clock3 },
  inventoryCount: { title: "الجرد بالباركود", sub: "مسح الأصناف بالموبايل وتقرير الفروقات", icon: ClipboardList },
};

function CustomIcon({ name, size = 24 }: { name: string; size?: number }) {
  const Icon = CUSTOM_ICONS[name] ?? Star;
  return <Icon size={size} strokeWidth={2.2} />;
}

function HomeScreen({
  onNavigate, onCustomClick, stats, settings, flags, visibleModules, customModules,
}: {
  onNavigate: (screen: TileKey) => void;
  onCustomClick: (module: CustomModule) => void;
  stats: ReportsData | null;
  settings: StoreSettings;
  flags: UiFlags;
  visibleModules: ScreenKey[];
  customModules: CustomModule[];
}) {
  const builtinTiles = TILE_DEFS.filter((tile) => tile.key === "exit" || visibleModules.includes(tile.key as ScreenKey));

  return (
    <div className="home-screen">
      <div className="hero">
        <div className="hero-speed" />
        <ShoppingCart className="hero-cart" size={88} strokeWidth={2.4} />
        <div className="hero-text">
          <div className="hero-small">برنامج</div>
          <div className="hero-big">الجمال</div>
        </div>
        {flags.showHeroSlogan && <div className="hero-banner">الجمال للأدوات المدرسية والمكتبية — إدارة احترافية لمكتبتك لمزيد من النجاح</div>}
        {flags.showSeal && <div className="hero-seal">برنامج<br />الجمال<br />الاختيار الأفضل</div>}
      </div>

      <div className="home-tiles">
        {builtinTiles.map((tile) => {
          const Icon = tile.icon;
          return (
            <button key={tile.key} className="tile" onClick={() => onNavigate(tile.key)}>
              <span className="tile-icon" style={{ background: tile.color }}><Icon size={30} strokeWidth={2.2} /></span>
              <span className="tile-label">{tile.label}</span>
            </button>
          );
        })}
        {customModules.map((module) => (
          <button key={module.id} className="tile" onClick={() => onCustomClick(module)}>
            <span className="tile-icon" style={{ background: `linear-gradient(${module.color}, #173a63)` }}><CustomIcon name={module.icon} size={30} /></span>
            <span className="tile-label">{module.label}</span>
          </button>
        ))}
      </div>

      <div className="home-footer">
        <div className="footer-slogan">مع الجمال للأدوات المدرسية<br />إدارة أسهل .. ونجاح أكبر</div>
        {flags.showFooterPhone ? (
          <div className="footer-phone">
            <span className="phone-circle"><Phone size={25} fill="white" /></span>
            <a className="support-link" href={whatsappLink("السلام عليكم م. وائل، محتاج مساعدة في برنامج الجمال.")} target="_blank" rel="noreferrer" title={`واتساب ${SUPPORT.name}`}><span className="phone-number">{SUPPORT.phone}</span></a>
          </div>
        ) : (
          <div className="footer-slogan" style={{ zIndex: 2, textAlign: "center" }}>كل احتياجات المدرسة<br />في مكان واحد</div>
        )}
        <div className="footer-features">
          <div><span>✔</span> سهل الاستخدام</div>
          <div><span>✔</span> دعم فني مجاني</div>
          <div><span>✔</span> مناسب للمكتبات والأدوات المدرسية</div>
        </div>
        {flags.showHomeStats && (
          <div className="footer-badge">
            <BadgeCheck size={34} color="#d89a10" />
            <div>مبيعات اليوم<br /><b>{money(stats?.salesTotal ?? 0, settings.currency)}</b></div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DesktopApp({ initialProducts, initialCustomers, initialInvoices, initialSettings }: Props) {
  const { userName, license } = useSession();
  const [screen, setScreen] = useState<ScreenKey>("home");
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);
  const [settings, setSettings] = useState<StoreSettings>(initialSettings ?? DEFAULT_SETTINGS);
  const [reports, setReports] = useState<ReportsData | null>(null);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [installmentsData, setInstallmentsData] = useState<InstallmentsData | null>(null);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [groups, setGroups] = useState<ProductGroup[]>([]);
  const [toast, setToast] = useState<ToastState>(null);
  const [clock, setClock] = useState("");
  const [minimized, setMinimized] = useState(false);
  const [maximized, setMaximized] = useState(true);
  const [exitOpen, setExitOpen] = useState(false);
  const [locked, setLocked] = useState(false);
  const [customModal, setCustomModal] = useState<CustomModule | null>(null);
  const [statementCustomerId, setStatementCustomerId] = useState<number | null>(null);
  const [previewInvoiceId, setPreviewInvoiceId] = useState<number | null>(null);
  // شاشات البيع تبقى مُحمّلة (مخفية) حتى لا تضيع الفاتورة الجارية عند فتح المعاينة
  const [posVisited, setPosVisited] = useState({ sale: false, purchase: false });
  // الشاشة التي فُتحت منها المعاينة، ليعود إليها زر "الرجوع للفاتورة"
  const [returnScreen, setReturnScreen] = useState<ScreenKey>("sales");
  // ربط الموبايل ككاميرا باركود + معرفة سعر الصنف
  const [scanSession, setScanSession] = useState<ScanSession | null>(null);
  const [pairingOpen, setPairingOpen] = useState(false);
  const [scanActive, setScanActive] = useState(false);
  const [phoneLinked, setPhoneLinked] = useState(false);
  const [priceOpen, setPriceOpen] = useState(false);
  const [scanIncoming, setScanIncoming] = useState<{ code: string; nonce: number } | null>(null);
  const lastScanIdRef = useRef(0);
  const screenRef = useRef<ScreenKey>("home");
  const priceOpenRef = useRef(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const visibleModules = useMemo(() => parseVisibleModules(settings.visibleModules), [settings.visibleModules]);
  const customModules = useMemo(() => parseCustomModules(settings.customModules), [settings.customModules]);
  const flags = useMemo(() => parseUiFlags(settings.uiFlags), [settings.uiFlags]);
  const themeStyle = getThemeVars(settings) as CSSProperties;
  const themeKey = getThemeKey(settings.theme);

  const showToast = useCallback((message: string, error = false) => {
    setToast({ message, error });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3800);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const [productData, customerData, invoiceData, settingsData, reportData, ticketData, installmentData, categoryData, groupData] = await Promise.all([
        api<{ products: Product[] }>("/api/products"),
        api<{ customers: Customer[] }>("/api/customers"),
        api<{ invoices: Invoice[] }>("/api/invoices"),
        api<{ settings: StoreSettings }>("/api/settings"),
        api<ReportsData>("/api/reports"),
        api<{ tickets: SupportTicket[] }>("/api/tickets"),
        api<InstallmentsData>("/api/installments"),
        api<{ categories: ProductCategory[] }>("/api/categories"),
        api<{ groups: ProductGroup[] }>("/api/groups"),
      ]);
      setProducts(productData.products);
      setCustomers(customerData.customers);
      setInvoices(invoiceData.invoices);
      setSettings(settingsData.settings);
      setReports(reportData);
      setTickets(ticketData.tickets);
      setInstallmentsData(installmentData);
      setCategories(categoryData.categories);
      setGroups(groupData.groups);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "تعذر تحميل بيانات قاعدة البيانات", true);
    }
  }, [showToast]);

  useEffect(() => {
    const update = () => setClock(dateTime(new Date()));
    update();
    const timer = setInterval(update, 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => { void refresh(); }, 0);
    return () => clearTimeout(timer);
  }, [refresh]);

  // تحديث مراجع الحالة المستخدمة داخل مؤقت الاستطلاع
  useEffect(() => { screenRef.current = screen; }, [screen]);
  useEffect(() => { priceOpenRef.current = priceOpen; }, [priceOpen]);

  // قراءة قادمة من الموبايل: في شاشة البيع تُضاف للفاتورة، وفي أي شاشة أخرى تفتح معرفة السعر
  const handleIncomingScan = useCallback((item: ScanItemDto) => {
    if (priceOpenRef.current) {
      setScanIncoming({ code: item.code, nonce: Date.now() + Math.random() });
      return;
    }
    if (screenRef.current === "sales" || screenRef.current === "purchases") {
      window.dispatchEvent(new CustomEvent("algamal:scan", { detail: item }));
      return;
    }
    setScanIncoming({ code: item.code, nonce: Date.now() + Math.random() });
    setPriceOpen(true);
  }, []);

  // استطلاع الموبايل كل نصف ثانية تقريباً عندما يكون الاستقبال مفعّلاً
  useEffect(() => {
    if (!scanActive) return;
    let stopped = false;
    const tick = async () => {
      try {
        const data = await api<{ items: ScanItemDto[]; linked: boolean }>(`/api/scan/poll?after=${lastScanIdRef.current}`);
        if (stopped) return;
        setPhoneLinked(data.linked);
        for (const item of data.items) {
          lastScanIdRef.current = Math.max(lastScanIdRef.current, item.id);
          handleIncomingScan(item);
        }
      } catch {
        // انقطاع مؤقت: نكمل المحاولة في الدورة التالية
      }
    };
    const interval = setInterval(() => void tick(), 600);
    return () => {
      stopped = true;
      clearInterval(interval);
    };
  }, [scanActive, handleIncomingScan]);

  // اختصار F7 لمعرفة سعر صنف من أي شاشة
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "F7") {
        event.preventDefault();
        setPriceOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const loadScanSession = useCallback(async () => {
    const data = await api<ScanSession>("/api/scan/session");
    setScanSession(data);
    setPhoneLinked(data.linked);
    return data;
  }, []);

  const openPairing = useCallback(async () => {
    setPairingOpen(true);
    try {
      const data = await loadScanSession();
      if (data.enabled) {
        lastScanIdRef.current = data.lastId;
        setScanActive(true);
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : "تعذر تجهيز ربط الموبايل", true);
    }
  }, [loadScanSession, showToast]);

  const rotateScanToken = useCallback(async () => {
    try {
      const data = await api<ScanSession>("/api/scan/session", { method: "POST", body: JSON.stringify({ action: "rotate" }) });
      setScanSession(data);
      lastScanIdRef.current = data.lastId;
      setPhoneLinked(false);
      showToast("تم إلغاء الربط القديم، امسح الكود الجديد من الموبايل");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "تعذر إلغاء الربط", true);
    }
  }, [showToast]);

  const openCustomerDisplay = () => {
    window.open("/customer-display", "algamal-customer-display", "width=1280,height=800");
  };

  const navigate = useCallback((target: TileKey) => {
    if (target === "exit") { setExitOpen(true); return; }
    if (!visibleModules.includes(target)) {
      showToast("هذه الشاشة مخفية حالياً — فعّلها من «تخصيص البرنامج»", true);
      return;
    }
    if (target === "sales") setPosVisited((current) => ({ ...current, sale: true }));
    if (target === "purchases") setPosVisited((current) => ({ ...current, purchase: true }));
    if (target === "preview" && screen !== "preview") setReturnScreen(screen);
    setScreen(target);
    setMinimized(false);
  }, [visibleModules, showToast, screen]);

  const openStatement = useCallback((customerId: number | null) => {
    setStatementCustomerId(customerId);
    setScreen("statements");
    setMinimized(false);
  }, []);

  const openPreview = useCallback((invoiceId: number | null) => {
    if (screen !== "preview") setReturnScreen(screen);
    setPreviewInvoiceId(invoiceId);
    setScreen("preview");
    setMinimized(false);
  }, [screen]);

  const goBackToInvoice = useCallback(() => {
    navigate(returnScreen === "preview" ? "sales" : returnScreen);
  }, [navigate, returnScreen]);

  const backLabel = returnScreen === "sales"
    ? "الرجوع للفاتورة"
    : returnScreen === "purchases"
      ? "الرجوع لفاتورة المشتريات"
      : "الرجوع";

  const handleMaximize = () => {
    setMaximized((value) => !value);
    if (!document.fullscreenElement) void document.documentElement.requestFullscreen?.().catch(() => undefined);
    else void document.exitFullscreen?.().catch(() => undefined);
  };

  const handleClose = () => {
    setLocked(true);
    setExitOpen(false);
    try { window.close(); } catch { /* Browser may refuse programmatic close. */ }
  };

  const HeadIcon = SCREEN_TITLES[screen].icon;
  const common = { onRefresh: refresh, onToast: showToast, settings };

  const renderScreen = () => {
    switch (screen) {
      case "home":
        return <HomeScreen onNavigate={navigate} onCustomClick={setCustomModal} stats={reports} settings={settings} flags={flags} visibleModules={visibleModules} customModules={customModules} />;
      case "inventory":
        return <InventoryScreen products={products} categories={categories} groups={groups} {...common} />;
      case "catalog":
        return <InventoryScreen key="catalog" variant="catalog" products={products} categories={categories} groups={groups} {...common} />;
      case "labels":
        return <BarcodeLabelsScreen products={products} settings={settings} onToast={showToast} />;
      case "customers":
        return <CustomersScreen customers={customers} invoices={invoices} onOpenStatement={openStatement} {...common} />;
      case "reports":
        return <ReportsScreen reports={reports} invoices={invoices} onOpenPreview={openPreview} {...common} />;
      case "settings":
        return <SettingsScreen onNavigate={(target) => navigate(target)} {...common} />;
      case "backup":
        return <BackupScreen products={products} customers={customers} invoices={invoices} {...common} />;
      case "support":
        return <SupportScreen tickets={tickets} {...common} />;
      case "about":
        return <InfoScreen variant="about" onNavigate={navigate} />;
      case "help":
        return <InfoScreen variant="help" onNavigate={navigate} />;
      case "statements":
        return <StatementsScreen key={statementCustomerId ?? "all"} customers={customers} initialCustomerId={statementCustomerId} onNavigate={(target) => navigate(target)} {...common} />;
      case "installments":
        return <InstallmentsScreen data={installmentsData} customers={customers} onOpenStatement={(id) => openStatement(id)} {...common} />;
      case "preview":
        return <InvoicePreviewScreen key={previewInvoiceId ?? "all"} invoices={invoices} customers={customers} initialInvoiceId={previewInvoiceId} onNavigate={(target) => navigate(target)} onBack={goBackToInvoice} backLabel={backLabel} {...common} />;
      case "purchaseRequests":
        return <PurchaseRequestsScreen products={products} {...common} />;
      case "shifts":
        return <ShiftsScreen onToast={showToast} />;
      case "inventoryCount":
        return <InventoryCountScreen onToast={showToast} />;
      case "customize":
        return <CustomizationScreen onNavigate={(target) => navigate(target)} {...common} />;
      default:
        return null;
    }
  };

  if (locked) {
    return (
      <div className="app-root" data-theme={themeKey} data-density={settings.uiDensity || "comfortable"} data-button-style={settings.buttonStyle || "gradient"} data-table-striped={settings.tableStriped || "true"} data-reduce-motion={settings.reduceMotion || "false"} style={themeStyle}>
        <div className="titlebar">
          <div className="titlebar-title"><span className="titlebar-icon">ج</span> {settings.storeName} - {settings.subtitle}</div>
          <div className="win-controls"><button className="win-btn close" onClick={() => setLocked(false)}><X size={13} /></button></div>
        </div>
        <div className="minimized">
          <div className="minimized-message">تم إنهاء الجلسة<br /><button className="btn blue" style={{ marginTop: 18 }} onClick={() => setLocked(false)}>العودة للبرنامج</button></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`app-root ${maximized ? "maximized" : ""}`} data-theme={themeKey} data-density={settings.uiDensity || "comfortable"} data-button-style={settings.buttonStyle || "gradient"} data-table-striped={settings.tableStriped || "true"} data-reduce-motion={settings.reduceMotion || "false"} style={themeStyle}>
      <div className="titlebar">
        <div className="titlebar-title">
          <span className="titlebar-icon">ج</span>
          {settings.storeName} - {settings.subtitle}
          <span style={{ color: "#6f8299", fontWeight: 400 }}> | نسخة سطح المكتب</span>
        </div>
        <div className="win-controls">
          <button className="win-btn" title="تصغير" onClick={() => setMinimized(true)}><Minus size={14} /></button>
          <button className="win-btn" title="تكبير / استعادة" onClick={handleMaximize}><Square size={11} /></button>
          <button className="win-btn close" title="إغلاق" onClick={() => setExitOpen(true)}><X size={14} /></button>
        </div>
      </div>

      {minimized ? (
        <div className="minimized">
          <div className="minimized-message">تم تصغير البرنامج إلى شريط المهام</div>
          <div className="taskbar">
            <button onClick={() => setMinimized(false)}>الجمال للأدوات المدرسية — استعادة</button>
            <span style={{ color: "#dceaff", fontSize: 12 }}>{clock}</span>
          </div>
        </div>
      ) : (
        <div className="app-body">
          <main className="workspace">
            <div className="screen-head compact">
              <div className="head-right">
                <span className="head-icon compact"><HeadIcon size={16} /></span>
                <div className="head-title">{SCREEN_TITLES[screen].title}</div>
              </div>
              <div className="head-actions compact">
                {flags.showClock && <span className="head-chip head-chip-compact"><Clock3 size={12} /> {clock || "—"}</span>}
                <button className="btn compact head-action-btn" onClick={() => setPriceOpen(true)} title="معرفة سعر صنف (F7)"><Tag size={13} /> سعر صنف <kbd className="kbd-mini">F7</kbd></button>
                <button className="btn compact head-action-btn" onClick={openCustomerDisplay} title="شاشة الأسعار للعملاء"><Monitor size={13} /> شاشة العميل</button>
                <button className={`btn compact head-action-btn scan-status-chip ${scanActive ? (phoneLinked ? "linked" : "waiting") : ""}`} onClick={() => (scanActive ? setScanActive(false) : void openPairing())} title={scanActive ? "إيقاف استقبال الموبايل" : "ربط الموبايل ككاميرا باركود"}><Smartphone size={13} /> {scanActive ? (phoneLinked ? "الموبايل متصل" : "بانتظار الموبايل") : "ربط الموبايل"}</button>
                {flags.showDbStatus && <span className="head-chip head-chip-compact"><Wifi size={12} /> متصلة</span>}
                {screen !== "home" && <button className="btn compact" onClick={() => navigate("home")}><ChevronLeft size={13} /> الرئيسية</button>}
              </div>
            </div>

            <div className={`work-area ${screen === "home" || screen === "sales" || screen === "purchases" ? "flush" : ""}`}>
              {posVisited.sale && (
                <div className="pos-host" style={{ display: screen === "sales" ? "block" : "none", height: "100%" }}>
                  <PosScreen mode="sale" active={screen === "sales"} products={products} customers={customers} invoices={invoices} uiFlags={flags} {...common} />
                </div>
              )}
              {posVisited.purchase && (
                <div className="pos-host" style={{ display: screen === "purchases" ? "block" : "none", height: "100%" }}>
                  <PosScreen mode="purchase" active={screen === "purchases"} products={products} customers={customers} invoices={invoices} uiFlags={flags} {...common} />
                </div>
              )}
              {screen !== "sales" && screen !== "purchases" && renderScreen()}
            </div>
          </main>

          <aside className="sidebar">
            <div className="side-logo"><strong>الجمال</strong><span>للأدوات المدرسية والمكتبية</span></div>
            {NAV_ORDER.filter((key) => visibleModules.includes(key)).map((key) => {
              const Icon = MODULE_ICONS[key];
              return <button key={key} className={`side-btn ${screen === key ? "active" : ""}`} onClick={() => navigate(key)}><span>{MODULE_LABELS[key]}</span><Icon size={22} /></button>;
            })}
            <div className="side-separator" />
            {visibleModules.includes("about") && <button className="side-btn" onClick={() => navigate("about")}><span>عن البرنامج</span><Info size={22} /></button>}
            {flags.showSidebarNote && (
              <div className="side-note">
                <b>الدعم الفني</b><br />
                <a className="support-link-small" dir="ltr" href={whatsappLink("السلام عليكم م. وائل، محتاج مساعدة في برنامج الجمال.")} target="_blank" rel="noreferrer" style={{ display: "inline-block", marginTop: 3 }}>{SUPPORT.phone}</a><br />
                عدد الأصناف: {products.length}<br />
                فواتير محفوظة: {invoices.length}<br />
                المبيعات: {money(num(reports?.salesTotal), settings.currency)}
              </div>
            )}
          </aside>
        </div>
      )}

      {flags.showStatusBar && (
        <div className="statusbar">
          <span className="status-item"><span className="status-dot" /> جاهز للعمل</span>
          <span className="status-item">المستخدم: {userName}</span>
          <span className="status-item">الصلاحية: كاملة</span>
          <span className="status-item grow">قاعدة البيانات متصلة — {settings.storeName}</span>
          <span className="status-item"><Save size={12} style={{ verticalAlign: "middle" }} /> الإصدار 2.0.0</span>
          {flags.showClock && <span className="status-item" dir="ltr">{clock || "--:--"}</span>}
        </div>
      )}

      {priceOpen && (
        <PriceLookupPanel
          key={scanIncoming?.nonce ?? "manual"}
          variant="modal"
          products={products}
          currency={settings.currency}
          storeName={settings.storeName}
          initialQuery={scanIncoming?.code}
          onClose={() => {
            setPriceOpen(false);
            setScanIncoming(null);
          }}
        />
      )}

      {pairingOpen && (
        <PairingModal
          session={scanSession}
          receiving={scanActive}
          linked={phoneLinked}
          onClose={() => setPairingOpen(false)}
          onRotate={() => void rotateScanToken()}
          onStop={() => {
            setScanActive(false);
            setPairingOpen(false);
          }}
        />
      )}

      {toast && (
        <div className={`toast ${toast.error ? "error" : ""}`} onClick={() => setToast(null)}>
          {toast.error ? <X size={18} /> : <BadgeCheck size={19} />} {toast.message}
        </div>
      )}

      {exitOpen && (
        <div className="modal-backdrop">
          <div className="modal" style={{ width: 430 }}>
            <div className="modal-head"><span>تأكيد الخروج</span><button className="btn small" onClick={() => setExitOpen(false)}><X size={13} /></button></div>
            <div className="modal-body" style={{ textAlign: "center", fontSize: 15, fontWeight: 800, lineHeight: 2 }}>
              <LogOut size={42} color="#c91414" style={{ marginBottom: 6 }} />
              <div>هل تريد إغلاق برنامج الجمال؟</div>
              <div style={{ fontSize: 12, color: "#667c94", fontWeight: 500 }}>سيتم حفظ جميع الفواتير تلقائياً في قاعدة البيانات.</div>
            </div>
            <div className="modal-foot" style={{ justifyContent: "center" }}>
              <button className="btn red" onClick={handleClose}><LogOut size={14} /> نعم، إغلاق</button>
              <button className="btn" onClick={() => setExitOpen(false)}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {customModal && (
        <div className="modal-backdrop">
          <div className="modal" style={{ width: 500 }}>
            <div className="modal-head"><span>{customModal.label}</span><button className="btn small" onClick={() => setCustomModal(null)}><X size={13} /></button></div>
            <div className="modal-body">
              <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
                <span className="custom-icon-preview" style={{ background: customModal.color }}><CustomIcon name={customModal.icon} size={20} /></span>
                <div><b style={{ fontSize: 16 }}>{customModal.label}</b><div style={{ fontSize: 11, color: "#6b7e93" }}>اختصار مخصص يفتح: {MODULE_LABELS[customModal.target]}</div></div>
              </div>
              <div className="info-box">{customModal.content || "لا يوجد محتوى إضافي لهذا الاختصار. يمكنك تعديله من شاشة تخصيص البرنامج."}</div>
            </div>
            <div className="modal-foot">
              <button className="btn blue" onClick={() => { navigate(customModal.target); setCustomModal(null); }}>فتح {MODULE_LABELS[customModal.target]}</button>
              <button className="btn" onClick={() => navigate("customize")}>تعديل الاختصارات</button>
              <button className="btn" onClick={() => setCustomModal(null)}>إغلاق</button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}
