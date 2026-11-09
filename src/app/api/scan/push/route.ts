import { getLicenseStatus } from "@/lib/license/core";
import { guardRead } from "@/lib/license/guard";
import { TRIAL_PRODUCT_CODES } from "@/lib/license/config";
import { findProductByCode } from "@/lib/product-lookup";
import { recordScan, tokenMatches } from "@/lib/scan-store";
import { badRequest, errorResponse, readJson, str } from "@/lib/server";

export const dynamic = "force-dynamic";

/**
 * يستقبل قراءة الباركود من الموبايل. هذا المسار هو الوحيد الذي يمرره الجسر للشبكة،
 * ولا يقبل إلا الرمز الصحيح الذي يظهر في QR على شاشة الكمبيوتر.
 */
export async function POST(request: Request) {
  try {
    const body = await readJson<{ token?: string; code?: string }>(request);
    const token = str(body.token) || request.headers.get("x-scan-token") || "";
    if (!token || !tokenMatches(token)) {
      return Response.json(
        { error: "الرابط منتهٍ أو غير صحيح. امسح الكود الجديد من شاشة الكمبيوتر" },
        { status: 401 },
      );
    }

    const code = str(body.code).slice(0, 64);
    if (!code) return badRequest("لم يتم قراءة أي كود");

    const denied = await guardRead();
    if (denied) return denied;

    const license = await getLicenseStatus();
    const product = await findProductByCode(code);
    const blocked = Boolean(product) && license.state === "trial" && !(product && TRIAL_PRODUCT_CODES.includes(product.code));

    const { item, duplicate } = recordScan({ code, product, blocked });
    return Response.json({
      ok: true,
      duplicate,
      found: item.found,
      blocked,
      product: item.product
        ? { id: item.product.id, name: item.product.name, salePrice: item.product.salePrice, unit: item.product.unit, quantity: item.product.quantity }
        : null,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
