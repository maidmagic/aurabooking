import { BookingWidget } from "@/components/booking/booking-widget";

export default function WidgetDemoPage() {
  return (
    <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="font-editorial text-3xl text-black mb-2">
            Book an Appointment
          </h1>
          <p className="text-sm text-slate-400">
            Select a service and pick your ideal time.
          </p>
        </div>
        <BookingWidget businessId="demo" />
      </div>
    </div>
  );
}
