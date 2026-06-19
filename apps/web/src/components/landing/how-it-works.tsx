const steps = [
  {
    number: "01",
    title: "Client texts your number",
    desc: "They send a message asking about availability, pricing, or to book. No app, no account, no friction.",
  },
  {
    number: "02",
    title: "AI recognizes & responds",
    desc: "Returning clients are greeted by name with their history. The AI answers questions, checks your live calendar, and offers available slots.",
  },
  {
    number: "03",
    title: "Slot confirmed instantly",
    desc: "Client picks a time. The appointment is written to your calendar mid-conversation. No double-booking, no cache delay.",
  },
  {
    number: "04",
    title: "Auto-reminder & reschedule",
    desc: "48 hours before, an automated text reminder goes out. Reply RESCHEDULE to pick a new time — no-staff intervention needed.",
  },
];

export function HowItWorks() {
  return (
    <section className="py-32 px-6 bg-[#FAFAFA]">
      <div className="max-w-7xl mx-auto">
        <h2 className="font-editorial text-4xl text-center mb-4">
          How it works.
        </h2>
        <p className="text-slate-500 text-center font-light mb-20 max-w-xl mx-auto">
          One text message does what used to take a phone call, a hold, and a calendar sync.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-16">
          {steps.map((step) => (
            <div key={step.number} className="flex gap-6">
              <span className="font-editorial text-5xl text-slate-200 leading-none shrink-0">
                {step.number}
              </span>
              <div>
                <h3 className="text-xl font-medium tracking-tight mb-2">
                  {step.title}
                </h3>
                <p className="text-slate-500 font-light leading-relaxed">
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
