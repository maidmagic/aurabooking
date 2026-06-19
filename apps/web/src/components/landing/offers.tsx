const offers = [
  {
    title: "White-Glove Setup",
    desc: "We personally ingest your service menu, pricing, hours, and calendar rules. You don't configure a thing — just tell us how you run, and we make the AI match it perfectly.",
    highlight: "Done-For-You Onboarding",
  },
  {
    title: "The Usage Trial",
    desc: "No 14-day clock. You get the first 50 conversations free. We want you addicted to the time savings before a paywall ever appears.",
    highlight: "First 50 Conversations Free",
  },
  {
    title: "Tiered Pricing",
    desc: "Starter at $49/mo for solo operators (up to 100 conversations). Growth at $99/mo for multi-staff locations with advanced routing and higher limits. You only pay for the scale you need.",
    highlight: "Starter $49 — Growth $99",
  },
  {
    title: "The ROI Guarantee",
    desc: "If the app doesn't recover at least 5 appointments your first month, you don't pay. No fine print, no questions asked. The math has to work for you.",
    highlight: "5 Appointments or It's Free",
  },
];

export function Offers() {
  return (
    <section className="py-32 px-6 bg-white">
      <div className="max-w-7xl mx-auto">
        <h2 className="font-editorial text-4xl text-center mb-4">
          No-risk offers. Real results.
        </h2>
        <p className="text-slate-500 text-center font-light mb-20 max-w-xl mx-auto">
          Every part of this is built to eliminate the risk of switching.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {offers.map((offer) => (
            <div
              key={offer.title}
              className="p-10 rounded-3xl bg-[#FAFAFA] border border-slate-100 hover:shadow-lg transition-shadow duration-500"
            >
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                {offer.highlight}
              </span>
              <h3 className="text-xl font-medium tracking-tight mt-6 mb-4">
                {offer.title}
              </h3>
              <p className="text-slate-500 font-light leading-relaxed">
                {offer.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
