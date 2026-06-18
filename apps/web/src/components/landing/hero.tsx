import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChatPreview } from "./chat-preview";

export function Hero() {
  return (
    <section className="pt-32 pb-20 px-6">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <div className="inline-flex items-center gap-2 bg-accent/10 text-accent text-sm font-medium px-3 py-1 rounded-full mb-6">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            AI-Powered Text-to-Appointment
          </div>
          <h1 className="text-4xl lg:text-5xl font-semibold text-foreground leading-tight mb-4">
            Never Miss a Booking Again
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed mb-8 max-w-lg">
            AI that answers texts, books appointments, and recaptures missed calls — automatically. 
            Your customers book in minutes, not hours.
          </p>
          <div className="flex items-center gap-4">
            <Link href="/auth/register">
              <Button size="lg" className="bg-primary hover:bg-[#333] text-primary-foreground">
                Get Started Free
              </Button>
            </Link>
            <Button size="lg" variant="outline">
              See it Live
            </Button>
          </div>
          <div className="flex items-center gap-8 mt-10 pt-8 border-t border-border">
            <div>
              <p className="text-2xl font-semibold text-foreground">1,200+</p>
              <p className="text-sm text-muted-foreground">Businesses</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-foreground">45K</p>
              <p className="text-sm text-muted-foreground">Appointments Booked</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-foreground">97%</p>
              <p className="text-sm text-muted-foreground">Satisfaction</p>
            </div>
          </div>
        </div>
        <div className="flex justify-center lg:justify-end">
          <ChatPreview />
        </div>
      </div>
    </section>
  );
}
