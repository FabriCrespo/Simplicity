export const ADMIN_PIN_KEY = "simplicity-admin-pin";

export function getAdminPin(): string {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem(ADMIN_PIN_KEY) ?? "";
}

export function setAdminPin(pin: string) {
  sessionStorage.setItem(ADMIN_PIN_KEY, pin);
}

export function clearAdminPin() {
  sessionStorage.removeItem(ADMIN_PIN_KEY);
}

export function adminHeaders(extra?: HeadersInit): HeadersInit {
  return {
    "x-admin-pin": getAdminPin(),
    ...extra,
  };
}
