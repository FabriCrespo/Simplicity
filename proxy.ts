import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** Bloquea acceso directo a comprobantes en /public. */
export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/uploads/receipts")) {
    return new NextResponse("Not found", { status: 404 });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/uploads/receipts/:path*"],
};
