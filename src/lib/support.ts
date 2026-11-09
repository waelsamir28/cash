export const SUPPORT = {
  name: "م. وائل سمير",
  title: "الدعم الفني - برنامج الجمال للأدوات المدرسية",
  phone: "01222355769",
  whatsappNumber: "201222355769",
  hours: "يومياً من 9 صباحاً حتى 9 مساءً",
};

export function whatsappLink(text = ""): string {
  const encoded = encodeURIComponent(text);
  return `https://wa.me/${SUPPORT.whatsappNumber}${text ? `?text=${encoded}` : ""}`;
}
