"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useState,
  type CSSProperties,
  type MouseEvent,
} from "react";

const panels = [
  {
    src: "/tienda/1.jpeg",
    alt: "Interior de Simplicity — rack y estanterías",
  },
  {
    src: "/tienda/2.jpeg",
    alt: "Display de denim en Simplicity",
  },
  {
    src: "/tienda/3.jpeg",
    alt: "Accesorios y shelves en Simplicity",
  },
] as const;

const INTERVAL_MS = 3800;

export function Hero() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [spot, setSpot] = useState({ x: 50, y: 50, active: false });

  const goTo = useCallback((index: number) => {
    setActive(((index % panels.length) + panels.length) % panels.length);
  }, []);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || paused) return;

    const id = window.setInterval(() => {
      setActive((prev) => (prev + 1) % panels.length);
    }, INTERVAL_MS);

    return () => window.clearInterval(id);
  }, [paused]);

  const onSpotMove = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setSpot({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
      active: true,
    });
  };

  return (
    <section
      aria-label="Simplicity tienda"
      className="relative isolate overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => {
        setPaused(false);
        setSpot((s) => ({ ...s, active: false }));
      }}
    >
      {/* Mobile slideshow */}
      <div className="relative h-[72svh] md:hidden">
        {panels.map((panel, index) => {
          const isActive = active === index;
          return (
            <div
              key={panel.src}
              aria-hidden={!isActive}
              className={`absolute inset-0 transition-opacity duration-1000 ease-out ${
                isActive ? "opacity-100" : "opacity-0"
              }`}
            >
              <Image
                src={panel.src}
                alt={panel.alt}
                fill
                priority={index === 0}
                sizes="100vw"
                className={`object-cover object-center grayscale contrast-[1.08] brightness-[1.02] transition-[filter,transform] duration-3800 ease-out ${
                  isActive ? "scale-105" : "scale-100"
                }`}
              />
              <div className="absolute inset-0 bg-black/20" />
            </div>
          );
        })}

        <div className="absolute bottom-6 left-0 right-0 z-20 flex justify-center gap-2">
          {panels.map((panel, index) => (
            <button
              key={panel.src}
              type="button"
              aria-label={`Ver imagen ${index + 1}`}
              onClick={() => goTo(index)}
              className={`h-1 rounded-full transition-all duration-500 ${
                active === index ? "w-7 bg-white" : "w-1.5 bg-white/45"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Desktop: B&W with cursor color spotlight */}
      <div
        className="hero-spotlight relative hidden h-[70svh] md:block"
        onMouseMove={onSpotMove}
        onMouseLeave={() => setSpot((s) => ({ ...s, active: false }))}
        style={
          {
            "--spot-x": `${spot.x}%`,
            "--spot-y": `${spot.y}%`,
            "--spot-size": spot.active ? "300px" : "0px",
          } as CSSProperties
        }
      >
        <div className="absolute inset-0 grid grid-cols-3">
          {panels.map((panel, index) => (
            <button
              key={`color-${panel.src}`}
              type="button"
              onClick={() => goTo(index)}
              aria-label={panel.alt}
              className="relative overflow-hidden bg-border"
            >
              <Image
                src={panel.src}
                alt=""
                fill
                priority={index === 0}
                sizes="33vw"
                aria-hidden
                className="object-cover object-center transition-transform duration-700 hover:scale-[1.03]"
              />
            </button>
          ))}
        </div>

        {/* Single B&W overlay — mask hole is relative to full hero */}
        <div className="hero-bw-layer pointer-events-none absolute inset-0 grid grid-cols-3">
          {panels.map((panel, index) => (
            <div key={`bw-${panel.src}`} className="relative overflow-hidden">
              <Image
                src={panel.src}
                alt=""
                fill
                priority={index === 0}
                sizes="33vw"
                aria-hidden
                className="object-cover object-center grayscale contrast-[1.08] brightness-[1.02]"
              />
            </div>
          ))}
        </div>

        <div className="pointer-events-none absolute inset-0 bg-black/15" />
      </div>

      <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center px-4">
        <p className="animate-fade-up text-[9px] font-light uppercase tracking-[0.42em] text-white/75 sm:text-[10px]">
          XOXO
        </p>
        <h1 className="animate-fade-up animate-delay-1 mt-3 text-center font-display text-[2rem] font-medium tracking-[0.06em] text-white drop-shadow-[0_2px_24px_rgba(0,0,0,0.55)] sm:text-5xl md:text-6xl lg:text-[4.5rem]">
          Welcome to the club
        </h1>
        <span className="animate-shimmer-line animate-delay-2 mt-4 h-px w-16 bg-white/70 sm:w-24" />
        <p className="animate-fade-up animate-delay-3 mt-5 hidden text-[10px] font-light uppercase tracking-[0.28em] text-white/55 md:block">
          Move to reveal color
        </p>
      </div>
    </section>
  );
}
