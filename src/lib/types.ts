/** أنواع البيانات المشتركة - متوافق مع Vercel */
export type ScreenKey =
  | "home"
  | "sales"
  | "purchases"
  | "inventory"
  | "catalog"
  | "reports"
  | "customers"
  | "settings"
  | "backup"
  | "support"
  | "about"
  | "help"
  | "statements"
  | "installments"
  | "preview"
  | "customize"
  | "labels"
  | "purchaseRequests"
  | "shifts"
  | "inventoryCount"
  | "returns"
  | "expenses";

export type StoreSettings = {
  storeName: string;
  subtitle: string;
  phone: string;
  address: string;
  taxNumber: string;
  currency: string;
  defaultTax: string;
  printer: string;
  footer: string;
  theme: string;
  customPrimary: string;
  customAccent: string;
  invoiceHeader: string;
  invoiceSubtitle: string;
  invoiceAccent: string;
  invoiceTableHeader: string;
  invoiceLogoUrl: string;
  invoiceShowLogo: string;
  invoiceShowBarcode: string;
  invoiceShowTax: string;
  invoiceShowBalance: string;
  invoicePaper: string;
  invoiceFontSize: string;
  invoiceFooter: string;
  visibleModules: string;
  customModules: string;
  uiFlags: string;
  // إضافات المظهر
  fontFamily: string;
  homeFontScale: string;
  sidebarFontScale: string;
  buttonRadius: string;
  buttonStyle: string;
  uiDensity: string;
  tableStriped: string;
  reduceMotion: string;
  invoiceTemplate: string;
  invoiceStartNumber: string;
  installmentAlertMonths: string;
  selectSound: string;
};

export const DEFAULT_SETTINGS: StoreSettings = {
  storeName: "الجمال للأدوات المدرسية",
  subtitle: "للأدوات المدرسية والمكتبية",
  phone: "01222355769",
  address: "جمهورية مصر العربية",
  taxNumber: "",
  currency: "ج.م",
  defaultTax: "0",
  printer: "الطابعة الافتراضية للنظام",
  footer: "شكراً لتعاملكم معنا",
  theme: "blue",
  customPrimary: "",
  customAccent: "",
  invoiceHeader: "الجمال للأدوات المدرسية",
  invoiceSubtitle: "للأدوات المدرسية والمكتبية والقرطاسية",
  invoiceAccent: "#0b4fa2",
  invoiceTableHeader: "#e4f0fc",
  invoiceLogoUrl: "",
  invoiceShowLogo: "true",
  invoiceShowBarcode: "true",
  invoiceShowTax: "true",
  invoiceShowBalance: "true",
  invoicePaper: "A4",
  invoiceFontSize: "12",
  invoiceFooter: "شكراً لتعاملكم معنا — لا ترد البضاعة بعد 3 أيام",
  visibleModules: "",
  customModules: "[]",
  uiFlags: "",
  fontFamily: "cairo",
  homeFontScale: "88",
  sidebarFontScale: "88",
  buttonRadius: "6",
  buttonStyle: "gradient",
  uiDensity: "comfortable",
  tableStriped: "true",
  reduceMotion: "false",
  invoiceTemplate: "modern",
  invoiceStartNumber: "1001",
  installmentAlertMonths: "2",
  selectSound: "true",
};

export type Product = {
  id: number;
  code: string;
  barcode: string;
  name: string;
  category: string;
  categoryGroup: string;
  unit: string;
  purchasePrice: number;
  salePrice: number;
  quantity: number;
  minQuantity: number;
  taxRate: number;
  active: boolean;
  createdAt: string;
};

export type Customer = {
  id: number;
  code: string;
  name: string;
  phone: string;
  address: string;
  customerType: string;
  balance: number;
  openingBalance: number;
  installmentEnabled: boolean;
  installmentStartedAt: string | null;
  createdAt: string;
};

export type InvoiceItem = {
  id: number;
  invoiceId: number;
  productId: number | null;
  productCode: string;
  productName: string;
  barcode: string;
  unit: string;
  quantity: number;
  price: number;
  discount: number;
  total: number;
};

export type Invoice = {
  id: number;
  invoiceNo: string;
  type: string;
  customerId: number | null;
  customerName: string;
  paymentType: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paid: number;
  remaining: number;
  notes: string;
  status: string;
  invoiceDate: string;
  createdAt: string;
  items?: InvoiceItem[];
};

export type Payment = {
  id: number;
  customerId: number;
  amount: number;
  method: string;
  note: string;
  paymentDate: string;
  createdAt: string;
};

export type PaymentAllocation = {
  id: number;
  paymentId: number;
  invoiceId: number;
  amount: number;
};

export type ProductGroup = {
  id: number;
  name: string;
  color: string;
  createdAt: string;
  productCount?: number;
  categoryCount?: number;
};

export type ProductCategory = {
  id: number;
  name: string;
  groupName: string;
  color: string;
  createdAt: string;
};

export type SupportTicket = {
  id: number;
  name: string;
  phone: string;
  subject: string;
  message: string;
  status: string;
  createdAt: string;
};

export type ReportsData = {
  salesTotal: number;
  purchasesTotal: number;
  salesCount: number;
  purchasesCount: number;
  profit: number;
  productsCount: number;
  customersCount: number;
  stockValue: number;
  expensesTotal: number;
  returnsTotal: number;
  netProfit: number;
  lowStock: Product[];
  topProducts: Array<{ name: string; quantity: number; total: number }>;
  daily: Array<{ day: string; total: number }>;
  recent: Invoice[];
};

export type StatementTransaction = {
  id: string;
  date: string;
  kind: "invoice" | "payment";
  description: string;
  reference: string;
  debit: number;
  credit: number;
  balance: number;
};

export type StatementData = {
  customer: Customer;
  opening: number;
  debitTotal: number;
  creditTotal: number;
  closing: number;
  transactions: StatementTransaction[];
};

export type AppUser = {
  id: number;
  code: string;
  name: string;
  phone: string;
  role: string;
  active: boolean;
  createdAt: string;
};

export type Shift = {
  id: number;
  userId: number | null;
  userName: string;
  role: string;
  startAt: string;
  endAt: string | null;
  startingCash: number;
  endingCash: number;
  totalSales: number;
  totalPurchases: number;
  salesCount: number;
  status: string;
  notes: string;
  createdAt: string;
};

export type PurchaseOrder = {
  id: number;
  orderNo: string;
  status: string;
  supplierName: string;
  totalItems: number;
  totalCost: number;
  notes: string;
  createdBy: string;
  createdAt: string;
  items?: PurchaseOrderItem[];
};

export type PurchaseOrderItem = {
  id: number;
  orderId: number;
  productId: number | null;
  productCode: string;
  productName: string;
  quantity: number;
  purchasePrice: number;
  total: number;
};

export type InventoryCount = {
  id: number;
  countNo: string;
  title: string;
  status: string;
  createdBy: string;
  totalScanned: number;
  totalVariance: number;
  notes: string;
  createdAt: string;
  items?: InventoryCountItem[];
};

export type InventoryCountItem = {
  id: number;
  countId: number;
  productId: number | null;
  productCode: string;
  productName: string;
  systemQuantity: number;
  countedQuantity: number;
  variance: number;
};

export type Expense = {
  id: number;
  code: string;
  title: string;
  category: string;
  amount: number;
  expenseDate: string;
  paymentMethod: string;
  notes: string;
  createdBy: string;
  createdAt: string;
};

export type ReturnRecord = {
  id: number;
  returnNo: string;
  type: string;
  originalInvoiceId: number | null;
  originalInvoiceNo: string;
  customerId: number | null;
  customerName: string;
  total: number;
  reason: string;
  status: string;
  createdAt: string;
  items?: ReturnItem[];
};

export type ReturnItem = {
  id: number;
  returnId: number;
  productId: number | null;
  productCode: string;
  productName: string;
  quantity: number;
  price: number;
  total: number;
};
