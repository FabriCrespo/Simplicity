"use client";

import Image from "next/image";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import type { SearchResult } from "@/lib/catalog";
import { formatPriceBob } from "@/lib/format";
import {
  getCachedSearch,
  getStoredCatalogVersion,
  setCachedSearch,
} from "@/lib/search-client-cache";

type Props = {
  open: boolean;
  onClose: () => void;
};

const emptyResult: SearchResult = {
  query: "",
  categories: [],
  products: [],
};

function readCatalogCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith("simplicity_catalog_v="));
  return match ? decodeURIComponent(match.split("=")[1] ?? "") : null;
}

export function SearchOverlay({ open, onClose }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<SearchResult>(emptyResult);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 50);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(focusTimer);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResult(emptyResult);
      setLoading(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const q = query.trim();
    if (!q) {
      setResult(emptyResult);
      setLoading(false);
      return;
    }

    const version =
      readCatalogCookie() ?? getStoredCatalogVersion() ?? "pending";
    const cached = getCachedSearch(q, version);
    if (cached) {
      setResult(cached);
      setLoading(false);
      return;
    }

    setLoading(true);
    setResult(emptyResult);
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!res.ok) throw new Error("search failed");
        const data = (await res.json()) as SearchResult;
        const nextVersion =
          data.version ??
          res.headers.get("X-Catalog-Version") ??
          version;
        setCachedSearch(q, nextVersion, data);
        setResult(data);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setResult({
            query: q,
            categories: [],
            products: [],
          });
        }
      } finally {
        setLoading(false);
      }
    }, 180);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query, open]);

  const hasQuery = query.trim().length > 0;
  const resultMatchesQuery =
    result.query.trim().toLowerCase() === query.trim().toLowerCase();
  const hasHits =
    resultMatchesQuery &&
    (result.categories.length > 0 || result.products.length > 0);
  const showLoading = hasQuery && !resultMatchesQuery;

  return (
    <div
      className={`fixed inset-0 z-85 ${open ? "pointer-events-auto" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      <button
        type="button"
        aria-label="Cerrar búsqueda"
        onClick={onClose}
        className={`absolute inset-0 bg-foreground/20 transition-opacity duration-500 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Buscar"
        className={`absolute inset-x-0 top-0 max-h-[min(100%,36rem)] overflow-hidden border-b border-border bg-background pt-[env(safe-area-inset-top)] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          open ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        <div className="mx-auto max-w-3xl px-4 pt-5 sm:px-6 sm:pt-6">
          <div className="flex items-center gap-3 border-b border-border pb-3">
            <Search className="size-4 shrink-0 text-muted" strokeWidth={1} />
            <label htmlFor={inputId} className="sr-only">
              Buscar prendas o categorías
            </label>
            <input
              id={inputId}
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar prendas o categorías"
              autoComplete="off"
              className="w-full bg-transparent text-sm font-light tracking-wide text-foreground outline-none placeholder:text-muted/70"
            />
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="flex size-9 shrink-0 items-center justify-center text-foreground transition-opacity hover:opacity-40"
            >
              <X className="size-4" strokeWidth={1} />
            </button>
          </div>
        </div>

        <div className="mx-auto max-h-[min(70svh,28rem)] max-w-3xl overflow-y-auto px-4 py-5 scrollbar-none sm:px-6">
          {!hasQuery ? (
            <p className="py-10 text-center text-[11px] font-light uppercase tracking-[0.2em] text-muted">
              Escribe para buscar
            </p>
          ) : showLoading ? (
            <p className="py-10 text-center text-[11px] font-light uppercase tracking-[0.2em] text-muted">
              Buscando…
            </p>
          ) : !hasHits ? (
            <p className="py-10 text-center font-display text-lg italic text-muted">
              No encontramos “{query.trim()}”
            </p>
          ) : (
            <div className="space-y-8 pb-4">
              {result.categories.length > 0 ? (
                <section>
                  <h2 className="text-[10px] font-light uppercase tracking-[0.28em] text-muted">
                    Categorías
                  </h2>
                  <ul className="mt-3 space-y-1">
                    {result.categories.map((category) => (
                      <li key={category.slug}>
                        <Link
                          href={category.href}
                          onClick={onClose}
                          className="flex items-baseline justify-between gap-4 border-b border-border/60 py-3 transition-opacity hover:opacity-45"
                        >
                          <span className="text-[12px] font-light uppercase tracking-[0.18em] text-foreground">
                            {category.name}
                          </span>
                          <span className="text-[10px] font-light tabular-nums tracking-wide text-muted">
                            {category.count}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {result.products.length > 0 ? (
                <section>
                  <h2 className="text-[10px] font-light uppercase tracking-[0.28em] text-muted">
                    Prendas
                  </h2>
                  <ul className="mt-3 space-y-3">
                    {result.products.map((product) => (
                      <li key={product.id}>
                        <Link
                          href={product.href}
                          onClick={onClose}
                          className="flex items-center gap-4 py-1 transition-opacity hover:opacity-55"
                        >
                          <span className="relative h-16 w-12 shrink-0 overflow-hidden bg-border">
                            {product.image ? (
                              <Image
                                src={product.image}
                                alt=""
                                fill
                                sizes="48px"
                                className="object-cover"
                              />
                            ) : null}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13px] font-light tracking-wide text-foreground">
                              {product.title}
                            </span>
                            <span className="mt-1 block text-[10px] font-light uppercase tracking-[0.16em] text-muted">
                              {product.category}
                            </span>
                          </span>
                          <span className="shrink-0 text-[11px] font-light text-muted">
                            {product.type === "unavailable"
                              ? "Sin stock"
                              : formatPriceBob(product.price)}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
