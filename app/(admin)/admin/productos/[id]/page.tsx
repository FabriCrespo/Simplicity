import { AdminProductEdit } from "@/components/admin/AdminProductEdit";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function AdminProductoEditPage({ params }: Props) {
  const { id } = await params;
  return <AdminProductEdit productId={id} />;
}
