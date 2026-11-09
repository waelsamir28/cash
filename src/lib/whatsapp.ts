"use client";

/**
 * بناء رسالة واتساب للفاتورة + رابط PDF
 */
export function buildInvoiceWhatsappMessage(opts: {
  storeName: string;
  invoiceNo: string;
  customerName: string;
  total: number;
  currency: string;
  invoiceDate: string;
  paymentType: string;
  remaining: number;
  phone?: string;
  itemsCount?: number;
}): string {
  const lines: string[] = [];
  lines.push(`مرحباً ${opts.customerName} 👋`);
  lines.push(`من ${opts.storeName}`);
  lines.push(``);
  lines.push(`📄 فاتورة رقم: ${opts.invoiceNo}`);
  lines.push(`📅 التاريخ: ${new Date(opts.invoiceDate).toLocaleDateString("ar-EG")}`);
  if (opts.itemsCount) lines.push(`📦 عدد الأصناف: ${opts.itemsCount}`);
  lines.push(`💰 الإجمالي: ${opts.total.toFixed(2)} ${opts.currency}`);
  lines.push(`💳 طريقة الدفع: ${opts.paymentType}`);
  if (opts.remaining > 0) lines.push(`⏳ المتبقي: ${opts.remaining.toFixed(2)} ${opts.currency}`);
  lines.push(``);
  lines.push(`شكراً لتعاملكم معنا ❤️`);
  if (opts.storeName) lines.push(`${opts.storeName}`);
  return lines.join("\n");
}

export function getWhatsappLink(phone: string, message: string): string {
  const clean = phone.replace(/[^0-9]/g, "");
  // تحويل 01x إلى 201x لمصر
  let normalized = clean;
  if (clean.startsWith("0")) normalized = "2" + clean;
  else if (clean.startsWith("2") && clean.length >= 11) normalized = clean;
  else if (clean.length >= 10) normalized = clean;
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${normalized}?text=${encoded}`;
}

export function getInvoiceWhatsappLink(opts: {
  customerPhone: string;
  storeName: string;
  invoiceNo: string;
  customerName: string;
  total: number;
  currency: string;
  invoiceDate: string;
  paymentType: string;
  remaining: number;
  itemsCount?: number;
}): string {
  const msg = buildInvoiceWhatsappMessage(opts);
  return getWhatsappLink(opts.customerPhone, msg);
}
