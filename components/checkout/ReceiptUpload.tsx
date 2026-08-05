"use client";

import { useEffect, useId, useRef, useState } from "react";

const MAX_BYTES = 8 * 1024 * 1024;
const ACCEPT =
  "image/*,image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf,.pdf";

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function isPdf(file: File) {
  return (
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf")
  );
}

function isImage(file: File) {
  return file.type.startsWith("image/") || /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name);
}

/** Comprime fotos grandes para subir más rápido en mobile. */
async function maybeCompressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type.includes("heic") || file.type.includes("heif")) {
    return file;
  }
  if (file.size < 1.2 * 1024 * 1024) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const maxSide = 1600;
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/jpeg", 0.82),
    );
    if (!blob || blob.size >= file.size) return file;

    const base = file.name.replace(/\.[^.]+$/, "") || "comprobante";
    return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
  } catch {
    return file;
  }
}

type Props = {
  file: File | null;
  onFile: (file: File | null) => void;
  disabled?: boolean;
  error?: string;
};

export function ReceiptUpload({ file, onFile, disabled, error }: Props) {
  const cameraId = useId();
  const galleryId = useId();
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const pick = async (list: FileList | null) => {
    const raw = list?.[0];
    if (!raw) return;

    setLocalError("");
    if (raw.size > MAX_BYTES) {
      setLocalError("El archivo supera 8 MB. Probá una foto más liviana.");
      return;
    }
    if (!isImage(raw) && !isPdf(raw)) {
      setLocalError("Usá una foto o un PDF del comprobante.");
      return;
    }

    setPreparing(true);
    try {
      const next = isPdf(raw) ? raw : await maybeCompressImage(raw);
      onFile(next);
    } finally {
      setPreparing(false);
    }
  };

  return (
    <div className="space-y-4">
      {!file ? (
        <div className="space-y-3">
          <div className="border border-dashed border-border px-4 py-8 text-center">
            <p className="font-display text-xl text-foreground">
              Adjuntá el comprobante
            </p>
            <p className="mt-2 text-[12px] font-light text-muted">
              Foto de la captura o PDF · máx. 8 MB
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label
              htmlFor={cameraId}
              className={`flex min-h-14 cursor-pointer items-center justify-center bg-foreground px-4 text-[11px] font-light uppercase tracking-[0.18em] text-background active:opacity-80 ${
                disabled || preparing ? "pointer-events-none opacity-40" : ""
              }`}
            >
              {preparing ? "Preparando…" : "Tomar foto"}
            </label>
            <input
              id={cameraId}
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              disabled={disabled || preparing}
              onChange={(e) => {
                void pick(e.target.files);
                e.target.value = "";
              }}
            />

            <label
              htmlFor={galleryId}
              className={`flex min-h-14 cursor-pointer items-center justify-center border border-border px-4 text-[11px] font-light uppercase tracking-[0.18em] text-foreground active:opacity-60 ${
                disabled || preparing ? "pointer-events-none opacity-40" : ""
              }`}
            >
              Galería / archivo
            </label>
            <input
              id={galleryId}
              ref={galleryRef}
              type="file"
              accept={ACCEPT}
              className="sr-only"
              disabled={disabled || preparing}
              onChange={(e) => {
                void pick(e.target.files);
                e.target.value = "";
              }}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-3 border border-border p-3 sm:p-4">
          <div className="overflow-hidden bg-border/40">
            {isPdf(file) && previewUrl ? (
              <div className="space-y-2">
                <iframe
                  title="Vista previa del PDF"
                  src={previewUrl}
                  className="h-56 w-full bg-background sm:h-72"
                />
                <p className="px-1 text-[11px] font-light text-muted">
                  PDF · {file.name} · {formatBytes(file.size)}
                </p>
              </div>
            ) : previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt="Vista previa del comprobante"
                className="mx-auto max-h-72 w-full object-contain sm:max-h-80"
              />
            ) : (
              <div className="flex h-40 items-center justify-center text-[11px] uppercase tracking-[0.16em] text-muted">
                Archivo listo
              </div>
            )}
          </div>

          {!isPdf(file) ? (
            <p className="truncate text-[11px] font-light text-muted">
              {file.name} · {formatBytes(file.size)}
            </p>
          ) : null}

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={disabled || preparing}
              onClick={() => galleryRef.current?.click()}
              className="flex min-h-12 items-center justify-center border border-border text-[10px] uppercase tracking-[0.16em] text-foreground active:opacity-60 disabled:opacity-40"
            >
              Cambiar
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onFile(null)}
              className="flex min-h-12 items-center justify-center border border-border text-[10px] uppercase tracking-[0.16em] text-muted active:opacity-60 disabled:opacity-40"
            >
              Quitar
            </button>
          </div>

          {/* Hidden inputs keep change flow working after preview */}
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            disabled={disabled || preparing}
            onChange={(e) => {
              void pick(e.target.files);
              e.target.value = "";
            }}
          />
          <input
            ref={galleryRef}
            type="file"
            accept={ACCEPT}
            className="sr-only"
            disabled={disabled || preparing}
            onChange={(e) => {
              void pick(e.target.files);
              e.target.value = "";
            }}
          />
        </div>
      )}

      {localError || error ? (
        <p className="text-sm font-light text-red-700">{localError || error}</p>
      ) : null}
    </div>
  );
}
