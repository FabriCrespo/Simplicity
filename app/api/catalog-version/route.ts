/**
 * Catalog version cookie — tiny route so we don't load products.json in middleware.
 */

import { NextResponse } from "next/server";
import { CATALOG_VERSION } from "@/lib/catalog";

export const dynamic = "force-static";
export const revalidate = false;

export async function GET() {
  const response = NextResponse.json({ version: CATALOG_VERSION });
  response.cookies.set("simplicity_catalog_v", CATALOG_VERSION, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
  });
  response.headers.set(
    "Cache-Control",
    "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
  );
  return response;
}
