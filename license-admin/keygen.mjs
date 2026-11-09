#!/usr/bin/env node
/**
 * توليد مفاتيح التفعيل لبرنامج الجمال — تشغّله مرة واحدة على جهازك الخاص فقط.
 *
 *  - ينشئ مفتاحاً خاصاً (Ed25519) يُحفظ مشفراً بكلمة السر التي تختارها أنت (private.enc.pem).
 *  - يحدّث المفتاح العام داخل src/lib/license/public-key.ts (هذا المفتاح آمن للتوزيع مع البرنامج).
 *
 * ⚠️ لو فقدت كلمة السر أو الملف الخاص لن تستطيع توليد أكواد لأي عميل جديد.
 * ⚠️ الملف الخاص لا يجب أن يخرج من جهازك أبداً.
 */
import { generateKeyPairSync } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { askSecret } from "./prompt.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const privateFile = path.join(here, "private.enc.pem");
const publicFile = path.join(root, "src", "lib", "license", "public-key.ts");
const force = process.argv.includes("--force");

if (fs.existsSync(privateFile) && !force) {
  console.error("⛔ يوجد مفتاح خاص بالفعل (private.enc.pem). إعادة الإنشاء تُبطل كل أكواد التفعيل القديمة.");
  console.error("   لو تقصد ذلك فعلاً شغّل: node license-admin/keygen.mjs --force");
  process.exit(1);
}

const first = await askSecret("اختر كلمة سر قوية لحماية المفتاح (8 أحرف على الأقل): ");
if (first.length < 8) {
  console.error("⛔ كلمة السر قصيرة. استخدم 8 أحرف على الأقل.");
  process.exit(1);
}
const second = await askSecret("أعد كتابة كلمة السر: ");
if (first !== second) {
  console.error("⛔ كلمتا السر غير متطابقتين.");
  process.exit(1);
}

const { publicKey, privateKey } = generateKeyPairSync("ed25519");

// المفتاح الخاص يُكتب مشفراً فقط (AES-256). لا نكتب أي نسخة غير مشفرة على القرص.
const encryptedPrivate = privateKey.export({
  type: "pkcs8",
  format: "pem",
  cipher: "aes-256-cbc",
  passphrase: first,
});
fs.writeFileSync(privateFile, encryptedPrivate, { mode: 0o600 });

const publicPem = publicKey.export({ type: "spki", format: "pem" }).toString();
fs.writeFileSync(
  publicFile,
  "// يُولَّد تلقائياً بواسطة license-admin/keygen.mjs — المفتاح العام فقط، وهو آمن للتوزيع مع البرنامج.\n" +
    `export const LICENSE_PUBLIC_KEY_PEM = \`${publicPem}\`;\n`,
);

console.log("✅ تم إنشاء المفتاح الخاص المشفر:", path.relative(root, privateFile));
console.log("✅ تم تحديث المفتاح العام:", path.relative(root, publicFile));
console.log("➡️  الخطوة التالية: أعد بناء البرنامج (npm run build) ثم أعد توليد ملفات EXE.");
