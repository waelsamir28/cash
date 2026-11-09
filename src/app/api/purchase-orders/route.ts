import { db } from "@/db";
import { products, purchaseOrderItems, purchaseOrders } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { badRequest, errorResponse, float, readJson, str } from "@/lib/server";
import { ensureSeed } from "@/lib/seed";
import { ensureDatabaseReady } from "@/db";
import { calcSuggestedQty } from "@/lib/purchase";

export const dynamic = "force-dynamic";

// GET: قائمة طلبات الشراء + اقتراحات ذكية للنواقص
export async function GET(request: Request) {
  try {
    await ensureDatabaseReady();
    await ensureSeed();
    const url = new URL(request.url);
    const mode = url.searchParams.get("mode");
    if (mode === "suggestions") {
      const allProducts = await db.select().from(products).orderBy(desc(products.id));
      const suggestions = allProducts
        .filter((p) => {
          const qty = Number(p.quantity) || 0;
          const min = Number(p.minQuantity) || 5;
          return qty <= min * 1.5;
        })
        .map((p) => {
          const qty = Number(p.quantity) || 0;
          const min = Number(p.minQuantity) || 5;
          const suggested = calcSuggestedQty(p as unknown as import("@/lib/types").Product);
          return {
            product: { ...p, createdAt: p.createdAt.toISOString() },
            currentQty: qty,
            minQty: min,
            suggestedQty: suggested,
            purchasePrice: Number(p.purchasePrice) || 0,
            totalCost: suggested * (Number(p.purchasePrice) || 0),
            urgency: qty <= 0 ? "عاجل" : qty <= min ? "عاجل" : "قريب",
          };
        })
        .filter((s) => s.suggestedQty > 0);
      return Response.json({ suggestions });
    }

    const orders = await db.select().from(purchaseOrders).orderBy(desc(purchaseOrders.id)).limit(100);
    const items = await db.select().from(purchaseOrderItems);
    const enriched = orders.map((o) => ({
      ...o,
      createdAt: o.createdAt.toISOString(),
      items: items.filter((it) => it.orderId === o.id),
    }));
    return Response.json({ orders: enriched });
  } catch (e) {
    return errorResponse(e);
  }
}

// POST: إنشاء طلب شراء جديد
export async function POST(request: Request) {
  try {
    await ensureDatabaseReady();
    const body = await readJson<{
      supplierName?: string;
      notes?: string;
      createdBy?: string;
      items?: Array<{ productId?: number; productCode?: string; productName?: string; quantity?: number; purchasePrice?: number }>;
    }>(request);
    const items = Array.isArray(body.items) ? body.items : [];
    if (items.length === 0) return badRequest("اختر صنفاً واحداً على الأقل");
    const orderNo = `PO-${Date.now().toString().slice(-8)}`;
    const totalItems = items.length;
    const totalCost = items.reduce((s, it) => s + float(it.quantity) * float(it.purchasePrice), 0);
    const [order] = await db
      .insert(purchaseOrders)
      .values({
        orderNo,
        supplierName: str(body.supplierName, "المورد العام"),
        status: "مسودة",
        totalItems,
        totalCost,
        notes: str(body.notes),
        createdBy: str(body.createdBy, "المدير"),
      })
      .returning();
    for (const it of items) {
      await db.insert(purchaseOrderItems).values({
        orderId: order.id,
        productId: it.productId ? Number(it.productId) : null,
        productCode: str(it.productCode),
        productName: str(it.productName),
        quantity: float(it.quantity),
        purchasePrice: float(it.purchasePrice),
        total: float(it.quantity) * float(it.purchasePrice),
      });
    }
    return Response.json({ order }, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await readJson<{ id?: number; status?: string }>(request);
    const id = Number(body.id);
    if (!id) return badRequest("رقم الطلب غير صحيح");
    const status = str(body.status);
    if (!["مسودة", "مرسل", "مستلم", "ملغي"].includes(status)) return badRequest("حالة غير صحيحة");
    const [updated] = await db.update(purchaseOrders).set({ status }).where(eq(purchaseOrders.id, id)).returning();
    if (!updated) return badRequest("الطلب غير موجود");
    // لو مستلم: زود المخزون
    if (status === "مستلم") {
      const items = await db.select().from(purchaseOrderItems).where(eq(purchaseOrderItems.orderId, id));
      for (const it of items) {
        if (!it.productId) continue;
        const [prod] = await db.select().from(products).where(eq(products.id, it.productId));
        if (prod) {
          await db
            .update(products)
            .set({ quantity: Number(prod.quantity) + Number(it.quantity) })
            .where(eq(products.id, it.productId));
        }
      }
    }
    return Response.json({ order: updated });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function DELETE(request: Request) {
  try {
    const id = Number(new URL(request.url).searchParams.get("id"));
    if (!id) return badRequest("رقم الطلب غير صحيح");
    await db.delete(purchaseOrders).where(eq(purchaseOrders.id, id));
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
