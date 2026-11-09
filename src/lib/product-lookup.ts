import { sql } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";

/** بيانات الصنف المختصرة التي تُرسل للموبايل والشاشات (بدون بيانات حساسة). */
export type ProductSummary = {
  id: number;
  code: string;
  barcode: string;
  name: string;
  unit: string;
  salePrice: number;
  quantity: number;
  minQuantity: number;
  category: string;
  categoryGroup: string;
};

/** يبحث عن صنف بالباركود أو الكود (غير حساس لحالة الأحرف)، ويتجاهل الأصناف غير النشطة. */
export async function findProductByCode(code: string): Promise<ProductSummary | null> {
  const value = code.trim().toLowerCase();
  if (!value) return null;
  const [row] = await db
    .select({
      id: products.id,
      code: products.code,
      barcode: products.barcode,
      name: products.name,
      unit: products.unit,
      salePrice: products.salePrice,
      quantity: products.quantity,
      minQuantity: products.minQuantity,
      category: products.category,
      categoryGroup: products.categoryGroup,
    })
    .from(products)
    .where(sql`${products.active} = true AND (lower(${products.barcode}) = ${value} OR lower(${products.code}) = ${value})`)
    .limit(1);
  return row ?? null;
}
