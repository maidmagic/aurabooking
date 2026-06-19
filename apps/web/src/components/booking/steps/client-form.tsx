"use client";

import { useState } from "react";

type ClientInfo = {
  first_name: string;
  last_name: string;
  phone: string;
  notes: string;
};

export function ClientForm({
  onSubmit,
}: {
  onSubmit: (info: ClientInfo) => void;
}) {
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [optIn, setOptIn] = useState(true);

  const valid = first.trim() && last.trim() && phone.trim().length >= 10;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 block">
            First Name
          </label>
          <input
            value={first}
            onChange={(e) => setFirst(e.target.value)}
            placeholder="Jane"
            className="w-full border-b border-slate-200 py-3 text-sm focus:outline-none focus:border-black bg-transparent"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 block">
            Last Name
          </label>
          <input
            value={last}
            onChange={(e) => setLast(e.target.value)}
            placeholder="Doe"
            className="w-full border-b border-slate-200 py-3 text-sm focus:outline-none focus:border-black bg-transparent"
          />
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-slate-500 mb-1 block">
          Phone Number
        </label>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
          placeholder="(555) 123-4567"
          type="tel"
          className="w-full border-b border-slate-200 py-3 text-sm focus:outline-none focus:border-black bg-transparent"
        />
      </div>

      <div>
        <label className="text-xs font-medium text-slate-500 mb-1 block">
          Special Notes
          <span className="text-slate-300 ml-1">(optional)</span>
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any preferences or requests..."
          rows={2}
          className="w-full border-b border-slate-200 py-3 text-sm focus:outline-none focus:border-black bg-transparent resize-none"
        />
      </div>

      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={optIn}
          onChange={(e) => setOptIn(e.target.checked)}
          className="mt-0.5 accent-black"
        />
        <span className="text-xs text-slate-400 leading-relaxed">
          I agree to receive SMS reminders and communications. Message &amp; data
          rates may apply. Reply STOP to opt out at any time.
        </span>
      </label>

      <button
        onClick={() =>
          onSubmit({ first_name: first.trim(), last_name: last.trim(), phone, notes })
        }
        disabled={!valid}
        className="w-full py-4 text-sm tracking-widest uppercase font-medium transition-all rounded-xl disabled:bg-slate-200 disabled:text-slate-400 bg-black text-white hover:bg-slate-800"
      >
        Confirm Booking
      </button>
    </div>
  );
}
