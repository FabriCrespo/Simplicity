import { NextResponse } from "next/server";

export const ADMIN_PIN_HEADER = "x-admin-pin";

export function getExpectedAdminPin() {
  return process.env.ADMIN_PIN ?? "simplicity";
}

export function isValidAdminPin(pin: string | null | undefined) {
  return Boolean(pin) && pin === getExpectedAdminPin();
}

export function requireAdminPin(request: Request): NextResponse | null {
  const pin = request.headers.get(ADMIN_PIN_HEADER) ?? "";
  if (!isValidAdminPin(pin)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  return null;
}
