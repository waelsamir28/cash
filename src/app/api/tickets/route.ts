import { db } from "@/db";
import { supportTickets } from "@/db/schema";
import { desc } from "drizzle-orm";
import { badRequest, errorResponse, readJson, str } from "@/lib/server";
import { ensureSeed } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureSeed();
    const rows = await db.select().from(supportTickets).orderBy(desc(supportTickets.id)).limit(50);
    return Response.json({ tickets: rows });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    await ensureSeed();
    const body = await readJson<{ name?: string; phone?: string; subject?: string; message?: string }>(request);
    if (!str(body.name) || !str(body.subject) || !str(body.message)) {
      return badRequest("برجاء إكمال الاسم والموضوع والرسالة");
    }
    const [ticket] = await db
      .insert(supportTickets)
      .values({
        name: str(body.name),
        phone: str(body.phone),
        subject: str(body.subject),
        message: str(body.message),
      })
      .returning();
    return Response.json({ ticket }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
