"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type ScrapedData = {
  business_name: string;
  services: { name: string; duration: number; price: number }[];
  business_hours: Record<string, string>;
  faq: { q: string; a: string }[];
};

interface AvailableNumber {
  phoneNumber: string;
  friendlyName: string;
  locality: string;
  region: string;
  price: string;
}

export default function ConciergeOnboarding() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<"pending" | "live">("pending");

  const [websiteUrl, setWebsiteUrl] = useState("");
  const [scraping, setScraping] = useState(false);
  const [scraped, setScraped] = useState<ScrapedData | null>(null);

  const [areaCode, setAreaCode] = useState("");
  const [searchingPhones, setSearchingPhones] = useState(false);
  const [availableNumbers, setAvailableNumbers] = useState<AvailableNumber[]>([]);
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [phonePurchased, setPhonePurchased] = useState(false);
  const [phoneError, setPhoneError] = useState("");

  const [calendarConnected, setCalendarConnected] = useState(false);

  const [stripeKey, setStripeKey] = useState("");
  const [stripeWebhook, setStripeWebhook] = useState("");
  const [connectingStripe, setConnectingStripe] = useState(false);
  const [stripeConnected, setStripeConnected] = useState(false);
  const [stripeError, setStripeError] = useState("");

  const [humanInLoop, setHumanInLoop] = useState(true);
  const [goingLive, setGoingLive] = useState(false);

  useEffect(() => {
    fetch("/api/onboarding/status")
      .then((r) => r.json())
      .then((data) => {
        setStatus(data.onboarding_step);
        setCalendarConnected(data.human_in_the_loop !== undefined);
        if (data.stripe_connected) setStripeConnected(true);
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

  const handleSearchPhones = async () => {
    if (!areaCode || areaCode.length < 3) return;
    setSearchingPhones(true);
    setPhoneError("");
    try {
      const res = await fetch(`/api/onboarding/phone/search?areaCode=${areaCode}`);
      const data = await res.json();
      if (data.error) {
        setPhoneError(data.error);
        setAvailableNumbers([]);
      } else {
        setAvailableNumbers(data.numbers ?? []);
        if (data.numbers?.length === 0) {
          setPhoneError("No numbers available in this area code");
        }
      }
    } catch {
      setPhoneError("Failed to search for numbers");
    } finally {
      setSearchingPhones(false);
    }
  };

  const handlePurchasePhone = async (phoneNumber: string) => {
    setPurchasing(true);
    setPhoneError("");
    try {
      const res = await fetch("/api/onboarding/phone/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber }),
      });
      const data = await res.json();
      if (data.error) {
        setPhoneError(data.error);
      } else {
        setPhonePurchased(true);
        setSelectedPhone(phoneNumber);
      }
    } catch {
      setPhoneError("Failed to purchase number");
    } finally {
      setPurchasing(false);
    }
  };

  const handleConnectStripe = async () => {
    if (!stripeKey) return;
    setConnectingStripe(true);
    setStripeError("");
    try {
      const res = await fetch("/api/onboarding/stripe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secretKey: stripeKey, webhookSecret: stripeWebhook || undefined }),
      });
      const data = await res.json();
      if (data.error) {
        setStripeError(data.error);
      } else {
        setStripeConnected(true);
      }
    } catch {
      setStripeError("Failed to connect Stripe");
    } finally {
      setConnectingStripe(false);
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

  const readyToGoLive = scraped && phonePurchased && calendarConnected;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-16">
        <h1 className="font-editorial text-5xl tracking-tight mb-4">
          Your AI receptionist.
          <br />
          <span className="text-slate-400 italic">Set up in 5 minutes.</span>
        </h1>
        <p className="text-slate-500 font-light text-lg max-w-xl leading-relaxed">
          No developers needed. Enter your URL, pick a phone number, connect your calendar and Stripe, and go live.
        </p>
      </div>

      {/* Step 1: URL Ingestion */}
      <div className="p-8 rounded-3xl bg-white border border-slate-100 shadow-sm mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${scraped ? "bg-green-500 text-white" : "bg-black text-white"}`}>
            {scraped ? "✓" : "1"}
          </div>
          <div>
            <p className="text-sm font-medium">Enter your business details</p>
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
                <div><span className="text-slate-400">Services ingested:</span><span className="ml-1 font-medium">{scraped.services.length}</span></div>
                <div><span className="text-slate-400">Hours imported:</span><span className="ml-1 font-medium">{Object.values(scraped.business_hours).filter((h) => h !== "Closed").length} days</span></div>
                <div><span className="text-slate-400">FAQs extracted:</span><span className="ml-1 font-medium">{scraped.faq.length}</span></div>
              </div>
            </div>
            <p className="text-xs text-slate-400">
              What should we change?
              <button className="ml-2 underline underline-offset-2 hover:text-black" onClick={() => setScraped(null)}>Re-ingest</button>
            </p>
          </div>
        )}
      </div>

      {/* Step 2: Phone Number */}
      <div className={`p-8 rounded-3xl border shadow-sm mb-6 transition-all ${phonePurchased ? "bg-white border-slate-100" : "bg-white border-slate-100"}`}>
        <div className="flex items-center gap-3 mb-6">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${phonePurchased ? "bg-green-500 text-white" : "bg-slate-100 text-slate-400"}`}>
            {phonePurchased ? "✓" : "2"}
          </div>
          <div>
            <p className="text-sm font-medium">Get a local phone number</p>
            <p className="text-xs text-slate-400">We&rsquo;ll purchase one for you — $1/mo, billed to your Twilio account.</p>
          </div>
          {phonePurchased && <span className="ml-auto text-xs text-green-600 font-medium">{selectedPhone}</span>}
        </div>

        {!phonePurchased && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <input
                value={areaCode}
                onChange={(e) => setAreaCode(e.target.value.replace(/\D/g, "").slice(0, 3))}
                placeholder="Area code (e.g. 212)"
                className="w-32 border-b border-slate-200 py-3 text-sm focus:outline-none focus:border-black bg-transparent text-center"
                maxLength={3}
                onKeyDown={(e) => e.key === "Enter" && handleSearchPhones()}
              />
              <button
                onClick={handleSearchPhones}
                disabled={searchingPhones || areaCode.length < 3}
                className="px-6 py-3 bg-black text-white text-sm font-semibold rounded-full hover:bg-slate-800 transition-all disabled:opacity-50"
              >
                {searchingPhones ? "Searching..." : "Search"}
              </button>
            </div>

            {phoneError && <p className="text-xs text-red-500">{phoneError}</p>}

            {availableNumbers.length > 0 && !phonePurchased && (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {availableNumbers.map((n) => (
                  <button
                    key={n.phoneNumber}
                    onClick={() => handlePurchasePhone(n.phoneNumber)}
                    disabled={purchasing}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-slate-100 hover:border-slate-300 hover:bg-slate-50 transition-all text-left disabled:opacity-50"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900">{n.friendlyName}</p>
                      <p className="text-xs text-slate-400">{n.locality}, {n.region}</p>
                    </div>
                    <span className="text-xs text-slate-500">${n.price}/mo</span>
                  </button>
                ))}
              </div>
            )}

            {purchasing && <p className="text-xs text-slate-400">Purchasing number...</p>}
          </div>
        )}

        {phonePurchased && (
          <div className="flex items-center gap-3 text-sm text-green-700 bg-green-50 rounded-xl px-4 py-3">
            <span>✓</span>
            <span>Your AI receptionist number is <strong>{selectedPhone}</strong>. Inbound texts will be answered instantly.</span>
          </div>
        )}
      </div>

      {/* Step 3: Calendar */}
      <div className="p-8 rounded-3xl bg-white border border-slate-100 shadow-sm mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${calendarConnected ? "bg-green-500 text-white" : "bg-slate-100 text-slate-400"}`}>
            {calendarConnected ? "✓" : "3"}
          </div>
          <div>
            <p className="text-sm font-medium">Connect your calendar</p>
            <p className="text-xs text-slate-400">So the AI knows your availability.</p>
          </div>
          {calendarConnected && <span className="ml-auto text-xs text-green-600 font-medium">Connected</span>}
        </div>

        <div className="max-w-sm">
          {calendarConnected ? (
            <div className="flex items-center gap-3 text-sm text-green-700 bg-green-50 rounded-xl px-4 py-3">
              <span>✓</span>
              <span>Google Calendar is connected.</span>
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

      {/* Step 4: Stripe */}
      <div className="p-8 rounded-3xl bg-white border border-slate-100 shadow-sm mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${stripeConnected ? "bg-green-500 text-white" : "bg-slate-100 text-slate-400"}`}>
            {stripeConnected ? "✓" : "4"}
          </div>
          <div>
            <p className="text-sm font-medium">Accept payments</p>
            <p className="text-xs text-slate-400">Connect Stripe so the AI can collect deposits.</p>
          </div>
          {stripeConnected && <span className="ml-auto text-xs text-green-600 font-medium">Connected</span>}
        </div>

        {!stripeConnected && (
          <div className="space-y-3">
            <p className="text-xs text-slate-400">
              Paste your Stripe secret key. Find it at{" "}
              <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-black">
                stripe.com/apikeys
              </a>
            </p>
            <input
              value={stripeKey}
              onChange={(e) => setStripeKey(e.target.value)}
              placeholder="sk_live_..."
              className="w-full border-b border-slate-200 py-3 text-sm focus:outline-none focus:border-black bg-transparent font-mono"
            />
            <input
              value={stripeWebhook}
              onChange={(e) => setStripeWebhook(e.target.value)}
              placeholder="Webhook signing secret (whsec_...) — optional, can add later"
              className="w-full border-b border-slate-200 py-3 text-sm focus:outline-none focus:border-black bg-transparent font-mono text-slate-400"
            />
            {stripeError && <p className="text-xs text-red-500">{stripeError}</p>}
            <button
              onClick={handleConnectStripe}
              disabled={connectingStripe || !stripeKey}
              className="px-6 py-3 bg-black text-white text-sm font-semibold rounded-full hover:bg-slate-800 transition-all disabled:opacity-50"
            >
              {connectingStripe ? "Verifying..." : "Connect Stripe"}
            </button>
          </div>
        )}

        {stripeConnected && (
          <div className="flex items-center gap-3 text-sm text-green-700 bg-green-50 rounded-xl px-4 py-3">
            <span>✓</span>
            <span>Stripe is connected. Deposits and payments will be processed automatically.</span>
          </div>
        )}
      </div>

      {/* Step 5: Go Live */}
      {readyToGoLive && (
        <>
          <div className="p-8 rounded-3xl bg-white border border-slate-100 shadow-sm mb-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold bg-slate-100 text-slate-400">
                5
              </div>
              <div>
                <p className="text-sm font-medium">Test drive your AI</p>
                <p className="text-xs text-slate-400">Text your new number and try to break it.</p>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-[#FAFAFA] border border-slate-100 mb-6">
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400 mb-3">Your AI receptionist number</p>
              <p className="text-3xl font-medium tracking-tight mb-2">{selectedPhone}</p>
              <p className="text-xs text-slate-500">Text it. Ask for something you don&rsquo;t offer. Try to book at 3 AM. See how the AI handles it.</p>
            </div>

            <div className="flex flex-wrap gap-2">
              {["Ask for an unoffered service", "Book at 3:00 AM", "Ask about pricing", "Try to reschedule"].map((test) => (
                <span key={test} className="text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">{test}</span>
              ))}
            </div>
          </div>

          <div className="p-8 rounded-3xl bg-white border border-slate-100 shadow-sm mb-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold bg-black text-white">
                6
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
                <p className="text-xs text-slate-500 mt-1">We&rsquo;ll text you a transcript every time the AI books an appointment.</p>
              </div>
            </label>

            <div className="bg-[#FAFAFA] rounded-2xl p-5 border border-slate-100 mb-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">What happens next</p>
              <ul className="space-y-2.5 text-sm text-slate-600">
                <li className="flex items-center gap-3"><span className="text-green-600">✓</span>Your AI receptionist goes live immediately</li>
                <li className="flex items-center gap-3"><span className="text-green-600">✓</span>Inbound texts answered in under 2 seconds</li>
                <li className="flex items-center gap-3"><span className="text-green-600">✓</span>Appointments written directly to your calendar</li>
                <li className="flex items-center gap-3"><span className="text-green-600">✓</span>Deposits collected via Stripe automatically</li>
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

      {!scraped && !phonePurchased && (
        <div className="text-center text-xs text-slate-400 mt-16">
          <p>Start by entering your website URL above. We handle the rest.</p>
        </div>
      )}

      {scraped && !phonePurchased && (
        <div className="text-center text-xs text-slate-400 mt-8">
          <p>Next, pick a phone number for your AI receptionist.</p>
        </div>
      )}
    </div>
  );
}
