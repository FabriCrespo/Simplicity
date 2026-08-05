/** Helpers seguros para cliente (sin fs). */

export function isReceiptImage(filename: string) {
  return /\.(jpe?g|png|webp|heic|heif)$/i.test(filename);
}

/** URL relativa protegida (requiere token o admin). */
export function receiptApiPath(orderId: string, token?: string) {
  const base = `/api/orders/${encodeURIComponent(orderId)}/receipt`;
  if (!token) return base;
  return `${base}?t=${encodeURIComponent(token)}`;
}
