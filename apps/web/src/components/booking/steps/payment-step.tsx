"use client";

type PaymentStepProps = {
  serviceName: string;
  servicePrice: number | null;
  depositRequired: boolean;
  depositAmount: number;
  onPay: () => void;
  onSkip: () => void;
  paying: boolean;
};

export function PaymentStep({
  serviceName,
  servicePrice,
  depositRequired,
  depositAmount,
  onPay,
  onSkip,
  paying,
}: PaymentStepProps) {
  const balanceDue = servicePrice != null ? servicePrice - depositAmount : 0;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-100 bg-white p-5 space-y-3">
        <h4 className="text-sm font-semibold text-slate-900">Booking Summary</h4>
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">{serviceName}</span>
          {servicePrice != null && (
            <span className="font-medium">${servicePrice.toFixed(2)}</span>
          )}
        </div>
        <div className="border-t border-slate-50 pt-3 space-y-2">
          {depositRequired && depositAmount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Deposit Due Now</span>
              <span className="font-semibold text-black">${depositAmount.toFixed(2)}</span>
            </div>
          )}
          {servicePrice != null && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Balance at Appointment</span>
              <span className="text-slate-600">${balanceDue.toFixed(2)}</span>
            </div>
          )}
        </div>
      </div>

      {depositRequired && depositAmount > 0 ? (
        <button
          onClick={onPay}
          disabled={paying}
          className="w-full py-4 text-sm tracking-widest uppercase font-medium rounded-xl bg-black text-white hover:bg-slate-800 transition-all disabled:opacity-50"
        >
          {paying ? "Processing..." : `Pay $${depositAmount.toFixed(0)} Deposit`}
        </button>
      ) : (
        <button
          onClick={onSkip}
          className="w-full py-4 text-sm tracking-widest uppercase font-medium rounded-xl bg-black text-white hover:bg-slate-800 transition-all"
        >
          Confirm — No Deposit Required
        </button>
      )}
    </div>
  );
}
