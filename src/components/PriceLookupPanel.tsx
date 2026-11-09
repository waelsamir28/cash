"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Eraser, PackageSearch, Search, Tag, X } from "lucide-react";
import { fmt } from "@/lib/format";
import type { Product } from "@/lib/types";

export type PriceLookupProps = {
  products: Product[];
  currency: string;
  storeName: string;
  /** قيمة مبدئية (مثلاً كود جاء من الموبايل). غيّر مفتاح المكوّن لإعادة تعيينها. */
  initialQuery?: string;
  variant: "modal" | "page";
  onClose?: () => void;
  /** يمسح الشاشة تلقائياً بعد هذه المدة من آخر عرض (مفيد لشاشة العميل). */
  idleResetMs?: number;
};

function exactMatch(products: Product[], query: string): Product | null {
  const value = query.trim().toLowerCase();
  if (!value) return null;
  return products.find((p) => p.active && (p.code.toLowerCase() === value || (p.barcode ?? "").toLowerCase() === value)) ?? null;
}

function searchMatches(products: Product[], query: string): Product[] {
  const value = query.trim().toLowerCase();
  if (!value) return [];
  return products
    .filter((p) => p.active && [p.name, p.code, p.barcode ?? "", p.category, p.categoryGroup].some((text) => text.toLowerCase().includes(value)))
    .slice(0, 30);
}

/** بحث سريع عن سعر الصنف بالباركود أو الكود أو الاسم، بخط كبير مناسب للعرض على الشاشات. */
export default function PriceLookupPanel({ products, currency, storeName, initialQuery = "", variant, onClose, idleResetMs }: PriceLookupProps) {
  const [query, setQuery] = useState(initialQuery);
  const [picked, setPicked] = useState<Product | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const exact = useMemo(() => exactMatch(products, query), [products, query]);
  const matches = useMemo(() => (exact ? [] : searchMatches(products, query)), [products, query, exact]);
  const shown = picked ?? exact ?? (matches.length === 1 ? matches[0] : null);

  useEffect(() => {
    const focusTimer = setTimeout(() => inputRef.current?.focus(), 60);
    return () => clearTimeout(focusTimer);
  }, []);

  useEffect(() => {
    if (!idleResetMs || !shown) return;
    const resetTimer = setTimeout(() => {
      setQuery("");
      setPicked(null);
    }, idleResetMs);
    return () => clearTimeout(resetTimer);
  }, [shown, idleResetMs]);

  const reset = () => {
    setQuery("");
    setPicked(null);
    inputRef.current?.focus();
  };

  const submit = () => {
    if (exact) setPicked(exact);
    else if (matches.length > 0) setPicked(matches[0]);
  };

  const lowStock = shown ? shown.quantity <= shown.minQuantity : false;

  const body = (
    <div className="price-body">
      <div className="price-search-row">
        <Search size={26} className="price-search-icon" />
        <input
          ref={inputRef}
          className="price-search-input"
          value={query}
          placeholder="امسح الباركود أو اكتب الكود أو اسم الصنف"
          aria-label="بحث عن صنف"
          onChange={(event) => {
            setQuery(event.target.value);
            setPicked(null);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") submit();
            if (event.key === "Escape" && onClose) onClose();
          }}
        />
        {query && (
          <button className="price-clear" onClick={reset} aria-label="مسح البحث">
            <Eraser size={20} />
          </button>
        )}
      </div>

      {!query && (
        <div className="price-idle">
          <div className="price-idle-badge"><Tag size={40} /></div>
          <h2>أهلاً بك في {storeName}</h2>
          <p>امسح باركود الصنف أو اكتب اسمه أو كوده لمعرفة سعره</p>
        </div>
      )}

      {query && !shown && matches.length > 1 && (
        <div className="price-results" role="listbox" aria-label="نتائج البحث">
          {matches.map((product) => (
            <button key={product.id} className="price-result" onClick={() => setPicked(product)} role="option" aria-selected={false}>
              <span className="price-result-name">{product.name}</span>
              <span className="price-result-code">{product.code}</span>
              <span className="price-result-price">{fmt(product.salePrice, 2)} {currency}</span>
            </button>
          ))}
        </div>
      )}

      {query && !shown && matches.length === 0 && (
        <div className="price-not-found">
          <PackageSearch size={48} />
          <b>لا يوجد صنف بهذا الكود أو الاسم</b>
          <span>جرّب كتابة جزء من الاسم أو تأكد من الكود</span>
        </div>
      )}

      {shown && (
        <div className="price-card" key={shown.id}>
          <div className="price-card-group">{shown.categoryGroup} · {shown.category}</div>
          <h3 className="price-card-name">{shown.name}</h3>
          <div className="price-card-amount">
            <span className="price-card-value">{fmt(shown.salePrice, 2)}</span>
            <span className="price-card-currency">{currency}</span>
          </div>
          <div className="price-card-meta">
            <span>الوحدة: <b>{shown.unit}</b></span>
            <span dir="ltr">الكود: <b>{shown.code}</b></span>
            {shown.barcode && <span dir="ltr">الباركود: <b>{shown.barcode}</b></span>}
            <span className={lowStock ? "price-low" : "price-ok"}>
              {lowStock ? "كمية قليلة" : "متوفر"}: <b>{fmt(shown.quantity, 0)}</b>
            </span>
          </div>
        </div>
      )}
    </div>
  );

  if (variant === "page") {
    return <div className="price-page">{body}</div>;
  }

  return (
    <div className="price-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && onClose) onClose(); }}>
      <div className="price-modal" role="dialog" aria-modal="true" aria-label="معرفة سعر الصنف">
        <div className="price-modal-head">
          <span><Tag size={18} /> معرفة سعر صنف</span>
          <span className="price-modal-hint">اختصار F7</span>
          <button className="btn small" onClick={onClose} aria-label="إغلاق"><X size={15} /></button>
        </div>
        {body}
      </div>
    </div>
  );
}
