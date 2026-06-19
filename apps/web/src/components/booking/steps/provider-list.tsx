"use client";

import { useEffect, useState } from "react";

type Provider = {
  id: string;
  name: string;
  role: string;
};

export function ProviderList({
  businessId,
  onSelect,
}: {
  businessId: string;
  onSelect: (id: string) => void;
}) {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/booking/providers?business_id=${businessId}`)
      .then((r) => r.json())
      .then((data) => {
        setProviders(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [businessId]);

  if (loading) {
    return (
      <div className="flex gap-3 justify-center">
        {[1, 2, 3].map((i) => (
          <div key={i} className="w-16 h-16 rounded-full bg-slate-100 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4 text-center">
        Choose a provider
      </p>
      <div className="flex flex-wrap gap-3 justify-center">
        <button
          onClick={() => onSelect("any")}
          className="flex flex-col items-center gap-1.5 px-5 py-3 rounded-xl border-2 border-black bg-black/5 hover:bg-black/10 transition-all"
        >
          <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center text-sm font-medium">
            A
          </div>
          <span className="text-xs font-medium text-black">Any Available</span>
        </button>
        {providers.map((provider) => (
          <button
            key={provider.id}
            onClick={() => onSelect(provider.id)}
            className="flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border border-slate-100 bg-white hover:border-slate-300 hover:shadow-sm transition-all"
          >
            <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-sm font-medium">
              {provider.name.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs text-slate-600">{provider.name.split(" ")[0]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
