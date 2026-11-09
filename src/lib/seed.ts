import { sql } from "drizzle-orm";
import { db, ensureDatabaseReady } from "@/db";
import { customers, productCategories, productGroups, products, settings } from "@/db/schema";
import { DEFAULT_SETTINGS } from "@/lib/types";
import { CATALOG_GROUPS, EXTRA_PRODUCTS, LEGACY_CATEGORY_MAP, withBarcode } from "@/lib/catalog";

const productSeed = [
  { code: "1001", barcode: "6223002001001", name: "كراسة مسطرة 100 ورقة", category: "كراسات مدرسية", categoryGroup: "كشاكيل وكراسات", unit: "كراسة", purchasePrice: 12, salePrice: 18, quantity: 240, minQuantity: 30 },
  { code: "1002", barcode: "6223002001002", name: "كراسة مربعات 60 ورقة", category: "كراسات مدرسية", categoryGroup: "كشاكيل وكراسات", unit: "كراسة", purchasePrice: 8, salePrice: 12, quantity: 300, minQuantity: 40 },
  { code: "1003", barcode: "6223002001003", name: "دفتر ملاحظات A5 غلاف مقوى", category: "دفاتر ملاحظات", categoryGroup: "كشاكيل وكراسات", unit: "دفتر", purchasePrice: 22, salePrice: 32, quantity: 110, minQuantity: 15 },
  { code: "1004", barcode: "6223002001004", name: "ورق تصوير A4 أبيض 500 ورقة", category: "ورق وتصوير", categoryGroup: "أدوات مكتبية", unit: "رزمة", purchasePrice: 95, salePrice: 125, quantity: 65, minQuantity: 10 },
  { code: "1005", barcode: "6223002001005", name: "ورق ملون 20 لون", category: "ورق وتصوير", categoryGroup: "أدوات مكتبية", unit: "حزمة", purchasePrice: 28, salePrice: 40, quantity: 90, minQuantity: 12 },
  { code: "1006", barcode: "6223002001006", name: "قلم رصاص HB عبوة 12", category: "أقلام", categoryGroup: "أدوات مدرسية", unit: "علبة", purchasePrice: 30, salePrice: 42, quantity: 150, minQuantity: 20 },
  { code: "1007", barcode: "6223002001007", name: "قلم حبر أزرق عبوة 10", category: "أقلام", categoryGroup: "أدوات مدرسية", unit: "علبة", purchasePrice: 35, salePrice: 50, quantity: 160, minQuantity: 20 },
  { code: "1008", barcode: "6223002001008", name: "قلم حبر أحمر عبوة 10", category: "أقلام", categoryGroup: "أدوات مدرسية", unit: "علبة", purchasePrice: 35, salePrice: 50, quantity: 120, minQuantity: 20 },
  { code: "1009", barcode: "6223002001009", name: "قلم جاف أسود", category: "أقلام", categoryGroup: "أدوات مدرسية", unit: "قطعة", purchasePrice: 5, salePrice: 8, quantity: 400, minQuantity: 50 },
  { code: "1010", barcode: "6223002001010", name: "قلم ماركر سبورة بيضاء", category: "أقلام", categoryGroup: "أدوات مدرسية", unit: "قطعة", purchasePrice: 14, salePrice: 22, quantity: 8, minQuantity: 15 },
  { code: "1011", barcode: "6223002001011", name: "ممحاة بيضاء كبيرة", category: "محايات ومبرايات", categoryGroup: "أدوات مدرسية", unit: "قطعة", purchasePrice: 3, salePrice: 5, quantity: 350, minQuantity: 40 },
  { code: "1012", barcode: "6223002001012", name: "مبراة معدنية بعلبة", category: "محايات ومبرايات", categoryGroup: "أدوات مدرسية", unit: "قطعة", purchasePrice: 6, salePrice: 10, quantity: 220, minQuantity: 30 },
  { code: "1013", barcode: "6223002001013", name: "مسطرة بلاستيك 30 سم", category: "أدوات هندسية", categoryGroup: "أدوات مدرسية", unit: "قطعة", purchasePrice: 7, salePrice: 12, quantity: 180, minQuantity: 25 },
  { code: "1014", barcode: "6223002001014", name: "مجموعة أدوات هندسية 4 قطع", category: "أدوات هندسية", categoryGroup: "أدوات مدرسية", unit: "علبة", purchasePrice: 38, salePrice: 55, quantity: 75, minQuantity: 10 },
  { code: "1015", barcode: "6223002001015", name: "منقلة 180 درجة", category: "أدوات هندسية", categoryGroup: "أدوات مدرسية", unit: "قطعة", purchasePrice: 5, salePrice: 9, quantity: 130, minQuantity: 20 },
  { code: "1016", barcode: "6223002001016", name: "ألوان خشب 12 لون", category: "ألوان خشب ومائية", categoryGroup: "ألوان وأنشطة", unit: "علبة", purchasePrice: 32, salePrice: 48, quantity: 95, minQuantity: 12 },
  { code: "1017", barcode: "6223002001017", name: "ألوان مائية 12 لون مع فرشاة", category: "ألوان خشب ومائية", categoryGroup: "ألوان وأنشطة", unit: "علبة", purchasePrice: 45, salePrice: 65, quantity: 60, minQuantity: 10 },
  { code: "1018", barcode: "6223002001018", name: "أقلام فلوماستر 24 لون", category: "أقلام تلوين", categoryGroup: "ألوان وأنشطة", unit: "علبة", purchasePrice: 75, salePrice: 105, quantity: 4, minQuantity: 10 },
  { code: "1019", barcode: "6223002001019", name: "فرشاة رسم عريضة", category: "أدوات رسم وأنشطة", categoryGroup: "ألوان وأنشطة", unit: "قطعة", purchasePrice: 9, salePrice: 15, quantity: 100, minQuantity: 15 },
  { code: "1020", barcode: "6223002001020", name: "لاصق سائل 50 مل", category: "لواصق وأشرطة", categoryGroup: "أدوات مكتبية", unit: "عبوة", purchasePrice: 11, salePrice: 17, quantity: 140, minQuantity: 20 },
  { code: "1021", barcode: "6223002001021", name: "شريط لاصق شفاف كبير", category: "لواصق وأشرطة", categoryGroup: "أدوات مكتبية", unit: "لفافة", purchasePrice: 8, salePrice: 13, quantity: 170, minQuantity: 25 },
  { code: "1022", barcode: "6223002001022", name: "مقص مكتبي صغير", category: "مقصات ودباسات", categoryGroup: "أدوات مكتبية", unit: "قطعة", purchasePrice: 18, salePrice: 27, quantity: 85, minQuantity: 12 },
  { code: "1023", barcode: "6223002001023", name: "دباسة مكتبية مع دبابيس", category: "مقصات ودباسات", categoryGroup: "أدوات مكتبية", unit: "قطعة", purchasePrice: 42, salePrice: 60, quantity: 55, minQuantity: 8 },
  { code: "1024", barcode: "6223002001024", name: "ملف بلاستيك شفاف A4", category: "ملفات وحافظات", categoryGroup: "أدوات مكتبية", unit: "قطعة", purchasePrice: 3, salePrice: 5, quantity: 500, minQuantity: 60 },
  { code: "1025", barcode: "6223002001025", name: "حافظة أقلام قماشية", category: "حقائب ومقالم", categoryGroup: "أدوات مدرسية", unit: "قطعة", purchasePrice: 25, salePrice: 38, quantity: 90, minQuantity: 12 },
  { code: "1026", barcode: "6223002001026", name: "شنطة مدرسية قماش", category: "حقائب ومقالم", categoryGroup: "أدوات مدرسية", unit: "قطعة", purchasePrice: 145, salePrice: 210, quantity: 35, minQuantity: 6 },
  { code: "1027", barcode: "6223002001027", name: "آلة حاسبة مكتبية 12 رقم", category: "آلات حاسبة", categoryGroup: "أدوات مكتبية", unit: "قطعة", purchasePrice: 85, salePrice: 120, quantity: 28, minQuantity: 5 },
  { code: "1028", barcode: "6223002001028", name: "قلم سبورة قابل للمسح", category: "أقلام", categoryGroup: "أدوات مدرسية", unit: "قطعة", purchasePrice: 15, salePrice: 24, quantity: 70, minQuantity: 10 },
  ...EXTRA_PRODUCTS.map(withBarcode),
];

const customerSeed = [
  // عميل نقدي فقط في التثبيت الجديد. العملاء يضيفهم المحل بنفسه.
  { code: "C10001", name: "عميل نقدي", phone: "", address: "", customerType: "عادي", balance: 0 },
];

const categorySeed = CATALOG_GROUPS.flatMap((group) =>
  group.categories.map((name) => ({ name, groupName: group.name, color: group.color })));

const settingSeed = Object.entries(DEFAULT_SETTINGS).map(([key, value]) => ({ key, value }));

let seedPromise: Promise<void> | null = null;

async function runSeed() {
  await ensureDatabaseReady();
  const [version] = await db.select({ value: settings.value }).from(settings).where(sql`${settings.key} = 'catalogSeedVersion'`);
  if (version?.value !== "2") {
    // One-time catalogue upgrade: never resurrect items the shop later deletes.
    await db.insert(products).values(productSeed).onConflictDoNothing({ target: products.code });
    await db.insert(productCategories).values(categorySeed).onConflictDoNothing({ target: productCategories.name });
    for (const [oldCategory, mapping] of Object.entries(LEGACY_CATEGORY_MAP)) {
      await db.update(products)
        .set({ category: mapping.category, categoryGroup: mapping.group })
        .where(sql`${products.category} = ${oldCategory}`);
    }
    await db.insert(settings).values({ key: "catalogSeedVersion", value: "2" })
      .onConflictDoUpdate({ target: settings.key, set: { value: "2" } });
  }

  const [groupsVersion] = await db.select({ value: settings.value }).from(settings).where(sql`${settings.key} = 'groupsSeedVersion'`);
  if (groupsVersion?.value !== "1") {
    await db.insert(productGroups).values(CATALOG_GROUPS.map((group) => ({ name: group.name, color: group.color })))
      .onConflictDoNothing({ target: productGroups.name });
    const existingGroups = await db.select({ name: productCategories.groupName }).from(productCategories);
    const productGroupNames = await db.select({ name: products.categoryGroup }).from(products);
    const names = Array.from(new Set([...existingGroups, ...productGroupNames].map((row) => row.name).filter(Boolean)));
    if (names.length) {
      await db.insert(productGroups).values(names.map((name) => ({ name, color: CATALOG_GROUPS.find((group) => group.name === name)?.color ?? "#1675c5" })))
        .onConflictDoNothing({ target: productGroups.name });
    }
    await db.insert(settings).values({ key: "groupsSeedVersion", value: "1" })
      .onConflictDoUpdate({ target: settings.key, set: { value: "1" } });
  }

  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(customers);
  if (count === 0) await db.insert(customers).values(customerSeed);
  await db.insert(settings).values(settingSeed).onConflictDoNothing({ target: settings.key });
}


export function ensureSeed(): Promise<void> {
  if (!seedPromise) {
    seedPromise = runSeed().catch((error) => {
      seedPromise = null;
      throw error;
    });
  }
  return seedPromise;
}
