import type { Metadata } from "next";
import { AdminApp } from "@/components/admin/AdminShell";

export const metadata: Metadata = {
  title: "Admin — Simplicity",
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <AdminApp>{children}</AdminApp>
    </div>
  );
}
