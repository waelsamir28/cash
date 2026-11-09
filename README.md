# الجمال للأدوات المدرسية - نظام إدارة المكتبات والقرطاسية

نظام سطح مكتب عربي للأدوات المدرسية والمكتبية: مبيعات، مشتريات، مخازن، كشف حساب، معاينة فواتير، ثيمات وتصميم فواتير — جاهز للتحويل إلى ملف EXE وأيضاً للنشر على Vercel.

## 🚀 النشر على Vercel في 3 دقائق

### 1) إنشاء قاعدة بيانات Postgres مجانية

اختر واحد من:

- **Neon** (مُفضل): https://neon.tech - أنشئ مشروع واحصل على `DATABASE_URL`
- **Supabase**: https://supabase.com - Database > Connection string (URI)
- **Vercel Postgres**: من داخل مشروع Vercel > Storage > Create Postgres

> انسخ رابط الاتصال كاملاً مع `?sslmode=require` في نهايته

### 2) رفع المشروع إلى Vercel

1. ارفع المشروع على GitHub
2. ادخل على https://vercel.com/new واختر المستودع `cash`
3. في شاشة **Environment Variables** أضف:

| المتغير | القيمة |
|---------|--------|
| `DATABASE_URL` | رابط قاعدة البيانات من الخطوة 1 |

4. اضغط **Deploy**

### 3) تشغيل Migrations (إنشاء الجداول)

بعد نجاح النشر، افتح Terminal محلياً:

```bash
# ثبت المتغير مؤقتاً
export DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"

# ادفع الـ schema إلى قاعدة البيانات (ينشئ كل الجداول)
npm run db:push
```

أو استخدم Drizzle Studio:

```bash
npm run db:studio
```

> **ملاحظة:** البرنامج ينشئ الجداول والبيانات الافتراضية تلقائياً عند أول زيارة بفضل `ensureSeed()` — لكن `db:push` يضمن أن كل شيء جاهز.

### 4) تأكد أن كل شيء يعمل

زر `/api/health` يجب أن يرجع `{ ok: true }`:

```
https://your-project.vercel.app/api/health
```

---

## ⚙️ متغيرات البيئة

| المتغير | مطلوب | الوصف |
|---------|-------|-------|
| `DATABASE_URL` | ✅ في Vercel | رابط Postgres |
| `POSTGRES_URL` | ❌ بديل | بعض المنصات تستخدم هذا الاسم |
| `ALGAMAL_LOCAL_DB` | ❌ محلي فقط | `1` لاستخدام PGlite بدل Postgres |
| `ALGAMAL_DATA_DIR` | ❌ محلي فقط | مسار قاعدة البيانات المحلية |

## 🛠️ التطوير المحلي

```bash
npm install

# باستخدام Postgres محلي
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/app_db" npm run dev

# أو باستخدام قاعدة محلية بدون Postgres
ALGAMAL_LOCAL_DB=1 npm run dev
```

## 📦 أوامر قاعدة البيانات

```bash
npm run db:generate  # توليد ملفات migrations من schema.ts
npm run db:push      # دفع التغييرات مباشرة (للتجربة)
npm run db:migrate   # تشغيل migrations المحفوظة
npm run db:studio    # فتح Drizzle Studio في المتصفح
```

## 🔧 ما تم إصلاحه لـ Vercel

- ✅ إصلاح `src/db/index.ts` - اتصال lazy لا يكسر الـ build + دعم SSL تلقائي (Neon/Supabase/Vercel)
- ✅ إضافة `drizzle.config.ts` مع قراءة `DATABASE_URL` من البيئة
- ✅ إصلاح `next.config.ts` - إزالة `standalone` في Vercel
- ✅ إضافة `vercel.json` مع إعدادات functions و CORS
- ✅ إضافة `.env.example` و `vercel-build` script
- ✅ إنشاء `src/lib/types.ts` المفقود
- ✅ معالجة أخطاء الاتصال بدون كسر السيرفر

## 📱 ربط الموبايل كقارئ باركود

من داخل البرنامج: زر **ربط الموبايل** > امسح QR بالموبايل > استخدم كاميرا الموبايل لإرسال الباركود مباشرة لشاشة المبيعات.

## 📄 الترخيص

راجع `license-admin/README.md` لإصدار أكواد التفعيل.
