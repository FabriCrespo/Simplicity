const STORAGE_KEY = "simplicity-broken-images-v1";

function readBroken(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const list = JSON.parse(raw) as string[];
    return new Set(Array.isArray(list) ? list : []);
  } catch {
    return new Set();
  }
}

function writeBroken(urls: Set<string>) {
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([...urls].slice(-400)),
    );
  } catch {
    // ignore quota
  }
}

/** Remember image URLs that 404'd so we can hide those products. */
export function markImageBroken(url: string) {
  if (!url) return;
  const set = readBroken();
  if (set.has(url)) return;
  set.add(url);
  writeBroken(set);
}

export function isImageBroken(url: string): boolean {
  if (!url) return true;
  return readBroken().has(url);
}
