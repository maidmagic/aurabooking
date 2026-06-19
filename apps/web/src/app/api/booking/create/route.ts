import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = createAdminClient();

  const body = await request.json();
  const { business_id, service_id, provider_id, date, time, first_name, last_name, phone, notes } = body;

  // Rate limit per business (100 bookings per minute)
  if (business_id) {
    const rateCheck = await checkRateLimit(`booking:${business_id}`, 100, 60_000);
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: "Too many booking requests. Please try again later." }, { status: 429 });
    }
  }

  if (!business_id || !service_id || !date || !time || !first_name || !last_name || !phone) {
    return NextResponse.json(
      { error: "business_id, service_id, date, time, first_name, last_name, and phone are required" },
      { status: 400 },
    );
  }

  const { data: service } = await supabase
    .from("services")
    .select("*")
    .eq("id", service_id)
    .eq("user_id", business_id)
    .single();

  if (!service) {
    return NextResponse.json({ error: "Service not found" }, { status: 404 });
  }

  const startTime = new Date(`${date}T${time}:00`);
  const endTime = new Date(startTime.getTime() + service.duration * 60000);

  const { data: existingAppointment } = await supabase
    .from("appointments")
    .select("id")
    .eq("user_id", business_id)
    .eq("start_time", startTime.toISOString())
    .neq("status", "cancelled")
    .maybeSingle();

  if (existingAppointment) {
    return NextResponse.json({ error: "This time slot is no longer available" }, { status: 409 });
  }

  const { data: customerProfile } = await supabase
    .from("customer_profiles")
    .select("id")
    .eq("phone", phone)
    .eq("user_id", business_id)
    .maybeSingle();

  let customerId = customerProfile?.id;

  if (!customerId) {
    const { data: newCustomer } = await supabase
      .from("customer_profiles")
      .insert({
        user_id: business_id,
        name: `${first_name} ${last_name}`,
        phone,
        email: null,
        notes: notes || null,
        sms_opt_in: true,
      })
      .select()
      .single();

    customerId = newCustomer?.id;
  }

  const appointmentData: Record<string, unknown> = {
    user_id: business_id,
    service_id,
    team_member_id: provider_id || null,
    customer_profile_id: customerId || null,
    customer_name: `${first_name} ${last_name}`,
    customer_phone: phone,
    start_time: startTime.toISOString(),
    end_time: endTime.toISOString(),
    status: "confirmed",
    notes: notes || null,
    payment_status: service.deposit_required ? "pending" : "unpaid",
  };

  const { data: appointment, error } = await supabase
    .from("appointments")
    .insert(appointmentData)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const response: Record<string, unknown> = {
    success: true,
    appointment,
    deposit_required: service.deposit_required,
  };

  if (service.deposit_required && service.deposit_amount > 0) {
    response.deposit_amount = service.deposit_amount;
  }

  return NextResponse.json(response);
}
