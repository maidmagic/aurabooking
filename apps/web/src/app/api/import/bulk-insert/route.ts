import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

function sanitizePhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (digits.length >= 10 && !digits.startsWith("1")) return `+${digits}`;
  if (digits.length >= 11) return `+${digits}`;
  return null;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { contacts, file_name } = body;

  if (!Array.isArray(contacts) || contacts.length === 0) {
    return NextResponse.json({ error: "contacts array required" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Create import record
  const { data: importRecord } = await admin
    .from("imports")
    .insert({
      user_id: user.id,
      status: "processing",
      total_rows: contacts.length,
      file_name: file_name || null,
    })
    .select("id")
    .single();

  const importId = importRecord?.id;
  let imported = 0;
  let duplicatesSkipped = 0;
  let invalid = 0;

  for (const contact of contacts) {
    const name = (contact.first_name || contact.name || "").trim();
    const phoneRaw = (contact.phone || contact.phone_number || "").trim();

    if (!name || !phoneRaw) {
      invalid++;
      continue;
    }

    const phone = sanitizePhone(phoneRaw);
    if (!phone) {
      invalid++;
      continue;
    }

    const email = (contact.email || "").trim() || null;
    const message = (contact.notes || contact.message || contact.comments || "").trim() || null;

    // Dedup by phone
    const { data: existing } = await admin
      .from("conversations")
      .select("id")
      .eq("user_id", user.id)
      .eq("customer_phone", phone)
      .maybeSingle();

    if (existing) {
      duplicatesSkipped++;
      continue;
    }

    await admin.from("conversations").insert({
      user_id: user.id,
      customer_name: name,
      customer_phone: phone,
      email,
      channel: "import",
      status: "new",
      ai_active: true,
    });

    imported++;
  }

  if (importId) {
    await admin
      .from("imports")
      .update({
        status: "completed",
        processed_rows: imported,
        failed_rows: invalid + duplicatesSkipped,
      })
      .eq("id", importId);
  }

  return NextResponse.json({
    success: true,
    import_id: importId,
    total: contacts.length,
    imported,
    duplicates_skipped: duplicatesSkipped,
    invalid,
  });
}

export const dynamic = "force-dynamic";
