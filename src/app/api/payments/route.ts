import { guardWrite } from "@/lib/license/guard";
import { db } from "@/db";
import { customers, invoices, paymentAllocations, payments } from "@/db/schema";
import { asc, desc, eq, sql } from "drizzle-orm";
import { badRequest, errorResponse, float, readJson, str } from "@/lib/server";
import { ensureSeed } from "@/lib/seed";
import { round } from "@/lib/format";
import { dateKey } from "@/lib/installments";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await ensureSeed();
    const customerId = Number(new URL(request.url).searchParams.get("customerId"));
    const rows = customerId
      ? await db.select().from(payments).where(eq(payments.customerId, customerId)).orderBy(desc(payments.paymentDate), desc(payments.id)).limit(200)
      : await db.select().from(payments).orderBy(desc(payments.paymentDate), desc(payments.id)).limit(200);
    return Response.json({ payments: rows });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  const denied = await guardWrite();
  if (denied) return denied;
  try {
    await ensureSeed();
    const body = await readJson<{ customerId?: number; amount?: number; method?: string; note?: string; paymentDate?: string }>(request);
    const customerId = Number(body.customerId);
    const amount = round(float(body.amount));
    if (!customerId || amount <= 0) return badRequest("اختر العميل وأدخل مبلغاً صحيحاً أكبر من صفر");
    const paymentDate = body.paymentDate ? new Date(`${body.paymentDate.slice(0, 10)}T12:00:00`) : new Date();
    if (Number.isNaN(paymentDate.getTime())) return badRequest("تاريخ الدفعة غير صحيح");
    if (dateKey(paymentDate) > dateKey(new Date())) return badRequest("لا يمكن تسجيل دفعة بتاريخ مستقبلي");

    const created = await db.transaction(async (tx) => {
      const [customer] = await tx.select().from(customers).where(eq(customers.id, customerId)).for("update");
      if (!customer) throw new Error("العميل غير موجود");
      if (amount > customer.balance) throw new Error(`المبلغ أكبر من الرصيد المستحق (${customer.balance})`);
      const [payment] = await tx.insert(payments).values({
        customerId, amount, method: str(body.method, "نقدي") || "نقدي", note: str(body.note), paymentDate,
      }).returning();

      // Allocate to the oldest open invoices first; no fixed due date is created.
      const open = await tx.select().from(invoices)
        .where(eq(invoices.customerId, customerId)).orderBy(asc(invoices.invoiceDate), asc(invoices.id)).for("update");
      let left = amount;
      for (const invoice of open) {
        if (left <= 0) break;
        if (invoice.type !== "sale" || invoice.remaining <= 0) continue;
        const portion = round(Math.min(left, invoice.remaining));
        const remaining = round(invoice.remaining - portion);
        await tx.insert(paymentAllocations).values({ paymentId: payment.id, invoiceId: invoice.id, amount: portion });
        await tx.update(invoices).set({
          paid: round(invoice.paid + portion), remaining,
          status: remaining === 0 ? "مسددة" : invoice.paymentType === "قسط" ? "قسط جزئي" : "آجل",
        }).where(eq(invoices.id, invoice.id));
        left = round(left - portion);
      }
      await tx.update(customers).set({
        balance: round(customer.balance - amount),
        installmentEnabled: true,
        installmentStartedAt: customer.installmentStartedAt ?? paymentDate,
      }).where(eq(customers.id, customerId));
      return payment;
    });
    return Response.json({ payment: created }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "تعذر تسجيل الدفعة" }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const denied = await guardWrite();
  if (denied) return denied;
  try {
    const id = Number(new URL(request.url).searchParams.get("id"));
    if (!id) return badRequest("رقم الدفعة غير صحيح");
    await db.transaction(async (tx) => {
      const [payment] = await tx.select().from(payments).where(eq(payments.id, id)).for("update");
      if (!payment) throw new Error("الدفعة غير موجودة");
      const allocations = await tx.select().from(paymentAllocations).where(eq(paymentAllocations.paymentId, id));
      for (const allocation of allocations) {
        const [invoice] = await tx.select().from(invoices).where(eq(invoices.id, allocation.invoiceId)).for("update");
        if (!invoice) continue;
        const paid = round(Math.max(0, invoice.paid - allocation.amount));
        const remaining = round(invoice.total - paid);
        await tx.update(invoices).set({ paid, remaining, status: remaining > 0 ? (invoice.paymentType === "قسط" ? "قسط جزئي" : "آجل") : "محفوظة" }).where(eq(invoices.id, invoice.id));
      }
      await tx.update(customers).set({ balance: sqlBalance(payment.customerId, payment.amount) }).where(eq(customers.id, payment.customerId));
      await tx.delete(payments).where(eq(payments.id, id));
    });
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "تعذر حذف الدفعة" }, { status: 400 });
  }
}

function sqlBalance(customerId: number, amount: number) {
  return sql`${customers.balance} + ${amount}`;
}
