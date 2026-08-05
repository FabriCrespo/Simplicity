"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

export type ToastTone = "success" | "error" | "info";

export type ToastAction = {
  label: string;
  href?: string;
  onClick?: () => void;
};

export type ToastInput = {
  title: string;
  description?: string;
  tone?: ToastTone;
  durationMs?: number;
  action?: ToastAction;
};

type Toast = ToastInput & {
  id: string;
  tone: ToastTone;
};

type ToastContextValue = {
  notify: (toast: ToastInput) => void;
  dismiss: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast debe usarse dentro de ToastProvider");
  }
  return ctx;
}

/** Seguro fuera de provider (no-op) — por si se usa en edge cases. */
export function useToastOptional() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const notify = useCallback(
    (input: ToastInput) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const toast: Toast = {
        ...input,
        id,
        tone: input.tone ?? "info",
      };
      setToasts((prev) => [...prev.slice(-4), toast]);
      const duration = input.durationMs ?? 5200;
      window.setTimeout(() => dismiss(id), duration);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ notify, dismiss }), [notify, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-200 flex flex-col items-center gap-2 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:items-end sm:pr-6"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto w-full max-w-sm border px-4 py-3 shadow-[0_12px_40px_-20px_rgba(0,0,0,0.45)] ${
              toast.tone === "error"
                ? "border-red-800/30 bg-background text-foreground"
                : toast.tone === "success"
                  ? "border-foreground/20 bg-foreground text-background"
                  : "border-border bg-background text-foreground"
            }`}
            role="status"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-[0.16em]">
                  {toast.title}
                </p>
                {toast.description ? (
                  <p
                    className={`mt-1 text-[12px] font-light leading-relaxed ${
                      toast.tone === "success"
                        ? "text-background/70"
                        : "text-muted"
                    }`}
                  >
                    {toast.description}
                  </p>
                ) : null}
                {toast.action ? (
                  toast.action.href ? (
                    <a
                      href={toast.action.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`mt-3 inline-block text-[10px] uppercase tracking-[0.16em] underline underline-offset-2 ${
                        toast.tone === "success"
                          ? "text-background"
                          : "text-foreground"
                      }`}
                    >
                      {toast.action.label}
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={toast.action.onClick}
                      className={`mt-3 text-[10px] uppercase tracking-[0.16em] underline underline-offset-2 ${
                        toast.tone === "success"
                          ? "text-background"
                          : "text-foreground"
                      }`}
                    >
                      {toast.action.label}
                    </button>
                  )
                ) : null}
              </div>
              <button
                type="button"
                aria-label="Cerrar"
                onClick={() => dismiss(toast.id)}
                className={`shrink-0 text-[10px] uppercase tracking-[0.14em] opacity-50 transition-opacity hover:opacity-100 ${
                  toast.tone === "success" ? "text-background" : "text-foreground"
                }`}
              >
                Cerrar
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
