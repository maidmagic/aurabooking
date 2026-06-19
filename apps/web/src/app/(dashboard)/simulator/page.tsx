"use client";

import { useState } from "react";

const COST_PER_LLM_CALL = 0.0025;
const COST_PER_SMS = 0.0079;

export default function SafetySimulator() {
  const [messagesPerMin, setMessagesPerMin] = useState(30);
  const [hasLoopProtection, setHasLoopProtection] = useState(true);
  const [hasRateLimit, setHasRateLimit] = useState(true);
  const [hasCircuitBreaker, setHasCircuitBreaker] = useState(true);
  const [hasTenantGate, setHasTenantGate] = useState(true);

  const msgsPerHour = messagesPerMin * 60;
  const msgsPerDay = msgsPerHour * 12;

  const botMultiplier = hasLoopProtection && hasRateLimit && hasCircuitBreaker && hasTenantGate ? 0.05 : 0.3;
  const botMessages = Math.round(msgsPerDay * botMultiplier);
  const totalMessages = msgsPerDay + botMessages;

  const baseCost = msgsPerDay * (COST_PER_LLM_CALL + COST_PER_SMS);
  const botCost = botMessages * (COST_PER_LLM_CALL + COST_PER_SMS);
  const totalCost = baseCost + botCost;
  const savedCost = botMessages > 0
    ? Math.round((msgsPerDay * 0.3 - botMessages) * (COST_PER_LLM_CALL + COST_PER_SMS) * 100) / 100
    : 0;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-10">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 mb-2">
          Traffic &amp; Cost Simulator
        </h1>
        <p className="text-sm text-slate-500">
          Adjust the incoming message volume and toggle safety nets to see their impact on infrastructure costs.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Controls */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-6">Traffic Volume</p>
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-slate-600">Incoming messages / min</span>
                <span className="text-lg font-semibold text-slate-900">{messagesPerMin}</span>
              </div>
              <input
                type="range"
                min="1"
                max="200"
                value={messagesPerMin}
                onChange={(e) => setMessagesPerMin(Number(e.target.value))}
                className="w-full accent-black"
              />
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>1</span>
                <span>200</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">Safety Nets</p>
            <div className="space-y-4">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="text-sm font-medium text-slate-900">Loop protection</p>
                  <p className="text-xs text-slate-400">Pauses AI after &gt;10 msgs in 5 min</p>
                </div>
                <input
                  type="checkbox"
                  checked={hasLoopProtection}
                  onChange={(e) => setHasLoopProtection(e.target.checked)}
                  className="h-5 w-5 rounded border-slate-300 text-black focus:ring-black"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="text-sm font-medium text-slate-900">Rate limiting</p>
                  <p className="text-xs text-slate-400">20 msgs / 60s per sender</p>
                </div>
                <input
                  type="checkbox"
                  checked={hasRateLimit}
                  onChange={(e) => setHasRateLimit(e.target.checked)}
                  className="h-5 w-5 rounded border-slate-300 text-black focus:ring-black"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="text-sm font-medium text-slate-900">Circuit breaker</p>
                  <p className="text-xs text-slate-400">Skips API after 5 failures</p>
                </div>
                <input
                  type="checkbox"
                  checked={hasCircuitBreaker}
                  onChange={(e) => setHasCircuitBreaker(e.target.checked)}
                  className="h-5 w-5 rounded border-slate-300 text-black focus:ring-black"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="text-sm font-medium text-slate-900">Tenant resource gate</p>
                  <p className="text-xs text-slate-400">Blocks over-quota tenants</p>
                </div>
                <input
                  type="checkbox"
                  checked={hasTenantGate}
                  onChange={(e) => setHasTenantGate(e.target.checked)}
                  className="h-5 w-5 rounded border-slate-300 text-black focus:ring-black"
                />
              </label>
            </div>
          </div>

          <div className="bg-[#FAFAFA] rounded-3xl border border-slate-100 p-5 text-xs text-slate-500 leading-relaxed">
            <span className="font-semibold text-slate-700">How it works: </span>
            Without safety nets, bot traffic (loops, spoofs, retries) inflates costs by ~30%.
            Each toggle represents a guardrail actively blocking that waste.
            <span className="block mt-2">
              <span className="text-green-600 font-medium">Protected: </span>
              95% of anomalous traffic blocked.
              <span className="block text-red-500 font-medium mt-1">Unprotected: </span>
              Only basic filtering applied.
            </span>
          </div>
        </div>

        {/* Results */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">Daily Projection</p>

            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-slate-50">
                <span className="text-sm text-slate-600">Real customer messages</span>
                <span className="text-lg font-semibold text-slate-900">{msgsPerDay.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-slate-50">
                <span className="text-sm text-slate-600">Anomalous / bot traffic</span>
                <span className={`text-lg font-semibold ${botMessages > 0 ? "text-red-500" : "text-green-600"}`}>
                  {botMessages.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-slate-50">
                <span className="text-sm text-slate-600">Total AI calls</span>
                <span className="text-lg font-semibold text-slate-900">{totalMessages.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">Cost Breakdown</p>

            <div className="space-y-3">
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-slate-600">LLM calls</span>
                <span className="text-sm font-medium">
                  ${(totalMessages * COST_PER_LLM_CALL).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-slate-600">SMS delivery</span>
                <span className="text-sm font-medium">
                  ${(totalMessages * COST_PER_SMS).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center py-3 border-t border-slate-100 mt-2">
                <span className="text-sm font-semibold text-slate-900">Daily total</span>
                <span className={`text-xl font-semibold ${botMessages > msgsPerDay * 0.1 ? "text-red-600" : "text-green-700"}`}>
                  ${totalCost.toFixed(2)}
                </span>
              </div>

              {savedCost > 0 && (
                <div className="bg-green-50 rounded-xl px-4 py-3 mt-3">
                  <p className="text-sm font-medium text-green-800">
                    Safety nets saving ~${savedCost.toFixed(2)}/day
                  </p>
                  <p className="text-xs text-green-600 mt-0.5">
                    ${(savedCost * 30).toFixed(0)}/mo projected
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">Status</p>
            <div className="space-y-2">
              {[
                { label: "Loop detection", active: hasLoopProtection },
                { label: "Rate limiting", active: hasRateLimit },
                { label: "Circuit breaker", active: hasCircuitBreaker },
                { label: "Resource gate", active: hasTenantGate },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2 text-sm">
                  <span className={`w-2 h-2 rounded-full ${item.active ? "bg-green-500" : "bg-red-500"}`} />
                  <span className="text-slate-600">{item.label}:</span>
                  <span className="font-medium">{item.active ? "Active" : "Off"}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
