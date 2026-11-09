#!/usr/bin/env node
/**
 * توليد كود تفعيل لعميل.
 * العميل يفتح شاشة التفعيل فيرى "كود الجهاز"، يرسله لك، فتشغّل:
 *
 *   node license-admin/issue.mjs --name "اسم العميل" --machine XXXX-XXXX-XXXX-XXXX --days 365
 *
 *   --days 0  أو تجاهله  ← ترخيص دائم
 *   --days 30            ← ينتهي بعد 30 يوماً من وقت التوليد
 */
import { createPrivateKey, sign } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { askSecret } from "./prompt.mjs";

const DAY_MS = 86_400_000;
const LICENSE_PREFIX = "ALG1";
const here = path.dirname(fileURLToPath(import.meta.url));
const privateFile = path.join(here, "private.enc.pem");
const logFile = path.join(here, "issued.log");

function fail(message) {
  console.error(`⛔ ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const parsed = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) fail(`معامل غير معروف: ${token}`);
    const value = argv[i + 1];
    if (value === undefined || value.startsWith("--")) fail(`القيمة مفقودة للمعامل ${token}`);
    parsed[token.slice(2)] = value;
    i += 1;
  }
  return parsed;
}

/** يحوّل أي صيغة لكود الجهاز XXXX-XXXX-XXXX-XXXX (16 حرف/رقم). */
function normalizeMachine(input) {
  const clean = input.replace(/[^0-9a-zA-Z]/g, "").toUpperCase();
  if (clean.length !== 16) return null;
  return clean.match(/.{4}/g).join("-");
}

const args = parseArgs(process.argv.slice(2));
const name = (args.name ?? "").trim();
const machine = normalizeMachine(args.machine ?? "");
const days = args.days === undefined ? 0 : Number(args.days);

if (!name) fail('اكتب اسم العميل بالمعامل --name "الاسم"');
if (!machine) fail("كود الجهاز غير صحيح. الصيغة المطلوبة: XXXX-XXXX-XXXX-XXXX");
if (!Number.isInteger(days)) fail("--days لازم يكون رقماً صحيحاً");
if (!fs.existsSync(privateFile)) fail("المفتاح الخاص غير موجود. شغّل keygen.mjs أولاً.");

const passphrase = await askSecret("كلمة سر المفتاح: ");
let privateKey;
try {
  privateKey = createPrivateKey({ key: fs.readFileSync(privateFile), format: "pem", passphrase });
} catch {
  fail("كلمة السر غير صحيحة");
}

const now = new Date();
const payload = {
  v: 1,
  n: name,
  m: machine,
  x: days === 0 ? null : new Date(now.getTime() + days * DAY_MS).toISOString(),
  i: now.toISOString(),
};

const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
const signature = sign(null, Buffer.from(body, "utf8"), privateKey).toString("base64url");
const key = `${LICENSE_PREFIX}.${body}.${signature}`;

fs.appendFileSync(
  logFile,
  `${now.toISOString()} | ${name} | ${machine} | ${payload.x ?? "دائم"}\n`,
  { mode: 0o600 },
);

console.log("\n✅ كود التفعيل (أرسله للعميل كما هو):\n");
console.log(key);
console.log(`\nالعميل: ${name} | الجهاز: ${machine} | الانتهاء: ${payload.x ?? "دائم"}`);
