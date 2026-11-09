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
    const groups = await db.select().from(productGroups).orderBy(asc(productGroups.name));
    const categories = await db.select().from(productCategories);
    const items = await db.select({ group: products.categoryGroup }).from(products);
    return Response.json({
      groups: groups.map((group) => ({
        ...group,
        categoryCount: categories.filter((category) => category.groupName === group.name).length,
        productCount: items.filter((item) => item.group === group.name).length,
      })),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  const denied = await guardWrite({ trialBlocked: true });
  if (denied) return denied;
  try {
    await ensureSeed();
    const body = await readJson<{ name?: string; color?: string }>(request);
    const name = str(body.name);
    if (!name) return badRequest("اكتب اسم المجموعة");
    const color = /^#[0-9a-fA-F]{6}$/.test(str(body.color)) ? str(body.color) : "#1675c5";
    const [group] = await db.insert(productGroups).values({ name, color })
      .onConflictDoNothing({ target: productGroups.name }).returning();
    if (!group) return badRequest("هذه المجموعة موجودة بالفعل");
    return Response.json({ group }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request) {
  const denied = await guardWrite({ trialBlocked: true });
  if (denied) return denied;
  try {
    const body = await readJson<{ id?: number; name?: string; color?: string }>(request);
    const id = Number(body.id);
    if (!id) return badRequest("المجموعة غير صحيحة");
    const [old] = await db.select().from(productGroups).where(eq(productGroups.id, id));
    if (!old) return badRequest("المجموعة غير موجودة");
    const name = str(body.name, old.name);
    const color = /^#[0-9a-fA-F]{6}$/.test(str(body.color)) ? str(body.color) : old.color;
    if (!name) return badRequest("اسم المجموعة مطلوب");
    const updated = await db.transaction(async (tx) => {
      const [group] = await tx.update(productGroups).set({ name, color }).where(eq(productGroups.id, id)).returning();
      if (name !== old.name) {
        await tx.update(productCategories).set({ groupName: name }).where(eq(productCategories.groupName, old.name));
        await tx.update(products).set({ categoryGroup: name }).where(eq(products.categoryGroup, old.name));
      }
      await tx.update(productCategories).set({ color }).where(eq(productCategories.groupName, name));
      return group;
    });
    return Response.json({ group: updated });
  } catch (error) {
    const message = error instanceof Error && error.message.includes("unique") ? "يوجد مجموعة أخرى بهذا الاسم" : "تعذر تعديل المجموعة";
    return Response.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const denied = await guardWrite({ trialBlocked: true });
  if (denied) return denied;
  try {
    const id = Number(new URL(request.url).searchParams.get("id"));
    if (!id) return badRequest("المجموعة غير صحيحة");
    const [group] = await db.select().from(productGroups).where(eq(productGroups.id, id));
    if (!group) return badRequest("المجموعة غير موجودة");
    const [category] = await db.select({ id: productCategories.id }).from(productCategories).where(eq(productCategories.groupName, group.name)).limit(1);
    const [product] = await db.select({ id: products.id }).from(products).where(eq(products.categoryGroup, group.name)).limit(1);
    if (category || product) return badRequest("لا يمكن حذف مجموعة بها تصنيفات أو أصناف؛ انقلها أو احذفها أولاً");
    await db.delete(productGroups).where(eq(productGroups.id, id));
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
