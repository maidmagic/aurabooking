"use client";

import { useState } from "react";
import { ServiceList } from "./steps/service-list";
import { ProviderList } from "./steps/provider-list";
import { TimeGrid } from "./steps/time-grid";
import { ClientForm } from "./steps/client-form";
import { PaymentStep } from "./steps/payment-step";
import { BookingConfirmed } from "./booking-confirmed";

type Step = 1 | 2 | 3 | 4 | 5;

type BookingState = {
  serviceId: string | null;
  serviceName: string;
  servicePrice: number | null;
  duration: number;
  depositRequired: boolean;
  depositAmount: number;
  providerId: string;
  selectedDate: string | null;
  selectedTime: string | null;
  clientInfo: null | {
    first_name: string;
    last_name: string;
    phone: string;
    notes: string;
  };
};

const STEP_LABELS = ["Service", "Provider", "Date & Time", "Your Info", "Confirm"] as const;

export function BookingWidget({ businessId }: { businessId: string }) {
  const [step, setStep] = useState<Step>(1);
  const [state, setState] = useState<BookingState>({
    serviceId: null,
    serviceName: "",
    servicePrice: null,
    duration: 0,
    depositRequired: false,
    depositAmount: 0,
    providerId: "any",
    selectedDate: null,
    selectedTime: null,
    clientInfo: null,
  });
  const [services, setServices] = useState<Record<string, { name: string; price: number | null; deposit_required: boolean; deposit_amount: number }>>({});
  const [paying, setPaying] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");

  const selectService = (id: string, duration: number) => {
    const svc = services[id];
    if (!svc) return;
    setState((prev) => ({
      ...prev,
      serviceId: id,
      serviceName: svc.name,
      servicePrice: svc.price,
      duration,
      depositRequired: svc.deposit_required,
      depositAmount: svc.deposit_amount,
    }));
    setStep(2);
  };

  const selectProvider = (id: string) => {
    setState((prev) => ({ ...prev, providerId: id }));
    setStep(3);
  };

  const selectTime = (date: string, time: string) => {
    setState((prev) => ({ ...prev, selectedDate: date, selectedTime: time }));
    setStep(4);
  };

  const submitClientInfo = (info: BookingState["clientInfo"]) => {
    if (!info) return;
    setState((prev) => ({ ...prev, clientInfo: info }));
    setStep(5);
  };

  const createBooking = async () => {
    setError("");
    setPaying(true);
    try {
      const res = await fetch("/api/booking/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_id: businessId,
          service_id: state.serviceId,
          provider_id: state.providerId === "any" ? null : state.providerId,
          date: state.selectedDate,
          time: state.selectedTime,
          first_name: state.clientInfo?.first_name,
          last_name: state.clientInfo?.last_name,
          phone: state.clientInfo?.phone,
          notes: state.clientInfo?.notes || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Booking failed");

      if (data.deposit_required && data.deposit_amount > 0) {
        const payRes = await fetch("/api/payments/create-deposit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ appointment_id: data.appointment.id }),
        });
        const payData = await payRes.json();
        if (payData.url) {
          window.location.href = payData.url;
          return;
        }
      }

      setConfirmed(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPaying(false);
    }
  };

  const handlePayDeposit = () => {
    createBooking();
  };

  if (confirmed) {
    return (
      <div className="w-full max-w-lg mx-auto">
        <div className="rounded-3xl bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
          <BookingConfirmed
            firstName={state.clientInfo?.first_name ?? ""}
            date={state.selectedDate ?? ""}
            time={state.selectedTime ?? ""}
            serviceName={state.serviceName}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg mx-auto">
      <div className="rounded-3xl bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
        <div className="mb-6 flex items-center justify-between border-b border-slate-50 pb-4">
          <div className="flex items-center gap-2">
            {STEP_LABELS.slice(0, step).map((label, i) => (
              <span key={label} className="flex items-center gap-2">
                {i > 0 && <span className="text-slate-200 text-xs">/</span>}
                <span
                  className={`text-[10px] font-semibold uppercase tracking-wider ${
                    i === step - 1 ? "text-black" : "text-slate-300"
                  }`}
                >
                  {label}
                </span>
              </span>
            ))}
          </div>
          {step > 1 && (
            <button
              onClick={() => setStep((prev) => (prev - 1) as Step)}
              className="text-xs font-medium text-slate-400 hover:text-black transition-colors"
            >
              &larr; Back
            </button>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-100 text-xs text-red-600">
            {error}
          </div>
        )}

        {step === 1 && (
          <ServiceList
            businessId={businessId}
            onSelect={(id, duration) => {
              const svc = services[id];
              if (!svc) {
                fetch(`/api/booking/services?business_id=${businessId}`)
                  .then((r) => r.json())
                  .then((all) => {
                    const map: Record<string, { name: string; price: number | null; deposit_required: boolean; deposit_amount: number }> = {};
                    for (const s of all) {
                      map[s.id] = { name: s.name, price: s.price, deposit_required: s.deposit_required, deposit_amount: s.deposit_amount };
                    }
                    setServices(map);
                    const svc2 = map[id];
                    if (svc2) {
                      setState((prev) => ({
                        ...prev,
                        serviceId: id,
                        serviceName: svc2.name,
                        servicePrice: svc2.price,
                        duration,
                        depositRequired: svc2.deposit_required,
                        depositAmount: svc2.deposit_amount,
                      }));
                      setStep(2);
                    }
                  });
                return;
              }
              selectService(id, duration);
            }}
          />
        )}

        {step === 2 && (
          <ProviderList businessId={businessId} onSelect={selectProvider} />
        )}

        {step === 3 && (
          <TimeGrid
            businessId={businessId}
            duration={state.duration}
            onSelect={selectTime}
          />
        )}

        {step === 4 && (
          <ClientForm onSubmit={submitClientInfo} />
        )}

        {step === 5 && (
          <PaymentStep
            serviceName={state.serviceName}
            servicePrice={state.servicePrice}
            depositRequired={state.depositRequired}
            depositAmount={state.depositAmount}
            onPay={handlePayDeposit}
            onSkip={createBooking}
            paying={paying}
          />
        )}
      </div>
    </div>
  );
}
