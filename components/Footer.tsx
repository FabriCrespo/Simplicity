"use client";

import Image from "next/image";
import Link from "next/link";
import { Reveal } from "@/components/Reveal";

const LINKS = [
  { label: "Shop", href: "/#coleccion" },
  { label: "Destacados", href: "/#destacados" },
  { label: "Visítanos", href: "/#contacto" },
  {
    label: "Instagram",
    href: "https://www.instagram.com/simplicity_bolivia/",
    external: true,
  },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden border-t border-white/10 bg-foreground text-background">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
        aria-hidden
      />

      <div className="relative mx-auto max-w-5xl px-5 py-16 text-center sm:px-8 sm:py-20">
        <Reveal>

          <div className="mx-auto mt-7 flex items-center justify-center gap-3">
            <span className="h-px w-8 bg-background/25" />
            <span className="size-1 rounded-full bg-background/40" />
            <span className="h-px w-8 bg-background/25" />
          </div>

          <p className="mt-6 font-display text-base italic tracking-wide text-background/50 sm:text-lg">
            Welcome to the club, sister.
          </p>
        </Reveal>

        <Reveal delayMs={100} className="mt-12">
          <Link
            href="/"
            className="inline-block transition-opacity hover:opacity-60 active:opacity-50"
            aria-label="Simplicity — inicio"
          >
            <Image
              src="/logo-wordmark.png"
              alt="Simplicity"
              width={200}
              height={64}
              className="mx-auto h-8 w-auto invert object-contain opacity-85 sm:h-9"
            />
          </Link>
        </Reveal>

        <Reveal delayMs={160}>
          <nav aria-label="Footer" className="mt-8">
            <ul className="flex flex-wrap items-center justify-center gap-x-7 gap-y-3">
              {LINKS.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    {...(link.external
                      ? { target: "_blank", rel: "noopener noreferrer" }
                      : {})}
                    className="text-[10px] font-light uppercase tracking-[0.26em] text-background/45 transition-opacity hover:text-background hover:opacity-100"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </Reveal>

        <Reveal delayMs={220}>
          <p className="mt-12 text-[10px] font-light uppercase tracking-[0.22em] text-background/30">
            © {year} — Cochabamba
          </p>
        </Reveal>
      </div>
    </footer>
  );
}
