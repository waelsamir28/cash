import { db } from "@/db";
import { shifts, users, invoices } from "@/db/schema";
import { desc, eq, gte } from "drizzle-orm";
import { badRequest, errorResponse, float, readJson, str } from "@/lib/server";
import { ensureDatabaseReady } from "@/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await ensureDatabaseReady();
    const url = new URL(request.url);
    const activeOnly = url.searchParams.get("active") === "1";
    const rows = await db.select().from(shifts).orderBy(desc(shifts.id)).limit(100);
    const filtered = activeOnly ? rows.filter((r) => r.status === "مفتوحة") : rows;
    return Response.json({
      shifts: filtered.map((s) => ({
        ...s,
        startAt: s.startAt.toISOString(),
        endAt: s.endAt ? s.endAt.toISOString() : null,
        createdAt: s.createdAt.toISOString(),
      })),
      openShift: rows.find((r) => r.status === "مفتوحة") ? { ...rows.find((r) => r.status === "مفتوحة")!, startAt: rows.find((r) => r.status === "مفتوحة")!.startAt.toISOString(), endAt: null, createdAt: rows.find((r) => r.status === "مفتوحة")!.createdAt.toISOString() } : null,
    });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(request: Request) {
  try {
    await ensureDatabaseReady();
    const body = await readJson<{ userId?: number; userName?: string; role?: string; startingCash?: number; notes?: string }>(request);
    // تحقق هل يوجد وردية مفتوحة
    const open = await db.select().from(shifts).where(eq(shifts.status, "مفتوحة")).limit(1);
    if (open.length > 0) return badRequest("يوجد وردية مفتوحة بالفعل — أغلقها أولاً");

    let userName = str(body.userName);
    let role = str(body.role, "cashier");
    let userId: number | null = body.userId ? Number(body.userId) : null;
    if (userId) {
      const [u] = await db.select().from(users).where(eq(users.id, userId));
      if (u) {
        userName = u.name;
        role = u.role;
      }
    }
    if (!userName) return badRequest("اختر المستخدم للوردية");

    const [created] = await db
      .insert(shifts)
      .values({
        userId,
        userName,
        role,
        startingCash: float(body.startingCash),
        notes: str(body.notes),
        status: "مفتوحة",
      })
      .returning();
    return Response.json({ shift: { ...created, startAt: created.startAt.toISOString(), endAt: null, createdAt: created.createdAt.toISOString() } }, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await readJson<{ id?: number; endingCash?: number; notes?: string }>(request);
    const id = Number(body.id);
    if (!id) return badRequest("رقم الوردية غير صحيح");
    const [shift] = await db.select().from(shifts).where(eq(shifts.id, id));
    if (!shift) return badRequest("الوردية غير موجودة");
    if (shift.status !== "مفتوحة") return badRequest("الوردية مغلقة بالفعل");

    // احسب مبيعات الوردية منذ فتحها
    const salesRows = await db.select().from(invoices).where(gte(invoices.createdAt, shift.startAt));
    const sales = salesRows.filter((inv) => inv.type === "sale");
    const totalSales = sales.reduce((s, inv) => s + Number(inv.total), 0);
    const endingCash = body.endingCash !== undefined ? float(body.endingCash) : float(shift.startingCash) + totalSales;

    const [updated] = await db
      .update(shifts)
      .set({
        endAt: new Date(),
        endingCash,
        totalSales,
        salesCount: sales.length,
        status: "مغلقة",
        notes: body.notes !== undefined ? str(body.notes) : shift.notes,
      })
      .where(eq(shifts.id, id))
      .returning();
    return Response.json({
      shift: {
        ...updated,
        startAt: updated.startAt.toISOString(),
        endAt: updated.endAt ? updated.endAt.toISOString() : null,
        createdAt: updated.createdAt.toISOString(),
      },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
