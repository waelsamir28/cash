import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";
import { getLicenseStatus } from "@/lib/license/core";
import { TRIAL_PRODUCT_CODES } from "@/lib/license/config";

/**
 * حراس الوصول للـ API. كل مسار يكتب بيانات ينادي guardWrite،
 * وكل مسار يقرأ بيانات العمل ينادي guardRead.
 * الرد المرفوض يحمل code يمكن للواجهة أن تفهمه.
 */

/** يمنع القراءة فقط لو الترخيص منتهي أو مخترق. */
export async function guardRead(): Promise<Response | null> {
  const status = await getLicenseStatus();
  if (status.state === "expired" || status.state === "tampered") {
    return Response.json({ error: status.message, code: "LICENSE_REQUIRED" }, { status: 403 });
  }
  return null;
}

/** يمنع الكتابة لو الترخيص منتهي، ويمنع العمليات المحجوبة في النسخة التجريبية. */
export async function guardWrite(options: { trialBlocked?: boolean } = {}): Promise<Response | null> {
  const denied = await guardRead();
  if (denied) return denied;
  if (options.trialBlocked) {
    const status = await getLicenseStatus();
    if (status.state === "trial") {
      return Response.json(
        { error: "هذه الخاصية غير متاحة في النسخة التجريبية", code: "LICENSE_TRIAL" },
        { status: 403 },
      );
    }
  }
  return null;
}

/** في النسخة التجريبية: يمنع فوترة أي صنف خارج قائمة الأصناف المحددة. */
export async function guardTrialProducts(productIds: (number | null)[]): Promise<Response | null> {
  const status = await getLicenseStatus();
  if (status.state !== "trial") return null;

  const ids = productIds.filter((id): id is number => typeof id === "number");
  if (ids.length === 0) return null;

  const rows = await db
    .select({ id: products.id, code: products.code, name: products.name })
    .from(products)
    .where(inArray(products.id, ids));
  const blocked = rows.find((row) => !TRIAL_PRODUCT_CODES.includes(row.code));
  if (blocked) {
    return Response.json(
      { error: `الصنف "${blocked.name}" غير متاح في النسخة التجريبية`, code: "LICENSE_TRIAL" },
      { status: 403 },
    );
  }
  return null;
}
