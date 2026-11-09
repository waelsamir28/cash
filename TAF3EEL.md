# باسوورد التفعيل - الإجابة

**لا يوجد باسوورد ثابت.**

- كل عميل له **كود جهاز** (مثل 875C-C25D-CD95-8294) يظهر في شاشة التفعيل.
- ولكل كود جهاز تولّد **كود تفعيل** خاص به باستخدام مفتاحك الخاص.

### لو أول مرة:
```bash
node license-admin/keygen.mjs
# سيطلب كلمة سر - اخترها أنت (هذه هي باسووردك)
```

### توليد كود للعميل:
```bash
node license-admin/issue.mjs --name "اسم العميل" --machine 875C-C25D-CD95-8294 --days 365
# سيطلب كلمة سر المفتاح → الصقها → سيطبع كود ALG1.xxxx
```

### نسيت الباسوورد؟
لا يمكن استرجاعه. شغّل:
```bash
node license-admin/keygen.mjs --force
# سيطلب كلمة سر جديدة - كل الأكواد القديمة ستبطل
```

### للعرض على Vercel بدون تفعيل:
في Vercel Dashboard > Settings > Environment Variables أضف:
```
ALGAMAL_DISABLE_LICENSE=1
```
ثم Redeploy.
