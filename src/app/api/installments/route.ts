import { db } from "@/db";
import { customers, invoices, paymentAllocations, payments } from "@/db/schema";
import { desc } from "drizzle-orm";
import { errorResponse, getSettings } from "@/lib/server";
import { ensureSeed } from "@/lib/seed";
import { round } from "@/lib/format";
import { daysBetween, isOverdue, type InstallmentAccount, type InstallmentsData } from "@/lib/installments";
import type { Customer } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureSeed();
    const [customerRows, invoiceRows, paymentRows, allocationRows, settings] = await Promise.all([
      db.select().from(customers),
      db.select().from(invoices).orderBy(desc(invoices.invoiceDate)),
      db.select().from(payments).orderBy(desc(payments.paymentDate)),
      db.select().from(paymentAllocations),
      getSettings(),
    ]);
    const now = new Date();
    const alertMonths = Math.max(1, Math.min(24, Number(settings.installmentAlertMonths) || 2));
    const accounts: InstallmentAccount[] = [];

    for (const row of customerRows) {
      const sales = invoiceRows.filter((invoice) => invoice.customerId === row.id && invoice.type === "sale");
      const customerPayments = paymentRows.filter((payment) => payment.customerId === row.id);
      const outstanding = round(Math.max(0, row.balance));
      const allocatedFor = (invoiceId: number) => allocationRows.filter((allocation) => allocation.invoiceId === invoiceId).reduce((sum, allocation) => sum + allocation.amount, 0);
      const initialPaidFor = (invoice: (typeof sales)[number]) => round(Math.max(0, invoice.paid - allocatedFor(invoice.id)));
      if (!row.installmentEnabled && outstanding <= 0) continue;

      const candidates = [
        ...sales.filter((invoice) => initialPaidFor(invoice) > 0).map((invoice) => ({ amount: initialPaidFor(invoice), date: invoice.invoiceDate })),
        ...customerPayments.map((payment) => ({ amount: payment.amount, date: payment.paymentDate })),
      ].sort((a, b) => b.date.getTime() - a.date.getTime());
      const last = candidates[0] ?? null;
      const open = sales.filter((invoice) => invoice.remaining > 0).sort((a, b) => a.invoiceDate.getTime() - b.invoiceDate.getTime());
      const firstUnpaidDate = open[0]?.invoiceDate ?? (row.openingBalance > 0 ? row.installmentStartedAt ?? row.createdAt : null);
      const referenceDate = last?.date ?? firstUnpaidDate;
      const customer: Customer = {
        ...row, balance: outstanding,
        installmentStartedAt: row.installmentStartedAt?.toISOString() ?? null,
        createdAt: row.createdAt.toISOString(),
      };
      accounts.push({
        customer, outstanding,
        totalPurchased: round(sales.reduce((sum, invoice) => sum + invoice.total, 0)),
        totalPaid: round(candidates.reduce((sum, entry) => sum + entry.amount, 0)),
        lastPaymentAmount: last?.amount ?? null,
        lastPaymentDate: last?.date.toISOString() ?? null,
        firstUnpaidDate: firstUnpaidDate?.toISOString() ?? null,
        referenceDate: referenceDate?.toISOString() ?? null,
        daysSincePayment: referenceDate ? daysBetween(referenceDate, now) : null,
        overdue: outstanding > 0 && isOverdue(referenceDate?.toISOString() ?? null, alertMonths, now),
        openInvoices: open.length,
      });
    }

    accounts.sort((a, b) => Number(b.overdue) - Number(a.overdue) || (b.daysSincePayment ?? 0) - (a.daysSincePayment ?? 0) || b.outstanding - a.outstanding);
    const result: InstallmentsData = {
      accounts,
      totalOutstanding: round(accounts.reduce((sum, account) => sum + account.outstanding, 0)),
      totalPaid: round(accounts.reduce((sum, account) => sum + account.totalPaid, 0)),
      overdueCount: accounts.filter((account) => account.overdue).length,
      overdueAmount: round(accounts.filter((account) => account.overdue).reduce((sum, account) => sum + account.outstanding, 0)),
      alertMonths,
      asOf: now.toISOString(),
    };
    return Response.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
