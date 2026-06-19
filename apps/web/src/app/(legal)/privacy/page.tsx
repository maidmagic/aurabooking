export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16 text-sm text-muted-foreground leading-relaxed space-y-6">
      <h1 className="text-3xl font-semibold text-foreground mb-8">Privacy Policy</h1>
      <p className="text-xs text-muted-foreground/60">Last updated: June 18, 2026</p>

      <section className="space-y-4">
        <h2 className="text-lg font-medium text-foreground">1. Introduction</h2>
        <p>
          AuraBooking ("we," "our," or "us") is a SaaS platform that provides AI-powered
          appointment scheduling and SMS communication services to businesses. This Privacy
          Policy explains how we collect, use, disclose, and safeguard your information when
          you use our platform.
        </p>
        <p>
          By using AuraBooking, you agree to the collection and use of information in accordance
          with this policy. If you do not agree, please do not use our services.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium text-foreground">2. Information We Collect</h2>
        <h3 className="text-base font-medium text-foreground">Personal Information</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>Contact Information:</strong> Name, phone number, email address, and business address.</li>
          <li><strong>Account Credentials:</strong> Email and password used to register and log in to your account.</li>
          <li><strong>Payment Information:</strong> Billing details processed through Stripe. We do not store full credit card numbers.</li>
          <li><strong>Conversation Data:</strong> SMS message content, conversation history, and communication metadata sent or received through our platform.</li>
          <li><strong>Calendar Data:</strong> Appointment details, availability, and scheduling information synced via Google Calendar or other integrated services.</li>
        </ul>
        <h3 className="text-base font-medium text-foreground">Automatically Collected Information</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>Usage Data:</strong> How you interact with our platform, including pages visited, features used, and time spent.</li>
          <li><strong>Device Information:</strong> Browser type, operating system, IP address, and device identifiers.</li>
          <li><strong>Log Data:</strong> Server logs, error reports, and debugging information.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium text-foreground">3. How We Use Your Information</h2>
        <p>We use the collected information for the following purposes:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>Service Delivery:</strong> To provide AI-powered SMS communication, appointment scheduling, and customer engagement services.</li>
          <li><strong>AI Processing:</strong> To process conversation data through OpenRouter AI for the purpose of generating automated responses, booking appointments, and answering customer inquiries.</li>
          <li><strong>SMS Communication:</strong> To send appointment reminders, marketing campaigns, and transactional messages via Twilio.</li>
          <li><strong>Payment Processing:</strong> To handle subscriptions and payments through Stripe.</li>
          <li><strong>Customer Support:</strong> To respond to your inquiries and provide technical support.</li>
          <li><strong>Service Improvement:</strong> To analyze usage patterns and improve our platform.</li>
          <li><strong>Legal Compliance:</strong> To comply with applicable laws, regulations, and legal processes, including 10DLC and CTIA requirements.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium text-foreground">4. Third-Party Service Providers</h2>
        <p>We share your information with the following third-party service providers who help us deliver our services:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>Twilio:</strong> SMS sending and receiving. Your phone numbers and message content are processed through Twilio's infrastructure.</li>
          <li><strong>OpenRouter:</strong> AI model access for conversation processing. Message content may be sent to OpenRouter's API for AI response generation.</li>
          <li><strong>Stripe:</strong> Payment processing. Payment information is handled directly by Stripe and is subject to their Privacy Policy.</li>
          <li><strong>Supabase:</strong> Database and authentication infrastructure.</li>
          <li><strong>Google:</strong> Calendar integration for appointment scheduling.</li>
          <li><strong>Vercel:</strong> Hosting and deployment infrastructure.</li>
        </ul>
        <p>
          These providers have access to your personal information only to perform specific tasks
          on our behalf and are contractually obligated not to disclose or use it for any other purpose.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium text-foreground">5. Data Retention</h2>
        <p>
          We retain your personal information for as long as your account is active or as needed
          to provide you with our services. When you cancel your account, we retain your data
          for 30 days before permanent deletion, unless a longer retention period is required by law.
        </p>
        <p>
          Conversation logs and message content are retained for the duration of your subscription
          and for up to 90 days after service termination for dispute resolution purposes.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium text-foreground">6. Data Security</h2>
        <p>
          We implement appropriate technical and organizational security measures to protect your
          personal information, including encryption in transit (TLS) and at rest, access controls,
          and regular security audits. However, no method of transmission over the Internet is
          completely secure, and we cannot guarantee absolute security.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium text-foreground">7. Your Rights</h2>
        <p>Depending on your jurisdiction, you may have the following rights regarding your personal data:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>Access:</strong> Request a copy of the personal data we hold about you.</li>
          <li><strong>Correction:</strong> Request correction of inaccurate or incomplete data.</li>
          <li><strong>Deletion:</strong> Request deletion of your personal data (subject to legal obligations).</li>
          <li><strong>Portability:</strong> Request transfer of your data to another service provider.</li>
          <li><strong>Objection:</strong> Object to processing of your data for marketing purposes.</li>
          <li><strong>Withdrawal of Consent:</strong> Withdraw consent at any time where we rely on consent as a legal basis.</li>
        </ul>
        <p>
          To exercise these rights, please contact us at privacy@aurabooking.com or submit a request
          through our <a href="/gdpr" className="underline hover:text-foreground">Data Deletion Request page</a>.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium text-foreground">8. CCPA & GDPR Compliance</h2>
        <p>
          If you are a California resident (CCPA) or a resident of the European Economic Area (GDPR),
          you have additional rights regarding your personal data:
        </p>
        <h3 className="text-base font-medium text-foreground">California Residents (CCPA)</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li>Right to know what personal information is collected and how it is used.</li>
          <li>Right to request deletion of personal information.</li>
          <li>Right to opt out of the sale of personal information. We do not sell personal information.</li>
          <li>Right to non-discrimination for exercising your CCPA rights.</li>
        </ul>
        <h3 className="text-base font-medium text-foreground">EEA Residents (GDPR)</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li>Data processed on the basis of consent, contract, or legitimate interest.</li>
          <li>Right to lodge a complaint with your supervisory authority.</li>
          <li>Data transferred to the US is safeguarded through Standard Contractual Clauses.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium text-foreground">9. Cookies</h2>
        <p>
          We use essential cookies for authentication and session management. We may also use
          analytics cookies to understand how our platform is used. You can control cookie
          preferences through your browser settings.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium text-foreground">10. Children's Privacy</h2>
        <p>
          Our services are not directed to individuals under the age of 18. We do not knowingly
          collect personal information from children. If we become aware that a child has provided
          us with personal information, we will take steps to delete it.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium text-foreground">11. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. We will notify you of any material
          changes by posting the new policy on this page and updating the "Last updated" date.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium text-foreground">12. Contact Us</h2>
        <p>
          If you have any questions or concerns about this Privacy Policy, please contact us at:<br />
          Email: privacy@aurabooking.com
        </p>
      </section>
    </div>
  );
}
