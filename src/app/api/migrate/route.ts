import { ensureDatabaseReady, getPool, isDatabaseConfigured } from "@/db";
import { sql } from "drizzle-orm";
import { db } from "@/db";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isDatabaseConfigured()) {
    return Response.json({ error: "DATABASE_URL غير مضبوط في Vercel" }, { status: 500 });
  }
  try {
    await ensureDatabaseReady();
    const pool = await getPool();
    if (pool) {
      await pool.query("select 1");
    } else {
      await db.execute(sql`select 1`);
    }
    return Response.json({ ok: true, message: "قاعدة البيانات جاهزة — الجداول تم إنشاؤها/التحقق منها" });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return Response.json({ error: msg }, { status: 500 });
  }
}

export async function POST() {
  return GET();
}
