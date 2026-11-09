"use client";

import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

type Props = {
  value: string;
  height?: number;
  width?: number;
  fontSize?: number;
  displayValue?: boolean;
  className?: string;
};

export default function BarcodeSvg({ value, height = 34, width = 1.5, fontSize = 12, displayValue = true, className = "" }: Props) {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    try {
      JsBarcode(ref.current, value || "0", {
        format: "CODE128", lineColor: "#000000", background: "#ffffff",
        width, height, displayValue, fontSize, font: "monospace", textMargin: 2, margin: 2,
      });
    } catch {
      JsBarcode(ref.current, "0", { format: "CODE128", width, height, displayValue: true, margin: 2 });
    }
  }, [value, height, width, fontSize, displayValue]);
  return <svg ref={ref} className={`barcode-svg ${className}`} aria-label={`باركود ${value}`} />;
}
