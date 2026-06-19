const features = [
  {
    title: "Zero App Friction",
    desc: "60% of booking attempts happen outside business hours. Clients text a number, get an instant conversational response, and secure a slot — no app download, no login, no waiting.",
    span: "col-span-1 md:col-span-2",
  },
  {
    title: "Contextual Memory",
    desc: "Returning customers are greeted by name with their full history — last service, preferred staff member, vaccination records. No duplicate profiles, no awkward repeats.",
    span: "col-span-1",
  },
  {
    title: "Flawless Calendar Sync",
    desc: "Your live calendar is read and written mid-conversation. No caching delays, no double-booking, no wasted buffer time. Every confirmed slot is instantly locked.",
    span: "col-span-1",
  },
  {
    title: "Graceful Rescheduling",
    desc: "Automated text reminders 24-48 hours out. Reply RESCHEDULE to pick a new time. No-shows drop, slots reopen, and your calendar stays full without a single staff intervention.",
    span: "col-span-1 md:col-span-2",
  },
];

export function Features() {
  return (
    <section className="py-32 bg-white px-6">
      <div className="max-w-7xl mx-auto">
        <h2 className="font-editorial text-4xl text-center mb-20">
          The four things that actually matter.
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feat) => (
            <div
              key={feat.title}
              className={`p-10 rounded-3xl bg-[#FAFAFA] border border-slate-100 hover:shadow-lg transition-shadow duration-500 ${feat.span}`}
            >
              <h3 className="text-xl font-medium tracking-tight mb-4">
                {feat.title}
              </h3>
              <p className="text-slate-500 font-light leading-relaxed">
                {feat.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
