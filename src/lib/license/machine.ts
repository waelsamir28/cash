import { createHash } from "node:crypto";
import os from "node:os";

/**
 * كود الجهاز: بصمة ثابتة مشتقة من بيانات الجهاز (اسم الجهاز، النظام، المعالج، حجم الذاكرة).
 * تُحسب تلقائياً ولا تُخزَّن. تظهر للمستخدم ليرسلها لك، فتولّد له كود تفعيل يعمل على جهازه فقط.
 */
export function getMachineCode(): string {
  const cpu = os.cpus()[0]?.model ?? "cpu";
  const memoryGb = Math.round(os.totalmem() / 1024 ** 3);
  const raw = [os.hostname(), os.platform(), os.arch(), cpu, String(memoryGb)].join("|");
  const hex = createHash("sha256").update(raw).digest("hex").slice(0, 16).toUpperCase();
  return hex.match(/.{4}/g)?.join("-") ?? hex;
}
