import { guardRead, guardTrialProducts, guardWrite } from "@/lib/license/guard";
import { db } from "@/db";
import { customers, invoiceItems, invoices, products } from "@/db/schema";
import { desc, eq, inArray, sql } from "drizzle-orm";
import { badRequest, errorResponse, float, getSettings, readJson, str } from "@/lib/server";
import { ensureSeed } from "@/lib/seed";
import { round } from "@/lib/format";
import { invoiceStart, nextInvoiceNumber } from "@/lib/invoice-number";
import { dateKey } from "@/lib/installments";

export const dynamic = "force-dynamic";

type IncomingItem = {
  productId?: number | null;
  productCode?: string;
  productName?: string;
  barcode?: string;
  unit?: string;
  quantity?: number;
  price?: number;
  discount?: number;
};

type InvoiceBody = {
  type?: string;
  customerId?: number | null;
  customerName?: string;
  paymentType?: string;
  discount?: number;
  tax?: number;
  paid?: number;
  notes?: string;
  invoiceDate?: string;
  items?: IncomingItem[];
};

export async function GET(request: Request) {
  const denied = await guardRead();
  if (denied) return denied;
  try {
    await ensureSeed();
    const type = new URL(request.url).searchParams.get("type");
    const rows = type
      ? await db.select().from(invoices).where(eq(invoices.type, type)).orderBy(desc(invoices.id)).limit(200)
      : await db.select().from(invoices).orderBy(desc(invoices.id)).limit(200);
    return Response.json({ invoices: rows });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  const denied = await guardWrite();
  if (denied) return denied;
  try {
    await ensureSeed();
    const body = await readJson<InvoiceBody>(request);
    const rawItems = Array.isArray(body.items) ? body.items : [];
    if (rawItems.length === 0) return badRequest("لا يمكن حفظ فاتورة بدون أصناف");
    const type = body.type === "purchase" ? "purchase" : "sale";
    const paymentType = ["نقدي", "آجل", "قسط", "شبكة"].includes(str(body.paymentType)) ? str(body.paymentType) : "نقدي";
    const items = rawItems
      .filter((item) => str(item.productName) && float(item.quantity) > 0)
      .map((item) => {
        const quantity = round(float(item.quantity));
        const price = round(Math.max(0, float(item.price)));
        const discount = round(Math.min(quantity * price, Math.max(0, float(item.discount))));
        return {
          productId: item.productId ? Number(item.productId) : null,
          productCode: str(item.productCode), productName: str(item.productName),
          barcode: str(item.barcode), unit: str(item.unit, "قطعة") || "قطعة",
          quantity, price, discount, total: round(quantity * price - discount),
        };
      });
    if (items.length !== rawItems.length || items.some((item) => item.quantity <= 0 || item.price < 0)) {
      return badRequest("راجع الكميات والأسعار؛ يجب أن تكون قيمًا صحيحة");
    }
    const invoiceDate = body.invoiceDate ? new Date(`${body.invoiceDate.slice(0, 10)}T12:00:00`) : new Date();
    if (Number.isNaN(invoiceDate.getTime())) return badRequest("تاريخ الفاتورة غير صحيح");
    if (dateKey(invoiceDate) > dateKey(new Date())) return badRequest("لا يمكن تسجيل فاتورة بتاريخ مستقبلي");
    const settings = await getSettings();

    const trialDenied = await guardTrialProducts(items.map((item) => item.productId));
    if (trialDenied) return trialDenied;

    const result = await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext('algamal-invoice-number'))`);
      const invoiceNo = await nextInvoiceNumber(tx, invoiceStart(settings.invoiceStartNumber));
      const productIds = Array.from(new Set(items.map((item) => item.productId).filter((id): id is number => Boolean(id)))).sort((a, b) => a - b);
      const lockedProducts = productIds.length
        ? await tx.select().from(products).where(inArray(products.id, productIds)).orderBy(products.id).for("update")
        : [];
      if (type === "sale") {
        for (const product of lockedProducts) {
          const requested = items.filter((item) => item.productId === product.id).reduce((sum, item) => sum + item.quantity, 0);
          if (product.quantity < requested) throw new Error(`الكمية غير متوفرة: ${product.name} (المتوفر ${product.quantity})`);
        }
      }

      const customerId = body.customerId ? Number(body.customerId) : null;
      const [customer] = customerId ? await tx.select().from(customers).where(eq(customers.id, customerId)).for("update") : [];
      if (customerId && !customer) throw new Error("العميل غير موجود");
      if (type === "sale" && paymentType === "قسط" && (!customer || customer.name.includes("نقدي"))) {
        throw new Error("اختر عميلاً باسمه للبيع بالقسط، أو أضف عميلاً جديداً من علامة +");
      }

      const subtotal = round(items.reduce((sum, item) => sum + item.quantity * item.price, 0));
      const discount = round(Math.min(subtotal, Math.max(0, float(body.discount))));
      const tax = round(Math.max(0, float(body.tax)));
      const total = round(subtotal - discount + tax);
      const requestedPaid = body.paid === undefined ? total : float(body.paid);
      if (requestedPaid < 0) throw new Error("المدفوع لا يمكن أن يكون بالسالب");
      const paid = round(Math.min(total, requestedPaid));
      const remaining = round(total - paid);
      if (remaining > 0 && type === "sale" && !customer) throw new Error("اختر عميلاً لتسجيل المبلغ المتبقي عليه");
      const status = remaining > 0 ? (paymentType === "قسط" ? (paid > 0 ? "قسط جزئي" : "قسط") : "آجل") : "محفوظة";

      const [invoice] = await tx.insert(invoices).values({
        invoiceNo, type, customerId,
        customerName: customer?.name ?? str(body.customerName, type === "sale" ? "عميل نقدي" : "مورد نقدي"),
        paymentType, subtotal, discount, tax, total, paid, remaining,
        notes: str(body.notes), status, invoiceDate,
      }).returning();
      await tx.insert(invoiceItems).values(items.map((item) => ({ ...item, invoiceId: invoice.id })));

      for (const item of items) {
        if (!item.productId) continue;
        const delta = type === "sale" ? -item.quantity : item.quantity;
        await tx.update(products).set({ quantity: sql`${products.quantity} + ${delta}` }).where(eq(products.id, item.productId));
      }
      if (type === "sale" && customer) {
        await tx.update(customers).set({
          balance: sql`${customers.balance} + ${remaining}`,
          ...(paymentType === "قسط" ? {
            installmentEnabled: true,
            installmentStartedAt: customer.installmentStartedAt ?? invoiceDate,
          } : {}),
        }).where(eq(customers.id, customer.id));
      }
      return invoice;
    });
    return Response.json({ invoice: result }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "تعذر حفظ الفاتورة";
    return Response.json({ error: message }, { status: 400 });
  }
}
