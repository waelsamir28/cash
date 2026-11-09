import { guardWrite } from "@/lib/license/guard";
import { db } from "@/db";
import { customers as customersTable, invoiceItems, invoices, paymentAllocations, products } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { badRequest, errorResponse } from "@/lib/server";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  try {
    const id = Number((await params).id);
    if (!id) return badRequest("رقم الفاتورة غير صحيح");
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
    if (!invoice) return badRequest("الفاتورة غير موجودة");
    const items = await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, id));
    return Response.json({ invoice: { ...invoice, items } });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  const denied = await guardWrite();
  if (denied) return denied;
  try {
    const id = Number((await params).id);
    if (!id) return badRequest("رقم الفاتورة غير صحيح");

    await db.transaction(async (tx) => {
      const [invoice] = await tx.select().from(invoices).where(eq(invoices.id, id));
      if (!invoice) throw new Error("الفاتورة غير موجودة");
      const [allocation] = await tx.select({ id: paymentAllocations.id }).from(paymentAllocations).where(eq(paymentAllocations.invoiceId, id)).limit(1);
      if (allocation) throw new Error("لا يمكن حذف فاتورة عليها تحصيلات؛ احذف الدفعات المرتبطة من كشف الحساب أولاً");
      const items = await tx.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, id));

      for (const item of items) {
        if (!item.productId) continue;
        const delta = invoice.type === "sale" ? item.quantity : -item.quantity;
        await tx
          .update(products)
          .set({ quantity: sql`${products.quantity} + ${delta}` })
          .where(eq(products.id, item.productId));
      }

      if (invoice.type === "sale" && invoice.customerId && invoice.remaining > 0) {
        await tx.execute(
          sql`update ${customersTable} set balance = greatest(0, balance - ${invoice.remaining}) where id = ${invoice.customerId}`,
        );
      }

      await tx.delete(invoices).where(eq(invoices.id, id));
    });

    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "تعذر حذف الفاتورة";
    return Response.json({ error: message }, { status: 400 });
  }
}
