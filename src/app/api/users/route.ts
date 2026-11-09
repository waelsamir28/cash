import { db } from "@/db";
import { users } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { badRequest, errorResponse, readJson, str } from "@/lib/server";
import { ensureDatabaseReady } from "@/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureDatabaseReady();
    const rows = await db.select().from(users).orderBy(desc(users.id));
    return Response.json({
      users: rows.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() })),
    });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(request: Request) {
  try {
    await ensureDatabaseReady();
    const body = await readJson<{ name?: string; phone?: string; role?: string; password?: string }>(request);
    const name = str(body.name);
    if (!name) return badRequest("اسم المستخدم مطلوب");
    const role = ["admin", "manager", "cashier", "viewer"].includes(str(body.role)) ? str(body.role) : "cashier";
    const code = `U${Date.now().toString().slice(-5)}`;
    const [created] = await db
      .insert(users)
      .values({
        code,
        name,
        phone: str(body.phone),
        role,
        password: str(body.password, "1234"),
      })
      .returning();
    return Response.json({ user: { ...created, createdAt: created.createdAt.toISOString() } }, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await readJson<{ id?: number; name?: string; phone?: string; role?: string; password?: string; active?: boolean }>(request);
    const id = Number(body.id);
    if (!id) return badRequest("رقم المستخدم غير صحيح");
    const patch: Record<string, unknown> = {};
    if (body.name !== undefined) patch.name = str(body.name);
    if (body.phone !== undefined) patch.phone = str(body.phone);
    if (body.role !== undefined && ["admin", "manager", "cashier", "viewer"].includes(str(body.role))) patch.role = str(body.role);
    if (body.password !== undefined && str(body.password)) patch.password = str(body.password);
    if (body.active !== undefined) patch.active = Boolean(body.active);
    const [updated] = await db.update(users).set(patch as never).where(eq(users.id, id)).returning();
    if (!updated) return badRequest("المستخدم غير موجود");
    return Response.json({ user: { ...updated, createdAt: updated.createdAt.toISOString() } });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function DELETE(request: Request) {
  try {
    const id = Number(new URL(request.url).searchParams.get("id"));
    if (!id) return badRequest("رقم المستخدم غير صحيح");
    // منع حذف آخر admin
    const [u] = await db.select().from(users).where(eq(users.id, id));
    if (!u) return badRequest("المستخدم غير موجود");
    if (u.role === "admin") {
      const admins = await db.select().from(users);
      if (admins.filter((x) => x.role === "admin" && x.active).length <= 1) {
        return badRequest("لا يمكن حذف آخر مدير عام");
      }
    }
    await db.delete(users).where(eq(users.id, id));
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
