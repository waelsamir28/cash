"use client";

import { BarChart3, Download, Eye, RefreshCw, TrendingUp } from "lucide-react";
import { downloadFile } from "@/lib/client-api";
import { fmt, money, shortDate } from "@/lib/format";
import type { Invoice, ReportsData, StoreSettings } from "@/lib/types";

type Props = {
  reports: ReportsData | null;
  invoices: Invoice[];
  settings: StoreSettings;
  onOpenPreview: (invoiceId: number | null) => void;
  onRefresh: () => Promise<void> | void;
  onToast: (message: string, error?: boolean) => void;
};

export default function ReportsScreen({ reports, invoices, settings, onOpenPreview, onRefresh, onToast }: Props) {
  const daily = reports?.daily ?? [];
  const max = Math.max(...daily.map((day) => day.total), 1);

  const exportCsv = () => {
    const header = ["رقم الفاتورة", "النوع", "العميل", "التاريخ", "الإجمالي", "طريقة الدفع", "الحالة"];
    const rows = invoices.map((invoice) => [invoice.invoiceNo, invoice.type === "sale" ? "مبيعات" : "مشتريات", invoice.customerName, shortDate(invoice.createdAt), invoice.total, invoice.paymentType, invoice.status]);
    const csv = "\uFEFF" + [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    downloadFile("algamal-invoices.csv", csv, "text/csv");
    onToast("تم تصدير تقرير الفواتير CSV");
  };

  return (
    <div>
      <h2 className="page-title"><BarChart3 size={20} style={{ verticalAlign: "middle", marginLeft: 6 }} /> التقارير والإحصائيات</h2>
      <p className="page-desc">ملخص فوري للمبيعات والمشتريات والأرباح وحركة المخزون من قاعدة البيانات.</p>

      <div style={{ display: "flex", gap: 7, marginBottom: 12 }}>
        <button className="btn blue" onClick={() => void onRefresh()}><RefreshCw size={15} /> تحديث البيانات</button>
        <button className="btn" onClick={exportCsv}><Download size={15} /> تصدير الفواتير CSV</button>
        <span className="head-chip"><TrendingUp size={13} /> آخر 7 أيام</span>
      </div>

      <div className="stat-grid">
        <div className="stat-card"><div className="k">إجمالي المبيعات</div><div className="v green">{fmt(reports?.salesTotal ?? 0, 2)}</div></div>
        <div className="stat-card"><div className="k">إجمالي المشتريات</div><div className="v red">{fmt(reports?.purchasesTotal ?? 0, 2)}</div></div>
        <div className="stat-card"><div className="k">صافي الربح التقديري</div><div className="v">{fmt(reports?.profit ?? 0, 2)}</div></div>
        <div className="stat-card"><div className="k">قيمة المخزون</div><div className="v">{fmt(reports?.stockValue ?? 0, 2)}</div></div>
      </div>

      <div className="two-col" style={{ gridTemplateColumns: "1.4fr 1fr" }}>
        <div className="panel">
          <div className="panel-head"><span>مبيعات آخر 7 أيام</span><span>{money(reports?.salesTotal ?? 0, settings.currency)}</span></div>
          <div className="chart">
            {daily.map((day, index) => (
              <div className="chart-col" key={`${day.day}-${index}`}>
                <span className="chart-value">{fmt(day.total, 0)}</span>
                <div className="chart-bar" style={{ height: `${Math.max(4, (day.total / max) * 120)}px` }} />
                <span className="chart-label">{day.day}</span>
              </div>
            ))}
          </div>
          <div className="panel-body">
            <div className="stat-grid" style={{ gridTemplateColumns: "repeat(4,1fr)", marginBottom: 0 }}>
              <div className="stat-card"><div className="k">فواتير مبيعات</div><div className="v">{reports?.salesCount ?? 0}</div></div>
              <div className="stat-card"><div className="k">فواتير مشتريات</div><div className="v">{reports?.purchasesCount ?? 0}</div></div>
              <div className="stat-card"><div className="k">الأصناف</div><div className="v">{reports?.productsCount ?? 0}</div></div>
              <div className="stat-card"><div className="k">العملاء</div><div className="v">{reports?.customersCount ?? 0}</div></div>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head"><span>الأصناف الأكثر مبيعاً</span></div>
          <div className="panel-body" style={{ padding: 8 }}>
            <table className="win-table">
              <thead><tr><th>الصنف</th><th>الكمية</th><th>القيمة</th></tr></thead>
              <tbody>
                {(reports?.topProducts ?? []).map((item) => (
                  <tr key={item.name}><td className="right">{item.name}</td><td>{fmt(item.quantity, 0)}</td><td>{fmt(item.total, 2)}</td></tr>
                ))}
                {(reports?.topProducts ?? []).length === 0 && <tr><td colSpan={3} className="empty-row">احفظ أول فاتورة مبيعات لظهور الإحصائيات</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="two-col" style={{ gridTemplateColumns: "1.4fr 1fr", marginTop: 12 }}>
        <div className="panel">
          <div className="panel-head"><span>أحدث الفواتير</span></div>
          <div className="table-wrap" style={{ maxHeight: 240 }}>
            <table className="win-table">
              <thead><tr><th>رقم الفاتورة</th><th>النوع</th><th>العميل / المورد</th><th>التاريخ</th><th>الإجمالي</th><th>الدفع</th><th>معاينة</th></tr></thead>
              <tbody>
                {(reports?.recent ?? invoices.slice(0, 8)).map((invoice) => (
                  <tr key={invoice.id}><td>{invoice.invoiceNo}</td><td>{invoice.type === "sale" ? "مبيعات" : "مشتريات"}</td><td className="right">{invoice.customerName}</td><td>{shortDate(invoice.createdAt)}</td><td><b>{fmt(invoice.total, 2)}</b></td><td>{invoice.paymentType}</td><td><button className="btn small blue" onClick={() => onOpenPreview(invoice.id)}><Eye size={12} /> عرض</button></td></tr>
                ))}
                {invoices.length === 0 && <tr><td colSpan={7} className="empty-row">لا توجد فواتير بعد</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
        <div className="panel">
          <div className="panel-head"><span>تنبيهات المخزون</span><span className="head-chip" style={{ color: "#c00" }}>{reports?.lowStock.length ?? 0} أصناف</span></div>
          <div className="panel-body" style={{ padding: 8 }}>
            <table className="win-table">
              <thead><tr><th>الصنف</th><th>المتوفر</th><th>الحد</th></tr></thead>
              <tbody>
                {(reports?.lowStock ?? []).map((product) => (
                  <tr key={product.id} className="alert"><td className="right">{product.name}</td><td>{fmt(product.quantity, 0)}</td><td>{fmt(product.minQuantity, 0)}</td></tr>
                ))}
                {(reports?.lowStock ?? []).length === 0 && <tr><td colSpan={3} className="empty-row">جميع الأصناف فوق حد الطلب</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
