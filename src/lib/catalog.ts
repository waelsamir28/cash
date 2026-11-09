export type CatalogGroup = {
  name: string;
  color: string;
  categories: string[];
};

export const CATALOG_GROUPS: CatalogGroup[] = [
  { name: "كتب خارجية", color: "#7b4bc4", categories: ["سلاح التلميذ", "الأضواء", "الامتحان"] },
  { name: "كشاكيل وكراسات", color: "#1675c5", categories: ["كشاكيل سلك", "كراسات مدرسية", "كراسات رسم", "دفاتر ملاحظات"] },
  { name: "أدوات مدرسية", color: "#159c67", categories: ["أقلام", "محايات ومبرايات", "أدوات هندسية", "حقائب ومقالم"] },
  { name: "ألوان وأنشطة", color: "#d97706", categories: ["ألوان خشب ومائية", "أقلام تلوين", "أدوات رسم وأنشطة"] },
  { name: "أدوات مكتبية", color: "#0f766e", categories: ["ورق وتصوير", "لواصق وأشرطة", "مقصات ودباسات", "ملفات وحافظات", "آلات حاسبة"] },
];

export const LEGACY_CATEGORY_MAP: Record<string, { group: string; category: string }> = {
  "دفاتر وورق": { group: "كشاكيل وكراسات", category: "كراسات مدرسية" },
  "أقلام": { group: "أدوات مدرسية", category: "أقلام" },
  "أدوات مدرسية": { group: "أدوات مدرسية", category: "محايات ومبرايات" },
  "أدوات هندسية": { group: "أدوات مدرسية", category: "أدوات هندسية" },
  "ألوان ورسم": { group: "ألوان وأنشطة", category: "ألوان خشب ومائية" },
  "قرطاسية مكتبية": { group: "أدوات مكتبية", category: "ملفات وحافظات" },
  "حقائب وإكسسوارات": { group: "أدوات مدرسية", category: "حقائب ومقالم" },
  "إلكترونيات مكتبية": { group: "أدوات مكتبية", category: "آلات حاسبة" },
};

export function groupForCategory(category: string): string {
  return CATALOG_GROUPS.find((group) => group.categories.includes(category))?.name
    ?? LEGACY_CATEGORY_MAP[category]?.group
    ?? "أدوات مدرسية";
}

export type ExtraProductSeed = {
  code: string;
  name: string;
  category: string;
  categoryGroup: string;
  unit: string;
  purchasePrice: number;
  salePrice: number;
  quantity: number;
  minQuantity: number;
};

const book = (code: string, series: string, subject: string, grade: string, purchasePrice: number, salePrice: number): ExtraProductSeed => ({
  code,
  name: `${series} — ${subject} — ${grade} — الترم الأول`,
  category: series,
  categoryGroup: "كتب خارجية",
  unit: "كتاب",
  purchasePrice,
  salePrice,
  quantity: 30,
  minQuantity: 5,
});

const notebook = (code: string, name: string, category: string, purchasePrice: number, salePrice: number): ExtraProductSeed => ({
  code, name, category, categoryGroup: "كشاكيل وكراسات", unit: "قطعة", purchasePrice, salePrice, quantity: 100, minQuantity: 15,
});

// أسعار استرشادية قابلة للتعديل من شاشة المخازن، وليست تسعيراً رسمياً للناشرين.
export const EXTRA_PRODUCTS: ExtraProductSeed[] = [
  book("2001", "سلاح التلميذ", "لغة عربية", "الصف الرابع الابتدائي", 110, 145),
  book("2002", "سلاح التلميذ", "رياضيات", "الصف الرابع الابتدائي", 105, 140),
  book("2003", "سلاح التلميذ", "لغة إنجليزية", "الصف الخامس الابتدائي", 115, 150),
  book("2004", "سلاح التلميذ", "علوم", "الصف السادس الابتدائي", 120, 155),
  book("2005", "الأضواء", "لغة عربية", "الصف الخامس الابتدائي", 125, 165),
  book("2006", "الأضواء", "رياضيات", "الصف السادس الابتدائي", 130, 170),
  book("2007", "الأضواء", "دراسات اجتماعية", "الصف الرابع الابتدائي", 100, 135),
  book("2008", "الأضواء", "لغة إنجليزية", "الصف الأول الإعدادي", 135, 175),
  book("2009", "الامتحان", "لغة عربية", "الصف السادس الابتدائي", 115, 150),
  book("2010", "الامتحان", "رياضيات", "الصف الثاني الإعدادي", 125, 165),
  book("2011", "الامتحان", "علوم", "الصف الثالث الإعدادي", 140, 180),
  book("2012", "الامتحان", "لغة إنجليزية", "الصف الأول الثانوي", 150, 195),
  notebook("2013", "كشكول سلك 100 ورقة — صغير", "كشاكيل سلك", 16, 24),
  notebook("2014", "كشكول سلك 200 ورقة — كبير", "كشاكيل سلك", 28, 40),
  notebook("2015", "كشكول جامعي A4 — 200 ورقة", "كشاكيل سلك", 42, 60),
  notebook("2016", "كشكول سلك 5 مواضيع — 200 ورقة", "كشاكيل سلك", 38, 55),
  notebook("2017", "كراسة عربي 80 ورقة", "كراسات مدرسية", 10, 15),
  notebook("2018", "كراسة إنجليزي 100 ورقة", "كراسات مدرسية", 12, 18),
  notebook("2019", "كراسة حساب 60 ورقة", "كراسات مدرسية", 8, 12),
  notebook("2020", "كراسة خط 40 ورقة", "كراسات مدرسية", 5, 8),
  notebook("2021", "كراسة رسم 60 ورقة — غلاف مقوى", "كراسات رسم", 18, 28),
  notebook("2022", "كراسة رسم A3 — 40 ورقة", "كراسات رسم", 30, 45),
  notebook("2023", "دفتر ملاحظات سلك A6 — 80 ورقة", "دفاتر ملاحظات", 12, 20),
  notebook("2024", "دفتر يوميات غلاف مقوى — 200 ورقة", "دفاتر ملاحظات", 35, 50),
];

export function withBarcode(item: ExtraProductSeed) {
  return { ...item, barcode: `6223002${item.code.padStart(6, "0")}`, taxRate: 0, active: true };
}
