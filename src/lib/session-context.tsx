"use client";

import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";
import type { LicenseStatus } from "@/lib/license/types";

const SESSION_KEY = "algamal.session.user";
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): string | null {
  try {
    return window.sessionStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

function getServerSnapshot(): string | null {
  return null;
}

/** يحفظ اسم الدخول لمدة تشغيل البرنامج الحالية فقط (يُمسح عند إغلاق النافذة). */
export function setSessionUser(name: string): void {
  try {
    window.sessionStorage.setItem(SESSION_KEY, name);
  } catch {
    // التخزين غير متاح: الجلسة تبقى في الذاكرة لهذه الصفحة فقط
  }
  listeners.forEach((listener) => listener());
}

/** اسم المستخدم الحالي أو null لو لم يدخل بعد. */
export function useSessionUser(): string | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

type SessionValue = { userName: string; license: LicenseStatus };

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ userName, license, children }: SessionValue & { children: ReactNode }) {
  return <SessionContext.Provider value={{ userName, license }}>{children}</SessionContext.Provider>;
}

/** بيانات الجلسة (اسم المستخدم وحالة الترخيص). تُستخدم داخل البرنامج فقط. */
export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession يجب استخدامه داخل AppShell");
  return value;
}
