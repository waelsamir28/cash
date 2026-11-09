import type { Viewport } from "next";
import MobileScanner from "@/components/MobileScanner";

// الموبايل يحتاج عرض جهازه الحقيقي (التطبيق الرئيسي مضبوط على 1280 لشاشة الكمبيوتر)
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function ScanPage() {
  return <MobileScanner />;
}
