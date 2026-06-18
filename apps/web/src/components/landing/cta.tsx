import Link from "next/link";
import { Button } from "@/components/ui/button";

export function CTA() {
  return (
    <section className="py-20 px-6 bg-[#1A1A1A]">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-3xl font-semibold text-white mb-4">
          Ready to Stop Missing Bookings?
        </h2>
        <p className="text-[#B8B0A8] mb-8 max-w-lg mx-auto">
          Join 1,200+ businesses using AuraBooking to capture every lead, 
          every hour of the day.
        </p>
        <Link href="/auth/register">
          <Button size="lg" className="bg-white text-[#1A1A1A] hover:bg-[#EDE9E3]">
            Try AuraBooking Free
          </Button>
        </Link>
      </div>
    </section>
  );
}
