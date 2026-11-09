import { db } from "@/db";
import { expenses } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { badRequest, errorResponse, float, readJson, str } from "@/lib/server";
import { ensureDatabaseReady } from "@/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureDatabaseReady();
    const rows = await db.select().from(expenses).orderBy(desc(expenses.id)).limit(200);
    return Response.json({ expenses: rows.map((r) => ({ ...r, expenseDate: r.expenseDate.toISOString(), createdAt: r.createdAt.toISOString() })) });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(request: Request) {
  try {
    await ensureDatabaseReady();
    const body = await readJson<{ title?: string; category?: string; amount?: number; expenseDate?: string; paymentMethod?: string; notes?: string; createdBy?: string }>(request);
    const title = str(body.title);
    if (!title) return badRequest("اسم المصروف مطلوب");
    const amount = float(body.amount);
    if (amount <= 0) return badRequest("المبلغ يجب أن يكون أكبر من صفر");
    const code = `EXP-${Date.now().toString().slice(-8)}`;
    const [created] = await db
      .insert(expenses)
      .values({
        code,
        title,
        category: str(body.category, "أخرى"),
        amount,
        expenseDate: body.expenseDate ? new Date(body.expenseDate) : new Date(),
        paymentMethod: str(body.paymentMethod, "نقدي"),
        notes: str(body.notes),
        createdBy: str(body.createdBy, "المدير"),
      })
      .returning();
    return Response.json({ expense: { ...created, expenseDate: created.expenseDate.toISOString(), createdAt: created.createdAt.toISOString() } }, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function DELETE(request: Request) {
  try {
    const id = Number(new URL(request.url).searchParams.get("id"));
    if (!id) return badRequest("رقم المصروف غير صحيح");
    await db.delete(expenses).where(eq(expenses.id, id));
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
