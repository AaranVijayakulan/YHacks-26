import { useState } from 'react';
import { Columns2, Leaf, Monitor, RotateCcw, Settings, X } from 'lucide-react';
import type { ViewMode } from '../types.ts';

interface TopControlBarProps {
  viewMode: ViewMode;
  onChangeViewMode: (mode: ViewMode) => void;
  useLiveServerAi: boolean;
  onToggleLiveServerAi: (value: boolean) => void;
  autoLearnCache: boolean;
  onToggleAutoLearnCache: (value: boolean) => void;
  onResetSession: () => void;
  totalMessages: number;
}

export function TopControlBar({
  viewMode,
  onChangeViewMode,
  useLiveServerAi,
  onToggleLiveServerAi,
  autoLearnCache,
  onToggleAutoLearnCache,
  onResetSession,
  totalMessages,
}: TopControlBarProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="sticky top-0 z-50 border-b border-neutral-800 bg-[#1D1D1D] text-white">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-4 px-4 py-2.5 sm:px-6">
        {/* Left: EcoRoute Brand Mark */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#059669] text-white">
            <Leaf className="h-4 w-4" aria-hidden="true" />
          </div>
          <span className="font-[var(--font-display)] text-sm font-bold tracking-tight text-white whitespace-nowrap">
            EcoRoute
          </span>
          <span className="hidden md:inline text-xs text-neutral-400 whitespace-nowrap">
            Token-Optimization Router &amp; ESG Telemetry
          </span>
        </div>

        {/* Center: Prominent View Mode Toggle */}
        <div
          role="group"
          aria-label="Demo view mode"
          className="flex items-center gap-1 rounded-lg bg-neutral-800 p-1"
        >
          <button
            type="button"
            onClick={() => onChangeViewMode('storefront')}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
              viewMode === 'storefront'
                ? 'bg-white text-[#1D1D1D] shadow-xs'
                : 'text-neutral-300 hover:text-white'
            }`}
          >
            <Monitor className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Customer Storefront View</span>
          </button>
          <button
            type="button"
            onClick={() => onChangeViewMode('split')}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
              viewMode === 'split'
                ? 'bg-[#059669] text-white shadow-xs'
                : 'text-neutral-300 hover:text-white'
            }`}
          >
            <Columns2 className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Split-Screen Engine View (Live Math &amp; Router)</span>
          </button>
        </div>

        {/* Right: Compact Settings Button + Popover */}
        <div className="relative flex items-center gap-2 shrink-0">
          {totalMessages > 0 && (
            <button
              type="button"
              onClick={onResetSession}
              className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-800/80 px-2.5 py-1.5 text-xs font-medium text-neutral-200 transition-colors hover:bg-neutral-700 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setSettingsOpen((prev) => !prev)}
            aria-expanded={settingsOpen}
            aria-label="Open EcoRoute engine settings"
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-neutral-700 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <Settings className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Settings</span>
          </button>

          {settingsOpen && (
            <div className="absolute right-0 top-11 z-50 w-80 rounded-xl border border-neutral-200 bg-white p-4 text-[#1D1D1D] shadow-xl">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-2.5">
                <span className="font-[var(--font-display)] text-xs font-bold text-[#1D1D1D]">
                  EcoRoute Engine Settings
                </span>
                <button
                  type="button"
                  onClick={() => setSettingsOpen(false)}
                  aria-label="Close settings"
                  className="rounded p-1 text-neutral-400 hover:text-neutral-900"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="mt-3 space-y-3.5 text-xs">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[#1D1D1D]">
                      Live Server Gemini AI Replies
                    </p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-neutral-500">
                      Off = instant built-in deterministic replies (0ms). On = uses server-side
                      Gemini proxy (<code className="font-mono">/api/ecoroute-chat</code>) for
                      dynamic responses.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={useLiveServerAi}
                    onClick={() => onToggleLiveServerAi(!useLiveServerAi)}
                    className={`relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors ${
                      useLiveServerAi ? 'bg-[#059669]' : 'bg-neutral-300'
                    }`}
                  >
                    <span
                      className={`block h-4 w-4 translate-y-0.5 rounded-full bg-white shadow transition-transform ${
                        useLiveServerAi ? 'translate-x-4.5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-start justify-between gap-3 border-t border-neutral-100 pt-3">
                  <div>
                    <p className="font-semibold text-[#1D1D1D]">
                      Auto-Learn FAQ Vector Cache
                    </p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-neutral-500">
                      Automatically caches new Level 1–7 Q&amp;A pairs so repeat asks become 0% AI
                      cache hits.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={autoLearnCache}
                    onClick={() => onToggleAutoLearnCache(!autoLearnCache)}
                    className={`relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors ${
                      autoLearnCache ? 'bg-[#059669]' : 'bg-neutral-300'
                    }`}
                  >
                    <span
                      className={`block h-4 w-4 translate-y-0.5 rounded-full bg-white shadow transition-transform ${
                        autoLearnCache ? 'translate-x-4.5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
