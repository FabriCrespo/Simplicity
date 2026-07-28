"use client";

import Link from "next/link";
import { MapPin } from "lucide-react";
import {
  SiFacebook,
  SiInstagram,
  SiLinktree,
  SiTiktok,
} from "react-icons/si";
import type { IconType } from "react-icons";
import { Reveal } from "@/components/Reveal";

const LOCATION = {
  title: "Simplicity",
  addressLines: [
    "Simeón Roncal 1610",
    "Condominio Remanso",
    "Cochabamba, Bolivia",
  ],
  mapsUrl:
    "https://www.google.com/maps/search/?api=1&query=Simeon+Roncal+1610+Cochabamba+Bolivia",
  mapsEmbed:
    "https://maps.google.com/maps?q=Sime%C3%B3n+Roncal+1610,+Cochabamba,+Bolivia&z=16&output=embed",
  whatsapp: "https://wa.me/59177957266",
};

const HOURS = [
  { day: "Lunes — Viernes", time: "10:00 — 20:00" },
  { day: "Sábado", time: "10:00 — 20:00" },
  { day: "Domingo", time: "Cerrado" },
];

const SOCIALS: { name: string; href: string; Icon: IconType }[] = [
  {
    name: "Instagram",
    href: "https://www.instagram.com/simplicity_bolivia/",
    Icon: SiInstagram,
  },
  {
    name: "TikTok",
    href: "https://www.tiktok.com/@simplicity_bolivia",
    Icon: SiTiktok,
  },
  {
    name: "Facebook",
    href: "https://www.facebook.com/profile.php?id=100065175353576",
    Icon: SiFacebook,
  },
  {
    name: "Linktree",
    href: "https://tr.ee/eP6if4lltz",
    Icon: SiLinktree,
  },
];

export function VisitSection() {
  return (
    <section
      id="contacto"
      aria-labelledby="visita-heading"
      className="border-t border-border bg-background text-foreground"
    >
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <Reveal className="text-center">
          <p className="text-[10px] uppercase tracking-[0.28em] text-muted">
            XOXO
          </p>
          <h2
            id="visita-heading"
            className="mt-3 font-display text-3xl tracking-tight sm:text-4xl md:text-5xl"
          >
            Visítanos
          </h2>
          <p className="mx-auto mt-3 max-w-md font-display text-base italic text-muted sm:text-lg">
            Welcome to the club, sister.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-10 sm:mt-14 md:grid-cols-3 md:gap-10 lg:mt-16 lg:gap-16">
          <Reveal delayMs={80} className="text-center md:text-left">
            <div className="mb-4 flex items-center justify-center gap-2 md:justify-start">
              <MapPin className="size-4 text-muted" strokeWidth={1} />
              <h3 className="text-[11px] uppercase tracking-[0.22em] text-muted">
                Ubicación
              </h3>
            </div>
            <p className="font-display text-2xl tracking-wide">{LOCATION.title}</p>
            <div className="mt-3 space-y-1 text-sm leading-relaxed text-muted">
              {LOCATION.addressLines.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
            <Link
              href={LOCATION.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-block text-[11px] uppercase tracking-[0.2em] text-foreground transition-opacity active:opacity-50 hover:opacity-50"
            >
              Cómo llegar
            </Link>
          </Reveal>

          <Reveal delayMs={140} className="text-center md:text-left">
            <h3 className="mb-4 text-[11px] uppercase tracking-[0.22em] text-muted">
              Horarios
            </h3>
            <ul className="space-y-3">
              {HOURS.map((row) => (
                <li
                  key={row.day}
                  className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4 md:flex-col md:gap-0.5 lg:flex-row lg:gap-4"
                >
                  <span className="text-sm text-foreground/80">{row.day}</span>
                  <span className="text-sm tabular-nums tracking-wide text-muted">
                    {row.time}
                  </span>
                </li>
              ))}
            </ul>
            <Link
              href={LOCATION.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-block text-[11px] uppercase tracking-[0.2em] text-foreground transition-opacity active:opacity-50 hover:opacity-50"
            >
              WhatsApp
            </Link>
          </Reveal>

          <Reveal delayMs={200} className="text-center md:text-left">
            <h3 className="mb-4 text-[11px] uppercase tracking-[0.22em] text-muted">
              Redes
            </h3>
            <ul className="flex flex-col items-center gap-4 md:items-start">
              {SOCIALS.map(({ name, href, Icon }) => (
                <li key={name}>
                  <Link
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-3 text-sm tracking-wide text-foreground transition-transform active:scale-95 hover:opacity-50"
                  >
                    <Icon className="size-4 opacity-90" aria-hidden />
                    <span className="text-[11px] uppercase tracking-[0.18em]">
                      {name}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>

        <Reveal delayMs={120} className="group relative mt-12 overflow-hidden border border-border sm:mt-16">
          <iframe
            title="Ubicación de Simplicity en Google Maps"
            src={LOCATION.mapsEmbed}
            className="h-60 w-full grayscale contrast-[1.05] transition-[filter] duration-700 group-active:grayscale-0 sm:h-90 md:h-105 md:group-hover:grayscale-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </Reveal>
      </div>
    </section>
  );
}
