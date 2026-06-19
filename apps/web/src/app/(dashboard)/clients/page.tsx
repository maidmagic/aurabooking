"use client";

import { useEffect, useState } from "react";

type Client = {
  id: string;
  phone: string;
  name: string | null;
  total_cancellations: number;
  last_appointment_at: string | null;
  is_subscribed: boolean;
  created_at: string;
};

const RECENCY_FILTERS = [
  { value: "", label: "All Clients" },
  { value: "6months", label: "Not seen in 6 months" },
  { value: "1year", label: "Not seen in 1 year" },
] as const;

function formatLastSeen(iso: string | null): string {
  if (!iso) return "Never";
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMonths = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.44));
  if (diffMonths < 1) return "Less than a month ago";
  if (diffMonths === 1) return "1 month ago";
  return `${diffMonths} months ago`;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [search, setSearch] = useState("");
  const [recency, setRecency] = useState("");

  const fetchClients = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (recency) params.set("lastVisit", recency);
    fetch(`/api/clients?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        setClients(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const seedDemoData = async () => {
    setSeeding(true);
    try {
      await fetch("/api/seed", { method: "POST" });
      fetchClients();
    } finally {
      setSeeding(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, [recency]);

  useEffect(() => {
    const timer = setTimeout(() => fetchClients(), 300);
    return () => clearTimeout(timer);
  }, [search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Client Directory</h2>
          <p className="text-xs text-slate-400 mt-1">
            {clients.length} client{clients.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-xl border border-slate-100 bg-white p-0.5">
            {RECENCY_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setRecency(f.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  recency === f.value
                    ? "bg-black text-white"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or phone..."
            className="w-56 border-b border-slate-200 py-2 text-sm focus:outline-none focus:border-black bg-transparent"
          />
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : clients.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-sm text-slate-400 mb-4">
            {search || recency ? "No clients match your filters." : "No clients yet."}
          </p>
          {!search && !recency && (
            <button
              onClick={seedDemoData}
              disabled={seeding}
              className="px-5 py-2.5 bg-black text-white text-sm font-semibold rounded-full shadow-sm hover:bg-slate-800 transition-all disabled:opacity-50"
            >
              {seeding ? "Loading..." : "Load Demo Data"}
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {clients.map((client) => (
            <div
              key={client.id}
              className="flex items-center justify-between p-4 rounded-xl bg-white border border-slate-100 hover:border-slate-200 transition-all"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="h-10 w-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-sm font-medium shrink-0">
                  {client.name?.charAt(0)?.toUpperCase() ?? "?"}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {client.name ?? "Unknown"}
                  </p>
                  <p className="text-xs text-slate-400">{client.phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-6 text-xs text-slate-400 shrink-0">
                <span>{formatLastSeen(client.last_appointment_at)}</span>
                {client.total_cancellations > 0 && (
                  <span className="text-amber-600">
                    {client.total_cancellations} cancellation{client.total_cancellations !== 1 ? "s" : ""}
                  </span>
                )}
                {!client.is_subscribed && (
                  <span className="text-red-400">Unsubscribed</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
