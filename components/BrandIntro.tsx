"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const SESSION_KEY = "simplicity-intro-seen";

export function BrandIntro() {
  const [phase, setPhase] = useState<"idle" | "enter" | "hold" | "exit">(
    "idle",
  );
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || sessionStorage.getItem(SESSION_KEY)) return;

    const scrollY = window.scrollY;
    document.documentElement.classList.add("intro-locked");
    document.body.style.top = `-${scrollY}px`;

    setPhase("enter");

    const holdTimer = window.setTimeout(() => setPhase("hold"), 700);
    const exitTimer = window.setTimeout(() => setPhase("exit"), 2400);
    const hideTimer = window.setTimeout(() => {
      setPhase("idle");
      sessionStorage.setItem(SESSION_KEY, "1");
      document.documentElement.classList.remove("intro-locked");
      document.body.style.top = "";
      window.scrollTo(0, scrollY);
    }, 3400);

    return () => {
      window.clearTimeout(holdTimer);
      window.clearTimeout(exitTimer);
      window.clearTimeout(hideTimer);
      document.documentElement.classList.remove("intro-locked");
      document.body.style.top = "";
    };
  }, []);

  if (!mounted || phase === "idle") return null;

  const entering = phase === "enter";
  const exiting = phase === "exit";

  return createPortal(
    <div
      className={`brand-intro-veil z-300 flex items-center justify-center bg-background ${
        exiting ? "intro-veil-out" : "intro-veil-in"
      }`}
      aria-hidden
    >
      <div
        className={`relative flex flex-col items-center px-8 ${
          exiting ? "intro-mark-exit" : entering ? "intro-mark-enter" : ""
        }`}
      >
        <p
          className={`text-[9px] font-light uppercase tracking-[0.5em] text-muted sm:text-[10px] ${
            entering ? "intro-fade-late" : exiting ? "opacity-0" : "opacity-100"
          } transition-opacity duration-500`}
        >
          XOXO
        </p>

        <span
          className={`mt-6 h-px w-10 bg-foreground/25 sm:w-14 ${
            entering
              ? "intro-rule"
              : exiting
                ? "scale-x-0 opacity-0"
                : "scale-x-100"
          } origin-center transition-all duration-700`}
        />

        <div className="mt-7 sm:mt-8">
          <Image
            src="/logo-wordmark.png"
            alt="Simplicity"
            width={480}
            height={160}
            priority
            className="h-10 w-auto object-contain sm:h-14 md:h-16"
          />
        </div>

        <span
          className={`mt-7 h-px w-10 bg-foreground/25 sm:mt-8 sm:w-14 ${
            entering
              ? "intro-rule intro-delay"
              : exiting
                ? "scale-x-0 opacity-0"
                : "scale-x-100"
          } origin-center transition-all duration-700`}
        />

        <p
          className={`mt-6 text-[9px] font-light uppercase tracking-[0.42em] text-muted sm:mt-7 sm:text-[10px] ${
            entering ? "intro-fade-late" : exiting ? "opacity-0" : "opacity-100"
          } transition-opacity duration-500`}
        >
          Welcome to the club
        </p>
      </div>
    </div>,
    document.body,
  );
}
