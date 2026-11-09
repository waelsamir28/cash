import { guardRead, guardWrite } from "@/lib/license/guard";
import { db } from "@/db";
import { customers } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { badRequest, errorResponse, float, readJson, str } from "@/lib/server";
import { ensureSeed } from "@/lib/seed";
import { round } from "@/lib/format";

export const dynamic = "force-dynamic";

type CustomerBody = {
  id?: number;
  name?: string;
  phone?: string;
  address?: string;
  customerType?: string;
  balance?: number;
  installmentEnabled?: boolean;
};

export async function GET() {
  const denied = await guardRead();
  if (denied) return denied;
  try {
    await ensureSeed();
    const rows = await db.select().from(customers).orderBy(desc(customers.id));
    return Response.json({ customers: rows });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  const denied = await guardWrite();
  if (denied) return denied;
  try {
    await ensureSeed();
    const body = await readJson<CustomerBody>(request);
    const name = str(body.name);
    if (!name) return badRequest("اسم العميل مطلوب");
    const balance = round(float(body.balance));
    if (balance < 0) return badRequest("الرصيد الافتتاحي لا يمكن أن يكون بالسالب");
    const installmentEnabled = body.installmentEnabled === true || balance > 0 || str(body.customerType) === "قسط";
    const [created] = await db.insert(customers).values({
      code: `C${Date.now().toString().slice(-8)}`,
      name, phone: str(body.phone), address: str(body.address),
      customerType: str(body.customerType, installmentEnabled ? "قسط" : "عادي") || "عادي",
      balance, openingBalance: balance, installmentEnabled,
      installmentStartedAt: installmentEnabled ? new Date() : null,
    }).returning();
    return Response.json({ customer: created }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request) {
  const denied = await guardWrite();
  if (denied) return denied;
  try {
    const body = await readJson<CustomerBody>(request);
    const id = Number(body.id);
    if (!id) return badRequest("اختر العميل أولاً");
    const patch: Partial<typeof customers.$inferInsert> = {};
    if (body.name !== undefined) patch.name = str(body.name);
    if (body.phone !== undefined) patch.phone = str(body.phone);
    if (body.address !== undefined) patch.address = str(body.address);
    if (body.customerType !== undefined) patch.customerType = str(body.customerType);
    if (body.installmentEnabled !== undefined) {
      patch.installmentEnabled = Boolean(body.installmentEnabled);
      if (body.installmentEnabled) patch.installmentStartedAt = new Date();
    }
    const [updated] = await db.update(customers).set(patch).where(eq(customers.id, id)).returning();
    if (!updated) return badRequest("العميل غير موجود");
    return Response.json({ customer: updated });
  } catch (error) {
    return errorResponse(error);
  }
}
