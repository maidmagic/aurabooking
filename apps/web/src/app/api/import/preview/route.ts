import { NextResponse } from "next/server";
import Papa from "papaparse";

const FIELD_MAPPING: Record<string, string[]> = {
  customer_name: ["name", "full name", "full_name", "first name", "first_name", "last name", "last_name", "client", "patient", "contact", "customer"],
  customer_phone: ["phone", "mobile", "cell", "phone number", "phone_number", "telephone", "cell phone", "cell_phone", "mobile phone", "mobile_phone", "contact number", "contact_number", "ph"],
  email: ["email", "e-mail", "email address", "email_address", "mail", "e mail"],
  message: ["notes", "note", "comments", "comment", "message", "description", "details"],
};

function autoMap(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  const headerLower = headers.map((h) => h.toLowerCase().trim());

  for (const [field, aliases] of Object.entries(FIELD_MAPPING)) {
    for (const alias of aliases) {
      const idx = headerLower.findIndex(
        (h) => h === alias || h.includes(alias) || alias.includes(h)
      );
      if (idx !== -1) {
        mapping[field] = headers[idx];
        break;
      }
    }
  }

  return mapping;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { csv_text } = body;

    if (!csv_text || typeof csv_text !== "string") {
      return NextResponse.json({ error: "CSV text is required" }, { status: 400 });
    }

    const result = Papa.parse(csv_text, { header: true, skipEmptyLines: true });

    if (result.errors.length > 0 && result.data.length === 0) {
      return NextResponse.json({ error: "Failed to parse CSV", details: result.errors[0] }, { status: 400 });
    }

    const headers = result.meta.fields ?? [];
    const preview = result.data.slice(0, 5);
    const totalRows = result.data.length;
    const autoMapping = autoMap(headers);

    return NextResponse.json({
      headers,
      preview,
      total_rows: totalRows,
      auto_mapping: autoMapping,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to parse CSV" }, { status: 400 });
  }
}

export const dynamic = "force-dynamic";
