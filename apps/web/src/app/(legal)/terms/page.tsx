export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16 text-sm text-muted-foreground leading-relaxed space-y-6">
      <h1 className="text-3xl font-semibold text-foreground mb-8">Terms of Service</h1>
      <p className="text-xs text-muted-foreground/60">Last updated: June 18, 2026</p>

      <section className="space-y-4">
        <h2 className="text-lg font-medium text-foreground">1. Acceptance of Terms</h2>
        <p>
          By accessing or using AuraBooking ("the Platform"), you agree to be bound by these
          Terms of Service. If you do not agree to all terms, you may not access or use the Platform.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium text-foreground">2. Description of Service</h2>
        <p>
          AuraBooking is a SaaS platform that provides AI-powered appointment scheduling, SMS
          communication, customer engagement, and related services to businesses. The Platform
          includes automated AI responses, SMS campaign management, appointment booking, and
          integrations with third-party services including Twilio, Google Calendar, and OpenRouter AI.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium text-foreground">3. Account Registration</h2>
        <p>
          To use the Platform, you must create an account. You agree to:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Provide accurate, current, and complete registration information.</li>
          <li>Maintain and promptly update your account information.</li>
          <li>Maintain the security of your account credentials.</li>
          <li>Accept responsibility for all activities that occur under your account.</li>
          <li>Notify us immediately of any unauthorized use of your account.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium text-foreground">4. Acceptable Use Policy</h2>
        <p className="font-medium text-foreground">
          You may not use the Platform for any unlawful purpose or in violation of any applicable
          laws or regulations, including but not limited to:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>Spam Prohibition:</strong> You may not use the Platform to send unsolicited
          commercial messages (spam), bulk marketing messages without proper consent, or any
          communication that violates the CTIA guidelines, 10DLC regulations, or the
          Telephone Consumer Protection Act (TCPA).</li>
          <li><strong>Harassment:</strong> You may not use the Platform to harass, threaten,
          or abuse any individual.</li>
          <li><strong>Fraud:</strong> You may not use the Platform for fraudulent activities
          or deceptive practices.</li>
          <li><strong>Illegal Content:</strong> You may not transmit any content that is illegal,
          obscene, defamatory, or infringes on the rights of others.</li>
          <li><strong>Opt-Out Violations:</strong> You must honor all opt-out requests (e.g.,
          "STOP" replies) immediately and may not send further messages to opted-out numbers.</li>
        </ul>
        <p className="font-medium text-foreground">
          Violation of this Acceptable Use Policy may result in immediate suspension or
          termination of your account without refund.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium text-foreground">5. Third-Party Services</h2>
        <p>
          The Platform integrates with third-party services including Twilio (SMS), OpenRouter (AI),
          Stripe (payments), Google (calendar), and Supabase (database). Your use of these services
          is subject to their respective terms of service and privacy policies. We are not responsible
          for the operation or availability of third-party services.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium text-foreground">6. AI Services</h2>
        <p>
          AuraBooking uses AI models accessed through OpenRouter to generate automated responses
          to customer inquiries. You acknowledge that:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>AI-generated responses may not always be accurate or appropriate.</li>
          <li>You are responsible for reviewing and monitoring AI interactions with your customers.</li>
          <li>You must have a human oversight mechanism in place for AI communications.</li>
          <li>We are not liable for any damages arising from AI-generated content.</li>
          <li>You may disable AI features at any time through your account settings.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium text-foreground">7. Payment Terms</h2>
        <p>
          Subscription fees are billed in advance on a monthly basis. All payments are processed
          securely through Stripe. By subscribing, you authorize us to charge your payment method
          on the agreed billing cycle.
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Fees are non-refundable except as required by law.</li>
          <li>We may change our fees with 30 days&apos; notice.</li>
          <li>Failure to pay may result in account suspension.</li>
          <li>You are responsible for all applicable taxes.</li>
          <li>Overage charges for usage beyond plan limits will be billed monthly.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium text-foreground">8. Cancellation and Termination</h2>
        <p>
          You may cancel your subscription at any time through your account settings or by
          contacting support. Upon cancellation:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Your account will remain active until the end of the current billing period.</li>
          <li>No prorated refunds will be issued for partial months.</li>
          <li>Your data will be retained for 30 days after cancellation.</li>
          <li>After 30 days, your data will be permanently deleted.</li>
        </ul>
        <p>
          We reserve the right to suspend or terminate your account immediately, without prior
          notice or liability, for:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Violation of these Terms of Service.</li>
          <li>Violation of the Acceptable Use Policy, including spam or 10DLC violations.</li>
          <li>Fraudulent or illegal activity.</li>
          <li>Non-payment of fees.</li>
          <li>Any conduct that we deem harmful to the Platform or other users.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium text-foreground">9. Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by law, AuraBooking shall not be liable for any indirect,
          incidental, special, consequential, or punitive damages arising out of or relating to your
          use of the Platform. Our total liability for any claim arising from these terms or the
          Platform shall not exceed the total amount paid by you to us in the 12 months preceding
          the event giving rise to the liability.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium text-foreground">10. Disclaimer of Warranties</h2>
        <p>
          The Platform is provided on an "as is" and "as available" basis without warranties of
          any kind, either express or implied. We do not warrant that the Platform will be
          uninterrupted, error-free, secure, or free from viruses or other harmful components.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium text-foreground">11. Data Protection</h2>
        <p>
          Our handling of your personal data is governed by our Privacy Policy. You retain ownership
          of all data you submit to the Platform. You grant us a limited license to process this data
          solely for the purpose of providing our services.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium text-foreground">12. Governing Law</h2>
        <p>
          These Terms shall be governed by and construed in accordance with the laws of the State of
          Delaware, without regard to its conflict of law provisions. Any disputes arising from these
          terms shall be resolved exclusively in the courts of Delaware.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium text-foreground">13. Changes to Terms</h2>
        <p>
          We reserve the right to modify these terms at any time. We will notify users of material
          changes via email or through the Platform. Continued use of the Platform after changes
          constitutes acceptance of the new terms.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium text-foreground">14. Contact</h2>
        <p>
          For questions about these Terms, contact us at:<br />
          Email: legal@aurabooking.com
        </p>
      </section>
    </div>
  );
}
