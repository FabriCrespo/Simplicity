"use client";

import Image from "next/image";
import { useState } from "react";

type Props = {
  src?: string | null;
  alt: string;
  size?: "sm" | "md";
};

export function AdminProductThumb({ src, alt, size = "md" }: Props) {
  const [broken, setBroken] = useState(false);
  const dim = size === "sm" ? "h-12 w-10" : "h-16 w-12";

  if (!src || broken) {
    return (
      <span
        className={`inline-flex shrink-0 items-center justify-center bg-border/80 ${dim}`}
        aria-hidden
      >
        <span className="text-[9px] uppercase tracking-[0.12em] text-muted">
          —
        </span>
      </span>
    );
  }

  return (
    <span className={`relative shrink-0 overflow-hidden bg-border ${dim}`}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={size === "sm" ? "40px" : "48px"}
        className="object-cover"
        onError={() => setBroken(true)}
      />
    </span>
  );
}

export function statusBadgeClass(type: string) {
  switch (type) {
    case "available":
      return "bg-foreground text-background";
    case "unavailable":
      return "border border-border text-muted";
    case "promotional":
      return "border border-foreground text-foreground";
    default:
      return "bg-border/80 text-muted";
  }
}

export function stockTone(qty: number, tracked: boolean) {
  if (!tracked) return "text-muted";
  if (qty <= 0) return "text-red-700";
  if (qty <= 3) return "text-amber-800";
  return "text-foreground";
}
