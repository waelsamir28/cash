import type { Product } from "./types";

export type PurchaseSuggestion = {
  product: Product;
  currentQty: number;
  minQty: number;
  suggestedQty: number;
  purchasePrice: number;
  totalCost: number;
  urgency: "عاجل" | "قريب" | "متوسط";
};

/**
 * حساب الكمية المقترحة للشراء:
 * - لو الكمية صفر أو أقل من الحد: نطلب ضعف الحد
 * - وإلا نطلب الفرق حتى ضعف الحد
 */
export function calcSuggestedQty(product: Product): number {
  const qty = Number(product.quantity) || 0;
  const min = Number(product.minQuantity) || 5;
  if (qty <= 0) return min * 3;
  if (qty <= min) return Math.ceil(min * 2 - qty);
  if (qty <= min * 1.5) return Math.ceil(min - (qty - min));
  return 0;
}

export function getUrgency(product: Product): PurchaseSuggestion["urgency"] {
  const qty = Number(product.quantity) || 0;
  const min = Number(product.minQuantity) || 5;
  if (qty <= 0) return "عاجل";
  if (qty <= min) return "عاجل";
  if (qty <= min * 1.5) return "قريب";
  return "متوسط";
}

export function buildPurchaseSuggestions(products: Product[]): PurchaseSuggestion[] {
  const list: PurchaseSuggestion[] = [];
  for (const p of products) {
    const suggested = calcSuggestedQty(p);
    if (suggested <= 0) continue;
    list.push({
      product: p,
      currentQty: Number(p.quantity) || 0,
      minQty: Number(p.minQuantity) || 5,
      suggestedQty: suggested,
      purchasePrice: Number(p.purchasePrice) || 0,
      totalCost: suggested * (Number(p.purchasePrice) || 0),
      urgency: getUrgency(p),
    });
  }
  // عاجل أولاً ثم قريب
  const order = { عاجل: 0, قريب: 1, متوسط: 2 };
  return list.sort((a, b) => order[a.urgency] - order[b.urgency] || b.totalCost - a.totalCost);
}
