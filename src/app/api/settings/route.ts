import { guardWrite } from "@/lib/license/guard";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { errorResponse, getSettings, readJson, str } from "@/lib/server";
import { ensureSeed } from "@/lib/seed";
import { DEFAULT_SETTINGS } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureSeed();
    return Response.json({ settings: await getSettings() });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: Request) {
  const denied = await guardWrite();
  if (denied) return denied;
  try {
    await ensureSeed();
    const body = await readJson<Record<string, unknown>>(request);
    for (const key of Object.keys(DEFAULT_SETTINGS)) {
      if (!(key in body)) continue;
      const value = str(body[key]);
      const [existing] = await db.select().from(settings).where(eq(settings.key, key));
      if (existing) {
        await db.update(settings).set({ value }).where(eq(settings.key, key));
      } else {
        await db.insert(settings).values({ key, value });
      }
    }
    return Response.json({ settings: await getSettings() });
  } catch (error) {
    return errorResponse(error);
  }
}
