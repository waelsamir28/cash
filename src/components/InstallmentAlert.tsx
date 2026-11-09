"use client";

import { ArrowLeft, BellRing, TriangleAlert } from "lucide-react";
import { fmt } from "@/lib/format";
import { elapsedLabel, type InstallmentsData } from "@/lib/installments";

type Props = {
  data: InstallmentsData | null;
  currency: string;
  onOpen: () => void;
};

export default function InstallmentAlert({ data, currency, onOpen }: Props) {
  const overdue = data?.accounts.filter((account) => account.overdue) ?? [];
  if (overdue.length === 0) return null;
  return (
    <section className="installment-alert" role="alert" aria-label="تنبيه أقساط متأخرة">
      <div className="installment-alert-icon"><BellRing size={25} /></div>
      <div className="installment-alert-content">
        <b><TriangleAlert size={15} style={{ verticalAlign: "middle", marginLeft: 5 }} /> تنبيه: {overdue.length} {overdue.length === 1 ? "عميل لم يسدد" : "عملاء لم يسددوا"} منذ {data?.alertMonths === 2 ? "شهرين" : `${data?.alertMonths ?? 2} أشهر`} أو أكثر</b>
        <div className="installment-alert-names">
          {overdue.slice(0, 4).map((account) => <span key={account.customer.id}>{account.customer.name} — <strong>{fmt(account.outstanding, 2)} {currency}</strong> <small>({elapsedLabel(account.daysSincePayment)})</small></span>)}
          {overdue.length > 4 && <span>+ {overdue.length - 4} عملاء آخرين</span>}
        </div>
      </div>
      <div className="installment-alert-total"><small>إجمالي المتأخر</small><strong>{fmt(data?.overdueAmount ?? 0, 2)} {currency}</strong></div>
      <button className="btn red" onClick={onOpen}>متابعة الأقساط <ArrowLeft size={15} /></button>
    </section>
  );
}
