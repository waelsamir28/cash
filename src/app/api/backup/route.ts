import { guardWrite } from "@/lib/license/guard";
import { db } from "@/db";
import { customers, invoiceItems, invoices, paymentAllocations, payments, productCategories, products, settings, supportTickets } from "@/db/schema";
import { eq } from "drizzle-orm";
import { badRequest, errorResponse, float, getSettings, readJson, str } from "@/lib/server";
import { ensureSeed } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureSeed();
    const [productRows, customerRows, invoiceRows, itemRows, settingRows, ticketRows, paymentRows, categoryRows, allocationRows] = await Promise.all([
      db.select().from(products),
      db.select().from(customers),
      db.select().from(invoices),
      db.select().from(invoiceItems),
      db.select().from(settings),
      db.select().from(supportTickets),
      db.select().from(payments),
      db.select().from(productCategories),
      db.select().from(paymentAllocations),
    ]);
    return Response.json({
      app: "الجمال للأدوات المدرسية",
      version: "2.0.0",
      exportedAt: new Date().toISOString(),
      products: productRows,
      customers: customerRows,
      invoices: invoiceRows.map((invoice) => ({
        ...invoice,
        items: itemRows.filter((item) => item.invoiceId === invoice.id),
      })),
      payments: paymentRows.map((payment) => ({ ...payment, allocations: allocationRows.filter((allocation) => allocation.paymentId === payment.id) })),
      categories: categoryRows,
      settings: settingRows.filter((row) => !row.key.startsWith("lic.")),
      tickets: ticketRows,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

type BackupBody = {
  products?: Array<Record<string, unknown>>;
  customers?: Array<Record<string, unknown>>;
  settings?: Array<{ key?: string; value?: string }>;
  categories?: Array<{ name?: string; groupName?: string; color?: string }>;
};

export async function POST(request: Request) {
  const denied = await guardWrite();
  if (denied) return denied;
  try {
    await ensureSeed();
    const body = await readJson<BackupBody>(request);
    if (!Array.isArray(body.products) && !Array.isArray(body.customers) && !Array.isArray(body.settings)) {
      return badRequest("ملف النسخة الاحتياطية غير صالح");
    }

    let productCount = 0;
    let customerCount = 0;
    let settingCount = 0;

    await db.transaction(async (tx) => {
      for (const row of body.products ?? []) {
        const code = str(row.code);
        const name = str(row.name);
        if (!code || !name) continue;
        const values = {
          code,
          barcode: str(row.barcode),
          name,
          category: str(row.category, "عام") || "عام",
          categoryGroup: str(row.categoryGroup, "أدوات مدرسية") || "أدوات مدرسية",
          unit: str(row.unit, "قطعة") || "قطعة",
          purchasePrice: float(row.purchasePrice),
          salePrice: float(row.salePrice),
          quantity: float(row.quantity),
          minQuantity: float(row.minQuantity),
          taxRate: float(row.taxRate),
          active: row.active !== false,
        };
        const [existing] = await tx.select().from(products).where(eq(products.code, code));
        if (existing) await tx.update(products).set(values).where(eq(products.code, code));
        else await tx.insert(products).values(values);
        productCount++;
      }

      for (const row of body.customers ?? []) {
        const code = str(row.code);
        const name = str(row.name);
        if (!code || !name) continue;
        const values = {
          code,
          name,
          phone: str(row.phone),
          address: str(row.address),
          customerType: str(row.customerType, "عادي") || "عادي",
          balance: float(row.balance),
          openingBalance: float(row.openingBalance),
          installmentEnabled: row.installmentEnabled === true,
          installmentStartedAt: row.installmentStartedAt ? new Date(String(row.installmentStartedAt)) : null,
        };
        const [existing] = await tx.select().from(customers).where(eq(customers.code, code));
        if (existing) await tx.update(customers).set(values).where(eq(customers.code, code));
        else await tx.insert(customers).values(values);
        customerCount++;
      }

      for (const row of body.categories ?? []) {
        const name = str(row.name);
        const groupName = str(row.groupName);
        if (!name || !groupName) continue;
        await tx.insert(productCategories).values({ name, groupName, color: str(row.color, "#1675c5") || "#1675c5" })
          .onConflictDoUpdate({ target: productCategories.name, set: { groupName, color: str(row.color, "#1675c5") || "#1675c5" } });
      }

      for (const row of body.settings ?? []) {
        const key = str(row.key);
        if (!key || key.startsWith("lic.")) continue;
        const value = str(row.value);
        const [existing] = await tx.select().from(settings).where(eq(settings.key, key));
        if (existing) await tx.update(settings).set({ value }).where(eq(settings.key, key));
        else await tx.insert(settings).values({ key, value });
        settingCount++;
      }
    });

    return Response.json({
      ok: true,
      restored: { products: productCount, customers: customerCount, settings: settingCount },
      settings: await getSettings(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "تعذر استعادة النسخة";
    return Response.json({ error: message }, { status: 400 });
  }
}
