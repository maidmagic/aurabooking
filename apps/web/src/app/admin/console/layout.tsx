import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AdminConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.user_metadata?.role !== "super_admin") {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="flex items-center gap-4 border-b border-stone-200 bg-white px-6 py-3 text-sm">
        <span className="font-editorial text-base text-stone-900">AuraBooking Admin</span>
        <a href="/admin/console" className="ml-4 text-stone-500 hover:text-stone-800">Dashboard</a>
        <a href="/admin/businesses" className="text-stone-500 hover:text-stone-800">Businesses</a>
        <a href="/admin/console/customers" className="text-stone-500 hover:text-stone-800">Customers</a>
      </nav>
      {children}
    </div>
  );
}
