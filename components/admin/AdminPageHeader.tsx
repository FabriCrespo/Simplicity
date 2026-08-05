import type { ReactNode } from "react";

type Props = {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
};

/** Encabezado unificado de páginas del admin. */
export function AdminPageHeader({
  eyebrow,
  title,
  description,
  actions,
}: Props) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-[11px] font-medium text-[color:var(--admin-muted)]">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-1 font-display text-[1.85rem] leading-tight tracking-tight text-[color:var(--admin-ink)] sm:text-[2.15rem]">
          {title}
        </h1>
        {description ? (
          <div className="mt-2 max-w-xl text-[13px] leading-relaxed text-[color:var(--admin-muted)]">
            {description}
          </div>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          {actions}
        </div>
      ) : null}
    </header>
  );
}
