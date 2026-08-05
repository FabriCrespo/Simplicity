"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useCart } from "@/components/cart/CartProvider";
import {
  LocationPicker,
  type MapLocation,
} from "@/components/checkout/LocationPicker";
import { useToast } from "@/components/ui/ToastProvider";
import { formatPriceBob } from "@/lib/format";

const DEPARTMENTS = [
  "La Paz",
  "Santa Cruz",
  "Cochabamba",
  "Oruro",
  "Potosí",
  "Chuquisaca",
  "Tarija",
  "Beni",
  "Pando",
] as const;

export function CheckoutForm() {
  const router = useRouter();
  const { notify } = useToast();
  const { items, subtotal, clearCart, closeCart } = useCart();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState<string>("Cochabamba");
  const [fulfillment, setFulfillment] = useState<"pickup" | "delivery">(
    "pickup",
  );
  const [address, setAddress] = useState("");
  const [location, setLocation] = useState<MapLocation | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    closeCart();
  }, [closeCart]);

  useEffect(() => {
    if (fulfillment === "pickup") {
      setCity("Cochabamba");
      setLocation(null);
      setAddress("");
    } else {
      setLocation(null);
    }
  }, [fulfillment]);

  useEffect(() => {
    if (fulfillment === "delivery") {
      setLocation(null);
    }
  }, [city, fulfillment]);

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-lg py-20 text-center">
        <p className="font-display text-2xl text-foreground">Tu bolsa está vacía</p>
        <Link
          href="/#coleccion"
          className="mt-6 inline-block text-[11px] font-light uppercase tracking-[0.22em] text-muted transition-opacity hover:opacity-50"
        >
          Seguir comprando
        </Link>
      </div>
    );
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (fulfillment === "delivery" && !location) {
      const message = "Marcá tu ubicación en el mapa";
      setError(message);
      notify({
        title: "Falta la ubicación",
        description: message,
        tone: "error",
      });
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: {
            name,
            phone,
            city: fulfillment === "pickup" ? "Cochabamba" : city,
            fulfillment,
            address: fulfillment === "delivery" ? address : undefined,
            location: fulfillment === "delivery" ? location : undefined,
            note: note || undefined,
          },
          lines: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            optionId: item.optionId,
            optionLabel: item.optionLabel,
          })),
        }),
      });

      const data = (await res.json()) as {
        order?: { id: string; accessToken: string };
        error?: string;
      };
      if (!res.ok || !data.order) {
        throw new Error(data.error || "No se pudo crear el pedido");
      }

      try {
        sessionStorage.setItem(
          `simplicity-order-token:${data.order.id}`,
          data.order.accessToken,
        );
      } catch {
        // ignore
      }

      notify({
        title: "Pedido creado",
        description: `${data.order.id} — continuá con el pago QR`,
        tone: "success",
      });
      clearCart();
      router.push(
        `/pedido/${data.order.id}/pagar?t=${encodeURIComponent(data.order.accessToken)}`,
      );    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error al crear el pedido";
      setError(message);
      notify({
        title: "No se pudo crear el pedido",
        description: message,
        tone: "error",
      });
      setSubmitting(false);
    }
  };

  const fieldClass =
    "mt-2 w-full border border-border bg-transparent px-3 py-2.5 text-sm font-light tracking-wide text-foreground outline-none transition-colors focus:border-foreground";

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
      <form onSubmit={onSubmit} className="space-y-6">
        <div>
          <p className="text-[10px] font-light uppercase tracking-[0.28em] text-muted">
            Checkout
          </p>
          <h1 className="mt-3 font-display text-3xl tracking-tight text-foreground sm:text-4xl">
            Tus datos
          </h1>
        </div>

        <label className="block">
          <span className="text-[10px] font-light uppercase tracking-[0.2em] text-muted">
            Nombre completo
          </span>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={fieldClass}
            autoComplete="name"
          />
        </label>

        <label className="block">
          <span className="text-[10px] font-light uppercase tracking-[0.2em] text-muted">
            WhatsApp / celular
          </span>
          <input
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={fieldClass}
            inputMode="tel"
            placeholder="77957266"
            autoComplete="tel"
          />
        </label>

        {fulfillment === "pickup" ? (
          <div className="border border-border/80 px-3 py-3">
            <p className="text-[10px] font-light uppercase tracking-[0.2em] text-muted">
              Ubicación de retiro
            </p>
            <p className="mt-2 text-sm font-light tracking-wide text-foreground">
              Cochabamba
            </p>
            <p className="mt-1 text-[12px] font-light text-muted">
              Retiro solo en tienda Simplicity — Cochabamba
            </p>
            <input type="hidden" name="city" value="Cochabamba" />
          </div>
        ) : (
          <label className="block">
            <span className="text-[10px] font-light uppercase tracking-[0.2em] text-muted">
              Departamento
            </span>
            <select
              required
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className={`${fieldClass} appearance-none`}
            >
              {DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </label>
        )}

        <fieldset>
          <legend className="text-[10px] font-light uppercase tracking-[0.2em] text-muted">
            Entrega
          </legend>
          <div className="mt-3 flex gap-3">
            {(
              [
                { id: "pickup", label: "Retiro en tienda" },
                { id: "delivery", label: "Delivery" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setFulfillment(opt.id)}
                className={`flex-1 border px-3 py-2.5 text-[11px] font-light uppercase tracking-[0.14em] transition-colors ${
                  fulfillment === opt.id
                    ? "border-foreground bg-foreground text-background"
                    : "border-border text-foreground hover:border-foreground/40"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </fieldset>

        {fulfillment === "delivery" ? (
          <div className="space-y-6">
            <p className="border border-border/80 bg-background/50 px-3 py-3 text-[12px] font-light leading-relaxed text-muted">
              El costo de envío no está incluido en el total. Lo acordás y
              pagás directo al motociclista del delivery al recibir tu pedido.
            </p>

            <label className="block">
              <span className="text-[10px] font-light uppercase tracking-[0.2em] text-muted">
                Dirección / referencia
              </span>
              <input
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className={fieldClass}
                autoComplete="street-address"
                placeholder="Calle, número, zona, referencia"
              />
            </label>

            <LocationPicker
              department={city}
              value={location}
              onChange={setLocation}
            />
          </div>
        ) : null}

        <label className="block">
          <span className="text-[10px] font-light uppercase tracking-[0.2em] text-muted">
            Nota (opcional)
          </span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            className={`${fieldClass} resize-none`}
            placeholder="Talla, horario de retiro, etc."
          />
        </label>

        {error ? (
          <p className="text-sm font-light text-red-700">{error}</p>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="flex h-12 w-full items-center justify-center bg-foreground text-[11px] font-light uppercase tracking-[0.22em] text-background transition-opacity hover:opacity-80 disabled:opacity-40 sm:w-auto sm:px-12"
        >
          {submitting ? "Creando pedido…" : "Continuar al pago QR"}
        </button>
      </form>

      <aside className="border border-border/80 p-6 sm:p-8">
        <p className="text-[10px] font-light uppercase tracking-[0.28em] text-muted">
          Resumen
        </p>
        <ul className="mt-6 space-y-4">
          {items.map((item) => (
            <li key={item.key} className="flex gap-3">
              <span className="relative h-16 w-12 shrink-0 overflow-hidden bg-border">
                {item.image ? (
                  <Image
                    src={item.image}
                    alt=""
                    fill
                    sizes="48px"
                    className="object-cover"
                  />
                ) : null}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-light text-foreground">
                  {item.title}
                </span>
                {item.optionLabel ? (
                  <span className="mt-0.5 block text-[10px] uppercase tracking-[0.14em] text-muted">
                    {item.optionLabel}
                  </span>
                ) : null}
                <span className="mt-1 block text-[11px] text-muted">
                  x{item.quantity} · {formatPriceBob(item.price * item.quantity)}
                </span>
              </span>
            </li>
          ))}
        </ul>
        {fulfillment === "delivery" ? (
          <div className="mt-6 flex items-start justify-between gap-3 border-t border-border pt-4 text-[12px] font-light text-muted">
            <span>Envío</span>
            <span className="max-w-[14rem] text-right leading-snug">
              A cargo del motociclista (no incluido)
            </span>
          </div>
        ) : null}
        <div
          className={`flex items-baseline justify-between ${
            fulfillment === "delivery" ? "mt-4" : "mt-8 border-t border-border pt-4"
          }`}
        >
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted">
            Total productos
          </span>
          <span className="font-display text-2xl text-foreground">
            {formatPriceBob(subtotal)}
          </span>
        </div>
      </aside>
    </div>
  );
}
