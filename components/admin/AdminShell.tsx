"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { RoutePrefetch } from "@/components/RoutePrefetch";
import { clearAdminPin, getAdminPin, setAdminPin } from "@/lib/admin-client";
import { ADMIN_PREFETCH_ROUTES } from "@/lib/prefetch-routes";

type AdminAuthContextValue = {
  pin: string;
  authed: boolean;
  loading: boolean;
  error: string;
  login: (pin: string) => Promise<boolean>;
  logout: () => void;
  authHeaders: () => HeadersInit;
};

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth debe usarse dentro de AdminAuthProvider");
  return ctx;
}

const NAV = [
  { href: "/admin", label: "Inicio", exact: true as boolean, icon: "home" as const },
  {
    href: "/admin/pedidos",
    label: "Pedidos",
    exact: false as boolean,
    icon: "orders" as const,
  },
  {
    href: "/admin/envios",
    label: "Envíos",
    exact: false as boolean,
    icon: "ship" as const,
  },
  {
    href: "/admin/productos",
    label: "Productos",
    exact: false as boolean,
    icon: "box" as const,
  },
  {
    href: "/admin/stock",
    label: "Stock",
    exact: false as boolean,
    icon: "stock" as const,
  },
];

function NavIcon({ name }: { name: (typeof NAV)[number]["icon"] }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (name) {
    case "home":
      return (
        <svg {...common}>
          <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" />
        </svg>
      );
    case "orders":
      return (
        <svg {...common}>
          <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
        </svg>
      );
    case "ship":
      return (
        <svg {...common}>
          <path d="M3 7h11v10H3z" />
          <path d="M14 10h4l3 3v4h-7v-7Z" />
          <circle cx="7" cy="18" r="1.5" />
          <circle cx="17.5" cy="18" r="1.5" />
        </svg>
      );
    case "box":
      return (
        <svg {...common}>
          <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
          <path d="M12 12 4.5 7.5M12 12l7.5-4.5M12 12v9" />
        </svg>
      );
    case "stock":
      return (
        <svg {...common}>
          <path d="M4 19V9M10 19V5M16 19v-7M22 19H2" />
        </svg>
      );
  }
}

function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [pin, setPinState] = useState("");
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const login = useCallback(async (value: string) => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: value }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "PIN incorrecto");
      }
      setAdminPin(value);
      setPinState(value);
      setAuthed(true);
      return true;
    } catch (err) {
      setAuthed(false);
      clearAdminPin();
      setError(err instanceof Error ? err.message : "Error");
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    clearAdminPin();
    setPinState("");
    setAuthed(false);
  }, []);

  useEffect(() => {
    const saved = getAdminPin();
    if (!saved) {
      setLoading(false);
      return;
    }
    void login(saved);
  }, [login]);

  const value = useMemo<AdminAuthContextValue>(
    () => ({
      pin,
      authed,
      loading,
      error,
      login,
      logout,
      authHeaders: () => ({ "x-admin-pin": getAdminPin() || pin }),
    }),
    [pin, authed, loading, error, login, logout],
  );

  return (
    <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>
  );
}

function AdminLogin() {
  const { login, loading, error } = useAdminAuth();
  const [value, setValue] = useState("");

  return (
    <div className="admin-root relative flex min-h-full flex-1 items-center justify-center px-4 py-16">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-[color:var(--admin-ink)]/[0.04] blur-3xl" />
        <div className="absolute -right-16 bottom-10 h-64 w-64 rounded-full bg-[color:var(--admin-ink)]/[0.035] blur-3xl" />
      </div>

      <div className="relative w-full max-w-[22rem]">
        <div className="flex items-center gap-3">
          <Image
            src="/simplicity-logo.jpg"
            alt=""
            width={40}
            height={40}
            className="h-10 w-10 rounded-sm object-cover"
          />
          <div>
            <p className="font-display text-xl leading-none text-[color:var(--admin-ink)]">
              Simplicity
            </p>
            <p className="mt-1 text-[12px] text-[color:var(--admin-muted)]">
              Panel de operaciones
            </p>
          </div>
        </div>

        <form
          className="mt-10 space-y-5 rounded-xl border border-[color:var(--admin-line)] bg-[color:var(--admin-surface)] p-6 shadow-[0_20px_50px_-28px_rgba(20,18,16,0.35)]"
          onSubmit={(e) => {
            e.preventDefault();
            void login(value);
          }}
        >
          <div>
            <h1 className="font-display text-2xl text-[color:var(--admin-ink)]">
              Ingresar
            </h1>
            <p className="mt-1.5 text-[13px] leading-relaxed text-[color:var(--admin-muted)]">
              Acceso restringido al equipo de la tienda.
            </p>
          </div>

          <label className="block">
            <span className="text-[12px] font-medium text-[color:var(--admin-ink)]">
              PIN
            </span>
            <input
              type="password"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="admin-input mt-2"
              autoComplete="current-password"
              inputMode="numeric"
              placeholder="••••••••"
            />
          </label>

          {error ? (
            <p className="text-[13px] text-red-700">{error}</p>
          ) : null}

          <button
            type="submit"
            disabled={loading || !value}
            className="admin-btn-primary w-full disabled:opacity-40"
          >
            {loading ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}

function isActive(pathname: string, href: string, exact: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { logout } = useAdminAuth();

  return (
    <div className="admin-root flex min-h-full flex-1 flex-col lg:flex-row">
      <RoutePrefetch hrefs={[...ADMIN_PREFETCH_ROUTES]} delayMs={200} />

      {/* Desktop sidebar */}
      <aside className="admin-sidebar relative hidden lg:flex lg:w-[15.5rem] lg:shrink-0 lg:flex-col">
        <div className="px-5 pb-2 pt-7">
          <Link href="/admin" className="flex items-center gap-3">
            <Image
              src="/simplicity-logo.jpg"
              alt="Simplicity"
              width={40}
              height={40}
              className="h-10 w-10 rounded-sm object-cover ring-1 ring-white/10"
            />
            <div>
              <p className="font-display text-[1.35rem] leading-none text-white">
                Simplicity
              </p>
              <p className="mt-1.5 text-[11px] text-white/45">Operaciones</p>
            </div>
          </Link>
        </div>

        <nav className="mt-8 flex flex-1 flex-col gap-0.5 px-3">
          {NAV.map((item) => {
            const active = isActive(pathname, item.href, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`admin-nav-link ${active ? "is-active" : ""}`}
              >
                <NavIcon name={item.icon} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto space-y-1 border-t border-white/10 px-3 py-4">
          <Link href="/" className="admin-nav-link">
            Ver tienda
          </Link>
          <button type="button" onClick={logout} className="admin-nav-link w-full">
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-[color:var(--admin-line)] bg-[color:var(--admin-wash)]/90 px-4 py-3 backdrop-blur-md lg:hidden">
        <Link href="/admin" className="flex min-w-0 items-center gap-2.5">
          <Image
            src="/simplicity-logo.jpg"
            alt=""
            width={32}
            height={32}
            className="h-8 w-8 rounded-sm object-cover"
          />
          <div className="min-w-0">
            <p className="truncate font-display text-lg leading-none text-[color:var(--admin-ink)]">
              Simplicity
            </p>
            <p className="mt-0.5 text-[11px] text-[color:var(--admin-muted)]">
              Admin
            </p>
          </div>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-[12px] text-[color:var(--admin-muted)] transition-colors hover:text-[color:var(--admin-ink)]"
          >
            Tienda
          </Link>
          <button
            type="button"
            onClick={logout}
            className="text-[12px] font-medium text-[color:var(--admin-ink)]"
          >
            Salir
          </button>
        </div>
      </header>

      <div className="flex min-w-0 flex-1 flex-col">
        <main className="admin-main flex-1 px-4 pb-[calc(5.25rem+env(safe-area-inset-bottom))] pt-6 sm:px-6 sm:pt-8 lg:px-10 lg:pb-10 lg:pt-9">
          <div className="mx-auto w-full max-w-5xl">{children}</div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav
        className="admin-bottom-nav fixed inset-x-0 bottom-0 z-40 lg:hidden"
        aria-label="Navegación admin"
      >
        <div className="mx-auto grid max-w-lg grid-cols-5 gap-0.5 px-1 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1.5">
          {NAV.map((item) => {
            const active = isActive(pathname, item.href, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`admin-bottom-link ${active ? "is-active" : ""}`}
              >
                <NavIcon name={item.icon} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export function AdminApp({ children }: { children: React.ReactNode }) {
  return (
    <AdminAuthProvider>
      <AdminGate>{children}</AdminGate>
    </AdminAuthProvider>
  );
}

function AdminGate({ children }: { children: React.ReactNode }) {
  const { authed, loading } = useAdminAuth();

  if (loading) {
    return (
      <div className="admin-root flex flex-1 items-center justify-center py-24 text-[13px] text-[color:var(--admin-muted)]">
        Cargando…
      </div>
    );
  }

  if (!authed) return <AdminLogin />;
  return <AdminShell>{children}</AdminShell>;
}
