"use client";

import { useEffect, useState, useMemo } from "react";

type Client = {
  id: string;
  phone: string;
  name: string | null;
  email: string | null;
  insurance_provider: string | null;
  insurance_id: string | null;
  notes: string | null;
  date_of_birth: string | null;
  total_cancellations: number;
  late_cancellations: number;
  last_appointment_at: string | null;
  is_subscribed: boolean;
  created_at: string;
};

const RECENCY_FILTERS = [
  { value: "", label: "All Clients" },
  { value: "6months", label: "Not seen in 6mo" },
  { value: "1year", label: "Not seen in 1yr" },
] as const;

function formatLastSeen(iso: string | null): string {
  if (!iso) return "Never";
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const diffMonths = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.44));
  if (diffMonths < 1) return "Less than a month ago";
  if (diffMonths === 1) return "1 month ago";
  return `${diffMonths} months ago`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function initials(name: string | null): string {
  if (!name) return "?";
  return name.split(" ").map((s) => s[0]).join("").toUpperCase().slice(0, 2);
}

function ContactCard({ client, onSave, onClose }: {
  client: Client;
  onSave: (c: Partial<Client>) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState(client.name ?? "");
  const [email, setEmail] = useState(client.email ?? "");
  const [phone, setPhone] = useState(client.phone);
  const [insuranceProvider, setInsuranceProvider] = useState(client.insurance_provider ?? "");
  const [insuranceId, setInsuranceId] = useState(client.insurance_id ?? "");
  const [dateOfBirth, setDateOfBirth] = useState(client.date_of_birth ?? "");
  const [notes, setNotes] = useState(client.notes ?? "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave({ phone, name, email, insurance_provider: insuranceProvider, insurance_id: insuranceId, date_of_birth: dateOfBirth, notes });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]">
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden animate-in slide-in-from-bottom-4">
        {/* Header avatar */}
        <div className="pt-10 pb-6 flex flex-col items-center border-b border-slate-100">
          <div className="h-20 w-20 rounded-full bg-black text-white flex items-center justify-center text-2xl font-semibold tracking-tight mb-3">
            {initials(name || client.name)}
          </div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full Name"
            className="text-xl font-semibold text-center text-slate-900 bg-transparent border-none focus:outline-none focus:ring-0 w-full px-4"
          />
          <p className="text-sm text-slate-400 mt-0.5">{client.total_cancellations > 0 ? `${client.total_cancellations} cancellation${client.total_cancellations > 1 ? "s" : ""}` : "No cancellations"}</p>
        </div>

        {/* Contact fields */}
        <div className="px-6 py-5 space-y-5">
          <FieldRow icon="📧" label="Email" value={email} onChange={setEmail} placeholder="email@example.com" />
          <FieldRow icon="📱" label="Phone" value={phone} onChange={setPhone} placeholder="+1 (555) 000-0000" />
          <FieldRow icon="🏥" label="Insurance Provider" value={insuranceProvider} onChange={setInsuranceProvider} placeholder="Blue Cross, Aetna..." />
          <FieldRow icon="🪪" label="Insurance ID" value={insuranceId} onChange={setInsuranceId} placeholder="Policy number" />
          <FieldRow icon="🎂" label="Date of Birth" value={dateOfBirth} onChange={setDateOfBirth} placeholder="YYYY-MM-DD" type="date" />
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Allergies, preferences, notes..."
              rows={3}
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:border-black bg-transparent resize-none"
            />
          </div>

          <div className="text-xs text-slate-400 bg-slate-50 rounded-xl px-4 py-3">
            <span className="font-medium text-slate-600">Last appointment:</span> {formatDate(client.last_appointment_at)} &middot; <span className="font-medium text-slate-600">Client since:</span> {formatDate(client.created_at)}
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-black rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-50">
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function FieldRow({ icon, label, value, onChange, placeholder, type }: {
  icon: string; label: string; value: string; onChange: (v: string) => void; placeholder: string; type?: string;
}) {
  return (
    <div className="flex items-center gap-4">
      <span className="text-base w-6 text-center shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</label>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          type={type || "text"}
          className="mt-0.5 w-full border-b border-slate-100 py-1.5 text-sm focus:outline-none focus:border-black bg-transparent"
        />
      </div>
    </div>
  );
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [search, setSearch] = useState("");
  const [recency, setRecency] = useState("");
  const [sort, setSort] = useState<"alpha" | "recent">("alpha");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const fetchClients = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (recency) params.set("lastVisit", recency);
    params.set("sort", sort);
    fetch(`/api/clients?${params.toString()}`)
      .then((r) => r.json())
      .then(setClients)
      .catch(() => {})
      .finally(() => setLoading(false));
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

  const handleSaveClient = async (updated: Partial<Client>) => {
    const res = await fetch("/api/clients", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    });
    if (res.ok) {
      fetchClients();
      setSelectedClient((prev) => prev ? { ...prev, ...updated } : null);
    }
  };

  useEffect(() => { fetchClients(); }, [recency, sort]);

  useEffect(() => {
    const timer = setTimeout(() => fetchClients(), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Group clients by first letter for A-Z index
  const grouped = useMemo(() => {
    const map: Record<string, Client[]> = {};
    for (const c of clients) {
      const letter = (c.name?.[0] ?? "#").toUpperCase();
      if (!map[letter]) map[letter] = [];
      map[letter].push(c);
    }
    return map;
  }, [clients]);

  const letters = useMemo(() => Object.keys(grouped).sort(), [grouped]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Client Directory</h2>
          <p className="text-xs text-slate-400 mt-1">{clients.length} client{clients.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex rounded-xl border border-slate-100 bg-white p-0.5">
            {RECENCY_FILTERS.map((f) => (
              <button key={f.value} onClick={() => setRecency(f.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${recency === f.value ? "bg-black text-white" : "text-slate-400 hover:text-slate-600"}`}
              >{f.label}</button>
            ))}
          </div>
          <div className="flex rounded-xl border border-slate-100 bg-white p-0.5">
            <button onClick={() => setSort("alpha")}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${sort === "alpha" ? "bg-black text-white" : "text-slate-400 hover:text-slate-600"}`}
            >A-Z</button>
            <button onClick={() => setSort("recent")}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${sort === "recent" ? "bg-black text-white" : "text-slate-400 hover:text-slate-600"}`}
            >Recent</button>
          </div>
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or phone..."
            className="w-48 border-b border-slate-200 py-2 text-sm focus:outline-none focus:border-black bg-transparent"
          />
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3, 4].map((i) => <div key={i} className="h-14 rounded-xl bg-slate-100 animate-pulse" />)}</div>
      ) : clients.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-sm text-slate-400 mb-4">{search || recency ? "No clients match your filters." : "No clients yet."}</p>
          {!search && !recency && (
            <button onClick={seedDemoData} disabled={seeding}
              className="px-5 py-2.5 bg-black text-white text-sm font-semibold rounded-full shadow-sm hover:bg-slate-800 transition-all disabled:opacity-50"
            >{seeding ? "Loading..." : "Load Demo Data"}</button>
          )}
        </div>
      ) : (
        <div>
          {sort === "alpha" ? (
            <div className="space-y-6">
              {letters.map((letter) => (
                <div key={letter}>
                  <div className="sticky top-0 bg-white z-10 pb-1 pt-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{letter}</span>
                  </div>
                  <div className="space-y-1">
                    {grouped[letter].map((client) => (
                      <button key={client.id} onClick={() => setSelectedClient(client)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors text-left"
                      >
                        <div className="h-9 w-9 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-medium shrink-0">
                          {initials(client.name)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-900 truncate">{client.name ?? "Unknown"}</p>
                          <p className="text-xs text-slate-400">{client.phone}{client.email ? ` · ${client.email}` : ""}</p>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 shrink-0">
                          {client.insurance_provider && <span className="bg-slate-50 px-2 py-0.5 rounded-full">{client.insurance_provider}</span>}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {clients.map((client) => (
                <button key={client.id} onClick={() => setSelectedClient(client)}
                  className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-medium shrink-0">
                      {initials(client.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{client.name ?? "Unknown"}</p>
                      <p className="text-xs text-slate-400">{client.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-400 shrink-0">
                    <span>{formatLastSeen(client.last_appointment_at)}</span>
                    {!client.is_subscribed && <span className="text-red-400">Unsubscribed</span>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {selectedClient && (
        <ContactCard client={selectedClient} onSave={handleSaveClient} onClose={() => setSelectedClient(null)} />
      )}
    </div>
  );
}
