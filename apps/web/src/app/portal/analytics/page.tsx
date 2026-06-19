import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function getWeekBounds(): { start: string; end: string } {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { start: monday.toISOString(), end: sunday.toISOString() };
}

export default async function PortalAnalytics() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return <p className="py-16 text-center text-xs text-gray-300">Sign in to view analytics</p>;
  }

  const admin = createAdminClient();
  const { start, end } = getWeekBounds();

  const { count: bookingsThisWeek } = await admin
    .from("appointments")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("start_time", start)
    .lte("start_time", end)
    .neq("status", "cancelled");

  const { data: weekAppointments } = await admin
    .from("appointments")
    .select("service_id, services!inner(price)")
    .eq("user_id", user.id)
    .gte("start_time", start)
    .lte("start_time", end)
    .neq("status", "cancelled");

  const totalRevenue = (weekAppointments ?? []).reduce(
    (sum, apt) => sum + Number((apt.services as any)?.price || 0),
    0,
  );

  const { count: totalConversations } = await admin
    .from("conversations")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  const { count: aiBookings } = await admin
    .from("conversations")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("status", "booked");

  return (
    <div>
      <div className="mb-10">
        <h1 className="font-serif text-2xl tracking-tight text-gray-900">Analytics</h1>
        <p className="mt-1 text-sm text-gray-400">Your business at a glance</p>
      </div>

      {/* Hero metrics */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="rounded-2xl border border-gray-100 bg-white p-8">
          <p className="text-xs font-medium uppercase tracking-widest text-gray-300">
            Appointments Booked This Week
          </p>
          <p className="mt-3 font-serif text-5xl tracking-tight text-gray-900">
            {bookingsThisWeek ?? 0}
          </p>
          <div className="mt-4 h-1 w-full rounded-full bg-gray-50">
            <div
              className="h-1 rounded-full bg-gray-900 transition-all"
              style={{ width: `${Math.min(((bookingsThisWeek ?? 0) / 20) * 100, 100)}%` }}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-8">
          <p className="text-xs font-medium uppercase tracking-widest text-gray-300">
            Estimated Revenue
          </p>
          <p className="mt-3 font-serif text-5xl tracking-tight text-gray-900">
            ${totalRevenue.toFixed(0)}
          </p>
          <p className="mt-2 text-xs text-gray-300">
            This week
          </p>
        </div>
      </div>

      {/* Secondary metrics */}
      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-50 bg-white p-6">
          <p className="text-[11px] font-medium uppercase tracking-widest text-gray-300">
            Total Conversations
          </p>
          <p className="mt-2 font-serif text-2xl tracking-tight text-gray-800">
            {totalConversations ?? 0}
          </p>
        </div>

        <div className="rounded-xl border border-gray-50 bg-white p-6">
          <p className="text-[11px] font-medium uppercase tracking-widest text-gray-300">
            AI Bookings
          </p>
          <p className="mt-2 font-serif text-2xl tracking-tight text-gray-800">
            {aiBookings ?? 0}
          </p>
        </div>

        <div className="rounded-xl border border-gray-50 bg-white p-6">
          <p className="text-[11px] font-medium uppercase tracking-widest text-gray-300">
            Booking Rate
          </p>
          <p className="mt-2 font-serif text-2xl tracking-tight text-gray-800">
            {totalConversations && totalConversations > 0
              ? `${Math.round(((aiBookings ?? 0) / totalConversations) * 100)}%`
              : "—"}
          </p>
        </div>
      </div>

      {/* Quiet footer */}
      <p className="mt-12 text-center text-[10px] uppercase tracking-widest text-gray-200">
        Updated in real-time &middot; AuraBooking
      </p>
    </div>
  );
}
