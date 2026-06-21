import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function AdminBusinessesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.user_metadata?.role !== "super_admin") redirect("/admin/login");

  const admin = createAdminClient();
  const { data: businesses } = await admin
    .from("users")
    .select("id, email, company_name, phone, industry, is_active, business_description")
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen bg-stone-50 p-8">
      <div className="mx-auto max-w-5xl">
        <h1 className="font-editorial text-3xl text-stone-900">All Businesses</h1>
        <p className="mt-1 text-sm text-stone-500">{businesses?.length ?? 0} companies registered</p>

        <div className="mt-6 space-y-2">
          {(businesses ?? []).map((b) => (
            <Link
              key={b.id}
              href={`/admin/businesses/${b.id}`}
              className="flex items-center justify-between rounded-lg border border-stone-200 bg-white px-5 py-4 transition hover:border-stone-300 hover:shadow-sm"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-stone-900">{b.company_name || "Unnamed Business"}</span>
                  {!b.is_active && (
                    <span className="rounded bg-stone-100 px-2 py-0.5 text-xs text-stone-500">inactive</span>
                  )}
                </div>
                <div className="mt-0.5 text-sm text-stone-500">
                  {b.email} &middot; {b.industry || "no industry"} &middot; {b.phone || "no phone"}
                </div>
              </div>
              <svg className="h-4 w-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
          {(!businesses || businesses.length === 0) && (
            <p className="py-8 text-center text-stone-400">No businesses registered yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
