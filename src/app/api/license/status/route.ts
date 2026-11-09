import { getLicenseStatus } from "@/lib/license/core";
import { errorResponse } from "@/lib/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json(await getLicenseStatus());
  } catch (error) {
    return errorResponse(error);
  }
}
