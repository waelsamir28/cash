"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle, Clock3, PackageCheck, PackagePlus, Send, ShoppingCart, Trash2, Truck } from "lucide-react";
import { api } from "@/lib/client-api";
import { fmt } from "@/lib/format";
import type { Product, PurchaseOrder } from "@/lib/types";
import type { PurchaseSuggestion } from "@/lib/purchase";

type Props = {
  products: Product[];
  onRefresh: () => Promise<void> | void;
  onToast: (message: string, error?: boolean) => void;
};

export default function PurchaseRequestsScreen({ products, onRefresh, onToast }: Props) {
  const [suggestions, setSuggestions] = useState<PurchaseSuggestion[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [supplierName, setSupplierName] = useState("المورد العام");
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"suggestions" | "orders">("suggestions");

  const load = useCallback(async () => {
    try {
      const [sugData, ordersData] = await Promise.all([
        api<{ suggestions: PurchaseSuggestion[] }>("/api/purchase-orders?mode=suggestions"),
        api<{ orders: PurchaseOrder[] }>("/api/purchase-orders"),
      ]);
      setSuggestions(sugData.suggestions);
      setOrders(ordersData.orders);
      // افتراضياً اختر كل العاجل
      const init: Record<string, number> = {};
      sugData.suggestions.filter((s) => s.urgency === "عاجل").forEach((s) => {
        init[s.product.code] = s.suggestedQty;
      });
      setSelected(init);
    } catch (e) {
      onToast(e instanceof Error ? e.message : "تعذر تحميل طلبات الشراء", true);
    }
  }, [onToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalSelected = useMemo(() => {
    let count = 0;
    let cost = 0;
    for (const s of suggestions) {
      const qty = selected[s.product.code];
      if (qty && qty > 0) {
        count += 1;
        cost += qty * s.purchasePrice;
      }
    }
    return { count, cost };
  }, [selected, suggestions]);

  const toggle = (code: string, qty: number) => {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[code]) delete next[code];
      else next[code] = qty;
      return next;
    });
  };

  const createOrder = async () => {
    const items = suggestions
      .filter((s) => selected[s.product.code] && selected[s.product.code] > 0)
      .map((s) => ({
        productId: s.product.id,
        productCode: s.product.code,
        productName: s.product.name,
        quantity: selected[s.product.code],
        purchasePrice: s.purchasePrice,
      }));
    if (items.length === 0) {
      onToast("اختر صنفاً واحداً على الأقل", true);
      return;
    }
    setBusy(true);
    try {
      await api("/api/purchase-orders", {
        method: "POST",
        body: JSON.stringify({ supplierName, items, createdBy: "المدير" }),
      });
      onToast(`تم إنشاء طلب شراء بـ ${items.length} صنف`);
      setSelected({});
      await load();
      await onRefresh();
      setTab("orders");
    } catch (e) {
      onToast(e instanceof Error ? e.message : "تعذر إنشاء الطلب", true);
    } finally {
      setBusy(false);
    }
  };

  const updateStatus = async (id: number, status: string) => {
    if (status === "مستلم" && !confirm("تأكيد استلام الطلب؟ سيتم زيادة المخزون تلقائياً")) return;
    try {
      await api("/api/purchase-orders", { method: "PATCH", body: JSON.stringify({ id, status }) });
      onToast(`تم تحديث الطلب إلى ${status}`);
      await load();
      await onRefresh();
    } catch (e) {
      onToast(e instanceof Error ? e.message : "تعذر التحديث", true);
    }
  };

  const deleteOrder = async (id: number) => {
    if (!confirm("حذف الطلب؟")) return;
    try {
      await api(`/api/purchase-orders?id=${id}`, { method: "DELETE" });
      onToast("تم حذف الطلب");
      await load();
    } catch (e) {
      onToast(e instanceof Error ? e.message : "تعذر الحذف", true);
    }
  };

  const urgencyColor = (u: string) => (u === "عاجل" ? "#c01212" : u === "قريب" ? "#d98213" : "#6b7280");

  return (
    <div>
      <h2 className="page-title">
        <PackageCheck size={20} style={{ verticalAlign: "middle", marginLeft: 6 }} /> طلبات الشراء الذكية
      </h2>
      <p className="page-desc">النظام يراقب النواقص تلقائياً ويقترح كميات الشراء حسب حد التنبيه — اضغط لإنشاء طلب وإرساله للمورد.</p>

      <div className="settings-tabs">
        <button className={`settings-tab ${tab === "suggestions" ? "active" : ""}`} onClick={() => setTab("suggestions")}>
          <AlertTriangle size={14} style={{ verticalAlign: "middle", marginLeft: 5 }} /> النواقص المقترحة ({suggestions.length})
        </button>
        <button className={`settings-tab ${tab === "orders" ? "active" : ""}`} onClick={() => setTab("orders")}>
          <ShoppingCart size={14} style={{ verticalAlign: "middle", marginLeft: 5 }} /> طلبات الشراء ({orders.length})
        </button>
      </div>

      {tab === "suggestions" && (
        <>
          <div className="stat-grid">
            <div className="stat-card">
              <div className="k">أصناف تحت الحد</div>
              <div className="v red">{suggestions.length}</div>
            </div>
            <div className="stat-card">
              <div className="k">عاجل</div>
              <div className="v red">{suggestions.filter((s) => s.urgency === "عاجل").length}</div>
            </div>
            <div className="stat-card">
              <div className="k">المحدد للطلب</div>
              <div className="v">{totalSelected.count}</div>
            </div>
            <div className="stat-card">
              <div className="k">تكلفة متوقعة</div>
              <div className="v">{fmt(totalSelected.cost, 2)}</div>
            </div>
          </div>

          <div className="panel" style={{ marginBottom: 10 }}>
            <div className="panel-head">
              <span>إعداد الطلب</span>
              <Truck size={15} />
            </div>
            <div className="panel-body" style={{ display: "flex", gap: 8, alignItems: "end", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 180 }}>
                <label className="label">اسم المورد</label>
                <input className="field" style={{ width: "100%" }} value={supplierName} onChange={(e) => setSupplierName(e.target.value)} placeholder="المورد العام" />
              </div>
              <button className="btn blue" disabled={busy || totalSelected.count === 0} onClick={() => void createOrder()}>
                <Send size={14} /> إنشاء طلب شراء ({totalSelected.count})
              </button>
              <button className="btn" onClick={() => setSelected({})}>إلغاء التحديد</button>
              <span className="head-chip">الإجمالي: {fmt(totalSelected.cost, 2)} ج.م</span>
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <span>الأصناف التي تحتاج شراء</span>
              <span className="head-chip">{suggestions.length} صنف</span>
            </div>
            <div className="table-wrap" style={{ maxHeight: 420 }}>
              <table className="win-table">
                <thead>
                  <tr>
                    <th>اختيار</th>
                    <th>الصنف</th>
                    <th>المتوفر</th>
                    <th>الحد</th>
                    <th>المقترح</th>
                    <th>سعر الشراء</th>
                    <th>التكلفة</th>
                    <th>الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {suggestions.map((s) => (
                    <tr key={s.product.code} className={selected[s.product.code] ? "selected" : ""}>
                      <td>
                        <input
                          type="checkbox"
                          checked={Boolean(selected[s.product.code])}
                          onChange={() => toggle(s.product.code, s.suggestedQty)}
                        />
                      </td>
                      <td className="right">
                        <b>{s.product.name}</b>
                        <br />
                        <small>{s.product.code} • {s.product.category}</small>
                      </td>
                      <td>{fmt(s.currentQty, 0)}</td>
                      <td>{fmt(s.minQty, 0)}</td>
                      <td>
                        <input
                          type="number"
                          min={1}
                          style={{ width: 60, textAlign: "center" }}
                          value={selected[s.product.code] ?? s.suggestedQty}
                          onChange={(e) => setSelected((prev) => ({ ...prev, [s.product.code]: Number(e.target.value) || 1 }))}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                      <td>{fmt(s.purchasePrice, 2)}</td>
                      <td>
                        <b>{fmt((selected[s.product.code] ?? s.suggestedQty) * s.purchasePrice, 2)}</b>
                      </td>
                      <td>
                        <span style={{ color: urgencyColor(s.urgency), fontWeight: 900 }}>{s.urgency}</span>
                      </td>
                    </tr>
                  ))}
                  {suggestions.length === 0 && (
                    <tr>
                      <td colSpan={8} className="empty-row">
                        ✅ لا توجد نواقص — جميع الأصناف فوق حد التنبيه
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {tab === "orders" && (
        <div className="panel">
          <div className="panel-head">
            <span>سجل طلبات الشراء</span>
            <PackageCheck size={15} />
          </div>
          <div className="table-wrap">
            <table className="win-table">
              <thead>
                <tr>
                  <th>رقم الطلب</th>
                  <th>المورد</th>
                  <th>التاريخ</th>
                  <th>الأصناف</th>
                  <th>التكلفة</th>
                  <th>الحالة</th>
                  <th>إجراء</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td>{o.orderNo}</td>
                    <td>{o.supplierName}</td>
                    <td>{new Date(o.createdAt).toLocaleDateString("ar-EG")}</td>
                    <td>{o.totalItems}</td>
                    <td>{fmt(o.totalCost, 2)}</td>
                    <td>
                      <span className={`status-pill ${o.status === "مستلم" ? "paid" : o.status === "مرسل" ? "active" : ""}`} style={{ background: o.status === "مستلم" ? "#e2f6e8" : o.status === "مرسل" ? "#e4f2ff" : "#fff3d6", color: o.status === "مستلم" ? "#17703b" : o.status === "مرسل" ? "#0b4c9e" : "#7a4b05", border: "1px solid #ccc", padding: "2px 8px", borderRadius: 12, fontSize: 11, fontWeight: 900 }}>
                        {o.status}
                      </span>
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {o.status === "مسودة" && (
                        <button className="btn small blue" onClick={() => void updateStatus(o.id, "مرسل")}>
                          <Send size={11} /> إرسال
                        </button>
                      )}{" "}
                      {o.status === "مرسل" && (
                        <button className="btn small green" onClick={() => void updateStatus(o.id, "مستلم")}>
                          <CheckCircle size={11} /> استلام
                        </button>
                      )}{" "}
                      <button className="btn small red" onClick={() => void deleteOrder(o.id)}>
                        <Trash2 size={11} />
                      </button>
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={7} className="empty-row">
                      لا توجد طلبات بعد — أنشئ طلباً من تبويب النواقص
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {orders.length > 0 && (
            <div className="panel-body">
              <div className="info-box">عند الضغط على <b>استلام</b> سيتم زيادة المخزون تلقائياً بكل أصناف الطلب.</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
