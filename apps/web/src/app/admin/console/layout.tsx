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
      {children}
    </div>
  );
}
