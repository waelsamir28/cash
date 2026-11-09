import { db } from "@/db";
import { customers, invoices, paymentAllocations, payments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { badRequest, errorResponse } from "@/lib/server";
import { ensureSeed } from "@/lib/seed";
import { round } from "@/lib/format";
import type { StatementData, StatementTransaction } from "@/lib/types";

export const dynamic = "force-dynamic";

type Entry = {
  id: string;
  date: Date;
  kind: "invoice" | "payment";
  description: string;
  reference: string;
  debit: number;
  credit: number;
  net: number;
};

export async function GET(request: Request) {
  try {
    await ensureSeed();
    const url = new URL(request.url);
    const customerId = Number(url.searchParams.get("customerId"));
    if (!customerId) return badRequest("اختر العميل أولاً");

    const fromText = url.searchParams.get("from") || "";
    const toText = url.searchParams.get("to") || "";
    const from = fromText ? new Date(`${fromText}T00:00:00`) : null;
    const to = toText ? new Date(`${toText}T23:59:59.999`) : null;
    const validFrom = from && !Number.isNaN(from.getTime()) ? from : null;
    const validTo = to && !Number.isNaN(to.getTime()) ? to : null;

    const [customerRows, invoiceRows, paymentRows, allocationRows] = await Promise.all([
      db.select().from(customers).where(eq(customers.id, customerId)),
      db.select().from(invoices).where(eq(invoices.customerId, customerId)),
      db.select().from(payments).where(eq(payments.customerId, customerId)),
      db.select().from(paymentAllocations),
    ]);
    const customer = customerRows[0];
    if (!customer) return badRequest("العميل غير موجود");

    const entries: Entry[] = [];
    if (customer.openingBalance > 0) {
      entries.push({
        id: `opening-${customer.id}`, date: customer.installmentStartedAt ?? customer.createdAt,
        kind: "invoice", description: "رصيد افتتاحي / قسط سابق", reference: "OPEN",
        debit: customer.openingBalance, credit: 0, net: customer.openingBalance,
      });
    }
    for (const invoice of invoiceRows.filter((row) => row.type === "sale")) {
      const allocated = allocationRows.filter((allocation) => allocation.invoiceId === invoice.id).reduce((sum, allocation) => sum + allocation.amount, 0);
      const initialPaid = round(Math.max(0, invoice.paid - allocated));
      entries.push({
        id: `invoice-${invoice.id}`,
        date: new Date(invoice.invoiceDate),
        kind: "invoice",
        description: `فاتورة مبيعات - ${invoice.paymentType}`,
        reference: invoice.invoiceNo,
        debit: invoice.total,
        credit: initialPaid,
        net: round(invoice.total - initialPaid),
      });
    }
    for (const payment of paymentRows) {
      entries.push({
        id: `payment-${payment.id}`,
        date: new Date(payment.paymentDate),
        kind: "payment",
        description: `دفعة ${payment.method}${payment.note ? ` - ${payment.note}` : ""}`,
        reference: `PAY-${payment.id}`,
        debit: 0,
        credit: payment.amount,
        net: -payment.amount,
      });
    }
    entries.sort((a, b) => a.date.getTime() - b.date.getTime());

    const opening = round(entries
      .filter((entry) => validFrom && entry.date < validFrom)
      .reduce((sum, entry) => sum + entry.net, 0));

    const inRange = entries.filter((entry) =>
      (!validFrom || entry.date >= validFrom) && (!validTo || entry.date <= validTo));

    let running = opening;
    let debitTotal = 0;
    let creditTotal = 0;
    const transactions: StatementTransaction[] = inRange.map((entry) => {
      running = round(running + entry.net);
      debitTotal += entry.debit;
      creditTotal += entry.credit;
      return {
        id: entry.id,
        date: entry.date.toISOString(),
        kind: entry.kind,
        description: entry.description,
        reference: entry.reference,
        debit: round(entry.debit),
        credit: round(entry.credit),
        balance: running,
      };
    });

    const result: StatementData = {
      customer: { ...customer, createdAt: customer.createdAt.toISOString(), installmentStartedAt: customer.installmentStartedAt?.toISOString() ?? null },
      opening,
      debitTotal: round(debitTotal),
      creditTotal: round(creditTotal),
      closing: round(running),
      transactions,
    };
    return Response.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
