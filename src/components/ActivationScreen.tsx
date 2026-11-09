"use client";

import { LogOut } from "lucide-react";
import LicenseCard from "@/components/LicenseCard";
import SupportBar from "@/components/SupportBar";
import type { LicenseStatus } from "@/lib/license/types";

/** شاشة التفعيل تظهر عند انتهاء التجربة أو انتهاء كود التفعيل أو اكتشاف تلاعب بالساعة. */
export default function ActivationScreen({ license }: { license: LicenseStatus }) {
  const title = license.state === "tampered"
    ? "تم اكتشاف تغيير في تاريخ الجهاز"
    : license.keyStored
      ? "انتهت صلاحية التفعيل"
      : "انتهت الفترة التجريبية";

  return (
    <div className="gate-root gate-activation">
      <div className="gate-glow" />
      <header className="gate-hero">
        <div className="hero-small">برنامج</div>
        <div className="hero-big">الجمال</div>
        <div className="hero-slogan">إدارة احترافية .. لمكتبة وأدوات مدرسية أكثر نجاحاً</div>
      </header>

      <main className="gate-main">
        <section className="gate-card gate-card-wide">
          <h1 className="gate-title">{title}</h1>
          <p className="gate-sub">{license.message}</p>
          <LicenseCard license={license} />
          <div className="gate-btn-row">
            <button className="gate-btn-exit" onClick={() => window.close()}>
              <LogOut size={18} /> خروج من البرنامج
            </button>
          </div>
        </section>
      </main>

      <SupportBar />
    </div>
  );
}
