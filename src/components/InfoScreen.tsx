"use client";

import { SUPPORT } from "@/lib/support";

import { BadgeCheck, HelpCircle, Info, Keyboard, Monitor, PackageCheck } from "lucide-react";

type Props = {
  variant: "about" | "help";
  onNavigate: (screen: "backup" | "help" | "about" | "statements" | "preview" | "customize" | "settings") => void;
};

export default function InfoScreen({ variant, onNavigate }: Props) {
  if (variant === "about") {
    return (
      <div>
        <h2 className="page-title"><Info size={20} style={{ verticalAlign: "middle", marginLeft: 6 }} /> معلومات عن البرنامج</h2>
        <p className="page-desc">برنامج الجمال للأدوات المدرسية — إدارة احترافية للمكتبات والقرطاسية.</p>
        <div className="two-col" style={{ gridTemplateColumns: "1.2fr 1fr" }}>
          <div className="panel">
            <div className="panel-head"><span>نبذة عن الإصدار</span><BadgeCheck size={17} /></div>
            <div className="panel-body">
              <div className="info-box" style={{ fontSize: 14, lineHeight: 2.2 }}>
                برنامج <b>الجمال</b> نظام إدارة متكامل للمكتبات ومحلات الأدوات المدرسية والمكتبية، بواجهة عربية RTL ونمط نوافذ ويندوز الكلاسيكي. يدير المبيعات والمشتريات والمخازن والعملاء وكشوف الحساب والتقارير، مع تصميم فواتير وثيمات وتخصيص كامل للواجهة.
              </div>
              <div className="kv" style={{ marginTop: 16 }}>
                <b>اسم البرنامج</b><span>الجمال للأدوات المدرسية</span>
                <b>الإصدار</b><span>2.0.0 (Desktop Edition)</span>
                <b>التخصص</b><span>الأدوات المدرسية، القرطاسية، والمستلزمات المكتبية</span>
                <b>البيئة</b><span>Next.js + PostgreSQL + Drizzle ORM</span>
                <b>الواجهة</b><span>عربية RTL — مخصصة للشاشات الكبيرة</span>
                <b>الدعم الفني</b><span dir="ltr">{SUPPORT.phone}</span>
              </div>
            </div>
          </div>
          <div className="panel">
            <div className="panel-head"><span>أبرز المميزات</span><PackageCheck size={17} /></div>
            <div className="panel-body">
              <div className="feature-list" style={{ gridTemplateColumns: "1fr" }}>
                <div><span>✔</span> نقطة بيع سريعة بالباركود مع خصم وضريبة وآجل</div>
                <div><span>✔</span> كتالوج جاهز بأكثر من 50 صنفاً: كتب خارجية، كشاكيل، أقلام وأدوات مكتبية</div>
                <div><span>✔</span> أقساط بدون موعد، تحصيل مرن وتنبيه بعد شهرين</div>
                <div><span>✔</span> كشف حساب بالفواتير والتحصيلات والرصيد</div>
                <div><span>✔</span> معاينة فواتير بتصميم قابل للتخصيص وطباعة PDF</div>
                <div><span>✔</span> ثيمات ألوان + وضع ليلي + ألوان مخصصة</div>
                <div><span>✔</span> إخفاء/إظهار الوحدات وإضافة اختصارات مخصصة</div>
                <div><span>✔</span> تحديث المخزون تلقائياً عند البيع والشراء</div>
                <div><span>✔</span> تقارير وأرباح وتنبيهات نواقص ونسخ احتياطي</div>
                <div><span>✔</span> جاهز للتحويل إلى ملف تنفيذي EXE لويندوز</div>
              </div>
              <div style={{ display: "flex", gap: 7, marginTop: 14, flexWrap: "wrap" }}>
                <button className="btn blue" onClick={() => onNavigate("help")}><HelpCircle size={15} /> دليل التشغيل</button>
                <button className="btn" onClick={() => onNavigate("customize")}>تخصيص البرنامج</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="page-title"><HelpCircle size={20} style={{ verticalAlign: "middle", marginLeft: 6 }} /> المساعدة ودليل التشغيل</h2>
      <p className="page-desc">خطوات التشغيل، الاختصارات، وتجهيز ملف EXE لويندوز.</p>

      <div className="two-col" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <div className="panel">
          <div className="panel-head"><span>اختصارات لوحة المفاتيح</span><Keyboard size={17} /></div>
          <div className="panel-body" style={{ padding: 8 }}>
            <table className="win-table">
              <thead><tr><th>الاختصار</th><th>الوظيفة</th></tr></thead>
              <tbody>
                <tr><td dir="ltr">F2</td><td>فاتورة جديدة</td></tr>
                <tr><td dir="ltr">F4</td><td>حفظ الفاتورة</td></tr>
                <tr><td dir="ltr">F8</td><td>طباعة الفاتورة</td></tr>
                <tr><td dir="ltr">Ctrl + F</td><td>الانتقال لمربع بحث الأصناف</td></tr>
                <tr><td dir="ltr">Enter</td><td>إضافة صنف بعد كتابة الباركود</td></tr>
                <tr><td>نقر مزدوج</td><td>إضافة صنف بالكمية المحددة</td></tr>
              </tbody>
            </table>
          </div>
          <div className="panel-body">
            <div className="info-box">
              <b>دورة العمل:</b> المخازن ← إضافة الأصناف ← المبيعات ← مسح الباركود ← حفظ ← معاينة/طباعة ← كشف الحساب ← التقارير ← نسخ احتياطي.
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head"><span>تجهيز ملف تنفيذي EXE لويندوز</span><Monitor size={17} /></div>
          <div className="panel-body">
            <div className="info-box" style={{ marginBottom: 12 }}>
              المشروع مهيأ كتطبيق سطح مكتب: شريط عنوان، أزرار تصغير/تكبير/إغلاق، قائمة جانبية ثابتة، عرض أدنى 1180 بكسل، وطباعة فواتير. مجلد <b dir="ltr">desktop/</b> يحتوي غلاف Electron وملف الإعداد لبناء معالج تثبيت <b dir="ltr">.exe</b>.
            </div>
            <div className="code-block">{`# 1) من جذر المشروع: ابني النسخة الإنتاجية
npm run build

# 2) جهّز حزمة سطح المكتب وابنِ ملف EXE
cd desktop
npm install
node prepare.mjs
npm run dist

# الناتج:
desktop/dist-exe/AlGamal-Setup-2.1.0.exe
desktop/dist-exe/AlGamal-Portable-2.1.0.exe`}</div>
            <div className="kv" style={{ marginTop: 12 }}>
              <b>نظام التشغيل</b><span>Windows 10 / 11 (64-bit)</span>
              <b>الذاكرة</b><span>4 GB RAM كحد أدنى</span>
              <b>الشاشة</b><span>1180 × 720 أو أعلى</span>
              <b>قاعدة البيانات</b><span>PostgreSQL محلي أو على الشبكة</span>
            </div>
            <div style={{ display: "flex", gap: 7, marginTop: 12, flexWrap: "wrap" }}>
              <a className="btn green" href="/downloads/AlGamal-Setup-2.1.0.exe" download><Monitor size={15} /> تحميل معالج التثبيت EXE</a>
              <a className="btn blue" href="/downloads/AlGamal-Portable-2.1.0.exe" download><PackageCheck size={15} /> تحميل النسخة المحمولة EXE</a>
              <button className="btn" onClick={() => onNavigate("backup")}><PackageCheck size={15} /> النسخ الاحتياطي</button>
            </div>
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 12 }}>
        <div className="panel-head"><span>أسئلة شائعة</span></div>
        <div className="panel-body">
          <div className="feature-list">
            <div><b>كيف أضيف صنفاً؟</b><br />من «المخازن» املأ النموذج ثم اضغط حفظ الصنف.</div>
            <div><b>كيف أستخدم الباركود؟</b><br />اكتب الكود في شاشة المبيعات واضغط Enter أو امسحه بقارئ الباركود.</div>
            <div><b>كيف أعرض فاتورة قديمة؟</b><br />من «معاينة الفواتير» اختر الفاتورة واضغط طباعة / PDF.</div>
            <div><b>كيف أخفي شاشة لا أحتاجها؟</b><br />من «تخصيص البرنامج» أو تبويب التخصيص في الإعدادات ثم احفظ.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
