/**
 * واجهة TypeScript لقاعدة SQLite المحلية داخل برنامج سطح المكتب (Electron).
 * في المتصفح العادي لا يوجد window.db، لذلك ترجع getDesktopDb() القيمة null.
 */

export type UserRole = "admin" | "cashier" | "viewer";
export type InvoiceStatus = "محفوظة" | "آجل" | "مسددة";

export interface ListOptions {
  limit?: number;
  offset?: number;
}

export interface DbUser {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  active: boolean;
  createdAt: string;
  updatedAt: string | null;
}

export interface DbUserInput {
  name: string;
  email: string;
  phone?: string | null;
  role?: UserRole;
  active?: boolean;
}

export interface DbProduct {
  id: number;
  code: string | null;
  name: string;
  category: string;
  unit: string;
  purchasePrice: number;
  salePrice: number;
  quantity: number;
  createdAt: string;
  updatedAt: string | null;
}

export interface DbProductInput {
  name: string;
  code?: string | null;
  category?: string;
  unit?: string;
  purchasePrice?: number | string;
  salePrice?: number | string;
  quantity?: number | string;
}

export interface DbInvoice {
  id: number;
  invoiceNo: string;
  customerName: string;
  total: number;
  paid: number;
  status: InvoiceStatus;
  notes: string;
  invoiceDate: string;
  createdAt: string;
  updatedAt: string | null;
}

export interface DbInvoiceInput {
  invoiceNo: string;
  total: number | string;
  customerName?: string;
  paid?: number | string;
  status?: InvoiceStatus;
  notes?: string;
  invoiceDate?: string;
}

export interface DbInfo {
  ok: boolean;
  driver: string;
  path: string | null;
  isOpen: boolean;
  schemaVersion: number | null;
  latestSchemaVersion: number;
  sizeBytes: number;
}

export interface DesktopDbApi {
  addUser(data: DbUserInput): Promise<DbUser>;
  getAllUsers(options?: ListOptions): Promise<DbUser[]>;
  getUserById(id: number): Promise<DbUser | null>;
  updateUser(id: number, data: Partial<DbUserInput>): Promise<DbUser>;
  deleteUser(id: number): Promise<{ deleted: boolean }>;

  addProduct(data: DbProductInput): Promise<DbProduct>;
  getAllProducts(options?: ListOptions): Promise<DbProduct[]>;
  getProductById(id: number): Promise<DbProduct | null>;
  updateProduct(id: number, data: Partial<DbProductInput>): Promise<DbProduct>;
  deleteProduct(id: number): Promise<{ deleted: boolean }>;

  addInvoice(data: DbInvoiceInput): Promise<DbInvoice>;
  getAllInvoices(options?: ListOptions): Promise<DbInvoice[]>;
  getInvoiceById(id: number): Promise<DbInvoice | null>;
  updateInvoice(id: number, data: Partial<DbInvoiceInput>): Promise<DbInvoice>;
  deleteInvoice(id: number): Promise<{ deleted: boolean }>;

  dbInfo(): Promise<DbInfo>;
}

declare global {
  interface Window {
    db?: DesktopDbApi;
  }
}

/** يرجع واجهة قاعدة البيانات داخل Electron، أو null عند التشغيل في المتصفح. */
export function getDesktopDb(): DesktopDbApi | null {
  if (typeof window === "undefined") return null;
  return window.db ?? null;
}

// الرسالة القادمة من الـ preload بالصيغة: "[CODE] رسالة عربية"
// (contextBridge ينقل الرسالة فقط، لذلك نضع الكود داخلها).
const ERROR_PREFIX = /^\[([A-Z_]+)\]\s*/;

/** يستخرج كود الخطأ مثل DUPLICATE أو REQUIRED أو NOT_FOUND. */
export function getDbErrorCode(error: unknown): string | null {
  if (error instanceof Error) {
    const match = ERROR_PREFIX.exec(error.message);
    if (match) return match[1];
  }
  return null;
}

/** يرجع رسالة الخطأ العربية بدون بادئة الكود، جاهزة للعرض للمستخدم. */
export function getDbErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message.replace(ERROR_PREFIX, "");
  return "حدث خطأ غير متوقع";
}
