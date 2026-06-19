"use client";

type BookingConfirmedProps = {
  firstName: string;
  date: string;
  time: string;
  serviceName: string;
};

export function BookingConfirmed({
  firstName,
  date,
  time,
  serviceName,
}: BookingConfirmedProps) {
  const d = new Date(`${date}T${time}:00`);

  return (
    <div className="text-center space-y-6 py-8">
      <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto">
        <svg
          className="w-8 h-8 text-green-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>

      <div>
        <h3 className="text-xl font-semibold text-slate-900 mb-1">
          You&rsquo;re booked, {firstName}!
        </h3>
        <p className="text-sm text-slate-400">
          We&rsquo;ll send a reminder before your appointment.
        </p>
      </div>

      <div className="rounded-xl border border-slate-100 bg-white p-5 space-y-2 text-left">
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">Service</span>
          <span className="font-medium text-slate-900">{serviceName}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">Date</span>
          <span className="font-medium text-slate-900">
            {d.toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">Time</span>
          <span className="font-medium text-slate-900">
            {d.toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            })}
          </span>
        </div>
      </div>
    </div>
  );
}
