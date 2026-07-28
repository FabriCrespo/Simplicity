export function formatPriceBob(price: number): string {
  return `Bs ${price.toLocaleString("es-BO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
