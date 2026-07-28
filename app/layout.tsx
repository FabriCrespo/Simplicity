import type { Metadata } from "next";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import { CartRoot } from "@/components/cart/CartRoot";
import { CatalogWarmup } from "@/components/CatalogWarmup";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { SignatureEffects } from "@/components/SignatureEffects";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Simplicity — Ropa con intención",
  description: "Tienda de ropa minimalista. Blanco, negro y lo esencial.",
  icons: {
    icon: [{ url: "/simplicity-logo.jpg", type: "image/jpeg" }],
    apple: [{ url: "/simplicity-logo.jpg", type: "image/jpeg" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${cormorant.variable} ${dmSans.variable} h-full antialiased`}
    >
      <body
        className="min-h-full flex flex-col bg-background text-foreground font-sans"
        suppressHydrationWarning
      >
        <CartRoot>
          <CatalogWarmup />
          <SignatureEffects />
          <Header />
          <main className="flex flex-1 flex-col">{children}</main>
          <Footer />
        </CartRoot>
      </body>
    </html>
  );
}
