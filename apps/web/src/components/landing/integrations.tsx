import { Calendar, MessageCircle, Bot } from "lucide-react";

const integrations = [
  { name: "Google Calendar", icon: Calendar },
  { name: "Twilio", icon: MessageCircle },
  { name: "OpenAI", icon: Bot },
];

export function Integrations() {
  return (
    <section className="py-16 px-6">
      <div className="max-w-7xl mx-auto text-center">
        <p className="text-sm font-medium text-muted-foreground mb-8 uppercase tracking-wider">
          Powered by
        </p>
        <div className="flex items-center justify-center gap-12">
          {integrations.map((integration) => {
            const Icon = integration.icon;
            return (
              <div
                key={integration.name}
                className="flex items-center gap-3 text-muted-foreground"
              >
                <Icon className="h-6 w-6" />
                <span className="text-sm font-medium">{integration.name}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
