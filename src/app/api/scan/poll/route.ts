import { errorResponse } from "@/lib/server";
import { pollScans } from "@/lib/scan-store";

export const dynamic = "force-dynamic";

/** يسحبه برنامج سطح المكتب كل نصف ثانية تقريباً. لا يصل له الموبايل (الجسر يمنعه). */
export async function GET(request: Request) {
  try {
    const after = Math.max(0, Math.trunc(Number(new URL(request.url).searchParams.get("after")) || 0));
    return Response.json(pollScans(after));
  } catch (error) {
    return errorResponse(error);
  }
}
