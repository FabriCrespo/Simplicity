import { NextResponse } from "next/server";
import { CATALOG_VERSION, searchCatalog } from "@/lib/catalog";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const result = searchCatalog(q, 24);

  const response = NextResponse.json(result, {
    headers: {
      "Cache-Control":
        "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
      "X-Catalog-Version": CATALOG_VERSION,
    },
  });

  response.cookies.set("simplicity_catalog_v", CATALOG_VERSION, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
  });

  return response;
}
