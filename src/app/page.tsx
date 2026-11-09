import { db } from "@/db";
import { customers, invoices, products } from "@/db/schema";
import { desc } from "drizzle-orm";
import { ensureSeed } from "@/lib/seed";
import { getSettings } from "@/lib/server";
import { getLicenseStatus } from "@/lib/license/core";
import { TRIAL_PRODUCT_CODES } from "@/lib/license/config";
import type { LicenseStatus } from "@/lib/license/types";
import { DEFAULT_SETTINGS, type Customer, type Invoice, type Product, type StoreSettings } from "@/lib/types";
import AppShell from "@/components/AppShell";
import DesktopApp from "@/components/DesktopApp";

export const dynamic = "force-dynamic";

function serialize<T>(value: unknown): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export default async function HomePage() {
  let license: LicenseStatus | null = null;
  let productRows: Product[] = [];
  let customerRows: Customer[] = [];
  let invoiceRows: Invoice[] = [];
  let settings: StoreSettings = DEFAULT_SETTINGS;
  let loadError = "تعذر الاتصال بقاعدة البيانات";

  try {
    await ensureSeed();
    license = await getLicenseStatus();
    const blocked = license.state === "expired" || license.state === "tampered";
    // لا نرسل بيانات العمل إلى المتصفح أصلاً عندما يكون الترخيص منتهياً
    if (!blocked) {
      const [productsData, customersData, invoicesData, settingsData] = await Promise.all([
        db.select().from(products).orderBy(desc(products.id)),
        db.select().from(customers).orderBy(desc(customers.id)),
        db.select().from(invoices).orderBy(desc(invoices.id)).limit(100),
        getSettings(),
      ]);
      const visibleProducts = license.state === "trial"
        ? productsData.filter((product) => TRIAL_PRODUCT_CODES.includes(product.code))
        : productsData;
      productRows = serialize<Product[]>(visibleProducts);
      customerRows = serialize<Customer[]>(customersData);
      invoiceRows = serialize<Invoice[]>(invoicesData);
      settings = settingsData;
    }
  } catch (error) {
    const raw = error instanceof Error ? error.message : loadError;
    // رسالة أوضح لو الجداول غير موجودة
    if (raw.includes('relation "') && raw.includes("does not exist")) {
      loadError = "قاعدة البيانات فارغة — الجداول غير موجودة. افتح /api/migrate لتجهيزها أو شغّل npm run db:push محلياً.\nالتفاصيل: " + raw;
    } else {
      loadError = raw;
    }
  }

  if (!license) {
    return (
      <main className="gate-root">
        <div className="gate-glow" />
        <section className="gate-main">
          <div className="gate-card">
            <h1 className="gate-title">تعذر تشغيل البرنامج</h1>
            <p className="gate-sub">{loadError}</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <AppShell license={license}>
      <DesktopApp
        initialProducts={productRows}
        initialCustomers={customerRows}
        initialInvoices={invoiceRows}
        initialSettings={settings}
      />
    </AppShell>
  );
}
