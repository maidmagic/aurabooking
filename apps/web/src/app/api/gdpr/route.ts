import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export async function POST(req: Request) {
  try {
    const { email, phone, name, requestType, details } = await req.json();

    if (!email || !name || !requestType) {
      return NextResponse.json(
        { error: "Email, name, and request type are required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { error: dbError } = await supabase.from("data_deletion_requests").insert({
      request_type: requestType,
      full_name: name,
      email,
      phone: phone || null,
      details: details || "",
      status: "pending",
    });

    if (dbError) {
      console.error("Failed to store GDPR request:", dbError);
      return NextResponse.json(
        { error: "Failed to submit request" },
        { status: 500 }
      );
    }

    if (resend && process.env.GDPR_EMAIL_TO) {
      await resend.emails.send({
        from:
          process.env.GDPR_EMAIL_FROM || "gdpr@aurabooking.com",
        to: process.env.GDPR_EMAIL_TO,
        subject: `[AuraBooking GDPR] ${requestType} request from ${name}`,
        html: `
          <h2>New Data Subject Request</h2>
          <p><strong>Type:</strong> ${requestType}</p>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Phone:</strong> ${phone || "N/A"}</p>
          <hr />
          <p><strong>Details:</strong></p>
          <p>${(details || "N/A").replace(/\n/g, "<br />")}</p>
        `,
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("GDPR request error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
