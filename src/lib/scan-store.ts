import { randomBytes, timingSafeEqual } from "node:crypto";
import os from "node:os";
import type { ProductSummary } from "@/lib/product-lookup";

/**
 * مخزن الماسح اللاسلكي (الموبايل ككاميرا باركود).
 * - يعيش في ذاكرة عملية الخادم فقط، ولا يُحفظ في قاعدة البيانات.
 * - رمز الربط (token) يتغير عند كل تشغيل للبرنامج، وعند الضغط على "إلغاء الربط".
 * - الخادم نفسه يعمل على 127.0.0.1 فقط؛ جسر LAN في سطح المكتب هو الذي يعرض مسار الإرسال للموبايل.
 */

export type ScanItem = {
  id: number;
  code: string;
  at: number;
  found: boolean;
  blocked: boolean;
  product: ProductSummary | null;
};

type Store = {
  token: string;
  seq: number;
  items: ScanItem[];
  lastPhoneAt: number;
  lastCode: string;
  lastCodeAt: number;
};

declare global {
  var __algamalScanStore: Store | undefined;
}

const DUPLICATE_WINDOW_MS = 1200;
const MAX_ITEMS = 100;
const LINK_ALIVE_MS = 20_000;

function createToken(): string {
  return randomBytes(18).toString("base64url");
}

function store(): Store {
  if (!globalThis.__algamalScanStore) {
    globalThis.__algamalScanStore = {
      token: createToken(),
      seq: 0,
      items: [],
      lastPhoneAt: 0,
      lastCode: "",
      lastCodeAt: 0,
    };
  }
  return globalThis.__algamalScanStore;
}

/** مقارنة آمنة للرمز (تمنع استنتاجه بقياس زمن المقارنة). */
export function tokenMatches(candidate: string): boolean {
  const expected = Buffer.from(store().token, "utf8");
  const given = Buffer.from(candidate, "utf8");
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export function currentToken(): string {
  return store().token;
}

/** يلغي الربط القديم: رمز جديد، ويمسح الطابور، ويفصل الموبايل. */
export function rotateToken(): string {
  const current = store();
  current.token = createToken();
  current.items = [];
  current.lastPhoneAt = 0;
  current.lastCode = "";
  return current.token;
}

export function linkAlive(now = Date.now()): boolean {
  const current = store();
  return current.lastPhoneAt > 0 && now - current.lastPhoneAt < LINK_ALIVE_MS;
}

/** يسجل قراءة جديدة. القراءة المكررة لنفس الكود خلال ثانية واحدة لا تُضاف مرتين. */
export function recordScan(input: { code: string; product: ProductSummary | null; blocked: boolean }): {
  item: ScanItem;
  duplicate: boolean;
} {
  const current = store();
  const now = Date.now();
  current.lastPhoneAt = now;

  const found = Boolean(input.product) && !input.blocked;
  const isDuplicate = input.code === current.lastCode && now - current.lastCodeAt < DUPLICATE_WINDOW_MS;
  if (isDuplicate) {
    return {
      item: { id: current.seq, code: input.code, at: now, found, blocked: input.blocked, product: found ? input.product : null },
      duplicate: true,
    };
  }

  current.lastCode = input.code;
  current.lastCodeAt = now;
  const item: ScanItem = {
    id: ++current.seq,
    code: input.code,
    at: now,
    found,
    blocked: input.blocked,
    product: found ? input.product : null,
  };
  current.items.push(item);
  if (current.items.length > MAX_ITEMS) current.items.splice(0, current.items.length - MAX_ITEMS);
  return { item, duplicate: false };
}

/** يرجع القراءات الأحدث من رقم معين، مع حالة الاتصال بالموبايل. */
export function pollScans(after: number) {
  const current = store();
  return {
    items: current.items.filter((item) => item.id > after),
    lastId: current.seq,
    linked: linkAlive(),
    lastPhoneAt: current.lastPhoneAt,
  };
}

export function sessionSnapshot() {
  const current = store();
  return { lastId: current.seq, linked: linkAlive(), lastPhoneAt: current.lastPhoneAt };
}

/** منفذ جسر LAN الذي يمرره تطبيق سطح المكتب (غير موجود في نسخة الويب). */
export function lanPort(): number | null {
  const raw = Number(process.env.ALGAMAL_LAN_PORT);
  return Number.isInteger(raw) && raw > 0 ? raw : null;
}

/** عناوين IPv4 للشبكة المحلية (Wi-Fi / Ethernet)، بدون عنوان الحلقة المحلية. */
export function lanAddresses(): string[] {
  const addresses: string[] = [];
  for (const list of Object.values(os.networkInterfaces())) {
    for (const info of list ?? []) {
      if (info.family === "IPv4" && !info.internal) addresses.push(info.address);
    }
  }
  return addresses;
}
