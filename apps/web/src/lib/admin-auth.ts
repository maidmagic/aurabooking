import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function requireAdmin(req: NextRequest | Request) {
  const headers = new Headers(req.headers);
  const cookieHeader = headers.get("cookie") || "";

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieHeader.split("; ").map((c) => {
            const [name, ...rest] = c.split("=");
            return { name, value: rest.join("=") };
          }).filter((c) => c.name);
        },
        setAll() {},
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: NextResponse.json({ error: "Not authenticated" }, { status: 401 }) };
  }

  if (user.user_metadata?.role !== "super_admin") {
    return { error: NextResponse.json({ error: "Forbidden — admin access required" }, { status: 403 }) };
  }

  return { user, supabase };
}
