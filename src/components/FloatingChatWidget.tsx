import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { ArrowUp, Leaf, User, X } from 'lucide-react';
import type { ChatTurnRecord } from '../types.ts';
import { PRESET_PROMPTS } from '../utils/ecoRouteEngine.ts';
import { MarkdownText } from './MarkdownText.tsx';

interface FloatingChatWidgetProps {
  turns: ChatTurnRecord[];
  isSending: boolean;
  onSendMessage: (text: string) => void;
  isOpen: boolean;
  onToggleOpen: (open: boolean) => void;
  onOpenSplitView: () => void;
}

export function FloatingChatWidget({
  turns,
  isSending,
  onSendMessage,
  isOpen,
  onToggleOpen,
  onOpenSplitView,
}: FloatingChatWidgetProps) {
  const [input, setInput] = useState('');
  const [hovered, setHovered] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isOpen && turns.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [isOpen, turns.length, isSending]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isSending) return;
    setInput('');
    onSendMessage(trimmed);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const trimmed = input.trim();
      if (!trimmed || isSending) return;
      setInput('');
      onSendMessage(trimmed);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Sleek 360px Rectangular Chat Popup */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Lululemon Canada AI Assistant"
          className="mb-3 flex w-[360px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-neutral-200 bg-[#1D1D1D] px-4 py-3 text-white">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#6B7280] text-white">
                <User className="h-4 w-4" aria-hidden="true" />
              </div>
              <div>
                <p className="font-[var(--font-display)] text-xs font-bold text-white">
                  lululemon Guest Assistant
                </p>
                <p className="text-[11px] text-neutral-300">
                  Optimized by EcoRoute Clean AI
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onToggleOpen(false)}
              aria-label="Close AI Assistant"
              className="rounded-lg p-1 text-neutral-300 transition-colors hover:bg-neutral-800 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Conversation Body */}
          <div className="h-64 overflow-y-auto bg-[#FAFAFA] p-3.5 space-y-3">
            {turns.length === 0 ? (
              <div className="rounded-xl border border-neutral-200 bg-white p-3.5 text-xs leading-relaxed text-neutral-600">
                <p className="font-semibold text-[#1D1D1D]">
                  Hi there — welcome to lululemon Canada.
                </p>
                <p className="mt-1">
                  Ask a question below or tap one of the 3 demo presets to watch EcoRoute strip
                  filler, match vector caches, and save electricity &amp; water in real time.
                </p>
              </div>
            ) : (
              turns.map((turn) => (
                <div key={turn.id} className="space-y-2">
                  {/* Customer message */}
                  <div className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-[#1D1D1D] px-3.5 py-2 text-xs leading-relaxed text-white">
                      {turn.question}
                    </div>
                  </div>

                  {/* Assistant reply */}
                  <div className="flex flex-col items-start">
                    <div className="max-w-[92%] rounded-2xl rounded-bl-sm border border-neutral-200 bg-white px-3.5 py-2.5 text-xs text-neutral-800">
                      <MarkdownText content={turn.answer} />
                      <div className="mt-2 flex items-center justify-between gap-2 border-t border-neutral-100 pt-1.5 text-[10px] text-neutral-500">
                        <span className="inline-flex items-center gap-1 font-medium text-[#059669]">
                          <Leaf className="h-3 w-3" aria-hidden="true" />
                          {turn.routeLabel}
                        </span>
                        <span className="font-mono tabular-nums">
                          -{turn.metrics.savedTokens.toLocaleString()} tok ·{' '}
                          {turn.metrics.savedWaterMl.toFixed(1)} mL
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}

            {isSending && (
              <div className="rounded-xl border border-neutral-200 bg-white px-3.5 py-2 text-xs text-neutral-500">
                Running Stage 1 NLP &rarr; Stage 2 MiniLM Vector Check...
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* 3 One-Click Demo Presets */}
          <div className="border-t border-neutral-200 bg-white px-3 pt-2.5 pb-2">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                Demo Presets
              </span>
              <button
                type="button"
                onClick={onOpenSplitView}
                className="text-[11px] font-medium text-[#059669] hover:underline"
              >
                Inspect Math &rarr;
              </button>
            </div>
            <div className="flex flex-col gap-1.5">
              {PRESET_PROMPTS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  disabled={isSending}
                  onClick={() => onSendMessage(preset.text)}
                  className="w-full rounded-lg border border-neutral-200 bg-[#FAFAFA] px-2.5 py-1.5 text-left transition-colors hover:border-[#059669] hover:bg-emerald-50/40 disabled:opacity-50"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-[#1D1D1D]">
                      {preset.badge}
                    </span>
                  </div>
                  <p className="truncate text-[11px] text-neutral-500">{preset.text}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Text Input Box */}
          <form
            onSubmit={handleSubmit}
            className="flex items-end gap-2 border-t border-neutral-200 bg-white p-3"
          >
            <label htmlFor="floating-chat-input" className="sr-only">
              Ask lululemon AI Assistant
            </label>
            <textarea
              id="floating-chat-input"
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isSending}
              placeholder="Ask about returns, Align sizing, or gear..."
              className="flex-1 resize-none rounded-lg border border-neutral-200 bg-[#FAFAFA] px-2.5 py-1.5 text-xs text-[#1D1D1D] placeholder:text-neutral-400 focus:border-neutral-400 focus:bg-white focus:outline-none"
            />
            <button
              type="submit"
              disabled={!input.trim() || isSending}
              aria-label="Send message"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#D31334] text-white transition-colors hover:bg-[#B80F2C] disabled:opacity-40"
            >
              <ArrowUp className="h-4 w-4" aria-hidden="true" />
            </button>
          </form>
        </div>
      )}

      {/* Circular Grey Default-Avatar Person Button + Hover Tooltip */}
      <div
        className="relative flex items-center"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {hovered && !isOpen && (
          <div
            role="tooltip"
            className="mr-3 rounded-lg bg-[#1D1D1D] px-3 py-1.5 text-xs font-medium text-white shadow-lg whitespace-nowrap"
          >
            AI Assistant — How can I help?
          </div>
        )}

        <button
          type="button"
          onClick={() => onToggleOpen(!isOpen)}
          aria-label="AI Assistant — How can I help?"
          aria-expanded={isOpen}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-[#6B7280] text-white shadow-lg ring-2 ring-white transition-transform hover:scale-105 hover:bg-[#4B5563] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#059669]"
        >
          <User className="h-7 w-7 text-white" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
