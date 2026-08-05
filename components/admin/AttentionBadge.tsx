import type { AttentionLevel } from "@/lib/admin-attention";
import { attentionLabel } from "@/lib/admin-attention";

type Props = {
  level: AttentionLevel;
  className?: string;
};

export function AttentionBadge({ level, className = "" }: Props) {
  const base =
    "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium tracking-wide";

  if (level === "urgent") {
    return (
      <span
        className={`${base} bg-red-50 text-red-800 ring-1 ring-inset ring-red-800/15 ${className}`}
        title="Lleva demasiado tiempo sin atender"
      >
        <UrgentIcon />
        {attentionLabel(level)}
      </span>
    );
  }

  if (level === "new") {
    return (
      <span
        className={`${base} bg-[color:var(--admin-ink,#171513)] text-[#fffcf9] ${className}`}
        title="Recién llegó"
      >
        <NewIcon />
        {attentionLabel(level)}
      </span>
    );
  }

  return (
    <span
      className={`${base} bg-amber-50 text-amber-950 ring-1 ring-inset ring-amber-900/15 ${className}`}
      title="Aún sin atender"
    >
      <WaitingIcon />
      {attentionLabel(level)}
    </span>
  );
}

function NewIcon() {
  return (
    <svg width="8" height="8" viewBox="0 0 10 10" fill="currentColor" aria-hidden>
      <circle cx="5" cy="5" r="4" />
    </svg>
  );
}

function WaitingIcon() {
  return (
    <svg
      width="9"
      height="9"
      viewBox="0 0 10 10"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      aria-hidden
    >
      <circle cx="5" cy="5" r="3.5" />
      <path d="M5 3v2.2L6.4 6.5" strokeLinecap="round" />
    </svg>
  );
}

function UrgentIcon() {
  return (
    <svg width="9" height="9" viewBox="0 0 10 10" fill="currentColor" aria-hidden>
      <path d="M5 1.2 9.2 8.8H.8L5 1.2Z" />
      <rect x="4.55" y="3.6" width="0.9" height="2.6" fill="white" />
      <rect x="4.55" y="6.7" width="0.9" height="0.9" fill="white" />
    </svg>
  );
}
