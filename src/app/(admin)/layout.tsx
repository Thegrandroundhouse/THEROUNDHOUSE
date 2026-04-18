import AdminGuard from "@/components/auth/AdminGuard";
import AdminShell from "@/components/admin/AdminShell";
import { AdminDialogProvider } from "@/components/admin/AdminDialogContext";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminGuard>
      <AdminDialogProvider>
        <AdminShell>{children}</AdminShell>
      </AdminDialogProvider>
    </AdminGuard>
  );
}
