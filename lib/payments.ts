/**
 * Fase A — pago QR estático.
 * Reemplazá `public/qr-pago.png` con el QR real del banco del cliente.
 */
export const PAYMENT_CONFIG = {
  qrImage: "/qr-pago.svg",
  bankLabel: "QR Simple — cuenta Simplicity",
  accountHolder: "Simplicity Bolivia",
  /** Texto extra bajo el QR (cuenta, banco, etc.) */
  footnotes: [
    "Escaneá con la app de tu banco (QR Simple).",
    "Usá el código del pedido como referencia / glosa si el banco lo pide.",
    "Después subí el comprobante en esta misma página.",
  ],
  whatsappSupport: "https://wa.me/59177957266",
} as const;
