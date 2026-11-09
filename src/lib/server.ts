import { db } from "@/db";
import { settings } from "@/db/schema";
import { DEFAULT_SETTINGS, type StoreSettings } from "@/lib/types";

export function errorResponse(error: unknown, fallback = "حدث خطأ غير متوقع") {
  const message = error instanceof Error ? error.message : fallback;
  return Response.json({ error: message || fallback }, { status: 500 });
}

export function badRequest(message: string) {
  return Response.json({ error: message }, { status: 400 });
}

export async function readJson<T = Record<string, unknown>>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    return {} as T;
  }
}

export async function getSettings(): Promise<StoreSettings> {
  const rows = await db.select().from(settings);
  const result = { ...DEFAULT_SETTINGS };
  for (const row of rows) {
    if (row.key in result) {
      (result as unknown as Record<string, string>)[row.key] = row.value;
    }
  }
  return result;
}

export function str(value: unknown, fallback = ""): string {
  if (value === null || value === undefined) return fallback;
  return String(value).trim();
}

export function float(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}
