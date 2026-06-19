"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type ScrapedData = {
  business_name: string;
  services: { name: string; duration: number; price: number }[];
  business_hours: Record<string, string>;
  faq: { q: string; a: string }[];
};

export default function ConciergeOnboarding() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<"pending" | "live">("pending");

  // Concierge state
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [scraping, setScraping] = useState(false);
  const [scraped, setScraped] = useState<ScrapedData | null>(null);
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [humanInLoop, setHumanInLoop] = useState(true);
  const [goingLive, setGoingLive] = useState(false);

  useEffect(() => {
    fetch("/api/onboarding/status")
      .then((r) => r.json())
      .then((data) => {
        setStatus(data.onboarding_step);
        setCalendarConnected(data.human_in_the_loop !== undefined);
        if (data.onboarding_step === "live") {
          router.push("/dashboard");
        }
      })
      .finally(() => setLoading(false));
  }, [router]);

  const handleScrape = async () => {
    if (!websiteUrl) return;
    setScraping(true);
    try {
      const res = await fetch("/api/onboarding/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: websiteUrl }),
      });
      const data = await res.json();
      setScraped(data.data);
    } finally {
      setScraping(false);
    }
  };

  const handleGoLive = async () => {
    setGoingLive(true);
    try {
      await fetch("/api/onboarding/go-live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ human_in_the_loop: humanInLoop }),
      });
      router.push("/dashboard");
    } finally {
      setGoingLive(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="size-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />
      </div>
    );
  }

  const allDone = scraped && calendarConnected;

  return (
    <div className="max-w-3xl mx-auto">

      {/* Hero */}
      <div className="mb-16">
        <h1 className="font-editorial text-5xl tracking-tight mb-4">
          We set it up.
          <br />
          <span className="text-slate-400 italic">You just show up.</span>
        </h1>
        <p className="text-slate-500 font-light text-lg max-w-xl leading-relaxed">
          No forms to fill. No configurations to tweak. Give us your website URL
          and a 15-minute window. We ingest your business, train the AI, and
          hand you a fully working receptionist.
        </p>
      </div>

      {/* Step: URL Ingestion */}
      <div className="p-8 rounded-3xl bg-white border border-slate-100 shadow-sm mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
            scraped ? "bg-green-500 text-white" : "bg-black text-white"
          }`}>
            {scraped ? "✓" : "1"}
          </div>
          <div>
            <p className="text-sm font-medium">Tell us where you operate</p>
            <p className="text-xs text-slate-400">Your website URL is all we need.</p>
          </div>
          {scraped && <span className="ml-auto text-xs text-green-600 font-medium">Done</span>}
        </div>

        {!scraped ? (
          <div className="flex gap-3">
            <input
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://your-business-website.com"
              className="flex-1 border-b border-slate-200 py-3 text-sm focus:outline-none focus:border-black bg-transparent"
              onKeyDown={(e) => e.key === "Enter" && handleScrape()}
            />
            <button
              onClick={handleScrape}
              disabled={scraping || !websiteUrl}
              className="px-6 py-3 bg-black text-white text-sm font-semibold rounded-full hover:bg-slate-800 transition-all disabled:opacity-50"
            >
              {scraping ? "Ingesting..." : "Ingest"}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-sm text-slate-600 bg-slate-50 rounded-xl p-4">
              <p className="font-medium mb-2 text-black">{scraped.business_name}</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400">Services ingested:</span>
                  <span className="ml-1 font-medium">{scraped.services.length}</span>
                </div>
                <div>
                  <span className="text-slate-400">Hours imported:</span>
                  <span className="ml-1 font-medium">
                    {Object.values(scraped.business_hours).filter((h) => h !== "Closed").length} days
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">FAQs extracted:</span>
                  <span className="ml-1 font-medium">{scraped.faq.length}</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-slate-400">
              What should we change? We&rsquo;ll adjust the AI&rsquo;s knowledge before it goes live.
              <button className="ml-2 underline underline-offset-2 hover:text-black" onClick={() => setScraped(null)}>
                Re-ingest
              </button>
            </p>
          </div>
        )}
      </div>

      {/* Step: Calendar Auth */}
      <div className={`p-8 rounded-3xl border shadow-sm mb-6 transition-all ${
        calendarConnected ? "bg-white border-slate-100" : "bg-white border-slate-100"
      }`}>
        <div className="flex items-center gap-3 mb-6">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
            calendarConnected ? "bg-green-500 text-white" : "bg-slate-100 text-slate-400"
          }`}>
            {calendarConnected ? "✓" : "2"}
          </div>
          <div>
            <p className="text-sm font-medium">Connect your calendar</p>
            <p className="text-xs text-slate-400">The only thing you need to do yourself.</p>
          </div>
          {calendarConnected && <span className="ml-auto text-xs text-green-600 font-medium">Connected</span>}
        </div>

        <div className="max-w-sm">
          {calendarConnected ? (
            <div className="flex items-center gap-3 text-sm text-green-700 bg-green-50 rounded-xl px-4 py-3">
              <span>✓</span>
              <span>Google Calendar is connected. We can read and write to your calendar.</span>
            </div>
          ) : (
            <a
              href="/api/integrations/google/auth"
              className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white text-sm font-semibold rounded-full hover:bg-slate-800 transition-all"
            >
              <span>📅</span>
              Connect Google Calendar
            </a>
          )}
        </div>
      </div>

      {/* Step: Sandbox + Go Live */}
      {scraped && (
        <>
          {/* Sandbox Test Drive */}
          <div className="p-8 rounded-3xl bg-white border border-slate-100 shadow-sm mb-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold bg-slate-100 text-slate-400">
                3
              </div>
              <div>
                <p className="text-sm font-medium">Test drive your AI</p>
                <p className="text-xs text-slate-400">Try to break it before it goes live.</p>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-[#FAFAFA] border border-slate-100 mb-6">
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400 mb-3">Your sandbox number</p>
              <p className="text-3xl font-medium tracking-tight mb-2">(888) 579-5668</p>
              <p className="text-xs text-slate-500">Text this number. Ask for something you don&rsquo;t offer. Try to book at 3 AM. See how the AI handles it.</p>
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                "Ask for an unoffered service",
                "Book at 3:00 AM",
                "Ask about pricing",
                "Try to reschedule",
              ].map((test) => (
                <span key={test} className="text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
                  {test}
                </span>
              ))}
            </div>
          </div>

          {/* Go Live */}
          <div className="p-8 rounded-3xl bg-white border border-slate-100 shadow-sm mb-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold bg-black text-white">
                4
              </div>
              <div>
                <p className="text-sm font-medium">Go live</p>
                <p className="text-xs text-slate-400">Flip the switch when you&rsquo;re ready.</p>
              </div>
            </div>

            <label className="flex items-start gap-4 cursor-pointer mb-6">
              <input
                type="checkbox"
                checked={humanInLoop}
                onChange={(e) => setHumanInLoop(e.target.checked)}
                className="mt-1 h-5 w-5 rounded border-slate-300 text-black focus:ring-black"
              />
              <div>
                <p className="text-sm font-medium">Human-in-the-loop (first 7 days)</p>
                <p className="text-xs text-slate-500 mt-1">
                  We&rsquo;ll text you a transcript summary every time the AI books an appointment.
                  Every notification is proof the software is making you money.
                </p>
              </div>
            </label>

            <div className="bg-[#FAFAFA] rounded-2xl p-5 border border-slate-100 mb-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">What happens next</p>
              <ul className="space-y-2.5 text-sm text-slate-600">
                <li className="flex items-center gap-3">
                  <span className="text-green-600">✓</span>
                  Your AI receptionist goes live immediately
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-green-600">✓</span>
                  Inbound texts answered in under 2 seconds
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-green-600">✓</span>
                  Appointments written directly to your calendar
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-green-600">✓</span>
                  Booking notifications sent to your phone (first 7 days)
                </li>
              </ul>
            </div>

            <button
              onClick={handleGoLive}
              disabled={goingLive}
              className="px-8 py-3 bg-black text-white text-sm font-semibold rounded-full hover:bg-slate-800 transition-all disabled:opacity-50"
            >
              {goingLive ? "Activating..." : "Activate AI Receptionist"}
            </button>
          </div>
        </>
      )}

      {/* Empty state before URL */}
      {!scraped && (
        <div className="text-center text-xs text-slate-400 mt-16">
          <p>No setup required on your end. We handle the configuration.</p>
          <p className="mt-1">The only technical step is connecting your calendar below.</p>
        </div>
      )}
    </div>
  );
}
