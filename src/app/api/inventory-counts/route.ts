import { db } from "@/db";
import { inventoryCountItems, inventoryCounts, products } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { badRequest, errorResponse, float, readJson, str } from "@/lib/server";
import { ensureDatabaseReady } from "@/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureDatabaseReady();
    const counts = await db.select().from(inventoryCounts).orderBy(desc(inventoryCounts.id)).limit(100);
    const items = await db.select().from(inventoryCountItems);
    const enriched = counts.map((c) => ({
      ...c,
      createdAt: c.createdAt.toISOString(),
      items: items.filter((it) => it.countId === c.id),
    }));
    return Response.json({ counts: enriched });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(request: Request) {
  try {
    await ensureDatabaseReady();
    const body = await readJson<{ title?: string; createdBy?: string; notes?: string }>(request);
    const title = str(body.title);
    if (!title) return badRequest("عنوان الجرد مطلوب");
    const countNo = `JC-${Date.now().toString().slice(-8)}`;
    const [created] = await db
      .insert(inventoryCounts)
      .values({
        countNo,
        title,
        status: "جارية",
        createdBy: str(body.createdBy, "المدير"),
        notes: str(body.notes),
      })
      .returning();
    return Response.json({ count: { ...created, createdAt: created.createdAt.toISOString() } }, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await readJson<{
      id?: number;
      action?: string;
      productCode?: string;
      productId?: number;
      barcode?: string;
      quantity?: number;
      status?: string;
    }>(request);
    const id = Number(body.id);
    if (!id) return badRequest("رقم الجرد غير صحيح");

    const [count] = await db.select().from(inventoryCounts).where(eq(inventoryCounts.id, id));
    if (!count) return badRequest("عملية الجرد غير موجودة");
    if (count.status !== "جارية" && body.action === "scan") return badRequest("الجرد مكتمل — لا يمكن الإضافة");

    if (body.action === "scan") {
      const code = str(body.productCode) || str(body.barcode);
      if (!code) return badRequest("كود الصنف مطلوب");
      const qty = float(body.quantity) || 1;
      // ابحث عن المنتج
      let product: typeof products.$inferSelect | null = null;
      const all = await db.select().from(products);
      product =
        all.find((p) => p.code === code || p.barcode === code) ||
        (body.productId ? all.find((p) => p.id === Number(body.productId)) || null : null) ||
        null;
      if (!product) return badRequest(`الصنف غير موجود: ${code}`);

      const systemQty = Number(product.quantity) || 0;
      // هل موجود مسبقاً في الجرد؟
      const existing = await db
        .select()
        .from(inventoryCountItems)
        .where(eq(inventoryCountItems.countId, id));
      const dup = existing.find((it) => it.productCode === product!.code);
      if (dup) {
        const newCounted = Number(dup.countedQuantity) + qty;
        const variance = newCounted - systemQty;
        const [upd] = await db
          .update(inventoryCountItems)
          .set({ countedQuantity: newCounted, variance })
          .where(eq(inventoryCountItems.id, dup.id))
          .returning();
        await db
          .update(inventoryCounts)
          .set({ totalScanned: existing.length })
          .where(eq(inventoryCounts.id, id));
        return Response.json({ item: upd });
      } else {
        const variance = qty - systemQty;
        const [created] = await db
          .insert(inventoryCountItems)
          .values({
            countId: id,
            productId: product.id,
            productCode: product.code,
            productName: product.name,
            systemQuantity: systemQty,
            countedQuantity: qty,
            variance,
          })
          .returning();
        await db
          .update(inventoryCounts)
          .set({ totalScanned: existing.length + 1 })
          .where(eq(inventoryCounts.id, id));
        return Response.json({ item: created });
      }
    }

    if (body.status) {
      const valid = ["جارية", "مكتملة", "ملغاة"];
      if (!valid.includes(body.status)) return badRequest("حالة غير صحيحة");
      // لو مكتملة: احسب الفروقات
      if (body.status === "مكتملة") {
        const items = await db.select().from(inventoryCountItems).where(eq(inventoryCountItems.countId, id));
        const varianceCount = items.filter((it) => Number(it.variance) !== 0).length;
        const [upd] = await db
          .update(inventoryCounts)
          .set({ status: body.status, totalVariance: varianceCount })
          .where(eq(inventoryCounts.id, id))
          .returning();
        return Response.json({ count: { ...upd, createdAt: upd.createdAt.toISOString() } });
      }
      const [upd] = await db.update(inventoryCounts).set({ status: body.status }).where(eq(inventoryCounts.id, id)).returning();
      return Response.json({ count: { ...upd, createdAt: upd.createdAt.toISOString() } });
    }

    return badRequest("إجراء غير معروف");
  } catch (e) {
    return errorResponse(e);
  }
}

export async function DELETE(request: Request) {
  try {
    const id = Number(new URL(request.url).searchParams.get("id"));
    if (!id) return badRequest("رقم الجرد غير صحيح");
    await db.delete(inventoryCounts).where(eq(inventoryCounts.id, id));
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
