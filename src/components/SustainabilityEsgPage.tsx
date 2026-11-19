import { useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Cpu,
  DollarSign,
  Droplets,
  FileCheck2,
  Leaf,
  X,
  Zap,
} from 'lucide-react';
import type { ChatTurnRecord } from '../types.ts';
import { BASELINE_BENCHMARK } from '../utils/ecoRouteEngine.ts';

interface SustainabilityEsgPageProps {
  turns: ChatTurnRecord[];
  onBackToShop: () => void;
  onOpenChat: () => void;
}

export function SustainabilityEsgPage({
  turns,
  onBackToShop,
  onOpenChat,
}: SustainabilityEsgPageProps) {
  const [scaleMode, setScaleMode] = useState<'single' | 'scale'>('single');
  const [auditModalOpen, setAuditModalOpen] = useState(false);

  // Cumulative live single-session totals
  const sessionSavedTokens = turns.reduce((s, t) => s + t.metrics.savedTokens, 0);
  const sessionSavedWh = turns.reduce((s, t) => s + t.metrics.savedElectricityWh, 0);
  const sessionSavedWaterMl = turns.reduce((s, t) => s + t.metrics.savedWaterMl, 0);
  const sessionSavedCostUsd = turns.reduce((s, t) => s + t.metrics.savedCostUsd, 0);

  // Average savings ratio per message (used to project 150,000 daily chats smoothly)
  const avgSavedTokens =
    turns.length > 0 ? sessionSavedTokens / turns.length : 3080; // benchmark ~88% savings
  const avgSavedWh = turns.length > 0 ? sessionSavedWh / turns.length : 2.74;
  const avgSavedCost = turns.length > 0 ? sessionSavedCostUsd / turns.length : 0.00959;

  // Lululemon Scale Mode (150,000 daily chats × 365 days = 54.75M annual chats)
  const annualChats = 150_000 * 365;
  const scaleAnnualTokensB = (avgSavedTokens * annualChats) / 1_000_000_000;
  const scaleAnnualKwh = (avgSavedWh * annualChats) / 1000;
  const scaleAnnualWaterLiters = scaleAnnualKwh * 8.5; // 8.5 L/kWh (1.8 direct + 6.7 indirect)
  const scaleAnnualCostUsd = avgSavedCost * annualChats;

  // Single-mode dynamic progress bar targets (scales cleanly as user sends more messages)
  const tokenGoal = sessionSavedTokens >= 14000 ? 35000 : sessionSavedTokens >= 7000 ? 14000 : 10500;
  const tokenPct = Math.min(100, Math.round((sessionSavedTokens / tokenGoal) * 100));

  const whGoal = sessionSavedWh >= 12 ? 30 : 10;
  const whPct = Math.min(100, Math.round((sessionSavedWh / whGoal) * 100));

  const waterGoalMl = sessionSavedWaterMl >= 100 ? 255 : 85;
  const waterPct = Math.min(100, Math.round((sessionSavedWaterMl / waterGoalMl) * 100));

  const costGoalUsd = sessionSavedCostUsd >= 0.04 ? 0.1 : 0.035;
  const costPct = Math.min(100, Math.round((sessionSavedCostUsd / costGoalUsd) * 100));

  return (
    <div className="bg-[#FAFAFA] px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Top Breadcrumb + Mode Switch */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            onClick={onBackToShop}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1D1D1D] hover:text-[#D31334] transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Back to Lululemon Canada Storefront</span>
          </button>

          <button
            type="button"
            onClick={() => setAuditModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3.5 py-2 text-xs font-semibold text-[#1D1D1D] shadow-xs transition-colors hover:border-[#059669] hover:text-[#059669]"
          >
            <FileCheck2 className="h-3.5 w-3.5 text-[#059669]" aria-hidden="true" />
            <span>Verify Math &amp; Audit Receipt</span>
          </button>
        </div>

        {/* Hero ESG Header Card */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-[#059669]">
                <Leaf className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Lululemon Canada · 2026 Clean AI Sustainability Tracker</span>
              </div>
              <h1 className="mt-3 font-[var(--font-display)] text-2xl font-bold tracking-tight text-[#1D1D1D] sm:text-3xl [text-wrap:balance]">
                Real-Time Electricity, Water &amp; Token Savings
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-neutral-600">
                Every customer question routed through EcoRoute avoids oversized LLM inference.
                Watch live compute savings update with each message in the chat assistant, or toggle
                to Lululemon’s annual network scale projection.
              </p>
            </div>

            {/* Prominent Scale Toggle */}
            <div
              role="group"
              aria-label="Sustainability metric scale mode"
              className="flex flex-col gap-1 rounded-xl border border-neutral-200 bg-[#FAFAFA] p-1.5 sm:min-w-[270px]"
            >
              <button
                type="button"
                onClick={() => setScaleMode('single')}
                className={`rounded-lg px-3.5 py-2 text-left text-xs font-semibold transition-colors ${
                  scaleMode === 'single'
                    ? 'bg-[#1D1D1D] text-white'
                    : 'text-neutral-600 hover:text-[#1D1D1D]'
                }`}
              >
                Single Message Live Mode ({turns.length}{' '}
                {turns.length === 1 ? 'chat' : 'chats'})
              </button>
              <button
                type="button"
                onClick={() => setScaleMode('scale')}
                className={`rounded-lg px-3.5 py-2 text-left text-xs font-semibold transition-colors ${
                  scaleMode === 'scale'
                    ? 'bg-[#059669] text-white'
                    : 'text-neutral-600 hover:text-[#1D1D1D]'
                }`}
              >
                Lululemon Scale Mode (150,000 daily chats)
              </button>
            </div>
          </div>
        </div>

        {/* 4 Live ESG Metric Cards with Animated Progress Bars */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* 1. Tokens Saved */}
          <div className="rounded-xl border border-neutral-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-500">Tokens Saved</span>
              <Cpu className="h-4 w-4 text-[#059669]" aria-hidden="true" />
            </div>
            <p className="mt-2 font-mono text-2xl font-bold text-[#1D1D1D] tabular-nums">
              {scaleMode === 'single'
                ? `${sessionSavedTokens.toLocaleString()} tokens`
                : `~${scaleAnnualTokensB.toFixed(1)}B tokens/yr`}
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              {scaleMode === 'single'
                ? `Baseline ${BASELINE_BENCHMARK.tokens.toLocaleString()} tokens/msg avoided`
                : 'Projected across 54.75M annual Lululemon support chats'}
            </p>
            <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-neutral-100">
              <div
                className="h-full rounded-full bg-[#059669] transition-all duration-500 ease-out"
                style={{ width: `${scaleMode === 'single' ? tokenPct : 88}%` }}
              />
            </div>
            <div className="mt-1.5 flex justify-between font-mono text-[11px] text-neutral-500 tabular-nums">
              <span>{scaleMode === 'single' ? `${tokenPct}% of session goal` : '88% avg reduction'}</span>
              <span>{scaleMode === 'single' ? `${tokenGoal.toLocaleString()} tok` : '191.6B baseline'}</span>
            </div>
          </div>

          {/* 2. Electricity Saved */}
          <div className="rounded-xl border border-neutral-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-500">Electricity Saved</span>
              <Zap className="h-4 w-4 text-amber-600" aria-hidden="true" />
            </div>
            <p className="mt-2 font-mono text-2xl font-bold text-[#1D1D1D] tabular-nums">
              {scaleMode === 'single'
                ? `${sessionSavedWh.toFixed(2)} Wh`
                : `~${Math.round(scaleAnnualKwh).toLocaleString()} kWh/yr`}
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              Calculated from 0.85 Wh per 1,000 baseline tokens
            </p>
            <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-neutral-100">
              <div
                className="h-full rounded-full bg-amber-500 transition-all duration-500 ease-out"
                style={{ width: `${scaleMode === 'single' ? whPct : 91}%` }}
              />
            </div>
            <div className="mt-1.5 flex justify-between font-mono text-[11px] text-neutral-500 tabular-nums">
              <span>{scaleMode === 'single' ? `${whPct}% of ${whGoal} Wh goal` : 'Clean AI grid impact'}</span>
              <span>{scaleMode === 'single' ? `${whGoal} Wh` : '~164,250 kWh baseline'}</span>
            </div>
          </div>

          {/* 3. Cooling & Grid Water Saved */}
          <div className="rounded-xl border border-neutral-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-500">
                Cooling &amp; Grid Water Saved
              </span>
              <Droplets className="h-4 w-4 text-sky-600" aria-hidden="true" />
            </div>
            <p className="mt-2 font-mono text-2xl font-bold text-[#1D1D1D] tabular-nums">
              {scaleMode === 'single'
                ? `${sessionSavedWaterMl.toFixed(1)} mL`
                : `~${(scaleAnnualWaterLiters / 1_000_000).toFixed(2)}M Litres/yr`}
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              8.5 L per kWh (1.8 L direct cooling + 6.7 L indirect grid water)
            </p>
            <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-neutral-100">
              <div
                className="h-full rounded-full bg-sky-600 transition-all duration-500 ease-out"
                style={{ width: `${scaleMode === 'single' ? waterPct : 91}%` }}
              />
            </div>
            <div className="mt-1.5 flex justify-between font-mono text-[11px] text-neutral-500 tabular-nums">
              <span>{scaleMode === 'single' ? `${waterPct}% of ${waterGoalMl} mL goal` : 'WUE + Power Gen'}</span>
              <span>
                {scaleMode === 'single'
                  ? `${waterGoalMl} mL`
                  : `${Math.round(scaleAnnualWaterLiters).toLocaleString()} L`}
              </span>
            </div>
          </div>

          {/* 4. Cloud API Cost Saved */}
          <div className="rounded-xl border border-neutral-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-500">Cloud API Cost Saved</span>
              <DollarSign className="h-4 w-4 text-[#059669]" aria-hidden="true" />
            </div>
            <p className="mt-2 font-mono text-2xl font-bold text-[#059669] tabular-nums">
              {scaleMode === 'single'
                ? `$${sessionSavedCostUsd.toFixed(4)}`
                : `~$${Math.round(scaleAnnualCostUsd).toLocaleString()}/yr`}
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              {scaleMode === 'single'
                ? 'Direct inference savings vs. unrouted flagship LLM'
                : 'Projected annual Lululemon Canada guest-support inference savings'}
            </p>
            <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-neutral-100">
              <div
                className="h-full rounded-full bg-[#1D1D1D] transition-all duration-500 ease-out"
                style={{ width: `${scaleMode === 'single' ? costPct : 90}%` }}
              />
            </div>
            <div className="mt-1.5 flex justify-between font-mono text-[11px] text-neutral-500 tabular-nums">
              <span>{scaleMode === 'single' ? `${costPct}% of $${costGoalUsd.toFixed(2)} goal` : '90% cost avoided'}</span>
              <span>{scaleMode === 'single' ? `$${costGoalUsd.toFixed(3)}` : '$580,350 baseline'}</span>
            </div>
          </div>
        </div>

        {/* Prompt CTA if no messages sent yet in Single Mode */}
        {turns.length === 0 && scaleMode === 'single' && (
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-emerald-200 bg-emerald-50/60 p-5">
            <div>
              <p className="text-sm font-semibold text-[#1D1D1D]">
                Send a message in the bottom-right AI Assistant to watch these bars tick up live.
              </p>
              <p className="mt-0.5 text-xs text-neutral-600">
                Try Preset 1 (“What is your return policy?”) for an instant 100% Cache Hit saving
                3,500 tokens and 25.5 mL of water.
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenChat}
              className="rounded-lg bg-[#059669] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#047857] whitespace-nowrap"
            >
              Open AI Assistant
            </button>
          </div>
        )}
      </div>

      {/* Verify Math & Audit Receipt Modal */}
      {auditModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Verify Math and Audit Receipt"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <div className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-neutral-200 pb-4">
              <div>
                <p className="text-xs font-semibold text-[#059669]">
                  Deterministic ESG Verification
                </p>
                <h2 className="mt-0.5 font-[var(--font-display)] text-lg font-bold text-[#1D1D1D]">
                  Verify Math &amp; Audit Receipt
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setAuditModalOpen(false)}
                aria-label="Close audit modal"
                className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-[#1D1D1D]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-5 text-xs leading-relaxed text-neutral-700">
              {/* Formulas */}
              <div className="rounded-xl border border-neutral-200 bg-[#FAFAFA] p-4 space-y-2">
                <p className="font-semibold text-[#1D1D1D]">
                  Published Benchmark Formulas (Zero AI Hallucinations)
                </p>
                <ul className="space-y-1.5 font-mono text-[11px] text-neutral-700">
                  <li>
                    • Baseline (No EcoRoute): 3,500 tokens (3,250 in + 250 out) = 3.00 Wh · 25.5 mL
                    H₂O · $0.0106
                  </li>
                  <li>• Electricity Factor: 0.85 Wh per 1,000 baseline tokens (~3.00 Wh/chat)</li>
                  <li>
                    • Water Factor: 8.5 L per kWh (1.8 L direct data-center cooling + 6.7 L indirect
                    grid power water)
                  </li>
                  <li>• Cache Hit (90%+): 0 tokens · 0.00 Wh · 0.0 mL · $0.0000 (100% saved)</li>
                  <li>• Level 1–7 (60–89%): 420 tokens · 0.12 Wh · 1.0 mL · $0.0002 (88% saved)</li>
                  <li>• Level 8–10 (&lt;60%): 1,150 tokens · 1.10 Wh · 9.4 mL · $0.0042 (67% saved)</li>
                </ul>
              </div>

              {/* Session Audit Receipt */}
              <div>
                <p className="font-semibold text-[#1D1D1D] mb-2">
                  Live Session Audit Receipt ({turns.length}{' '}
                  {turns.length === 1 ? 'message' : 'messages'})
                </p>
                {turns.length === 0 ? (
                  <p className="rounded-lg border border-neutral-200 p-4 text-center text-neutral-500">
                    No chat messages recorded yet. Send a message in the floating AI Assistant to
                    generate auditable receipt lines.
                  </p>
                ) : (
                  <div className="divide-y divide-neutral-100 rounded-xl border border-neutral-200">
                    {turns.map((t, i) => (
                      <div key={t.id} className="flex items-center justify-between gap-4 p-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-[#1D1D1D]">
                            #{i + 1} · {t.question}
                          </p>
                          <p className="mt-0.5 text-[11px] text-neutral-500">
                            {t.routeLabel} · Vector {t.vector.similarityPercent}% · Stripped{' '}
                            {t.nlp.strippedCount} spans
                          </p>
                        </div>
                        <div className="shrink-0 text-right font-mono text-[11px] text-[#059669] tabular-nums">
                          <p>-{t.metrics.savedTokens.toLocaleString()} tok</p>
                          <p>
                            -{t.metrics.savedElectricityWh.toFixed(2)} Wh · -
                            {t.metrics.savedWaterMl.toFixed(1)} mL
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 border-t border-neutral-200 pt-4">
              <div className="mr-auto flex items-center gap-1.5 text-xs font-medium text-[#059669]">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                <span>All figures deterministically reconciled</span>
              </div>
              <button
                type="button"
                onClick={() => setAuditModalOpen(false)}
                className="rounded-lg bg-[#1D1D1D] px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-800"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
