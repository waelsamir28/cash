"use client";

import { useEffect, useState } from "react";
import { Tag } from "lucide-react";
import PriceLookupPanel from "@/components/PriceLookupPanel";
import type { Product } from "@/lib/types";

/** شاشة الأسعار للعملاء: تفتح على شاشة ثانية، ويقرأ منها العميل السعر بنفسه. */
export default function CustomerDisplay() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [storeName, setStoreName] = useState("الجمال للأدوات المدرسية");
  const [currency, setCurrency] = useState("ج.م");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch("/api/products", { cache: "no-store" }).then((response) => response.json()),
      fetch("/api/settings", { cache: "no-store" }).then((response) => response.json()),
    ])
      .then(([productData, settingsData]: [{ products?: Product[]; error?: string }, { settings?: { storeName: string; currency: string } }]) => {
        if (!active) return;
        if (!productData.products) {
          setError(productData.error ?? "تعذر تحميل الأصناف");
          return;
        }
        setProducts(productData.products);
        if (settingsData.settings) {
          setStoreName(settingsData.settings.storeName);
          setCurrency(settingsData.settings.currency);
        }
      })
      .catch(() => {
        if (active) setError("تعذر الاتصال بالبرنامج. تأكد أن برنامج الجمال مفتوح");
      });
    return () => {
      active = false;
    };
  }, []);

  if (error) {
    return (
      <div className="price-page">
        <div className="price-not-found"><Tag size={48} /><b>{error}</b></div>
      </div>
    );
  }
  if (!products) {
    return <div className="price-page"><div className="price-loading">جارٍ تحميل الأصناف…</div></div>;
  }

  return (
    <PriceLookupPanel
      products={products}
      currency={currency}
      storeName={storeName}
      variant="page"
      idleResetMs={45_000}
    />
  );
}
