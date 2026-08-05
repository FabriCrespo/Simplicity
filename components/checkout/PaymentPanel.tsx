"use client";

import Link from "next/link";
import { useState } from "react";
import { ReceiptUpload } from "@/components/checkout/ReceiptUpload";
import { useToast } from "@/components/ui/ToastProvider";
import type { Order } from "@/lib/orders";
import { isReceiptImage, receiptApiPath } from "@/lib/order-public";
import { PAYMENT_CONFIG } from "@/lib/payments";
import { formatPriceBob } from "@/lib/format";

const STATUS_LABEL: Record<Order["status"], string> = {
  pending_payment: "Pendiente de pago",
  pending_review: "Comprobante en revisión",
  paid: "Pagado",
  cancelled: "Cancelado",
};

export function PaymentPanel({
  order: initial,
  accessToken,
}: {
  order: Order;
  accessToken: string;
}) {
  const { notify } = useToast();
  const [order, setOrder] = useState(initial);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(
    initial.status === "pending_review" || initial.status === "paid",
  );

  const receiptUrl = receiptApiPath(order.id, accessToken);
  const hasReceipt = Boolean(order.receiptFile || order.receiptPath);
  const receiptIsImage = order.receiptFile
    ? isReceiptImage(order.receiptFile)
    : !!order.receiptPath && isReceiptImage(order.receiptPath);

  const onUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      const message = "Elegí una foto o PDF del comprobante";
      setError(message);
      notify({
        title: "Falta el comprobante",
        description: message,
        tone: "error",
      });
      return;
    }

    setError("");
    setUploading(true);

    try {
      const form = new FormData();
      form.append("receipt", file);
      const res = await fetch(receiptApiPath(order.id, accessToken), {
        method: "POST",
        headers: { "x-order-token": accessToken },
        body: form,
      });
      const data = (await res.json()) as { order?: Order; error?: string };
      if (!res.ok || !data.order) {
        throw new Error(data.error || "No se pudo subir el comprobante");
      }
      setOrder(data.order);
      setDone(true);
      setFile(null);
      notify({
        title: "Comprobante enviado",
        description:
          "Estamos revisando tu pago. Te avisamos cuando se confirme.",
        tone: "success",
        durationMs: 7000,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al subir";
      setError(message);
      notify({
        title: "No se pudo subir el comprobante",
        description: message,
        tone: "error",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mx-auto grid w-full max-w-4xl gap-10 lg:grid-cols-2 lg:gap-16">
      <div>
        <p className="text-[10px] font-light uppercase tracking-[0.28em] text-muted">
          Pago QR
        </p>
        <h1 className="mt-3 font-display text-3xl tracking-tight text-foreground sm:text-4xl">
          Escaneá y pagá
        </h1>
        <p className="mt-3 text-sm font-light text-muted">
          Pedido <span className="text-foreground">{order.id}</span>
          {" · "}
          {STATUS_LABEL[order.status]}
        </p>

        <div className="mt-6 border border-border bg-background p-5 sm:mt-8 sm:p-8">
          <div className="relative mx-auto aspect-square w-full max-w-[240px] overflow-hidden border border-border bg-background p-3 sm:max-w-[280px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={PAYMENT_CONFIG.qrImage}
              alt="QR de pago Simplicity"
              className="h-full w-full object-contain"
            />
          </div>
          <p className="mt-5 text-center text-[10px] font-light uppercase tracking-[0.22em] text-muted">
            {PAYMENT_CONFIG.bankLabel}
          </p>
          <p className="mt-2 text-center font-display text-xl text-foreground">
            {PAYMENT_CONFIG.accountHolder}
          </p>
          <p className="mt-4 text-center font-display text-3xl tracking-tight text-foreground">
            {formatPriceBob(order.subtotal)}
          </p>
          <p className="mt-2 text-center text-[11px] font-light text-muted">
            Referencia: {order.id}
          </p>
        </div>

        <ul className="mt-5 space-y-2 sm:mt-6">
          {PAYMENT_CONFIG.footnotes.map((line) => (
            <li
              key={line}
              className="text-[12px] font-light leading-relaxed text-muted"
            >
              · {line}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col justify-center">
        {order.status === "paid" ? (
          <div className="border border-border p-6 text-center sm:p-8">
            <p className="font-display text-2xl text-foreground">
              Pago confirmado
            </p>
            <p className="mt-3 text-sm font-light text-muted">
              Gracias — te contactamos para retiro o delivery.
            </p>
            <Link
              href="/"
              className="mt-8 inline-block min-h-11 text-[11px] uppercase tracking-[0.22em] text-muted transition-opacity hover:opacity-50"
            >
              Volver al inicio
            </Link>
          </div>
        ) : done ? (
          <div className="border border-border p-5 text-center sm:p-8">
            <p className="font-display text-2xl text-foreground">
              Comprobante recibido
            </p>
            <p className="mt-3 text-sm font-light leading-relaxed text-muted">
              Estamos revisando tu pago. Estado:{" "}
              <span className="text-foreground">
                {STATUS_LABEL[order.status]}
              </span>
              .
            </p>

            {hasReceipt ? (
              <div className="mx-auto mt-5 max-w-sm overflow-hidden border border-border">
                {receiptIsImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={receiptUrl}
                    alt="Comprobante subido"
                    className="max-h-56 w-full object-contain"
                  />
                ) : (
                  <a
                    href={receiptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-h-14 items-center justify-center px-4 text-[11px] uppercase tracking-[0.16em] text-muted underline-offset-4 hover:underline"
                  >
                    Ver PDF subido
                  </a>
                )}
              </div>
            ) : null}

            <div className="mt-8 flex flex-col gap-3">
              <a
                href={`${PAYMENT_CONFIG.whatsappSupport}?text=${encodeURIComponent(
                  `Hola Simplicity, subí el comprobante del pedido ${order.id}`,
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-11 items-center justify-center text-[11px] uppercase tracking-[0.2em] text-muted transition-opacity hover:opacity-50"
              >
                Dudas por WhatsApp
              </a>
              <Link
                href="/"
                className="flex min-h-11 items-center justify-center text-[11px] uppercase tracking-[0.22em] text-muted transition-opacity hover:opacity-50"
              >
                Seguir comprando
              </Link>
            </div>
          </div>
        ) : (
          <form
            onSubmit={onUpload}
            className="space-y-5 border border-border p-4 sm:space-y-6 sm:p-8"
          >
            <div>
              <p className="text-[10px] font-light uppercase tracking-[0.28em] text-muted">
                Comprobante
              </p>
              <h2 className="mt-2 font-display text-2xl text-foreground">
                Subí tu captura
              </h2>
              <p className="mt-2 text-sm font-light text-muted">
                En el celu: tomá foto o elegí de la galería. Revisá el preview
                antes de enviar.
              </p>
            </div>

            <ReceiptUpload
              file={file}
              onFile={(next) => {
                setFile(next);
                setError("");
              }}
              disabled={uploading}
              error={error}
            />

            <button
              type="submit"
              disabled={uploading || !file}
              className="flex min-h-14 w-full items-center justify-center bg-foreground text-[11px] font-light uppercase tracking-[0.22em] text-background transition-opacity hover:opacity-80 active:opacity-80 disabled:opacity-40"
            >
              {uploading ? "Subiendo…" : "Enviar comprobante"}
            </button>

            <a
              href={`${PAYMENT_CONFIG.whatsappSupport}?text=${encodeURIComponent(
                `Hola, tengo una duda sobre el pago del pedido ${order.id}`,
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-11 items-center justify-center text-center text-[10px] uppercase tracking-[0.2em] text-muted transition-opacity hover:opacity-50"
            >
              ¿Problema? Escribinos por WhatsApp
            </a>
          </form>
        )}

        <div className="mt-8 space-y-3 border-t border-border pt-6">
          <p className="text-[10px] uppercase tracking-[0.22em] text-muted">
            Resumen
          </p>
          {order.items.map((item) => (
            <div
              key={item.key}
              className="flex justify-between gap-4 text-[12px] font-light text-foreground"
            >
              <span className="min-w-0 truncate">
                {item.title}
                {item.optionLabel ? ` · ${item.optionLabel}` : ""} ×
                {item.quantity}
              </span>
              <span className="shrink-0 text-muted">
                {formatPriceBob(item.price * item.quantity)}
              </span>
            </div>
          ))}
          {order.customer.fulfillment === "delivery" ? (
            <p className="pt-2 text-[11px] font-light leading-relaxed text-muted">
              Envío: lo pagás directo al motociclista del delivery (no incluido
              en este total).
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
