import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";

function formatBusinessName(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const admin = createAdminClient();
  const { data: page } = await admin.from("legal_pages").select("business_name").eq("slug", slug).maybeSingle();
  const name = page?.business_name || formatBusinessName(slug);
  return {
    title: `${name} — Privacy Policy & Terms`,
    robots: "noindex, nofollow",
  };
}

export default async function LegalPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ name?: string }> }) {
  const { slug } = await params;
  const { name: queryName } = await searchParams;

  const admin = createAdminClient();
  const { data: page } = await admin.from("legal_pages").select("business_name").eq("slug", slug).maybeSingle();
  const businessName = page?.business_name || queryName || formatBusinessName(slug);
  const effectiveDate = "June 1, 2026";

  return (
    <div className="min-h-screen bg-white text-gray-900 antialiased">
      <div className="mx-auto max-w-3xl px-6 py-16 sm:px-8">
        <div className="mb-12 text-center">
          <a href={`https://aurabooking.com`} className="font-serif text-2xl tracking-tight text-gray-600">
            AuraBooking
          </a>
        </div>

        <h1 className="mb-2 text-center font-serif text-3xl tracking-tight sm:text-4xl">
          {businessName}
        </h1>
        <p className="mb-12 text-center text-sm text-gray-500">
          Privacy Policy &amp; Terms of Service &mdash; Effective {effectiveDate}
        </p>

        {/* ─── Privacy Policy ─── */}
        <section className="mb-16">
          <h2 className="mb-6 font-serif text-2xl tracking-tight">Privacy Policy</h2>
          <p className="mb-4 text-sm leading-relaxed text-gray-600">
            This Privacy Policy describes how <strong>{businessName}</strong> (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;)
            collects, uses, and protects information provided by users of our SMS-based appointment scheduling service.
            By using our services, you consent to the practices described in this policy.
          </p>

          <h3 className="mb-2 mt-8 font-semibold text-sm uppercase tracking-wider text-gray-900">1. Information We Collect</h3>
          <p className="mb-4 text-sm leading-relaxed text-gray-600">
            We collect the following information when you interact with our SMS service: your phone number, your name,
            appointment preferences, and any other information you voluntarily provide via text message. We may also
            collect your email address and payment information if required for booking or deposit purposes.
          </p>

          <h3 className="mb-2 mt-8 font-semibold text-sm uppercase tracking-wider text-gray-900">2. How We Use Your Information</h3>
          <p className="mb-4 text-sm leading-relaxed text-gray-600">
            We use the information we collect to: schedule and manage appointments, send appointment reminders via SMS,
            process payments when applicable, respond to your questions and requests, and improve our service quality.
          </p>

          <h3 className="mb-2 mt-8 font-semibold text-sm uppercase tracking-wider text-gray-900">3. Mobile Information — No Third-Party Sharing</h3>
          <p className="mb-4 rounded-md border border-gray-200 bg-gray-50 p-4 text-sm leading-relaxed text-gray-600">
            <strong>IMPORTANT:</strong> Mobile information (phone numbers, SMS conversation contents, and opt-in
            status) collected through our SMS service <strong>will not be shared with third parties or affiliates
            for marketing or promotional purposes.</strong> Your phone number and message data are used exclusively to
            facilitate and confirm appointments between you and {businessName}. We do not sell, rent, or trade your
            mobile information to any third party for their own marketing use.
          </p>
          <p className="mb-4 text-sm leading-relaxed text-gray-600">
            All mobile information is transmitted via encrypted channels and stored securely. Text messaging originator
            opt-in data and consent are not shared with any third parties.
          </p>

          <h3 className="mb-2 mt-8 font-semibold text-sm uppercase tracking-wider text-gray-900">4. Third-Party Service Providers</h3>
          <p className="mb-4 text-sm leading-relaxed text-gray-600">
            We use third-party service providers to operate our SMS infrastructure (Twilio), process payments (Stripe),
            and host our application (Vercel). These providers have access to only the information necessary to perform
            their functions and are contractually obligated to protect your data. Twilio is our mobile information service
            provider and handles message delivery; their privacy policy is available at twilio.com/legal/privacy.
          </p>

          <h3 className="mb-2 mt-8 font-semibold text-sm uppercase tracking-wider text-gray-900">5. Data Retention &amp; Deletion</h3>
          <p className="mb-4 text-sm leading-relaxed text-gray-600">
            We retain your information for as long as necessary to provide our services and comply with legal obligations.
            You may request deletion of your data at any time by contacting us. Upon request, we will delete your
            personal information within 30 days, subject to legal retention requirements.
          </p>

          <h3 className="mb-2 mt-8 font-semibold text-sm uppercase tracking-wider text-gray-900">6. Your Choices</h3>
          <p className="mb-4 text-sm leading-relaxed text-gray-600">
            You may opt out of receiving SMS messages at any time by replying &ldquo;STOP&rdquo; to any message you receive.
            You may also request access to, correction of, or deletion of your personal information by contacting us.
          </p>

          <h3 className="mb-2 mt-8 font-semibold text-sm uppercase tracking-wider text-gray-900">7. Changes to This Policy</h3>
          <p className="mb-4 text-sm leading-relaxed text-gray-600">
            We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated
            effective date. Continued use of our services after changes constitutes acceptance of the updated policy.
          </p>
        </section>

        {/* ─── Terms of Service ─── */}
        <section>
          <h2 className="mb-6 font-serif text-2xl tracking-tight">Terms of Service</h2>
          <p className="mb-4 text-sm leading-relaxed text-gray-600">
            These Terms of Service govern your use of the SMS-based appointment scheduling and communication
            services provided by <strong>{businessName}</strong>. By using our services, you agree to these terms.
          </p>

          <h3 className="mb-2 mt-8 font-semibold text-sm uppercase tracking-wider text-gray-900">1. Service Description</h3>
          <p className="mb-4 text-sm leading-relaxed text-gray-600">
            {businessName} uses an AI-powered SMS receptionist to communicate with customers, answer questions about
            services and availability, schedule appointments, and send reminders. The service is a supplemental
            communication channel and does not replace direct contact with {businessName} staff.
          </p>

          <h3 className="mb-2 mt-8 font-semibold text-sm uppercase tracking-wider text-gray-900">2. SMS Terms</h3>
          <p className="mb-4 text-sm leading-relaxed text-gray-600">
            By providing your phone number, you consent to receive automated SMS messages related to appointment
            scheduling, reminders, and follow-ups. Message frequency varies based on your appointment activity.
            Message and data rates may apply. You can reply &ldquo;STOP&rdquo; at any time to opt out of all messages.
            You can reply &ldquo;HELP&rdquo; for assistance.
          </p>

          <h3 className="mb-2 mt-8 font-semibold text-sm uppercase tracking-wider text-gray-900">3. Appointment &amp; Cancellation Policy</h3>
          <p className="mb-4 text-sm leading-relaxed text-gray-600">
            Appointments scheduled via SMS are subject to {businessName}&rsquo;s standard cancellation policy.
            We recommend confirming appointments at least 24 hours in advance. Late cancellations or no-shows may
            be subject to a fee at {businessName}&rsquo;s discretion.
          </p>

          <h3 className="mb-2 mt-8 font-semibold text-sm uppercase tracking-wider text-gray-900">4. User Responsibilities</h3>
          <p className="mb-4 text-sm leading-relaxed text-gray-600">
            You agree to provide accurate information when scheduling appointments and to not use the service for
            any unlawful purpose. You are responsible for maintaining the confidentiality of your phone number and
            for any activities that occur under your account.
          </p>

          <h3 className="mb-2 mt-8 font-semibold text-sm uppercase tracking-wider text-gray-900">5. Limitation of Liability</h3>
          <p className="mb-4 text-sm leading-relaxed text-gray-600">
            {businessName} provides the SMS service on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis.
            We do not guarantee that the service will be uninterrupted, timely, secure, or error-free. In no event
            shall {businessName} be liable for any indirect, incidental, special, consequential, or punitive damages
            arising out of or related to your use of the SMS service.
          </p>

          <h3 className="mb-2 mt-8 font-semibold text-sm uppercase tracking-wider text-gray-900">6. Intellectual Property</h3>
          <p className="mb-4 text-sm leading-relaxed text-gray-600">
            The AI receptionist technology and underlying software platform are provided by AuraBooking. All
            intellectual property rights in the platform remain with AuraBooking.
          </p>

          <h3 className="mb-2 mt-8 font-semibold text-sm uppercase tracking-wider text-gray-900">7. Changes to Terms</h3>
          <p className="mb-4 text-sm leading-relaxed text-gray-600">
            We reserve the right to modify these terms at any time. Changes will be posted on this page. Continued
            use of the service after changes constitutes acceptance of the modified terms.
          </p>

          <h3 className="mb-2 mt-8 font-semibold text-sm uppercase tracking-wider text-gray-900">8. Contact</h3>
          <p className="mb-4 text-sm leading-relaxed text-gray-600">
            For questions about these terms or our privacy practices, contact {businessName} directly or reach
            AuraBooking at legal@aurabooking.com.
          </p>
        </section>

        <div className="mt-16 border-t border-gray-200 pt-8 text-center text-xs text-gray-400">
          <p>Powered by AuraBooking &mdash; Effective {effectiveDate}</p>
          <p className="mt-1">
            This page is provided as a compliance accommodation for {businessName}&rsquo;s Twilio A2P 10DLC registration.
          </p>
        </div>
      </div>
    </div>
  );
}
