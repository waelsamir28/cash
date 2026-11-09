/** حالة الترخيص كما تُعرض للمستخدم. آمن للاستخدام في الواجهة (لا يحتوي على الكود نفسه). */
export type LicenseState = "full" | "trial" | "expired" | "tampered";

export type LicenseStatus = {
  state: LicenseState;
  message: string;
  /** كود الجهاز الذي يرسله المستخدم لك لتوليد كود التفعيل */
  machineCode: string;
  licensee: string | null;
  keyStored: boolean;
  expiresAt: string | null;
  daysLeft: number | null;
  trialEndsAt: string | null;
  trialDays: number;
  trialProductCount: number;
};
