export type Role = "admin" | "manager" | "cashier" | "viewer";

export const ROLE_LABELS: Record<Role, string> = {
  admin: "مدير عام",
  manager: "مدير فرع",
  cashier: "كاشير",
  viewer: "مشاهدة فقط",
};

export const ROLE_PERMISSIONS: Record<Role, string[]> = {
  admin: ["all"],
  manager: ["sales", "purchases", "inventory", "reports", "customers", "shifts"],
  cashier: ["sales", "customers", "inventoryCount"],
  viewer: ["reports"],
};

export function canRoleDo(role: string, action: string): boolean {
  const perms = ROLE_PERMISSIONS[role as Role] || [];
  return perms.includes("all") || perms.includes(action);
}

export function getRoleColor(role: string): string {
  switch (role) {
    case "admin":
      return "#c01212";
    case "manager":
      return "#0b4c9e";
    case "cashier":
      return "#128349";
    case "viewer":
      return "#6b7280";
    default:
      return "#6b7280";
  }
}
