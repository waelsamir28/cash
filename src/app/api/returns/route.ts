import { db } from "@/db";
import { customers, invoiceItems, invoices, products, returnItems, returns } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { badRequest, errorResponse, float, readJson, str } from "@/lib/server";
import { ensureDatabaseReady } from "@/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureDatabaseReady();
    const rows = await db.select().from(returns).orderBy(desc(returns.id)).limit(100);
    const items = await db.select().from(returnItems);
    return Response.json({
      returns: rows.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
        items: items.filter((it) => it.returnId === r.id),
      })),
    });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(request: Request) {
  try {
    await ensureDatabaseReady();
    const body = await readJson<{
      type?: string;
      originalInvoiceId?: number;
      customerId?: number;
      customerName?: string;
      reason?: string;
      items?: Array<{ productId?: number; productCode?: string; productName?: string; quantity?: number; price?: number }>;
    }>(request);
    const items = Array.isArray(body.items) ? body.items : [];
    if (items.length === 0) return badRequest("أضف صنفاً واحداً للمرتجع");
    const type = body.type === "مرتجع مشتريات" ? "مرتجع مشتريات" : "مرتجع مبيعات";
    const isSaleReturn = type === "مرتجع مبيعات";
    const returnNo = `RET-${Date.now().toString().slice(-8)}`;
    const total = items.reduce((s, it) => s + float(it.quantity) * float(it.price), 0);
    let originalNo = "";
    if (body.originalInvoiceId) {
      const [inv] = await db.select().from(invoices).where(eq(invoices.id, Number(body.originalInvoiceId)));
      if (inv) originalNo = inv.invoiceNo;
    }
    const [ret] = await db
      .insert(returns)
      .values({
        returnNo,
        type,
        originalInvoiceId: body.originalInvoiceId ? Number(body.originalInvoiceId) : null,
        originalInvoiceNo: originalNo,
        customerId: body.customerId ? Number(body.customerId) : null,
        customerName: str(body.customerName, isSaleReturn ? "عميل نقدي" : "مورد نقدي"),
        total,
        reason: str(body.reason),
        status: "مكتمل",
      })
      .returning();

    for (const it of items) {
      const qty = float(it.quantity);
      const price = float(it.price);
      await db.insert(returnItems).values({
        returnId: ret.id,
        productId: it.productId ? Number(it.productId) : null,
        productCode: str(it.productCode),
        productName: str(it.productName),
        quantity: qty,
        price,
        total: qty * price,
      });
      // تحديث المخزون
      if (it.productId) {
        const [prod] = await db.select().from(products).where(eq(products.id, Number(it.productId)));
        if (prod) {
          const delta = isSaleReturn ? qty : -qty; // مرتجع مبيعات يرجع للمخزون، مشتريات ينقص
          const newQty = Math.max(0, Number(prod.quantity) + delta);
          await db.update(products).set({ quantity: newQty }).where(eq(products.id, Number(it.productId)));
        }
      }
    }
    // لو مرتبط بفاتورة: تحديث رصيد العميل (تقليل مديونية للمرتجع)
    if (body.customerId) {
      const [cust] = await db.select().from(customers).where(eq(customers.id, Number(body.customerId)));
      if (cust) {
        // مرتجع مبيعات = نرد للعميل: نقلل رصيده (له) بمقدار المرتجع
        // مرتجع مشتريات = نقلل مستحقات المورد
        // نستخدم balance كرصيد مدين: مبيعات تزيد balance، مرتجع يقلله
        const delta = isSaleReturn ? -total : total;
        await db.update(customers).set({ balance: Number(cust.balance) + delta }).where(eq(customers.id, Number(body.customerId)));
      }
    }

    return Response.json({ return: ret }, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function DELETE(request: Request) {
  try {
    const id = Number(new URL(request.url).searchParams.get("id"));
    if (!id) return badRequest("رقم المرتجع غير صحيح");
    // عكس أثر المخزون قبل الحذف
    const [ret] = await db.select().from(returns).where(eq(returns.id, id));
    if (ret) {
      const items = await db.select().from(returnItems).where(eq(returnItems.returnId, id));
      const isSaleReturn = ret.type === "مرتجع مبيعات";
      for (const it of items) {
        if (!it.productId) continue;
        const [prod] = await db.select().from(products).where(eq(products.id, it.productId));
        if (prod) {
          const delta = isSaleReturn ? -Number(it.quantity) : Number(it.quantity);
          await db.update(products).set({ quantity: Math.max(0, Number(prod.quantity) + delta) }).where(eq(products.id, it.productId));
        }
      }
    }
    await db.delete(returns).where(eq(returns.id, id));
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
