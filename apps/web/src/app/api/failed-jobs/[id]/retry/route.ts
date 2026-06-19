import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { sendSMS } from "@/lib/sms/send";
import { logAudit } from "@/lib/audit";

const JOB_HANDLERS: Record<string, (payload: any) => Promise<void>> = {
  send_reminder: async (payload) => {
    const admin = createAdminClient();
    const { data: appointment } = await admin
      .from("appointments")
      .select("customer_phone, start_time, customer_name, user_id")
      .eq("id", payload.appointment_id)
      .single();

    if (!appointment) throw new Error("Appointment not found");

    await sendSMS({
      to: appointment.customer_phone,
      body: `Reminder: ${payload.service} at ${new Date(appointment.start_time).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}. Reply CONFIRM or CANCEL.`,
      type: "RESCUE",
    });
  },

  deposit_followup: async (payload) => {
    const admin = createAdminClient();
    const { data: appointment } = await admin
      .from("appointments")
      .select("customer_phone, user_id")
      .eq("id", payload.appointment_id)
      .single();

    if (!appointment) throw new Error("Appointment not found");

    await sendSMS({
      to: appointment.customer_phone,
      body: `Your appointment time slot is still available but requires a deposit to confirm. Reply or visit your link to complete payment.`,
      type: "RESCUE",
    });
  },
};

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: job } = await admin
    .from("failed_jobs")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  if (job.retry_count >= job.max_retries) {
    return NextResponse.json({ error: "Max retries exceeded" }, { status: 400 });
  }

  const handler = JOB_HANDLERS[job.job_type];
  if (!handler) {
    return NextResponse.json({ error: "Unknown job type" }, { status: 400 });
  }

  try {
    await handler(job.payload);
    await admin.from("failed_jobs").delete().eq("id", id);
    await logAudit({
      userId: user.id,
      action: "job.retried",
      resource: "failed_jobs",
      resourceId: id,
      metadata: { job_type: job.job_type },
    });
    return NextResponse.json({ retried: true });
  } catch (err: any) {
    await admin
      .from("failed_jobs")
      .update({
        retry_count: job.retry_count + 1,
        error: err.message,
        last_error_at: new Date().toISOString(),
      })
      .eq("id", id);

    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
