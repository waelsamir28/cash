import { createPublicKey, verify } from "node:crypto";
import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { ensureSeed } from "@/lib/seed";
import { CLOCK_TOLERANCE_MS, TRIAL_DAYS, TRIAL_PRODUCT_CODES } from "@/lib/license/config";
import { LICENSE_PUBLIC_KEY_PEM } from "@/lib/license/public-key";
import { getMachineCode } from "@/lib/license/machine";
import type { LicenseStatus } from "@/lib/license/types";

/**
 * نظام الترخيص:
 * - كود التفعيل = بيانات (اسم العميل، كود الجهاز، تاريخ الانتهاء) + توقيع رقمي.
 * - البرنامج يحمل المفتاح العام فقط، ويتحقق من التوقيع. التوقيع لا يمكن تزويره بدون المفتاح الخاص.
 * - المفتاح الخاص محفوظ عندك فقط ومحمي بكلمة السر (انظر license-admin/README.md).
 */

/** بادئة كود التفعيل (الإصدار الأول من الصيغة). */
export const LICENSE_PREFIX = "ALG1";
const DAY_MS = 86_400_000;
const LAST_SEEN_WRITE_EVERY_MS = 60_000;

/** مفاتيح تُحفظ في جدول الإعدادات. ليست ضمن DEFAULT_SETTINGS فلا يمكن تعديلها من شاشة الإعدادات. */
export const LICENSE_KEYS = {
  key: "lic.key",
  trialStartedAt: "lic.trialStartedAt",
  lastSeenAt: "lic.lastSeenAt",
} as const;

export class LicenseError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "LicenseError";
    this.code = code;
  }
}

export type LicensePayload = { v: number; n: string; m: string; x: string | null; i: string };

const publicKey = createPublicKey(LICENSE_PUBLIC_KEY_PEM);

/** يحوّل أي إدخال إلى صيغة كود الجهاز XXXX-XXXX-XXXX-XXXX، أو يرجع null لو غير صالح. */
export function normalizeMachineCode(input: string): string | null {
  const clean = input.replace(/[^0-9a-zA-Z]/g, "").toUpperCase();
  if (clean.length !== 16) return null;
  return clean.match(/.{4}/g)?.join("-") ?? null;
}

/** يتحقق من التوقيع والجهاز وتاريخ الانتهاء، ويرمي LicenseError برسالة عربية عند الفشل. */
export function verifyLicenseKey(rawKey: string, machineCode: string, now = Date.now()): LicensePayload {
  const compact = rawKey.replace(/\s+/g, "");
  const parts = compact.split(".");
  if (parts.length !== 3 || parts[0] !== LICENSE_PREFIX || !parts[1] || !parts[2]) {
    throw new LicenseError("BAD_FORMAT", "صيغة كود التفعيل غير صحيحة");
  }

  const [, body, signature] = parts;
  let signatureValid = false;
  try {
    signatureValid = verify(null, Buffer.from(body, "utf8"), publicKey, Buffer.from(signature, "base64url"));
  } catch {
    signatureValid = false;
  }
  if (!signatureValid) throw new LicenseError("BAD_SIGNATURE", "كود التفعيل غير صالح لهذا البرنامج");

  let payload: LicensePayload;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as LicensePayload;
  } catch {
    throw new LicenseError("BAD_FORMAT", "محتوى كود التفعيل تالف");
  }
  if (payload.v !== 1 || !payload.n || !payload.m) {
    throw new LicenseError("BAD_FORMAT", "محتوى كود التفعيل غير مكتمل");
  }
  if (payload.m !== machineCode) {
    throw new LicenseError("WRONG_MACHINE", "هذا الكود مخصص لجهاز آخر. أرسل كود جهازك للدعم الفني للحصول على كود مناسب");
  }
  if (payload.x && Date.parse(payload.x) <= now) {
    throw new LicenseError("EXPIRED", "انتهت صلاحية كود التفعيل");
  }
  return payload;
}

async function readLicenseRows(): Promise<Record<string, string>> {
  const rows = await db
    .select()
    .from(settings)
    .where(inArray(settings.key, Object.values(LICENSE_KEYS)));
  return Object.fromEntries(rows.map((row) => [row.key, row.value]));
}

async function writeLicenseValue(key: string, value: string): Promise<void> {
  await db
    .insert(settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: settings.key, set: { value } });
}

/**
 * يحسب حالة الترخيص الحالية:
 * - tampered: ساعة الجهاز رجعت للخلف (محاولة لإطالة التجربة).
 * - full: كود تفعيل صالح لهذا الجهاز.
 * - trial: الفترة التجريبية ما زالت سارية.
 * - expired: انتهت التجربة أو انتهى كود التفعيل.
 */
export async function getLicenseStatus(now = Date.now()): Promise<LicenseStatus> {
  await ensureSeed();
  const machineCode = getMachineCode();
  const stored = await readLicenseRows();
  const keyStored = Boolean(stored[LICENSE_KEYS.key]);

  const make = (input: Pick<LicenseStatus, "state" | "message"> & Partial<LicenseStatus>): LicenseStatus => ({
    machineCode,
    licensee: null,
    keyStored,
    expiresAt: null,
    daysLeft: null,
    trialEndsAt: null,
    trialDays: TRIAL_DAYS,
    trialProductCount: TRIAL_PRODUCT_CODES.length,
    ...input,
  });

  // 1) كشف رجوع ساعة الجهاز
  const lastSeen = Number(stored[LICENSE_KEYS.lastSeenAt] ?? 0);
  if (lastSeen > 0 && now < lastSeen - CLOCK_TOLERANCE_MS) {
    return make({
      state: "tampered",
      message: "تم اكتشاف تغيير في تاريخ ووقت الجهاز. أعد ضبط التاريخ الصحيح ثم أعد تشغيل البرنامج، أو تواصل مع الدعم الفني.",
    });
  }
  if (!lastSeen || now - lastSeen > LAST_SEEN_WRITE_EVERY_MS) {
    await writeLicenseValue(LICENSE_KEYS.lastSeenAt, String(now));
  }

  // 2) كود تفعيل محفوظ وصالح لهذا الجهاز
  const storedKey = stored[LICENSE_KEYS.key];
  if (storedKey) {
    try {
      const payload = verifyLicenseKey(storedKey, machineCode, now);
      const expiresAt = payload.x;
      return make({
        state: "full",
        licensee: payload.n,
        expiresAt,
        daysLeft: expiresAt ? Math.max(0, Math.ceil((Date.parse(expiresAt) - now) / DAY_MS)) : null,
        message: "البرنامج مفعّل بنجاح",
      });
    } catch (error) {
      if (error instanceof LicenseError && error.code === "EXPIRED") {
        return make({ state: "expired", message: `${error.message}. تواصل مع الدعم الفني لتجديد التفعيل.` });
      }
      // كود محفوظ لكنه غير صالح على هذا الجهاز (مثلاً نُسخت البيانات من جهاز آخر): نكمل على التجربة.
    }
  }

  // 3) الفترة التجريبية
  let trialStart = Number(stored[LICENSE_KEYS.trialStartedAt] ?? 0);
  if (!trialStart) {
    trialStart = now;
    await writeLicenseValue(LICENSE_KEYS.trialStartedAt, String(now));
  }
  const trialEnd = trialStart + TRIAL_DAYS * DAY_MS;
  const trialEndsAt = new Date(trialEnd).toISOString();

  if (now >= trialEnd) {
    return make({
      state: "expired",
      trialEndsAt,
      message: `انتهت الفترة التجريبية (${TRIAL_DAYS} أيام). أرسل كود جهازك للدعم الفني للحصول على كود التفعيل.`,
    });
  }
  return make({
    state: "trial",
    trialEndsAt,
    daysLeft: Math.max(1, Math.ceil((trialEnd - now) / DAY_MS)),
    message: "نسخة تجريبية محدودة بعدد من الأصناف",
  });
}

/** يتحقق من كود جديد ثم يحفظه. الكود يُكتب كما هو بعد إزالة المسافات. */
export async function activateLicense(rawKey: string): Promise<LicenseStatus> {
  await ensureSeed();
  const compact = rawKey.replace(/\s+/g, "");
  verifyLicenseKey(compact, getMachineCode());
  await writeLicenseValue(LICENSE_KEYS.key, compact);
  return getLicenseStatus();
}
