import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export async function POST(req: Request) {
  try {
    const { email, subject, description, pageUrl } = await req.json();

    if (!email || !description) {
      return NextResponse.json(
        { error: "Email and description are required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { error: dbError } = await supabase.from("feedback_logs").insert({
      user_email: email,
      subject: subject || "",
      description,
      page_url: pageUrl || null,
    });

    if (dbError) {
      console.error("Failed to store feedback:", dbError);
    }

    if (resend && process.env.FEEDBACK_EMAIL_TO) {
      await resend.emails.send({
        from: process.env.FEEDBACK_EMAIL_FROM || "feedback@aurabooking.com",
        to: process.env.FEEDBACK_EMAIL_TO,
        subject: `[AuraBooking Feedback] ${subject || "Bug Report"}`,
        html: `
          <h2>New Feedback</h2>
          <p><strong>From:</strong> ${email}</p>
          <p><strong>Subject:</strong> ${subject || "N/A"}</p>
          <p><strong>Page:</strong> ${pageUrl || "N/A"}</p>
          <hr />
          <p>${description.replace(/\n/g, "<br />")}</p>
        `,
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Feedback submission error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
