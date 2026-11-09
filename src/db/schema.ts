import {
  boolean,
  integer,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

const money = (name: string) =>
  numeric(name, { precision: 14, scale: 3, mode: "number" })
    .notNull()
    .default(0);

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  barcode: text("barcode").notNull().default(""),
  name: text("name").notNull(),
  category: text("category").notNull().default("عام"),
  categoryGroup: text("category_group").notNull().default("أدوات مدرسية"),
  unit: text("unit").notNull().default("قطعة"),
  purchasePrice: money("purchase_price"),
  salePrice: money("sale_price"),
  quantity: money("quantity"),
  minQuantity: money("min_quantity"),
  taxRate: money("tax_rate"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  phone: text("phone").notNull().default(""),
  address: text("address").notNull().default(""),
  customerType: text("customer_type").notNull().default("عادي"),
  balance: money("balance"),
  openingBalance: money("opening_balance"),
  installmentEnabled: boolean("installment_enabled").notNull().default(false),
  installmentStartedAt: timestamp("installment_started_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  invoiceNo: text("invoice_no").notNull().unique(),
  type: text("type").notNull().default("sale"),
  customerId: integer("customer_id"),
  customerName: text("customer_name").notNull().default("عميل نقدي"),
  paymentType: text("payment_type").notNull().default("نقدي"),
  subtotal: money("subtotal"),
  discount: money("discount"),
  tax: money("tax"),
  total: money("total"),
  paid: money("paid"),
  remaining: money("remaining"),
  notes: text("notes").notNull().default(""),
  status: text("status").notNull().default("محفوظة"),
  invoiceDate: timestamp("invoice_date", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const invoiceItems = pgTable("invoice_items", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id")
    .notNull()
    .references(() => invoices.id, { onDelete: "cascade" }),
  productId: integer("product_id"),
  productCode: text("product_code").notNull().default(""),
  productName: text("product_name").notNull(),
  barcode: text("barcode").notNull().default(""),
  unit: text("unit").notNull().default("قطعة"),
  quantity: money("quantity"),
  price: money("price"),
  discount: money("discount"),
  total: money("total"),
});

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull().default(""),
});

export const supportTickets = pgTable("support_tickets", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull().default(""),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  status: text("status").notNull().default("جديدة"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull(),
  amount: money("amount"),
  method: text("method").notNull().default("نقدي"),
  note: text("note").notNull().default(""),
  paymentDate: timestamp("payment_date", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const productGroups = pgTable("product_groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  color: text("color").notNull().default("#1675c5"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const productCategories = pgTable("product_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  groupName: text("group_name").notNull().default("أدوات مدرسية"),
  color: text("color").notNull().default("#1675c5"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const paymentAllocations = pgTable("payment_allocations", {
  id: serial("id").primaryKey(),
  paymentId: integer("payment_id").notNull().references(() => payments.id, { onDelete: "cascade" }),
  invoiceId: integer("invoice_id").notNull().references(() => invoices.id, { onDelete: "cascade" }),
  amount: money("amount"),
});

// ---- نظام المستخدمين والورديات ----
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  phone: text("phone").notNull().default(""),
  role: text("role").notNull().default("cashier"),
  password: text("password").notNull().default("1234"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const shifts = pgTable("shifts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  userName: text("user_name").notNull(),
  role: text("role").notNull().default("cashier"),
  startAt: timestamp("start_at", { withTimezone: true }).notNull().defaultNow(),
  endAt: timestamp("end_at", { withTimezone: true }),
  startingCash: money("starting_cash"),
  endingCash: money("ending_cash"),
  totalSales: money("total_sales"),
  totalPurchases: money("total_purchases"),
  salesCount: integer("sales_count").notNull().default(0),
  status: text("status").notNull().default("مفتوحة"),
  notes: text("notes").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---- طلبات الشراء الذكية ----
export const purchaseOrders = pgTable("purchase_orders", {
  id: serial("id").primaryKey(),
  orderNo: text("order_no").notNull().unique(),
  status: text("status").notNull().default("مسودة"),
  supplierName: text("supplier_name").notNull().default("المورد العام"),
  totalItems: integer("total_items").notNull().default(0),
  totalCost: money("total_cost"),
  notes: text("notes").notNull().default(""),
  createdBy: text("created_by").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const purchaseOrderItems = pgTable("purchase_order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id")
    .notNull()
    .references(() => purchaseOrders.id, { onDelete: "cascade" }),
  productId: integer("product_id"),
  productCode: text("product_code").notNull(),
  productName: text("product_name").notNull(),
  quantity: money("quantity"),
  purchasePrice: money("purchase_price"),
  total: money("total"),
});

// ---- الجرد بالباركود ----
export const inventoryCounts = pgTable("inventory_counts", {
  id: serial("id").primaryKey(),
  countNo: text("count_no").notNull().unique(),
  title: text("title").notNull(),
  status: text("status").notNull().default("جارية"),
  createdBy: text("created_by").notNull().default(""),
  totalScanned: integer("total_scanned").notNull().default(0),
  totalVariance: integer("total_variance").notNull().default(0),
  notes: text("notes").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const inventoryCountItems = pgTable("inventory_count_items", {
  id: serial("id").primaryKey(),
  countId: integer("count_id")
    .notNull()
    .references(() => inventoryCounts.id, { onDelete: "cascade" }),
  productId: integer("product_id"),
  productCode: text("product_code").notNull(),
  productName: text("product_name").notNull(),
  systemQuantity: money("system_quantity"),
  countedQuantity: money("counted_quantity"),
  variance: money("variance"),
});

export type PaymentAllocationRow = typeof paymentAllocations.$inferSelect;
export type ProductCategoryRow = typeof productCategories.$inferSelect;
export type ProductGroupRow = typeof productGroups.$inferSelect;
export type PaymentRow = typeof payments.$inferSelect;

export type ProductRow = typeof products.$inferSelect;
export type CustomerRow = typeof customers.$inferSelect;
export type InvoiceRow = typeof invoices.$inferSelect;
export type InvoiceItemRow = typeof invoiceItems.$inferSelect;
export type SettingRow = typeof settings.$inferSelect;
export type SupportTicketRow = typeof supportTickets.$inferSelect;
export type UserRow = typeof users.$inferSelect;
export type ShiftRow = typeof shifts.$inferSelect;
export type PurchaseOrderRow = typeof purchaseOrders.$inferSelect;
export type PurchaseOrderItemRow = typeof purchaseOrderItems.$inferSelect;
export type InventoryCountRow = typeof inventoryCounts.$inferSelect;
export type InventoryCountItemRow = typeof inventoryCountItems.$inferSelect;
