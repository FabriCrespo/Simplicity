"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, X } from "lucide-react";
import { useEffect } from "react";
import { useCart } from "@/components/cart/CartProvider";
import { GiftCardVisual } from "@/components/GiftCardVisual";
import { formatPriceBob } from "@/lib/format";

const WHATSAPP = "https://wa.me/59177957266";

export function CartSidebar() {
  const {
    items,
    isOpen,
    closeCart,
    itemCount,
    subtotal,
    setQuantity,
    removeItem,
  } = useCart();

  useEffect(() => {
    if (!isOpen) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeCart();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [isOpen, closeCart]);

  return (
    <div
      className={`fixed inset-0 z-90 ${isOpen ? "pointer-events-auto" : "pointer-events-none"}`}
      aria-hidden={!isOpen}
    >
      <button
        type="button"
        aria-label="Cerrar bolsa"
        onClick={closeCart}
        className={`absolute inset-0 bg-foreground/20 transition-opacity duration-500 ${
          isOpen ? "opacity-100" : "opacity-0"
        }`}
      />

      <aside
        id="cart-sidebar"
        role="dialog"
        aria-modal="true"
        aria-label="Bolsa"
        className={`absolute right-0 top-0 flex h-full w-[min(100%,22rem)] flex-col bg-background pt-[env(safe-area-inset-top)] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] sm:w-[24rem] ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-border/60 px-6 sm:h-16 sm:px-8">
          <p className="text-[10px] font-light uppercase tracking-[0.38em] text-muted">
            Bolsa{itemCount > 0 ? ` · ${itemCount}` : ""}
          </p>
          <button
            type="button"
            onClick={closeCart}
            aria-label="Cerrar"
            className="flex size-9 items-center justify-center text-foreground transition-opacity hover:opacity-40"
          >
            <X className="size-4" strokeWidth={1} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 scrollbar-none sm:px-8">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <p className="font-display text-2xl tracking-tight text-foreground">
                Vacía
              </p>
              <p className="mt-2 text-[11px] font-light uppercase tracking-[0.18em] text-muted">
                Sumá algo a la bolsa
              </p>
              <button
                type="button"
                onClick={closeCart}
                className="mt-8 text-[11px] font-light uppercase tracking-[0.2em] text-foreground transition-opacity hover:opacity-45"
              >
                Seguir comprando
              </button>
            </div>
          ) : (
            <ul className="space-y-6">
              {items.map((item) => (
                <li key={item.key} className="flex gap-4">
                  <Link
                    href={`/producto/${item.slug}`}
                    onClick={closeCart}
                    className={`relative shrink-0 overflow-hidden bg-border ${
                      /gift/i.test(item.title) ? "h-14 w-24" : "h-24 w-20"
                    }`}
                  >
                    {item.image ? (
                      <Image
                        src={item.image}
                        alt={item.title}
                        fill
                        sizes="96px"
                        className="object-cover"
                      />
                    ) : /gift/i.test(item.title) ? (
                      <GiftCardVisual
                        amount={item.price}
                        size="thumb"
                        className="absolute inset-0"
                      />
                    ) : null}
                  </Link>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Link
                          href={`/producto/${item.slug}`}
                          onClick={closeCart}
                          className="block text-[12px] font-light leading-snug tracking-wide text-foreground transition-opacity hover:opacity-50"
                        >
                          {item.title}
                        </Link>
                        {item.optionLabel ? (
                          <p className="mt-1 text-[10px] font-light uppercase tracking-[0.16em] text-muted">
                            {item.optionLabel}
                          </p>
                        ) : null}
                        <p className="mt-2 text-[11px] font-light text-muted">
                          {formatPriceBob(item.price)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(item.key)}
                        className="text-[10px] font-light uppercase tracking-[0.16em] text-muted transition-opacity hover:opacity-50"
                      >
                        Quitar
                      </button>
                    </div>

                    <div className="mt-3 inline-flex items-center border border-border">
                      <button
                        type="button"
                        aria-label="Menos"
                        onClick={() => setQuantity(item.key, item.quantity - 1)}
                        className="flex size-8 items-center justify-center text-foreground transition-opacity hover:opacity-45"
                      >
                        <Minus className="size-3" strokeWidth={1} />
                      </button>
                      <span className="min-w-8 text-center text-[11px] font-light tabular-nums">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        aria-label="Más"
                        onClick={() => setQuantity(item.key, item.quantity + 1)}
                        className="flex size-8 items-center justify-center text-foreground transition-opacity hover:opacity-45"
                      >
                        <Plus className="size-3" strokeWidth={1} />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {items.length > 0 ? (
          <div className="shrink-0 border-t border-border/60 px-6 py-5 sm:px-8">
            <div className="mb-4 flex items-baseline justify-between">
              <span className="text-[10px] font-light uppercase tracking-[0.22em] text-muted">
                Subtotal
              </span>
              <span className="text-sm font-light tracking-wide text-foreground">
                {formatPriceBob(subtotal)}
              </span>
            </div>
            <Link
              href="/checkout"
              onClick={closeCart}
              className="flex h-12 w-full items-center justify-center bg-foreground text-[11px] font-light uppercase tracking-[0.22em] text-background transition-opacity hover:opacity-80"
            >
              Ir a pagar
            </Link>
            <a
              href={`${WHATSAPP}?text=${encodeURIComponent(
                "Hola Simplicity, tengo una consulta sobre un pedido",
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 block w-full text-center text-[10px] font-light uppercase tracking-[0.2em] text-muted transition-opacity hover:opacity-50"
            >
              Dudas por WhatsApp
            </a>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
