"use client";

import { useMemo, useState } from "react";
import { BookOpen, Boxes, Download, FolderTree, PackagePlus, Pencil, Plus, Save, Search, Trash2, Warehouse, X } from "lucide-react";
import { api, downloadFile } from "@/lib/client-api";
import { fmt } from "@/lib/format";
import { CATALOG_GROUPS } from "@/lib/catalog";
import type { Product, ProductCategory, ProductGroup } from "@/lib/types";
import GroupsManager from "@/components/GroupsManager";

type Props = {
  products: Product[];
  categories: ProductCategory[];
  groups: ProductGroup[];
  variant?: "inventory" | "catalog";
  onRefresh: () => Promise<void> | void;
  onToast: (message: string, error?: boolean) => void;
};

type Form = {
  id: number | null; code: string; barcode: string; name: string; categoryGroup: string; category: string;
  unit: string; purchasePrice: string; salePrice: string; quantity: string; minQuantity: string; taxRate: string; active: boolean;
};

const emptyForm: Form = {
  id: null, code: "", barcode: "", name: "", categoryGroup: "أدوات مدرسية", category: "أقلام", unit: "قطعة",
  purchasePrice: "0", salePrice: "0", quantity: "0", minQuantity: "5", taxRate: "0", active: true,
};

export default function InventoryScreen({ products, categories, groups, variant = "inventory", onRefresh, onToast }: Props) {
  const [tab, setTab] = useState<"items" | "groups">("items");
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("الكل");
  const [category, setCategory] = useState("الكل");
  const [form, setForm] = useState<Form>(emptyForm);
  const [busy, setBusy] = useState(false);
  const [managerOpen, setManagerOpen] = useState(false);
  const [categoryForm, setCategoryForm] = useState({ id: 0, name: "", groupName: "كتب خارجية", color: "#7b4bc4" });
  const [categoryBusy, setCategoryBusy] = useState(false);

  const groupNames = useMemo(() => Array.from(new Set([
    ...CATALOG_GROUPS.map((item) => item.name),
    ...groups.map((item) => item.name),
    ...categories.map((item) => item.groupName),
    ...products.map((item) => item.categoryGroup || "أدوات مدرسية"),
  ])), [categories, products, groups]);
  const categoryNames = useMemo(() => Array.from(new Set([
    ...CATALOG_GROUPS.flatMap((item) => item.categories),
    ...categories.map((item) => item.name),
    ...products.map((item) => item.category),
  ])), [categories, products]);
  const categoriesForGroup = (groupName: string) => Array.from(new Set([
    ...(CATALOG_GROUPS.find((item) => item.name === groupName)?.categories ?? []),
    ...categories.filter((item) => item.groupName === groupName).map((item) => item.name),
    ...products.filter((item) => item.categoryGroup === groupName).map((item) => item.category),
  ]));
  const colorForGroup = (groupName: string) => groups.find((item) => item.name === groupName)?.color
    ?? categories.find((item) => item.groupName === groupName)?.color
    ?? CATALOG_GROUPS.find((item) => item.name === groupName)?.color ?? "#1675c5";

  const filtered = products.filter((product) => {
    const q = query.trim().toLowerCase();
    return (group === "الكل" || product.categoryGroup === group)
      && (category === "الكل" || product.category === category)
      && (!q || [product.name, product.code, product.barcode, product.category, product.categoryGroup].some((value) => value.toLowerCase().includes(q)));
  });

  const select = (product: Product) => setForm({
    id: product.id, code: product.code, barcode: product.barcode, name: product.name,
    categoryGroup: product.categoryGroup || "أدوات مدرسية", category: product.category, unit: product.unit,
    purchasePrice: String(product.purchasePrice), salePrice: String(product.salePrice), quantity: String(product.quantity),
    minQuantity: String(product.minQuantity), taxRate: String(product.taxRate), active: product.active,
  });
  const update = (patch: Partial<Form>) => setForm((current) => ({ ...current, ...patch }));

  const save = async () => {
    if (!form.name.trim()) { onToast("اسم الصنف مطلوب", true); return; }
    if (!form.category.trim() || !form.categoryGroup.trim()) { onToast("اختر المجموعة والتصنيف", true); return; }
    setBusy(true);
    try {
      await api("/api/products", {
        method: form.id ? "PATCH" : "POST",
        body: JSON.stringify({ ...form, purchasePrice: Number(form.purchasePrice) || 0, salePrice: Number(form.salePrice) || 0, quantity: Number(form.quantity) || 0, minQuantity: Number(form.minQuantity) || 0, taxRate: Number(form.taxRate) || 0 }),
      });
      onToast(form.id ? "تم تعديل بيانات الصنف" : "تمت إضافة الصنف الجديد");
      setForm(emptyForm);
      await onRefresh();
    } catch (error) { onToast(error instanceof Error ? error.message : "تعذر حفظ الصنف", true); }
    finally { setBusy(false); }
  };

  const remove = async () => {
    if (!form.id || !window.confirm("هل تريد حذف هذا الصنف نهائياً؟")) return;
    try {
      await api(`/api/products?id=${form.id}`, { method: "DELETE" });
      onToast("تم حذف الصنف"); setForm(emptyForm); await onRefresh();
    } catch (error) { onToast(error instanceof Error ? error.message : "تعذر حذف الصنف", true); }
  };

  const exportCsv = () => {
    const header = ["الكود", "الباركود", "اسم الصنف", "المجموعة", "التصنيف", "الوحدة", "سعر الشراء", "سعر البيع", "الكمية", "حد الطلب"];
    const rows = products.map((product) => [product.code, product.barcode, product.name, product.categoryGroup, product.category, product.unit, product.purchasePrice, product.salePrice, product.quantity, product.minQuantity]);
    const csv = "\uFEFF" + [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    downloadFile("algamal-products.csv", csv, "text/csv");
    onToast("تم تصدير قائمة الأصناف CSV");
  };

  const saveCategory = async () => {
    if (!categoryForm.name.trim() || !categoryForm.groupName.trim()) { onToast("اكتب اسم المجموعة والتصنيف", true); return; }
    setCategoryBusy(true);
    try {
      await api("/api/categories", { method: categoryForm.id ? "PATCH" : "POST", body: JSON.stringify(categoryForm) });
      onToast(categoryForm.id ? "تم تعديل التصنيف وتحديث أصنافه" : "تمت إضافة التصنيف للمجموعة");
      setCategoryForm({ id: 0, name: "", groupName: categoryForm.groupName, color: categoryForm.color });
      await onRefresh();
    } catch (error) { onToast(error instanceof Error ? error.message : "تعذر حفظ التصنيف", true); }
    finally { setCategoryBusy(false); }
  };

  const deleteCategory = async () => {
    if (!categoryForm.id || !window.confirm("حذف التصنيف؟ لا يمكن حذف تصنيف مرتبط بأصناف.")) return;
    try {
      await api(`/api/categories?id=${categoryForm.id}`, { method: "DELETE" });
      onToast("تم حذف التصنيف الفارغ");
      setCategoryForm({ id: 0, name: "", groupName: categoryForm.groupName, color: categoryForm.color });
      await onRefresh();
    } catch (error) { onToast(error instanceof Error ? error.message : "تعذر حذف التصنيف", true); }
  };

  const lowCount = products.filter((product) => product.quantity <= product.minQuantity).length;
  const stockValue = products.reduce((sum, product) => sum + product.quantity * product.purchasePrice, 0);

  return (
    <div>
      <h2 className="page-title">{variant === "catalog" ? <Boxes size={20} style={{ verticalAlign: "middle", marginLeft: 6 }} /> : <Warehouse size={20} style={{ verticalAlign: "middle", marginLeft: 6 }} />} {variant === "catalog" ? "الأصناف والمجموعات" : "المخازن والأصناف"}</h2>
      <p className="page-desc">{variant === "catalog" ? "اعرض كل الأصناف وعدّل بياناتها، وأضف المجموعات والتصنيفات وعدّل أسماءها وألوانها من مكان واحد." : "كتب خارجية، كشاكيل وكراسات، أقلام وأدوات مدرسية، ألوان وأنشطة، وأدوات مكتبية — كل مجموعة بتصنيفاتها الخاصة."}</p>
      {variant === "catalog" && <div className="settings-tabs"><button className={`settings-tab ${tab === "items" ? "active" : ""}`} onClick={() => setTab("items")}><PackagePlus size={15} style={{ verticalAlign: "middle", marginLeft: 5 }} /> الأصناف ({products.length})</button><button className={`settings-tab ${tab === "groups" ? "active" : ""}`} onClick={() => setTab("groups")}><FolderTree size={15} style={{ verticalAlign: "middle", marginLeft: 5 }} /> المجموعات والتصنيفات ({groups.length})</button></div>}
      {variant === "catalog" && tab === "groups" ? <GroupsManager groups={groups} categories={categories} products={products} onRefresh={onRefresh} onToast={onToast} /> : <>

      <div className="stat-grid">
        <div className="stat-card"><div className="k">إجمالي الأصناف</div><div className="v">{products.length}</div></div>
        <div className="stat-card"><div className="k">أصناف ناقصة</div><div className="v red">{lowCount}</div></div>
        <div className="stat-card"><div className="k">قيمة المخزون (تكلفة)</div><div className="v">{fmt(stockValue, 2)}</div></div>
        <div className="stat-card"><div className="k">المجموعات / التصنيفات</div><div className="v">{groupNames.length} / {categoryNames.length}</div></div>
      </div>

      <div className="catalog-group-strip">
        <button className={`catalog-group-chip ${group === "الكل" ? "active" : ""}`} style={group === "الكل" ? { background: "linear-gradient(#2878cf,#0b4b9d)" } : undefined} onClick={() => { setGroup("الكل"); setCategory("الكل"); }}><FolderTree size={16} /> كل المجموعات <small>{products.length}</small></button>
        {groupNames.map((name) => <button key={name} className={`catalog-group-chip ${group === name ? "active" : ""}`} style={group === name ? { background: `linear-gradient(${colorForGroup(name)},#173a63)` } : undefined} onClick={() => { setGroup(name); setCategory("الكل"); }}><BookOpen size={15} /> {name} <small>{products.filter((product) => product.categoryGroup === name).length}</small></button>)}
        <button className="btn small" onClick={() => setManagerOpen(true)}><FolderTree size={14} /> إدارة المجموعات والتصنيفات</button>
      </div>

      <div className="two-col wide-left">
        <div className="panel">
          <div className="panel-head"><span>قائمة الأصناف — {filtered.length}</span>
            <div className="inventory-filters"><Search size={15} /><input placeholder="بحث سريع..." value={query} onChange={(event) => setQuery(event.target.value)} />
              <select value={group} onChange={(event) => { setGroup(event.target.value); setCategory("الكل"); }}><option value="الكل">كل المجموعات</option>{groupNames.map((item) => <option key={item}>{item}</option>)}</select>
              <select value={category} onChange={(event) => setCategory(event.target.value)}><option value="الكل">كل التصنيفات</option>{(group === "الكل" ? categoryNames : categoriesForGroup(group)).map((item) => <option key={item}>{item}</option>)}</select>
              <button className="btn small" onClick={exportCsv}><Download size={13} /> CSV</button>
            </div>
          </div>
          <div className="table-wrap" style={{ maxHeight: 470 }}>
            <table className="win-table"><thead><tr><th>م</th><th>الكود</th><th>اسم الصنف</th><th>المجموعة / التصنيف</th><th>الوحدة</th><th>شراء</th><th>بيع</th><th>الكمية</th><th>الحد</th></tr></thead><tbody>
              {filtered.map((product, index) => <tr key={product.id} className={form.id === product.id ? "selected" : product.quantity <= product.minQuantity ? "alert" : ""} onClick={() => select(product)} style={{ cursor: "pointer" }}><td>{index + 1}</td><td>{product.code}</td><td className="right product-name-cell">{product.name}</td><td>{product.categoryGroup}<br /><small>{product.category}</small></td><td>{product.unit}</td><td>{fmt(product.purchasePrice, 2)}</td><td>{fmt(product.salePrice, 2)}</td><td><b>{fmt(product.quantity, 0)}</b></td><td>{fmt(product.minQuantity, 0)}</td></tr>)}
              {filtered.length === 0 && <tr><td colSpan={9} className="empty-row">لا توجد أصناف مطابقة</td></tr>}
            </tbody></table>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head"><span>{form.id ? "تعديل صنف" : "إضافة صنف جديد"}</span><PackagePlus size={17} /></div>
          <div className="panel-body">
            <div className="form-grid">
              <div><label className="label">كود الصنف</label><input className="field" style={{ width: "100%" }} value={form.code} onChange={(event) => update({ code: event.target.value })} placeholder="يولد تلقائياً" /></div>
              <div><label className="label">الباركود</label><input className="field" style={{ width: "100%" }} value={form.barcode} onChange={(event) => update({ barcode: event.target.value })} dir="ltr" /></div>
              <div className="full"><label className="label">اسم الصنف *</label><input className="field" style={{ width: "100%" }} value={form.name} onChange={(event) => update({ name: event.target.value })} placeholder="مثال: سلاح التلميذ — لغة عربية — الصف الرابع" /></div>
              <div><label className="label">المجموعة الرئيسية</label><select className="field" style={{ width: "100%" }} value={form.categoryGroup} onChange={(event) => update({ categoryGroup: event.target.value, category: categoriesForGroup(event.target.value)[0] ?? "" })}>{groupNames.map((item) => <option key={item}>{item}</option>)}</select></div>
              <div><label className="label">التصنيف الفرعي</label><input className="field" list="category-options" style={{ width: "100%" }} value={form.category} onChange={(event) => update({ category: event.target.value })} /><datalist id="category-options">{categoriesForGroup(form.categoryGroup).map((item) => <option key={item} value={item} />)}</datalist></div>
              <div><label className="label">الوحدة</label><input className="field" style={{ width: "100%" }} value={form.unit} onChange={(event) => update({ unit: event.target.value })} /></div>
              <div><label className="label">سعر الشراء</label><input type="number" min="0" step="0.01" className="field" style={{ width: "100%" }} value={form.purchasePrice} onChange={(event) => update({ purchasePrice: event.target.value })} /></div>
              <div><label className="label">سعر البيع</label><input type="number" min="0" step="0.01" className="field" style={{ width: "100%" }} value={form.salePrice} onChange={(event) => update({ salePrice: event.target.value })} /></div>
              <div><label className="label">الكمية الحالية</label><input type="number" min="0" className="field" style={{ width: "100%" }} value={form.quantity} onChange={(event) => update({ quantity: event.target.value })} /></div>
              <div><label className="label">حد التنبيه</label><input type="number" min="0" className="field" style={{ width: "100%" }} value={form.minQuantity} onChange={(event) => update({ minQuantity: event.target.value })} /></div>
              <div><label className="label">ضريبة %</label><input type="number" min="0" className="field" style={{ width: "100%" }} value={form.taxRate} onChange={(event) => update({ taxRate: event.target.value })} /></div>
              <div className="full"><label className="label"><input type="checkbox" checked={form.active} onChange={(event) => update({ active: event.target.checked })} style={{ minHeight: 0, verticalAlign: "middle", marginLeft: 6 }} /> الصنف نشط ويظهر في شاشة المبيعات</label></div>
            </div>
            <div style={{ display: "flex", gap: 7, marginTop: 14 }}><button className="btn green" disabled={busy} onClick={() => void save()}><Save size={15} /> حفظ الصنف</button><button className="btn" onClick={() => setForm(emptyForm)}>جديد</button><button className="btn red" onClick={() => void remove()} disabled={!form.id}><Trash2 size={15} /> حذف</button></div>
            <div className="info-box" style={{ marginTop: 14 }}>أسعار الكتب الجديدة استرشادية وقابلة للتعديل. اضغط على أي صنف لتحميل بياناته، واستخدم «إدارة المجموعات» لإضافة تصنيفات جديدة.</div>
          </div>
        </div>
      </div>

      </>}

      {managerOpen && <div className="modal-backdrop"><div className="modal wide" role="dialog" aria-modal="true">
        <div className="modal-head"><span><FolderTree size={17} style={{ verticalAlign: "middle", marginLeft: 6 }} /> إدارة المجموعات والتصنيفات</span><button className="btn small" onClick={() => setManagerOpen(false)}><X size={14} /></button></div>
        <div className="modal-body"><div className="category-manager-layout">
          <div className="category-manager-list">
            {groupNames.map((groupName) => <div key={groupName}><div className="category-group-heading">{groupName}</div>{categoriesForGroup(groupName).map((name) => {
              const record = categories.find((item) => item.name === name && item.groupName === groupName);
              return <div key={name} className={`category-row ${categoryForm.id === record?.id ? "active" : ""}`} onClick={() => record && setCategoryForm({ id: record.id, name: record.name, groupName: record.groupName, color: record.color })}><span><span className="dot" style={{ background: colorForGroup(groupName) }} />{name} <small>({products.filter((product) => product.category === name).length} صنف)</small></span>{record && <Pencil size={12} />}</div>;
            })}</div>)}
          </div>
          <div className="panel"><div className="panel-head"><span>{categoryForm.id ? "تعديل تصنيف" : "إضافة مجموعة / تصنيف"}</span><Plus size={15} /></div><div className="panel-body">
            <label className="label">المجموعة الرئيسية</label><input className="field" list="group-options" style={{ width: "100%", marginBottom: 9 }} value={categoryForm.groupName} onChange={(event) => setCategoryForm({ ...categoryForm, groupName: event.target.value })} placeholder="مثال: كتب خارجية" /><datalist id="group-options">{groupNames.map((name) => <option key={name} value={name} />)}</datalist>
            <label className="label">اسم التصنيف</label><input className="field" style={{ width: "100%", marginBottom: 9 }} value={categoryForm.name} onChange={(event) => setCategoryForm({ ...categoryForm, name: event.target.value })} placeholder="مثال: سلاح التلميذ" />
            <label className="label">لون المجموعة</label><input type="color" className="field" style={{ width: "100%", height: 34 }} value={categoryForm.color} onChange={(event) => setCategoryForm({ ...categoryForm, color: event.target.value })} />
            <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}><button className="btn green" disabled={categoryBusy} onClick={() => void saveCategory()}><Save size={14} /> حفظ</button><button className="btn" onClick={() => setCategoryForm({ id: 0, name: "", groupName: categoryForm.groupName, color: categoryForm.color })}>جديد</button><button className="btn red" disabled={!categoryForm.id} onClick={() => void deleteCategory()}><Trash2 size={14} /> حذف</button></div>
            <div className="info-box" style={{ marginTop: 12 }}>لإضافة مجموعة جديدة اكتب اسمها ثم اسم تصنيف داخلها. تعديل اسم التصنيف يحدّث الأصناف المرتبطة به تلقائياً.</div>
          </div></div>
        </div></div>
        <div className="modal-foot"><button className="btn" onClick={() => setManagerOpen(false)}>إغلاق</button></div>
      </div></div>}
    </div>
  );
}
