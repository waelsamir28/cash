"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { PackageSearch, Plus, Search, X } from "lucide-react";
import { fmt } from "@/lib/format";
import type { Product } from "@/lib/types";
import AppSelect from "@/components/AppSelect";

type Props = {
  products: Product[];
  isSale: boolean;
  currency: string;
  onAdd: (product: Product, quantity: number) => void;
  onClose: () => void;
};

export default function ProductSearchModal({ products, isSale, currency, onAdd, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("الكل");
  const [category, setCategory] = useState("الكل");
  const [quantity, setQuantity] = useState("1");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [added, setAdded] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);
  const groups = useMemo(() => ["الكل", ...Array.from(new Set(products.map((product) => product.categoryGroup)))], [products]);
  const categories = useMemo(() => ["الكل", ...Array.from(new Set(products.filter((product) => group === "الكل" || product.categoryGroup === group).map((product) => product.category)))], [products, group]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((product) => product.active
      && (group === "الكل" || product.categoryGroup === group)
      && (category === "الكل" || product.category === category)
      && (!q || [product.name, product.code, product.barcode, product.category, product.categoryGroup].some((value) => value.toLowerCase().includes(q))));
  }, [products, query, group, category]);
  const selected = products.find((product) => product.id === selectedId) ?? null;

  useEffect(() => {
    const timer = setTimeout(() => searchRef.current?.focus(), 40);
    const handler = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => { clearTimeout(timer); window.removeEventListener("keydown", handler); };
  }, [onClose]);

  const add = (product: Product) => {
    const qty = Math.max(0.001, Number(quantity) || 1);
    onAdd(product, qty);
    setSelectedId(product.id);
    setAdded((current) => current + 1);
  };

  return (
    <div className="modal-backdrop product-search-backdrop">
      <div className="modal product-search-modal" role="dialog" aria-modal="true" aria-label="بحث الأصناف">
        <div className="modal-head">
          <span><PackageSearch size={18} style={{ verticalAlign: "middle", marginLeft: 6 }} /> بحث الأصناف — اضغط مرتين على الصنف لإضافته</span>
          <button className="btn small" onClick={onClose} aria-label="إغلاق البحث"><X size={14} /></button>
        </div>
        <div className="modal-body">
          <div className="product-search-toolbar">
            <div className="product-search-input"><Search size={17} /><input ref={searchRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث بالاسم أو الكود أو الباركود..." onKeyDown={(event) => { if (event.key === "Enter" && selected) add(selected); }} /></div>
            <AppSelect ariaLabel="المجموعة" value={group} onChange={(value) => { setGroup(value); setCategory("الكل"); }} options={groups.map((item) => ({ value: item, label: item === "الكل" ? "كل المجموعات" : item }))} />
            <AppSelect ariaLabel="التصنيف" value={category} onChange={setCategory} options={categories.map((item) => ({ value: item, label: item === "الكل" ? "كل التصنيفات" : item }))} />
            <div className="product-search-qty"><label>الكمية</label><input type="number" min="0.001" step="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} /></div>
          </div>
          <div className="table-wrap product-search-table">
            <table className="win-table">
              <thead><tr><th>الكود</th><th>اسم الصنف</th><th>المجموعة</th><th>التصنيف</th><th>السعر</th><th>المتوفر</th><th>الوحدة</th><th>إضافة</th></tr></thead>
              <tbody>
                {filtered.map((product) => (
                  <tr key={product.id} className={selectedId === product.id ? "selected" : ""} onClick={() => setSelectedId(product.id)} onDoubleClick={() => add(product)}>
                    <td>{product.code}</td><td className="right">{product.name}</td><td>{product.categoryGroup}</td><td>{product.category}</td>
                    <td>{fmt(isSale ? product.salePrice : product.purchasePrice, 2)} {currency}</td><td>{fmt(product.quantity, 0)}</td><td>{product.unit}</td>
                    <td><button className="btn small green" onClick={(event) => { event.stopPropagation(); add(product); }}><Plus size={12} /></button></td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={8} className="empty-row">لا توجد أصناف مطابقة للبحث</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
        <div className="modal-foot product-search-foot">
          <span className="head-chip">النتائج: {filtered.length}</span>
          <span className="head-chip">تمت إضافة {added} صنف في هذه الجلسة</span>
          <span style={{ flex: 1 }} />
          <button className="btn green" disabled={!selected} onClick={() => selected && add(selected)}><Plus size={15} /> إضافة المحدد</button>
          <button className="btn" onClick={onClose}><X size={15} /> إغلاق</button>
        </div>
      </div>
    </div>
  );
}
