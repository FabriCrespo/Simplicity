"use client";

import { CartProvider } from "@/components/cart/CartProvider";
import { CartSidebar } from "@/components/cart/CartSidebar";

export function CartRoot({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      {children}
      <CartSidebar />
    </CartProvider>
  );
}
