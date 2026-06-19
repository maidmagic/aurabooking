"use client";

import { useEffect, useState } from "react";

type Service = {
  id: string;
  name: string;
  duration: number;
  price: number | null;
  description: string | null;
  deposit_required: boolean;
  deposit_amount: number;
};

export function ServiceList({
  businessId,
  onSelect,
}: {
  businessId: string;
  onSelect: (id: string, duration: number) => void;
}) {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/booking/services?business_id=${businessId}`)
      .then((r) => r.json())
      .then((data) => {
        setServices(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [businessId]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-xl bg-slate-100 animate-pulse" />
        ))}
      </div>
    );
  }

  const categories = ["Hair", "Skin", "Nails", "Wellness", "Other"];
  const grouped = new Map<string, Service[]>();
  for (const s of services) {
    const cat = categories.find((c) => s.name.toLowerCase().includes(c.toLowerCase())) || "Other";
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(s);
  }

  return (
    <div className="space-y-8">
      {Array.from(grouped.entries()).map(([category, items]) => (
        <div key={category}>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">
            {category}
          </h3>
          <div className="space-y-2">
            {items.map((service) => (
              <button
                key={service.id}
                onClick={() => onSelect(service.id, service.duration)}
                className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-white hover:border-slate-300 hover:shadow-sm transition-all text-left"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-slate-900">{service.name}</p>
                  {service.description && (
                    <p className="text-xs text-slate-400 mt-0.5 truncate">{service.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                  <span className="text-xs text-slate-400 bg-slate-50 px-2 py-1 rounded-md">
                    {service.duration} min
                  </span>
                  {service.price != null && (
                    <span className="text-sm font-semibold text-slate-900">
                      ${Number(service.price).toFixed(0)}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
