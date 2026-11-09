"use client";

import { useMemo, useState } from "react";
import { FolderTree, Pencil, Plus, Save, Tags, Trash2, X } from "lucide-react";
import { api } from "@/lib/client-api";
import type { Product, ProductCategory, ProductGroup } from "@/lib/types";

type Props = {
  groups: ProductGroup[];
  categories: ProductCategory[];
  products: Product[];
  onRefresh: () => Promise<void> | void;
  onToast: (message: string, error?: boolean) => void;
};

export default function GroupsManager({ groups, categories, products, onRefresh, onToast }: Props) {
  const [selectedGroup, setSelectedGroup] = useState<number | null>(groups[0]?.id ?? null);
  const [groupForm, setGroupForm] = useState({ id: 0, name: "", color: "#1675c5" });
  const [categoryForm, setCategoryForm] = useState({ id: 0, name: "" });
  const [busy, setBusy] = useState(false);
  const activeGroup = groups.find((group) => group.id === selectedGroup) ?? null;
  const groupCategories = useMemo(() => categories.filter((category) => category.groupName === activeGroup?.name), [categories, activeGroup]);

  const editGroup = (group: ProductGroup) => {
    setSelectedGroup(group.id);
    setGroupForm({ id: group.id, name: group.name, color: group.color });
    setCategoryForm({ id: 0, name: "" });
  };

  const saveGroup = async () => {
    if (!groupForm.name.trim()) { onToast("اكتب اسم المجموعة", true); return; }
    setBusy(true);
    try {
      const result = await api<{ group: ProductGroup }>("/api/groups", { method: groupForm.id ? "PATCH" : "POST", body: JSON.stringify(groupForm) });
      onToast(groupForm.id ? "تم تعديل المجموعة وتحديث أصنافها" : "تمت إضافة المجموعة");
      setSelectedGroup(result.group.id);
      setGroupForm({ id: 0, name: "", color: "#1675c5" });
      await onRefresh();
    } catch (error) { onToast(error instanceof Error ? error.message : "تعذر حفظ المجموعة", true); }
    finally { setBusy(false); }
  };

  const deleteGroup = async () => {
    if (!groupForm.id || !window.confirm("حذف المجموعة؟ يجب أن تكون بدون تصنيفات أو أصناف.")) return;
    try {
      await api(`/api/groups?id=${groupForm.id}`, { method: "DELETE" });
      onToast("تم حذف المجموعة");
      setGroupForm({ id: 0, name: "", color: "#1675c5" });
      setSelectedGroup(null);
      await onRefresh();
    } catch (error) { onToast(error instanceof Error ? error.message : "تعذر حذف المجموعة", true); }
  };

  const saveCategory = async () => {
    if (!activeGroup) { onToast("اختر مجموعة أولاً", true); return; }
    if (!categoryForm.name.trim()) { onToast("اكتب اسم التصنيف", true); return; }
    setBusy(true);
    try {
      await api("/api/categories", {
        method: categoryForm.id ? "PATCH" : "POST",
        body: JSON.stringify({ ...categoryForm, groupName: activeGroup.name, color: activeGroup.color }),
      });
      onToast(categoryForm.id ? "تم تعديل التصنيف" : "تمت إضافة التصنيف");
      setCategoryForm({ id: 0, name: "" });
      await onRefresh();
    } catch (error) { onToast(error instanceof Error ? error.message : "تعذر حفظ التصنيف", true); }
    finally { setBusy(false); }
  };

  const deleteCategory = async (id: number) => {
    if (!window.confirm("حذف التصنيف؟ لا يمكن حذف تصنيف مرتبط بأصناف.")) return;
    try {
      await api(`/api/categories?id=${id}`, { method: "DELETE" });
      onToast("تم حذف التصنيف");
      await onRefresh();
    } catch (error) { onToast(error instanceof Error ? error.message : "تعذر حذف التصنيف", true); }
  };

  return (
    <div className="groups-manager">
      <div className="panel">
        <div className="panel-head"><span><FolderTree size={16} style={{ verticalAlign: "middle", marginLeft: 5 }} /> المجموعات الرئيسية</span><button className="btn small blue" onClick={() => { setGroupForm({ id: 0, name: "", color: "#1675c5" }); setSelectedGroup(null); }}><Plus size={13} /> مجموعة جديدة</button></div>
        <div className="panel-body">
          <div className="group-card-grid">
            {groups.map((group) => (
              <button key={group.id} className={`group-card ${selectedGroup === group.id ? "active" : ""}`} onClick={() => editGroup(group)} style={{ borderColor: selectedGroup === group.id ? group.color : undefined }}>
                <span className="group-card-color" style={{ background: group.color }}><FolderTree size={20} /></span>
                <b>{group.name}</b>
                <small>{group.productCount ?? products.filter((product) => product.categoryGroup === group.name).length} صنف · {group.categoryCount ?? categories.filter((category) => category.groupName === group.name).length} تصنيف</small>
              </button>
            ))}
            {groups.length === 0 && <div className="empty-row">لا توجد مجموعات بعد</div>}
          </div>
        </div>
      </div>

      <div className="two-col" style={{ gridTemplateColumns: "320px 1fr", marginTop: 12 }}>
        <div className="panel">
          <div className="panel-head"><span>{groupForm.id ? "تعديل المجموعة" : "إضافة مجموعة"}</span><Pencil size={15} /></div>
          <div className="panel-body">
            <label className="label">اسم المجموعة</label>
            <input className="field" style={{ width: "100%", marginBottom: 10 }} value={groupForm.name} onChange={(event) => setGroupForm({ ...groupForm, name: event.target.value })} placeholder="مثال: كتب خارجية" />
            <label className="label">لون المجموعة</label>
            <input type="color" className="field" style={{ width: "100%", height: 36 }} value={groupForm.color} onChange={(event) => setGroupForm({ ...groupForm, color: event.target.value })} />
            <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
              <button className="btn green" disabled={busy} onClick={() => void saveGroup()}><Save size={14} /> حفظ</button>
              <button className="btn" onClick={() => setGroupForm({ id: 0, name: "", color: "#1675c5" })}>جديد</button>
              <button className="btn red" disabled={!groupForm.id} onClick={() => void deleteGroup()}><Trash2 size={14} /> حذف</button>
            </div>
            <div className="info-box" style={{ marginTop: 12 }}>تغيير اسم المجموعة يحدّث كل الأصناف والتصنيفات المرتبطة بها تلقائياً.</div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head"><span><Tags size={16} style={{ verticalAlign: "middle", marginLeft: 5 }} /> تصنيفات مجموعة: {activeGroup?.name ?? "اختر مجموعة"}</span><span className="head-chip">{groupCategories.length}</span></div>
          <div className="panel-body">
            <div className="field-row" style={{ marginBottom: 10 }}>
              <input className="field" style={{ flex: 1 }} placeholder={categoryForm.id ? "تعديل اسم التصنيف" : "إضافة تصنيف جديد داخل المجموعة"} value={categoryForm.name} onChange={(event) => setCategoryForm({ ...categoryForm, name: event.target.value })} disabled={!activeGroup} />
              <button className="btn green" disabled={!activeGroup || busy} onClick={() => void saveCategory()}><Save size={14} /> {categoryForm.id ? "حفظ التعديل" : "إضافة"}</button>
              {categoryForm.id > 0 && <button className="btn" onClick={() => setCategoryForm({ id: 0, name: "" })}><X size={14} /></button>}
            </div>
            <div className="table-wrap" style={{ maxHeight: 260 }}>
              <table className="win-table"><thead><tr><th>التصنيف</th><th>عدد الأصناف</th><th>إجراء</th></tr></thead><tbody>
                {groupCategories.map((category) => (
                  <tr key={category.id} className={categoryForm.id === category.id ? "selected" : ""}>
                    <td className="right"><span className="dot" style={{ background: category.color, width: 9, height: 9, borderRadius: "50%", display: "inline-block", marginLeft: 6 }} />{category.name}</td>
                    <td>{products.filter((product) => product.category === category.name).length}</td>
                    <td style={{ whiteSpace: "nowrap" }}><button className="btn small" onClick={() => setCategoryForm({ id: category.id, name: category.name })}><Pencil size={12} /> تعديل</button>{" "}<button className="btn small red" onClick={() => void deleteCategory(category.id)}><Trash2 size={12} /></button></td>
                  </tr>
                ))}
                {groupCategories.length === 0 && <tr><td colSpan={3} className="empty-row">{activeGroup ? "لا توجد تصنيفات داخل هذه المجموعة" : "اختر مجموعة من الكروت بالأعلى"}</td></tr>}
              </tbody></table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
