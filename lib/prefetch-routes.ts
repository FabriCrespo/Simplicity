/** Rutas de tienda a precargar en idle. */
export const SHOP_PREFETCH_ROUTES = ["/", "/checkout"] as const;

/** Rutas del admin a precargar al entrar al panel. */
export const ADMIN_PREFETCH_ROUTES = [
  "/admin",
  "/admin/pedidos",
  "/admin/envios",
  "/admin/productos",
  "/admin/stock",
] as const;
