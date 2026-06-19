import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";

function formatBusinessName(slug: string): string {
  return slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const admin = createAdminClient();
  const { data: page } = await admin.from("legal_pages").select("business_name").eq("slug", slug).maybeSingle();
  return {
    title: `${page?.business_name || formatBusinessName(slug)} — Contact Us`,
    robots: "noindex, nofollow",
  };
}

export default async function TwilioProofPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const admin = createAdminClient();
  const { data: legalPage } = await admin.from("legal_pages").select("business_name, slug").eq("slug", slug).maybeSingle();
  const businessName = legalPage?.business_name || formatBusinessName(slug);
  const phoneNumber = "(555) 000-0000";

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-2xl px-6 py-16">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 sm:p-12 shadow-sm">
          {/* Business header */}
          <div className="mb-10 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
              <span className="font-serif text-xl font-bold text-gray-400">
                {businessName.charAt(0)}
              </span>
            </div>
            <h1 className="font-serif text-2xl tracking-tight text-gray-900">{businessName}</h1>
            <p className="mt-1 text-sm text-gray-500">Contact Us</p>
          </div>

          {/* Contact card */}
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-sm text-gray-400 border border-gray-200">
                  📞
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Call Us</p>
                  <p className="text-sm text-gray-900">{phoneNumber}</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-sm text-gray-400 border border-gray-200">
                  💬
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Text Us</p>
                  <p className="text-sm text-gray-900">
                    <span className="font-mono tracking-wider">{phoneNumber}</span>
                    <span className="ml-2 inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                      SMS available
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-gray-400">
                    Text to book appointments, check availability, or ask questions
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-sm text-gray-400 border border-gray-200">
                  📍
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Visit Us</p>
                  <p className="text-sm text-gray-900">123 Main Street, Suite 100</p>
                  <p className="text-xs text-gray-400">City, State 12345</p>
                </div>
              </div>
            </div>
          </div>

          {/* Business hours hint */}
          <div className="mt-6 rounded-xl border border-dashed border-gray-200 bg-gray-50/50 p-4">
            <p className="text-center text-xs text-gray-400">
              Text us anytime — our AI receptionist responds instantly, even after hours.
            </p>
          </div>

          {/* Screenshot metadata */}
          <div className="mt-10 border-t border-gray-100 pt-6">
            <p className="text-center text-[10px] uppercase tracking-widest text-gray-300">
              Twilio A2P 10DLC Proof of Opt-In — {businessName}
            </p>
            <p className="mt-1 text-center text-[10px] text-gray-200">
              The phone number above is advertised on the business&apos;s website and physical storefront.
              End-users opt in by texting this number directly to initiate a booking or inquire about services.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
