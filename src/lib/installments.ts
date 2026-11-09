import type { Customer } from "@/lib/types";

export type InstallmentAccount = {
  customer: Customer;
  outstanding: number;
  totalPurchased: number;
  totalPaid: number;
  lastPaymentAmount: number | null;
  lastPaymentDate: string | null;
  firstUnpaidDate: string | null;
  daysSincePayment: number | null;
  referenceDate: string | null;
  overdue: boolean;
  openInvoices: number;
};

export type InstallmentsData = {
  accounts: InstallmentAccount[];
  totalOutstanding: number;
  totalPaid: number;
  overdueCount: number;
  overdueAmount: number;
  alertMonths: number;
  asOf: string;
};

export function dateKey(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function utcDay(key: string): number {
  const [year, month, day] = key.split("-").map(Number);
  return Date.UTC(year, month - 1, day) / 86400000;
}

export function daysBetween(from: Date | string, to: Date | string): number {
  const start = dateKey(from);
  const end = dateKey(to);
  if (!start || !end) return 0;
  return Math.max(0, utcDay(end) - utcDay(start));
}

export function addCalendarMonths(value: Date | string, months: number): string {
  const key = dateKey(value);
  if (!key) return "";
  const [year, month, day] = key.split("-").map(Number);
  const target = new Date(Date.UTC(year, month - 1 + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return target.toISOString().slice(0, 10);
}

export function isOverdue(reference: string | null, months: number, now: Date | string = new Date()): boolean {
  if (!reference) return false;
  const threshold = addCalendarMonths(reference, Math.max(1, months));
  return Boolean(threshold && dateKey(now) >= threshold);
}

export function elapsedLabel(days: number | null): string {
  if (days === null) return "لا توجد حركة";
  if (days === 0) return "اليوم";
  if (days === 1) return "من يوم";
  if (days === 2) return "من يومين";
  if (days <= 10) return `من ${days} أيام`;
  return `من ${days} يوم`;
}
