import { errorResponse, getSettings } from "@/lib/server";
import { ensureSeed } from "@/lib/seed";
import { invoiceStart, nextInvoiceNumber } from "@/lib/invoice-number";
import { db } from "@/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureSeed();
    const settings = await getSettings();
    return Response.json({ invoiceNo: await nextInvoiceNumber(db, invoiceStart(settings.invoiceStartNumber)) });
  } catch (error) {
    return errorResponse(error);
  }
}
