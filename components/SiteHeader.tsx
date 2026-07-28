"use client";

import Image from "next/image";
import Link from "next/link";
import { UserRound, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useCart } from "@/components/cart/CartProvider";
import { SearchOverlay } from "@/components/SearchOverlay";
import type { MenuCategory } from "@/lib/catalog";

function CategorySidebar({
  categories,
  open,
  onClose,
}: {
  categories: MenuCategory[];
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  return (
    <div
      className={`fixed inset-0 z-80 ${open ? "pointer-events-auto" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      <button
        type="button"
        aria-label="Cerrar menú"
        onClick={onClose}
        className={`absolute inset-0 bg-foreground/20 transition-opacity duration-500 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />

      <aside
        id="category-sidebar"
        role="dialog"
        aria-modal="true"
        aria-label="Categorías"
        className={`absolute left-0 top-0 flex h-full w-[min(100%,20rem)] flex-col bg-background transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] sm:w-88 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-14 shrink-0 items-center justify-between px-6 sm:h-16 sm:px-8">
          <p className="text-[10px] font-light uppercase tracking-[0.38em] text-muted">
            Shop
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex size-9 items-center justify-center text-foreground transition-opacity hover:opacity-40"
          >
            <X className="size-4" strokeWidth={1} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-6 pb-12 scrollbar-none sm:px-8">
          <ul>
            {categories.map((category) => (
              <li key={category.slug}>
                <Link
                  href={category.href}
                  onClick={onClose}
                  className="block border-b border-border/60 py-3.5 text-[11px] font-extralight uppercase tracking-[0.24em] text-foreground transition-opacity hover:opacity-35"
                >
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
    </div>
  );
}

export function SiteHeader({ categories }: { categories: MenuCategory[] }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { openCart, itemCount } = useCart();

  return (
    <>
      <header className="sticky top-0 z-50 bg-background">
        <div className="relative flex h-14 items-center justify-between px-4 sm:h-16 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 sm:gap-6">
            <button
              type="button"
              aria-label="Abrir menú"
              aria-expanded={menuOpen}
              aria-controls="category-sidebar"
              onClick={() => setMenuOpen(true)}
              className="group flex flex-col justify-center gap-1.25 py-2 transition-opacity hover:opacity-45"
            >
              <span className="block h-px w-4.5 bg-foreground" />
              <span className="block h-px w-4.5 bg-foreground" />
              <span className="block h-px w-4.5 bg-foreground" />
            </button>

            <button
              type="button"
              aria-label="Buscar"
              aria-expanded={searchOpen}
              onClick={() => setSearchOpen(true)}
              className="text-[11px] font-light uppercase tracking-[0.18em] text-foreground transition-opacity hover:opacity-45"
            >
              Buscar
            </button>
          </div>

          <Link
            href="/"
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transition-opacity hover:opacity-60"
            aria-label="Simplicity — inicio"
          >
            <Image
              src="/logo-wordmark.png"
              alt="Simplicity"
              width={240}
              height={80}
              priority
              className="h-8 w-auto object-contain sm:h-10"
            />
          </Link>

          <div className="flex items-center gap-4 sm:gap-6">
            <Link
              href="/admin"
              aria-label="Administrador"
              className="flex items-center text-foreground transition-opacity hover:opacity-45"
            >
              <UserRound className="size-4.25" strokeWidth={1} />
            </Link>

            <button
              type="button"
              onClick={openCart}
              aria-label="Abrir bolsa"
              aria-controls="cart-sidebar"
              className="flex items-center gap-1.5 text-[11px] font-light uppercase tracking-[0.18em] text-foreground transition-opacity hover:opacity-45"
            >
              <span>Bolsa</span>
              <span className="tabular-nums">{itemCount}</span>
            </button>
          </div>
        </div>
      </header>

      <CategorySidebar
        categories={categories}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
      />

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
