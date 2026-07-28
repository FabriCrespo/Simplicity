import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-5 py-24 text-center">
      <p className="text-[10px] font-light uppercase tracking-[0.28em] text-muted">
        404
      </p>
      <h1 className="mt-3 font-display text-3xl tracking-tight text-foreground sm:text-4xl">
        No encontrado
      </h1>
      <Link
        href="/"
        className="mt-8 text-[11px] font-light uppercase tracking-[0.2em] text-foreground transition-opacity hover:opacity-45"
      >
        Volver al inicio
      </Link>
    </div>
  );
}
