import { guardRead, guardWrite } from "@/lib/license/guard";
import { getLicenseStatus } from "@/lib/license/core";
import { TRIAL_PRODUCT_CODES } from "@/lib/license/config";
import { db } from "@/db";
import { products } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { badRequest, errorResponse, float, readJson, str } from "@/lib/server";
import { ensureSeed } from "@/lib/seed";
import { groupForCategory } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await guardRead();
  if (denied) return denied;
  try {
    await ensureSeed();
    const rows = await db.select().from(products).orderBy(desc(products.id));
    const status = await getLicenseStatus();
    const visible = status.state === "trial" ? rows.filter((product) => TRIAL_PRODUCT_CODES.includes(product.code)) : rows;
    return Response.json({ products: visible });
  } catch (error) {
    return errorResponse(error);
  }
}

type ProductBody = {
  id?: number;
  code?: string;
  barcode?: string;
  name?: string;
  category?: string;
  categoryGroup?: string;
  unit?: string;
  purchasePrice?: number;
  salePrice?: number;
  quantity?: number;
  minQuantity?: number;
  taxRate?: number;
  active?: boolean;
};

function values(body: ProductBody) {
  return {
    code: str(body.code) || `P${Date.now().toString().slice(-7)}`,
    barcode: str(body.barcode),
    name: str(body.name),
    category: str(body.category, "عام") || "عام",
    categoryGroup: str(body.categoryGroup) || groupForCategory(str(body.category)),
    unit: str(body.unit, "قطعة") || "قطعة",
    purchasePrice: float(body.purchasePrice),
    salePrice: float(body.salePrice),
    quantity: float(body.quantity),
    minQuantity: float(body.minQuantity),
    taxRate: float(body.taxRate),
    active: body.active !== false,
  };
}

export async function POST(request: Request) {
  const denied = await guardWrite({ trialBlocked: true });
  if (denied) return denied;
  try {
    await ensureSeed();
    const body = await readJson<ProductBody>(request);
    if (!str(body.name)) return badRequest("اسم الصنف مطلوب");
    const [created] = await db.insert(products).values(values(body)).returning();
    return Response.json({ product: created }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request) {
  const denied = await guardWrite({ trialBlocked: true });
  if (denied) return denied;
  try {
    const body = await readJson<ProductBody>(request);
    const id = Number(body.id);
    if (!id) return badRequest("رقم الصنف غير صحيح");
    const [updated] = await db
      .update(products)
      .set(values(body))
      .where(eq(products.id, id))
      .returning();
    if (!updated) return badRequest("الصنف غير موجود");
    return Response.json({ product: updated });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request) {
  const denied = await guardWrite({ trialBlocked: true });
  if (denied) return denied;
  try {
    const id = Number(new URL(request.url).searchParams.get("id"));
    if (!id) return badRequest("رقم الصنف غير صحيح");
    await db.delete(products).where(eq(products.id, id));
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
