import QRCode from "qrcode";
import { errorResponse } from "@/lib/server";
import { currentToken, lanAddresses, lanPort, rotateToken, sessionSnapshot } from "@/lib/scan-store";

export const dynamic = "force-dynamic";

/** يرجع بيانات الربط: الروابط ورمز QR. هذا المسار يصل له الكمبيوتر فقط (الجسر لا يمرره للشبكة). */
async function describeSession() {
  const port = lanPort();
  const ips = lanAddresses();
  const snapshot = sessionSnapshot();

  if (!port) {
    return {
      enabled: false,
      reason: "ربط الموبايل ككاميرا متاح في نسخة سطح المكتب (EXE) فقط",
      ips,
      port: null,
      urls: [] as string[],
      primaryUrl: null,
      qr: null,
      ...snapshot,
    };
  }

  const token = currentToken();
  const urls = ips.map((ip) => `https://${ip}:${port}/scan?t=${token}`);
  const primaryUrl = urls[0] ?? null;
  const qr = primaryUrl
    ? await QRCode.toDataURL(primaryUrl, { margin: 1, width: 320, color: { dark: "#0b3c80", light: "#ffffff" } })
    : null;

  return {
    enabled: true,
    reason: primaryUrl ? "" : "الكمبيوتر غير متصل بشبكة Wi-Fi. وصّله بالشبكة ثم أعد فتح نافذة الربط",
    ips,
    port,
    urls,
    primaryUrl,
    qr,
    ...snapshot,
  };
}

export async function GET() {
  try {
    return Response.json(await describeSession());
  } catch (error) {
    return errorResponse(error);
  }
}

/** POST {action:"rotate"} يلغي الربط القديم ويعطي رمزاً جديداً. */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { action?: string };
    if (body.action === "rotate") rotateToken();
    return Response.json(await describeSession());
  } catch (error) {
    return errorResponse(error);
  }
}
