import { guardWrite } from "@/lib/license/guard";
import { db } from "@/db";
import { productCategories, productGroups, products } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { badRequest, errorResponse, readJson, str } from "@/lib/server";
import { ensureSeed } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureSeed();
    const categories = await db.select().from(productCategories).orderBy(asc(productCategories.groupName), asc(productCategories.name));
    return Response.json({ categories });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  const denied = await guardWrite({ trialBlocked: true });
  if (denied) return denied;
  try {
    await ensureSeed();
    const body = await readJson<{ name?: string; groupName?: string; color?: string }>(request);
    const name = str(body.name);
    const groupName = str(body.groupName);
    if (!name || !groupName) return badRequest("اكتب اسم المجموعة والتصنيف");
    await db.insert(productGroups).values({ name: groupName, color: /^#[0-9a-fA-F]{6}$/.test(str(body.color)) ? str(body.color) : "#1675c5" }).onConflictDoNothing({ target: productGroups.name });
    const [category] = await db.insert(productCategories).values({
      name, groupName, color: /^#[0-9a-fA-F]{6}$/.test(str(body.color)) ? str(body.color) : "#1675c5",
    }).onConflictDoNothing({ target: productCategories.name }).returning();
    if (!category) return badRequest("هذا التصنيف موجود بالفعل");
    return Response.json({ category }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request) {
  const denied = await guardWrite({ trialBlocked: true });
  if (denied) return denied;
  try {
    const body = await readJson<{ id?: number; name?: string; groupName?: string; color?: string }>(request);
    const id = Number(body.id);
    if (!id) return badRequest("التصنيف غير صحيح");
    const [old] = await db.select().from(productCategories).where(eq(productCategories.id, id));
    if (!old) return badRequest("التصنيف غير موجود");
    const name = str(body.name, old.name);
    const groupName = str(body.groupName, old.groupName);
    const color = str(body.color, old.color);
    const updated = await db.transaction(async (tx) => {
      await tx.insert(productGroups).values({ name: groupName, color }).onConflictDoNothing({ target: productGroups.name });
      const [category] = await tx.update(productCategories).set({ name, groupName, color }).where(eq(productCategories.id, id)).returning();
      await tx.update(products).set({ category: name, categoryGroup: groupName }).where(eq(products.category, old.name));
      return category;
    });
    return Response.json({ category: updated });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request) {
  const denied = await guardWrite({ trialBlocked: true });
  if (denied) return denied;
  try {
    const id = Number(new URL(request.url).searchParams.get("id"));
    if (!id) return badRequest("التصنيف غير صحيح");
    const [category] = await db.select().from(productCategories).where(eq(productCategories.id, id));
    if (!category) return badRequest("التصنيف غير موجود");
    const [used] = await db.select({ id: products.id }).from(products).where(eq(products.category, category.name)).limit(1);
    if (used) return badRequest("لا يمكن حذف تصنيف مرتبط بأصناف؛ انقل الأصناف أولاً");
    await db.delete(productCategories).where(eq(productCategories.id, id));
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
