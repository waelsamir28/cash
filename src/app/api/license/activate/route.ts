import { activateLicense, LicenseError } from "@/lib/license/core";
import { badRequest, errorResponse, readJson, str } from "@/lib/server";

export const dynamic = "force-dynamic";

/** تفعيل البرنامج بكود. هذا المسار مفتوح دائماً حتى في حالة انتهاء التجربة. */
export async function POST(request: Request) {
  try {
    const body = await readJson<{ key?: string }>(request);
    const rawKey = str(body.key);
    if (!rawKey) return badRequest("اكتب كود التفعيل أولاً");
    const license = await activateLicense(rawKey);
    return Response.json({ ok: true, license });
  } catch (error) {
    if (error instanceof LicenseError) {
      return Response.json({ error: error.message, code: error.code }, { status: 400 });
    }
    return errorResponse(error);
  }
}
