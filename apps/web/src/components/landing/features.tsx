import { Bot, MessageSquare, Calendar, Bell, Target, Globe } from "lucide-react";

const features = [
  {
    title: "Virtual Receptionist",
    description: "AI that answers SMS, qualifies leads, and books appointments 24/7.",
    icon: Bot,
  },
  {
    title: "Business Messenger",
    description: "In-app messaging between your staff and customers in one place.",
    icon: MessageSquare,
  },
  {
    title: "AI Scheduling",
    description: "Real-time calendar sync reads availability and writes bookings instantly.",
    icon: Calendar,
  },
  {
    title: "Automated Reminders",
    description: "SMS appointment reminders reduce no-shows by up to 40%.",
    icon: Bell,
  },
  {
    title: "Lead Engage",
    description: "AI qualification pipeline that nurtures leads until they're ready to book.",
    icon: Target,
  },
  {
    title: "Web Chat",
    description: "Embeddable chat widget that captures website visitors with AI conversations.",
    icon: Globe,
  },
];

export function Features() {
  return (
    <section className="py-20 px-6 bg-card">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-semibold text-foreground mb-3">
            Everything You Need to Grow
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Six integrated features that work together to eliminate missed revenue.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="p-6 rounded-xl border border-border bg-background hover:border-[#D8D2CB] transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center mb-4">
                  <Icon className="h-5 w-5 text-primary-foreground" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
