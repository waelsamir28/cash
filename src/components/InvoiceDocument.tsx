"use client";
/* eslint-disable @next/next/no-img-element */

import type { CSSProperties } from "react";
import { getInvoiceDesign } from "@/lib/appearance";
import { fmt, shortDate } from "@/lib/format";
import type { Invoice, StoreSettings } from "@/lib/types";
import BarcodeSvg from "@/components/BarcodeSvg";

type Props = {
  invoice: Invoice;
  settings: StoreSettings;
  customerBalance?: number | null;
};

export default function InvoiceDocument({ invoice, settings, customerBalance }: Props) {
  const design = getInvoiceDesign(settings);
  const template = design.template || "modern";
  const style = {
    "--invoice-accent": design.accent,
    "--invoice-table": design.tableHeader,
    fontSize: `${design.fontSize}px`,
  } as CSSProperties;
  const items = invoice.items ?? [];
  const balance = customerBalance ?? invoice.remaining;

  return (
    <article className={`invoice-document template-${template} paper-${design.paper}`} style={style} dir="rtl">
      <header className="invoice-doc-header">
        <div className="invoice-doc-brand">
          {design.showLogo && <img src={design.logoUrl || "/images/app-icon.png"} alt="شعار المحل" className="invoice-doc-logo" />}
          <div>
            <h1>{design.header}</h1>
            <p>{design.subtitle}</p>
          </div>
        </div>
        <div className="invoice-doc-title">
          <strong>{invoice.type === "purchase" ? "فاتورة مشتريات" : "فاتورة مبيعات"}</strong>
          <span className="invoice-doc-number" dir="ltr">#{invoice.invoiceNo}</span>
        </div>
      </header>

      <section className="invoice-doc-meta">
        <div><span>التاريخ</span><b>{shortDate(invoice.invoiceDate || invoice.createdAt)}</b></div>
        <div><span>{invoice.type === "purchase" ? "المورد" : "العميل"}</span><b>{invoice.customerName}</b></div>
        <div><span>طريقة الدفع</span><b>{invoice.paymentType}</b></div>
        <div><span>الحالة</span><b>{invoice.status}</b></div>
        <div><span>العنوان</span><b>{design.address || "—"}</b></div>
        <div><span>الهاتف</span><b dir="ltr">{design.phone || "—"}</b></div>
        {design.showTax && design.taxNumber && <div><span>الرقم الضريبي</span><b>{design.taxNumber}</b></div>}
      </section>

      <table className="invoice-doc-table">
        <thead><tr><th>م</th><th>الصنف</th><th>الوحدة</th><th>الكمية</th><th>السعر</th><th>الخصم</th><th>القيمة</th></tr></thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={item.id ?? index}>
              <td>{index + 1}</td><td className="invoice-doc-item-name">{item.productName}</td><td>{item.unit}</td>
              <td>{fmt(item.quantity, 0)}</td><td>{fmt(item.price, 2)}</td><td>{fmt(item.discount, 2)}</td><td>{fmt(item.total, 2)}</td>
            </tr>
          ))}
          {items.length === 0 && <tr><td colSpan={7}>لا توجد أصناف</td></tr>}
        </tbody>
      </table>

      <section className="invoice-doc-summary">
        <div className="invoice-doc-notes">
          {invoice.notes && <p><b>ملاحظات:</b> {invoice.notes}</p>}
          {design.showBalance && <p><b>رصيد العميل:</b> {fmt(balance, 2)} {design.currency}</p>}
          <p className="invoice-doc-thanks">{design.footer}</p>
        </div>
        <table className="invoice-doc-totals">
          <tbody>
            <tr><td>الإجمالي</td><td>{fmt(invoice.subtotal, 2)} {design.currency}</td></tr>
            <tr><td>الخصم</td><td>{fmt(invoice.discount, 2)} {design.currency}</td></tr>
            <tr><td>الضريبة</td><td>{fmt(invoice.tax, 2)} {design.currency}</td></tr>
            <tr className="grand"><td>الصافي</td><td>{fmt(invoice.total, 2)} {design.currency}</td></tr>
            <tr><td>المدفوع</td><td>{fmt(invoice.paid, 2)} {design.currency}</td></tr>
            <tr><td>المتبقي</td><td>{fmt(invoice.remaining, 2)} {design.currency}</td></tr>
          </tbody>
        </table>
      </section>

      {design.showBarcode && <footer className="invoice-doc-barcode"><BarcodeSvg value={invoice.invoiceNo} height={30} width={1.4} fontSize={11} /></footer>}
    </article>
  );
}
