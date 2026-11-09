import { guardRead } from "@/lib/license/guard";
import { db } from "@/db";
import { customers, invoiceItems, invoices, products } from "@/db/schema";
import { desc } from "drizzle-orm";
import { errorResponse } from "@/lib/server";
import { ensureSeed } from "@/lib/seed";
import { round } from "@/lib/format";
import type { ReportsData } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await guardRead();
  if (denied) return denied;
  try {
    await ensureSeed();
    const [invoiceRows, itemRows, productRows, customerRows] = await Promise.all([
      db.select().from(invoices).orderBy(desc(invoices.id)).limit(500),
      db.select().from(invoiceItems),
      db.select().from(products),
      db.select().from(customers),
    ]);

    const saleInvoices = invoiceRows.filter((invoice) => invoice.type === "sale");
    const purchaseInvoices = invoiceRows.filter((invoice) => invoice.type === "purchase");
    const salesTotal = round(saleInvoices.reduce((sum, invoice) => sum + invoice.total, 0));
    const purchasesTotal = round(purchaseInvoices.reduce((sum, invoice) => sum + invoice.total, 0));

    const saleIds = new Set(saleInvoices.map((invoice) => invoice.id));
    const costByProduct = new Map(productRows.map((product) => [product.id, product.purchasePrice]));
    const cost = itemRows
      .filter((item) => saleIds.has(item.invoiceId))
      .reduce((sum, item) => sum + item.quantity * (costByProduct.get(item.productId ?? 0) ?? 0), 0);

    const dayMap = new Map<string, number>();
    const today = new Date();
    for (let offset = 6; offset >= 0; offset--) {
      const day = new Date(today);
      day.setDate(today.getDate() - offset);
      dayMap.set(day.toISOString().slice(0, 10), 0);
    }
    for (const invoice of saleInvoices) {
      const key = new Date(invoice.createdAt).toISOString().slice(0, 10);
      if (dayMap.has(key)) dayMap.set(key, (dayMap.get(key) ?? 0) + invoice.total);
    }
    const daily = Array.from(dayMap.entries()).map(([key, total]) => ({
      day: new Date(key).toLocaleDateString("ar-EG", { weekday: "short" }),
      total: round(total),
    }));

    const topMap = new Map<string, { name: string; quantity: number; total: number }>();
    for (const item of itemRows.filter((row) => saleIds.has(row.invoiceId))) {
      const current = topMap.get(item.productName) ?? { name: item.productName, quantity: 0, total: 0 };
      current.quantity += item.quantity;
      current.total += item.total;
      topMap.set(item.productName, current);
    }
    const topProducts = Array.from(topMap.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 6)
      .map((item) => ({ ...item, quantity: round(item.quantity), total: round(item.total) }));

    const report: ReportsData = {
      salesTotal,
      purchasesTotal,
      salesCount: saleInvoices.length,
      purchasesCount: purchaseInvoices.length,
      profit: round(salesTotal - cost),
      productsCount: productRows.length,
      customersCount: customerRows.length,
      stockValue: round(productRows.reduce((sum, product) => sum + product.quantity * product.purchasePrice, 0)),
      lowStock: productRows
        .filter((product) => product.quantity <= product.minQuantity)
        .map((product) => ({ ...product, createdAt: product.createdAt.toISOString() })),
      topProducts,
      daily,
      recent: invoiceRows.slice(0, 8).map((invoice) => ({
        ...invoice,
        invoiceDate: invoice.invoiceDate.toISOString(),
        createdAt: invoice.createdAt.toISOString(),
      })),
    };
    return Response.json(report);
  } catch (error) {
    return errorResponse(error);
  }
}
