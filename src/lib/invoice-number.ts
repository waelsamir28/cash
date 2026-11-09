import { db } from "@/db";
import { invoices } from "@/db/schema";
import { sql } from "drizzle-orm";

type Executor = Pick<typeof db, "select" | "execute">;

export function invoiceStart(value: unknown): number {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1001;
}

// Historical/demo invoice numbers may be archived with a prefix. New numeric
// invoices have their own consecutive sequence, starting at 1001 by default.
export async function nextInvoiceNumber(executor: Executor, start = 1001): Promise<string> {
  const [row] = await executor.select({
    value: sql<string>`greatest(coalesce(max(${invoices.invoiceNo}::bigint), ${start - 1}), ${start - 1}) + 1`,
  }).from(invoices).where(sql`${invoices.invoiceNo} ~ '^[0-9]{1,9}$'`);
  return String(row?.value ?? start);
}
