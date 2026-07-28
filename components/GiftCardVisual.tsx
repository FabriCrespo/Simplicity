import { formatPriceBob } from "@/lib/format";

type Props = {
  amount: number;
  /** "tile" = product grid, "hero" = product page, "thumb" = cart/search */
  size?: "tile" | "hero" | "thumb";
  className?: string;
};

/**
 * Editorial gift card — B&W, XOXO, credit-card proportions.
 */
export function GiftCardVisual({
  amount,
  size = "tile",
  className = "",
}: Props) {
  const isThumb = size === "thumb";
  const isHero = size === "hero";

  return (
    <div
      className={`gift-card-visual relative overflow-hidden bg-foreground text-background ${className}`}
      aria-hidden
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      <span
        className={`pointer-events-none absolute border-l border-t border-background/35 ${
          isThumb
            ? "left-1.5 top-1.5 h-2.5 w-2.5"
            : "left-3 top-3 h-3.5 w-3.5 sm:left-4 sm:top-4 sm:h-4 sm:w-4"
        }`}
      />
      <span
        className={`pointer-events-none absolute border-r border-t border-background/35 ${
          isThumb
            ? "right-1.5 top-1.5 h-2.5 w-2.5"
            : "right-3 top-3 h-3.5 w-3.5 sm:right-4 sm:top-4 sm:h-4 sm:w-4"
        }`}
      />
      <span
        className={`pointer-events-none absolute border-b border-l border-background/35 ${
          isThumb
            ? "bottom-1.5 left-1.5 h-2.5 w-2.5"
            : "bottom-3 left-3 h-3.5 w-3.5 sm:bottom-4 sm:left-4 sm:h-4 sm:w-4"
        }`}
      />
      <span
        className={`pointer-events-none absolute border-b border-r border-background/35 ${
          isThumb
            ? "bottom-1.5 right-1.5 h-2.5 w-2.5"
            : "bottom-3 right-3 h-3.5 w-3.5 sm:bottom-4 sm:right-4 sm:h-4 sm:w-4"
        }`}
      />

      <div
        className={`pointer-events-none absolute left-0 right-0 border-t border-dashed border-background/20 ${
          isThumb ? "top-[22%]" : "top-[24%]"
        }`}
      />

      <div
        className={`relative flex h-full flex-col justify-between ${
          isThumb
            ? "gap-1 p-2"
            : isHero
              ? "gap-4 p-6 sm:gap-5 sm:p-8"
              : "gap-2.5 p-4 sm:gap-3 sm:p-5"
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <p
              className={`font-light uppercase tracking-[0.32em] text-background/55 ${
                isThumb ? "text-[5px] tracking-[0.2em]" : "text-[8px] sm:text-[9px]"
              }`}
            >
              Gift Card
            </p>
            <p
              className={`mt-0.5 font-display italic text-background/80 ${
                isThumb ? "text-[8px]" : "text-xs sm:text-sm"
              }`}
            >
              XOXO
            </p>
          </div>
          <span
            className={`font-display italic text-background/45 ${
              isThumb ? "text-[7px]" : "text-[10px] sm:text-xs"
            }`}
          >
            for you
          </span>
        </div>

        <div className="text-center">
          <p
            className={`font-display font-medium leading-none tracking-tight text-background ${
              isThumb
                ? "text-base"
                : isHero
                  ? "text-4xl sm:text-5xl"
                  : "text-2xl sm:text-3xl"
            }`}
          >
            {formatPriceBob(amount).replace(/\.00$/, "")}
          </p>
          <span
            className={`mx-auto block h-px bg-background/40 ${
              isThumb ? "mt-1 w-5" : "mt-2 w-8 sm:w-10"
            }`}
          />
          <p
            className={`font-light uppercase tracking-[0.28em] text-background/70 ${
              isThumb
                ? "mt-1 text-[5px] tracking-[0.18em]"
                : "mt-2 text-[8px] sm:text-[9px]"
            }`}
          >
            Simplicity
          </p>
        </div>

        <p
          className={`font-light uppercase tracking-[0.2em] text-background/40 ${
            isThumb ? "text-[5px]" : "text-[7px] sm:text-[8px]"
          }`}
        >
          Cochabamba
        </p>
      </div>
    </div>
  );
}
