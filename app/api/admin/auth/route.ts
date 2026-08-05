import { NextResponse } from "next/server";
import { isValidAdminPin } from "@/lib/admin-auth";

export const runtime = "nodejs";

/** Valida el PIN admin sin exponer datos. */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    pin?: string;
  } | null;
  const pin = body?.pin ?? request.headers.get("x-admin-pin") ?? "";
  if (!isValidAdminPin(pin)) {
    return NextResponse.json({ ok: false, error: "PIN incorrecto" }, { status: 401 });
  }
  return NextResponse.json({ ok: true });
}
