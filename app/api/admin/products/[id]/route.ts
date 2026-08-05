import { NextResponse } from "next/server";
import { requireAdminPin } from "@/lib/admin-auth";
import {
  getProductById,
  updateProduct,
  type ProductOptionGroup,
  type ProductPatch,
} from "@/lib/products-store";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const denied = requireAdminPin(request);
  if (denied) return denied;

  const { id } = await params;
  const product = await getProductById(id);
  if (!product) {
    return NextResponse.json(
      { error: "Producto no encontrado" },
      { status: 404 },
    );
  }
  return NextResponse.json({ product });
}

export async function PATCH(request: Request, { params }: Params) {
  const denied = requireAdminPin(request);
  if (denied) return denied;

  const { id } = await params;
  try {
    const body = (await request.json()) as ProductPatch;
    const patch: ProductPatch = {};

    if (body.title !== undefined) patch.title = String(body.title).trim();
    if (body.description !== undefined) {
      patch.description = String(body.description);
    }
    if (body.category !== undefined) {
      patch.category = String(body.category).trim();
    }
    if (body.price !== undefined) patch.price = Number(body.price);
    if (body.originalPrice !== undefined) {
      patch.originalPrice = Number(body.originalPrice);
    }
    if (body.featured !== undefined) patch.featured = Boolean(body.featured);
    if (body.type !== undefined) patch.type = String(body.type);
    if (body.handleStock !== undefined) {
      patch.handleStock = Boolean(body.handleStock);
    }
    if (body.currentStock !== undefined) {
      patch.currentStock = Math.max(0, Number(body.currentStock));
    }
    if (body.position !== undefined) patch.position = Number(body.position);
    if (body.images !== undefined && Array.isArray(body.images)) {
      patch.images = body.images.filter(
        (u): u is string => typeof u === "string" && u.trim().length > 0,
      );
    }
    if (body.options !== undefined && Array.isArray(body.options)) {
      patch.options = body.options as ProductOptionGroup[];
    }

    const product = await updateProduct(id, patch);
    if (!product) {
      return NextResponse.json(
        { error: "Producto no encontrado" },
        { status: 404 },
      );
    }
    return NextResponse.json({ product });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "No se pudo actualizar";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
