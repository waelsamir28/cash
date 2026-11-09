import type { Viewport } from "next";
import CustomerDisplay from "@/components/CustomerDisplay";

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function CustomerDisplayPage() {
  return <CustomerDisplay />;
}
