"use client";

import type { ReactNode } from "react";
import ActivationScreen from "@/components/ActivationScreen";
import StartScreen from "@/components/StartScreen";
import { SessionProvider, setSessionUser, useSessionUser } from "@/lib/session-context";
import type { LicenseStatus } from "@/lib/license/types";

/**
 * البوابة الرئيسية للبرنامج:
 * 1) الترخيص منتهٍ أو مخترق → شاشة التفعيل (لا يُحمَّل البرنامج أصلاً).
 * 2) لم يدخل المستخدم بعد → شاشة البداية (الاسم فقط).
 * 3) غير ذلك → البرنامج.
 */
export default function AppShell({ license, children }: { license: LicenseStatus; children: ReactNode }) {
  const userName = useSessionUser();

  if (license.state === "expired" || license.state === "tampered") {
    return <ActivationScreen license={license} />;
  }
  if (!userName) {
    return (
      <StartScreen
        license={license}
        onEnter={(name) => setSessionUser(name)}
        onExit={() => window.close()}
      />
    );
  }
  return (
    <SessionProvider userName={userName} license={license}>
      {children}
    </SessionProvider>
  );
}
