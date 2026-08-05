import { getStore, type Store } from "@netlify/blobs";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");

/**
 * En Netlify Functions el FS es read-only (/var/task). Usamos Netlify Blobs.
 * En local y durante el build seguimos con archivos en /data (lectura OK).
 */
export function usesNetlifyBlobs() {
  if (process.env.USE_NETLIFY_BLOBS === "1") return true;
  if (process.env.USE_NETLIFY_BLOBS === "0") return false;
  if (process.env.NETLIFY_BLOBS_CONTEXT) return true;
  if (process.env.AWS_LAMBDA_FUNCTION_NAME) return true;
  // Ruta típica del bundle en Netlify/AWS Lambda
  try {
    if (process.cwd().startsWith("/var/task")) return true;
  } catch {
    // ignore
  }
  return false;
}

function blobStore(name: string): Store {
  const siteID =
    process.env.NETLIFY_SITE_ID || process.env.SITE_ID || undefined;
  const token =
    process.env.NETLIFY_AUTH_TOKEN ||
    process.env.NETLIFY_BLOBS_TOKEN ||
    undefined;

  // En runtime de Netlify suele bastar getStore(name).
  // Si hay credenciales (local/dev), las pasamos explícitas.
  if (siteID && token) {
    return getStore({ name, siteID, token });
  }
  return getStore(name);
}

async function ensureDir(filePath: string) {
  await mkdir(path.dirname(filePath), { recursive: true });
}

export async function readJsonKey<T>(
  key: string,
  fallback: T,
  seedFromDisk?: string,
): Promise<T> {
  if (usesNetlifyBlobs()) {
    const store = blobStore("simplicity-data");
    const value = await store.get(key, { type: "json" });
    if (value != null) return value as T;

    // Primera vez en producción: seedear desde el JSON del deploy (solo lectura).
    if (seedFromDisk) {
      try {
        const raw = await readFile(path.join(DATA_DIR, seedFromDisk), "utf8");
        const parsed = JSON.parse(raw) as T;
        await store.setJSON(key, parsed);
        return parsed;
      } catch {
        await store.setJSON(key, fallback);
        return fallback;
      }
    }

    await store.setJSON(key, fallback);
    return fallback;
  }

  const filePath = path.join(DATA_DIR, `${key}.json`);
  try {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    if (seedFromDisk) {
      try {
        const raw = await readFile(path.join(DATA_DIR, seedFromDisk), "utf8");
        const parsed = JSON.parse(raw) as T;
        await ensureDir(filePath);
        await writeFile(filePath, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
        return parsed;
      } catch {
        // fall through
      }
    }
    await ensureDir(filePath);
    await writeFile(filePath, `${JSON.stringify(fallback, null, 2)}\n`, "utf8");
    return fallback;
  }
}

export async function writeJsonKey<T>(key: string, value: T): Promise<void> {
  if (usesNetlifyBlobs()) {
    const store = blobStore("simplicity-data");
    await store.setJSON(key, value);
    return;
  }

  const filePath = path.join(DATA_DIR, `${key}.json`);
  await ensureDir(filePath);
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function writeBinaryKey(
  key: string,
  bytes: Buffer,
  contentType?: string,
): Promise<void> {
  if (usesNetlifyBlobs()) {
    const store = blobStore("simplicity-receipts");
    const ab = bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength,
    ) as ArrayBuffer;
    await store.set(key, ab, {
      metadata: contentType ? { contentType } : undefined,
    });
    return;
  }

  const filePath = path.join(DATA_DIR, "receipts", key);
  await ensureDir(filePath);
  await writeFile(filePath, bytes);
}

export async function readBinaryKey(key: string): Promise<Buffer | null> {
  if (usesNetlifyBlobs()) {
    const store = blobStore("simplicity-receipts");
    const value = await store.get(key, { type: "arrayBuffer" });
    if (!value) return null;
    return Buffer.from(value);
  }

  try {
    return await readFile(path.join(DATA_DIR, "receipts", key));
  } catch {
    return null;
  }
}

/** Intento de leer un comprobante legacy en /public (solo lectura). */
export async function readLegacyPublicReceipt(
  publicPath: string,
): Promise<Buffer | null> {
  try {
    return await readFile(path.join(process.cwd(), "public", publicPath));
  } catch {
    return null;
  }
}
