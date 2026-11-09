import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "@fontsource/cairo/400.css";
import "@fontsource/cairo/600.css";
import "@fontsource/cairo/700.css";
import "@fontsource/tajawal/400.css";
import "@fontsource/tajawal/700.css";
import "@fontsource/almarai/400.css";
import "@fontsource/almarai/700.css";
import "@fontsource/ibm-plex-sans-arabic/400.css";
import "@fontsource/ibm-plex-sans-arabic/600.css";
import "@fontsource/noto-kufi-arabic/400.css";
import "@fontsource/noto-kufi-arabic/700.css";
import "./globals.css";
import "./theme.css";
import "./refinements.css";
import "./catalog-select.css";
import "./pro-ui.css";
import "./pos-clean.css";
import "./license.css";
import "./new-screens.css";

export const metadata: Metadata = {
  title: "الجمال للأدوات المدرسية | نظام إدارة المكتبات والقرطاسية",
  description: "نظام سطح مكتب عربي للأدوات المدرسية والمكتبية: مبيعات، مشتريات، مخازن، كشف حساب، معاينة فواتير، ثيمات وتصميم فواتير — جاهز للتحويل إلى ملف EXE.",
  icons: { icon: "/images/app-icon.png" },
};

export const viewport: Viewport = {
  width: 1280,
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
