import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const DEMO_NAMES = [
  "Olivia Chen", "James Miller", "Emma Watson", "Liam Rodriguez",
  "Sophia Kim", "Noah Patel", "Isabella Thompson", "Ethan Brooks",
  "Mia Garcia", "Lucas Adams", "Charlotte Wright", "Benjamin Lee",
];

const DEMO_PHONES = [
  "+14165550101", "+14165550102", "+14165550103", "+14165550104",
  "+14165550105", "+14165550106", "+14165550107", "+14165550108",
  "+14165550109", "+14165550110", "+14165550111", "+14165550112",
];

const SERVICE_NAMES = [
  "Haircut & Styling", "Facial Treatment", "Botox", "Microneedling",
  "Deep Tissue Massage", "Gel Manicure", "Keratin Treatment", "Lip Filler",
];

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  // Support ?reset=true to clear existing data first
  const { searchParams } = new URL(request.url);
  const reset = searchParams.get("reset") === "true";

  const { count: existingClients } = await admin
    .from("customer_profiles")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  if (existingClients && existingClients > 0) {
    if (!reset) {
      return NextResponse.json({
        message: "Seed data already exists. Use ?reset=true to re-seed.",
        clients: existingClients,
      });
    }
    // Clear existing seed data
    await admin.from("appointments").delete().eq("user_id", user.id);
    await admin.from("campaigns").delete().eq("user_id", user.id);
    await admin.from("customer_profiles").delete().eq("user_id", user.id);
  }

  const now = new Date();

  // Build customer profiles with realistic recency
  const customerProfiles = DEMO_NAMES.map((name, i) => {
    const monthsAgo = Math.floor(Math.random() * 14);
    const lastAppt = new Date(now);
    lastAppt.setMonth(lastAppt.getMonth() - monthsAgo);
    return {
      phone: DEMO_PHONES[i],
      user_id: user.id,
      name,
      total_cancellations: Math.floor(Math.random() * 4),
      late_cancellations: Math.floor(Math.random() * 2),
      last_appointment_at: lastAppt.toISOString(),
    };
  });

  const { error: profileError, data: insertedProfiles } = await admin
    .from("customer_profiles")
    .insert(customerProfiles)
    .select();

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  // Get user's existing services if any, to use for appointment service_ids
  const { data: userServices } = await admin
    .from("services")
    .select("id, name")
    .eq("user_id", user.id);

  // Create demo appointments
  const appointments = [];
  for (let i = 0; i < 12; i++) {
    const daysAgo = Math.floor(Math.random() * 60);
    const hour = 9 + Math.floor(Math.random() * 8);
    const apptDate = new Date(now);
    apptDate.setDate(apptDate.getDate() - daysAgo);
    apptDate.setHours(hour, 0, 0, 0);
    const endDate = new Date(apptDate);
    endDate.setHours(endDate.getHours() + 1);

    const profile = insertedProfiles![i % insertedProfiles!.length];
    const service = userServices?.length
      ? userServices[i % userServices.length]
      : null;

    appointments.push({
      user_id: user.id,
      customer_name: profile.name,
      customer_phone: profile.phone,
      service_id: service?.id ?? null,
      start_time: apptDate.toISOString(),
      end_time: endDate.toISOString(),
      status: ["confirmed", "completed", "completed", "completed"][i % 4],
      notes: `Demo appointment ${i + 1}`,
    });
  }

  const { error: apptError } = await admin
    .from("appointments")
    .insert(appointments);

  if (apptError) {
    return NextResponse.json({ error: apptError.message }, { status: 500 });
  }

  // Create demo services if none exist
  if (!userServices?.length) {
    const demoServiceRows = SERVICE_NAMES.map((name) => ({
      user_id: user.id,
      name,
      duration: 30 + Math.floor(Math.random() * 60),
      price: Math.floor(50 + Math.random() * 250),
    }));
    await admin.from("services").insert(demoServiceRows);
  }

  // Create a demo campaign (first one, user can see it in campaigns list)
  const demoCampaigns = [
    {
      user_id: user.id,
      name: "6-Month Recall (Hygiene)",
      type: "reminder",
      message_template: "Hi {{name}}, it's been a while! We have openings this week. Would you like to book your appointment?",
      audience: { raw: "Not seen > 6 mos" },
      schedule: null,
      status: "running",
    },
    {
      user_id: user.id,
      name: "Mother's Day Filler Special",
      type: "promotion",
      message_template: "Hi {{name}}, we're running a Mother's Day special on Botox and fillers. Want to grab a slot?",
      audience: { raw: "Spent > $500" },
      schedule: null,
      status: "completed",
    },
  ];
  const { error: campaignError } = await admin
    .from("campaigns")
    .insert(demoCampaigns);

  return NextResponse.json({
    message: "Seed data created",
    clients: insertedProfiles!.length,
    appointments: appointments.length,
    campaigns: campaignError ? 0 : demoCampaigns.length,
    services: userServices?.length ?? SERVICE_NAMES.length,
  });
}
