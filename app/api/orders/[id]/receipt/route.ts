import { NextResponse } from "next/server";
import {
  getOrderById,
  readOrderReceiptBytes,
  saveOrderReceipt,
} from "@/lib/orders";
import { canAccessOrder } from "@/lib/order-access";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

function contentTypeFor(filename: string) {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".heic") || lower.endsWith(".heif")) return "image/heic";
  return "image/jpeg";
}

export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  const order = await getOrderById(id);
  if (!order || !canAccessOrder(request, order)) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  try {
    const receipt = await readOrderReceiptBytes(order);
    if (!receipt) {
      return NextResponse.json({ error: "Sin comprobante" }, { status: 404 });
    }

    return new NextResponse(new Uint8Array(receipt.bytes), {
      headers: {
        "Content-Type": contentTypeFor(receipt.filename),
        "Content-Disposition": `inline; filename="${receipt.filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Comprobante no disponible" },
      { status: 404 },
    );
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const order = await getOrderById(id);
    if (!order || !canAccessOrder(request, order)) {
      return NextResponse.json(
        { error: "Pedido no encontrado" },
        { status: 404 },
      );
    }

    const form = await request.formData();
    const file = form.get("receipt");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Adjuntá el comprobante" },
        { status: 400 },
      );
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const updated = await saveOrderReceipt(id, {
      bytes,
      filename: file.name,
      mimeType: file.type || "application/octet-stream",
    });

    if (!updated) {
      return NextResponse.json(
        { error: "Pedido no encontrado" },
        { status: 404 },
      );
    }

    return NextResponse.json({ order: updated });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "No se pudo subir el comprobante";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
