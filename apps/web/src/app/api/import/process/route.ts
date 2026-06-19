import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Papa from "papaparse";

function sanitizePhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (digits.length >= 11 && digits.startsWith("1")) return `+${digits}`;
  if (digits.length >= 10 && !digits.startsWith("1")) return `+${digits}`;
  return null;
}

function isPhoneValid(phone: string): boolean {
  const sanitized = sanitizePhone(phone);
  return sanitized !== null && sanitized.length >= 12;
}

interface ImportRow {
  customer_name: string;
  customer_phone: string | null;
  email?: string | null;
  message?: string | null;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { csv_text, mapping, file_name } = body;

  if (!csv_text || !mapping) {
    return NextResponse.json({ error: "csv_text and mapping required" }, { status: 400 });
  }

  const parsed = Papa.parse(csv_text, { header: true, skipEmptyLines: true });
  const rows: ImportRow[] = [];

  let invalidCount = 0;
  let duplicateCount = 0;

  for (const row of parsed.data as Record<string, string>[]) {
    const name = mapping.customer_name ? (row[mapping.customer_name] || "").trim() : "";
    const phoneRaw = mapping.customer_phone ? (row[mapping.customer_phone] || "").trim() : "";
    const email = mapping.email ? (row[mapping.email] || "").trim() : "";
    const message = mapping.message ? (row[mapping.message] || "").trim() : "";

    if (!name || !phoneRaw) {
      invalidCount++;
      continue;
    }

    const phone = sanitizePhone(phoneRaw);
    if (!phone) {
      invalidCount++;
      continue;
    }

    rows.push({ customer_name: name, customer_phone: phone, email: email || null, message: message || null });
  }

  const admin = createAdminClient();

  // Create import record
  const { data: importRecord } = await admin
    .from("imports")
    .insert({
      user_id: user.id,
      status: "processing",
      total_rows: rows.length,
      file_name: file_name || null,
    })
    .select("id")
    .single();

  const importId = importRecord?.id;
  let processed = 0;
  let skipped = 0;

  // Batch insert (check duplicates by phone)
  for (const row of rows) {
    if (!row.customer_phone) continue;

    const { data: existing } = await admin
      .from("conversations")
      .select("id")
      .eq("user_id", user.id)
      .eq("customer_phone", row.customer_phone)
      .maybeSingle();

    if (existing) {
      skipped++;
      continue;
    }

    await admin.from("conversations").insert({
      user_id: user.id,
      customer_name: row.customer_name,
      customer_phone: row.customer_phone,
      channel: "import",
      status: "new",
      ai_active: true,
    });

    processed++;
  }

  // Update import status
  if (importId) {
    await admin
      .from("imports")
      .update({
        status: "completed",
        processed_rows: processed,
        failed_rows: invalidCount,
      })
      .eq("id", importId);
  }

  return NextResponse.json({
    success: true,
    import_id: importId,
    total: rows.length,
    imported: processed,
    duplicates_skipped: skipped,
    invalid: invalidCount,
  });
}

export const dynamic = "force-dynamic";
