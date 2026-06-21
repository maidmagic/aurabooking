"use client";

import { useEffect, useState } from "react";

export default function BusinessProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/business-profile")
      .then((r) => r.json())
      .then((data) => { setProfile(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const update = (key: string, value: any) => setProfile({ ...profile, [key]: value });

  const save = async () => {
    setSaving(true);
    const res = await fetch("/api/business-profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    });
    if (res.ok) setSaved(true);
    setSaving(false);
    setTimeout(() => setSaved(false), 2000);
  };

  const addFaq = () => {
    const faqs = profile?.faqs ?? [];
    update("faqs", [...faqs, { q: "", a: "" }]);
  };

  const updateFaq = (i: number, field: "q" | "a", value: string) => {
    const faqs = [...(profile?.faqs ?? [])];
    faqs[i] = { ...faqs[i], [field]: value };
    update("faqs", faqs);
  };

  const removeFaq = (i: number) => {
    const faqs = [...(profile?.faqs ?? [])];
    faqs.splice(i, 1);
    update("faqs", faqs);
  };

  if (loading) return <p className="p-8 text-stone-500">Loading...</p>;

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-editorial text-2xl text-stone-900">Business Profile</h1>
          <p className="text-sm text-stone-500">Information the AI uses to answer your customers accurately.</p>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-stone-900 px-4 py-2 text-sm text-white transition hover:bg-stone-800 disabled:opacity-50"
        >
          {saving ? "Saving..." : saved ? "Saved!" : "Save"}
        </button>
      </div>

      <div className="mt-6 space-y-6">
        {/* Company Info */}
        <section className="rounded-lg border border-stone-200 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-500">Company Info</h2>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-stone-600">Business Name</label>
              <input value={profile?.company_name ?? ""} onChange={(e) => update("company_name", e.target.value)} className="mt-1 w-full rounded border border-stone-200 px-3 py-2 text-sm focus:border-stone-400 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-medium text-stone-600">Phone</label>
              <input value={profile?.phone ?? ""} onChange={(e) => update("phone", e.target.value)} className="mt-1 w-full rounded border border-stone-200 px-3 py-2 text-sm focus:border-stone-400 focus:outline-none" />
            </div>
          </div>
        </section>

        {/* AI Context */}
        <section className="rounded-lg border border-stone-200 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-500">AI Context</h2>
          <div className="mt-4 space-y-4">
            <div>
              <label className="text-xs font-medium text-stone-600">Business Description</label>
              <p className="mb-1 text-xs text-stone-400">Describe your business so the AI knows what you do.</p>
              <textarea value={profile?.business_description ?? ""} onChange={(e) => update("business_description", e.target.value)} rows={3} className="mt-1 w-full rounded border border-stone-200 px-3 py-2 text-sm focus:border-stone-400 focus:outline-none" placeholder="e.g. A luxury medical spa offering Botox, fillers, and laser treatments..." />
            </div>
            <div>
              <label className="text-xs font-medium text-stone-600">Cancellation Policy</label>
              <p className="mb-1 text-xs text-stone-400">What the AI tells customers who want to cancel or reschedule.</p>
              <textarea value={profile?.cancellation_policy ?? ""} onChange={(e) => update("cancellation_policy", e.target.value)} rows={2} className="mt-1 w-full rounded border border-stone-200 px-3 py-2 text-sm focus:border-stone-400 focus:outline-none" placeholder="e.g. 24-hour notice required or a 50% fee applies." />
            </div>
            <div>
              <label className="text-xs font-medium text-stone-600">AI Greeting</label>
              <p className="mb-1 text-xs text-stone-400">How the AI introduces itself to new conversations.</p>
              <input value={profile?.ai_greeting ?? ""} onChange={(e) => update("ai_greeting", e.target.value)} className="mt-1 w-full rounded border border-stone-200 px-3 py-2 text-sm focus:border-stone-400 focus:outline-none" placeholder="Hi! Welcome to [Business Name]. How can I help you today?" />
            </div>
          </div>
        </section>

        {/* FAQs */}
        <section className="rounded-lg border border-stone-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-500">FAQs</h2>
            <button onClick={addFaq} className="text-xs text-stone-500 hover:text-stone-800">+ Add FAQ</button>
          </div>
          <p className="mb-1 mt-1 text-xs text-stone-400">Common questions customers ask. The AI will use these to answer accurately.</p>
          <div className="mt-3 space-y-3">
            {(profile?.faqs ?? []).map((faq: any, i: number) => (
              <div key={i} className="rounded border border-stone-100 bg-stone-50 p-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    <input value={faq.q} onChange={(e) => updateFaq(i, "q", e.target.value)} className="w-full rounded border border-stone-200 px-3 py-1.5 text-sm focus:border-stone-400 focus:outline-none" placeholder="Question" />
                    <textarea value={faq.a} onChange={(e) => updateFaq(i, "a", e.target.value)} rows={2} className="w-full rounded border border-stone-200 px-3 py-1.5 text-sm focus:border-stone-400 focus:outline-none" placeholder="Answer" />
                  </div>
                  <button onClick={() => removeFaq(i)} className="ml-2 mt-1 text-xs text-red-400 hover:text-red-600">Remove</button>
                </div>
              </div>
            ))}
            {(!profile?.faqs || profile.faqs.length === 0) && (
              <p className="py-4 text-center text-xs text-stone-400">No FAQs yet. Click "Add FAQ" to add common questions your customers ask.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
