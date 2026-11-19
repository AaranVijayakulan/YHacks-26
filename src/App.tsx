import { useEffect, useState } from 'react';
import { EcoRouteInspector } from './components/EcoRouteInspector.tsx';
import { FloatingChatWidget } from './components/FloatingChatWidget.tsx';
import { LululemonCanadaStorefront } from './components/LululemonCanadaStorefront.tsx';
import { TopControlBar } from './components/TopControlBar.tsx';
import type { ChatTurnRecord, FaqCacheEntry, StorefrontPage, ViewMode } from './types.ts';
import {
  buildTurnRecord,
  determineRoutePath,
  generateDeterministicLululemonReply,
  INITIAL_FAQ_CACHE,
  runStage1NlpStripper,
  runStage2VectorCheck,
} from './utils/ecoRouteEngine.ts';

const TURNS_STORAGE_KEY = 'ecoroute_lulu_turns_v2';
const CACHE_STORAGE_KEY = 'ecoroute_lulu_faq_cache_v1';

export default function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('storefront');
  const [storefrontPage, setStorefrontPage] = useState<StorefrontPage>('home');
  const [chatOpen, setChatOpen] = useState(false);
  const [useLiveServerAi, setUseLiveServerAi] = useState(false);
  const [autoLearnCache, setAutoLearnCache] = useState(true);
  const [isSending, setIsSending] = useState(false);

  const [turns, setTurns] = useState<ChatTurnRecord[]>(() => {
    try {
      const raw = localStorage.getItem(TURNS_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as ChatTurnRecord[]) : [];
    } catch {
      return [];
    }
  });

  const [faqCache, setFaqCache] = useState<FaqCacheEntry[]>(() => {
    try {
      const raw = localStorage.getItem(CACHE_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as FaqCacheEntry[]) : INITIAL_FAQ_CACHE;
    } catch {
      return INITIAL_FAQ_CACHE;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(TURNS_STORAGE_KEY, JSON.stringify(turns));
    } catch {
      // Ignore quota issues
    }
  }, [turns]);

  useEffect(() => {
    try {
      localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(faqCache));
    } catch {
      // Ignore quota issues
    }
  }, [faqCache]);

  const handleSendMessage = async (questionText: string) => {
    const trimmed = questionText.trim();
    if (!trimmed || isSending) return;

    setIsSending(true);
    setChatOpen(true);

    try {
      // Stage 1: Deterministic Python-style NLP & NER Stripper (0% AI, 1ms CPU)
      const nlp = runStage1NlpStripper(trimmed);

      // Stage 2: 22MB MiniLM Vector Similarity Check (0% GenAI, 2ms CPU)
      const vector = runStage2VectorCheck(nlp.strippedPrompt, faqCache);

      // Route path decision
      const routePath = determineRoutePath(vector);
      const matchedFaq = faqCache.find((item) => item.id === vector.matchedFaqId);

      let answer = generateDeterministicLululemonReply(
        routePath,
        nlp.strippedPrompt,
        matchedFaq
      );
      let usedLiveAi = false;
      let liveThoughts: string[] | undefined;

      // Optional live server-side Gemini AI call when user enables it in Settings (for non-cache paths)
      if (useLiveServerAi && routePath !== 'CACHE_HIT') {
        try {
          const res = await fetch('/api/ecoroute-chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              cleanedPrompt: nlp.strippedPrompt,
              tier: routePath === 'LEVEL_8_10' ? 'HIGH' : 'LOW',
            }),
          });
          if (res.ok) {
            const payload = (await res.json()) as { answer?: string; thoughts?: string[] };
            if (payload.answer) {
              answer = payload.answer;
              usedLiveAi = true;
            }
            if (Array.isArray(payload.thoughts) && payload.thoughts.length > 0) {
              liveThoughts = payload.thoughts;
            }
          }
        } catch {
          // Keep deterministic Lululemon reply if live server call is unavailable
        }
      }

      // Cache updates: increment hits on CACHE_HIT, or learn new entry on LEVEL_1_7
      let addedToCache = false;
      if (routePath === 'CACHE_HIT' && matchedFaq) {
        setFaqCache((prev) =>
          prev.map((entry) =>
            entry.id === matchedFaq.id ? { ...entry, hits: entry.hits + 1 } : entry
          )
        );
      } else if (routePath === 'LEVEL_1_7' && autoLearnCache) {
        const normalizedQuestion = nlp.strippedPrompt;
        const alreadyExists = faqCache.some(
          (e) => e.question.toLowerCase() === normalizedQuestion.toLowerCase()
        );
        if (!alreadyExists) {
          addedToCache = true;
          const newEntry: FaqCacheEntry = {
            id: `faq-${Date.now()}`,
            question: normalizedQuestion,
            answer,
            category: 'Learned in Session',
            hits: 1,
            source: 'learned',
            addedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };
          setFaqCache((prev) => [newEntry, ...prev]);
        }
      }

      const record = buildTurnRecord({
        question: trimmed,
        nlp,
        vector,
        routePath,
        answer,
        addedToCache,
        usedLiveAi,
        liveThoughts,
      });

      setTurns((prev) => [...prev, record]);
    } finally {
      setIsSending(false);
    }
  };

  const handleResetSession = () => {
    setTurns([]);
    setFaqCache(INITIAL_FAQ_CACHE);
    try {
      localStorage.removeItem(TURNS_STORAGE_KEY);
      localStorage.removeItem(CACHE_STORAGE_KEY);
    } catch {
      // Ignore
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-white text-[#1D1D1D]">
      <TopControlBar
        viewMode={viewMode}
        onChangeViewMode={setViewMode}
        useLiveServerAi={useLiveServerAi}
        onToggleLiveServerAi={setUseLiveServerAi}
        autoLearnCache={autoLearnCache}
        onToggleAutoLearnCache={setAutoLearnCache}
        onResetSession={handleResetSession}
        totalMessages={turns.length}
      />

      {viewMode === 'storefront' ? (
        <main className="flex-1">
          <LululemonCanadaStorefront
            activePage={storefrontPage}
            onChangePage={setStorefrontPage}
            turns={turns}
            onOpenChat={() => setChatOpen(true)}
          />
        </main>
      ) : (
        <main className="grid flex-1 grid-cols-1 lg:grid-cols-2">
          {/* Left 50%: Lululemon Canada Storefront */}
          <div className="min-w-0 overflow-y-auto">
            <LululemonCanadaStorefront
              activePage={storefrontPage}
              onChangePage={setStorefrontPage}
              turns={turns}
              onOpenChat={() => setChatOpen(true)}
              compact
            />
          </div>

          {/* Right 50%: Live EcoRoute Engine Inspector */}
          <div className="min-w-0 lg:sticky lg:top-[53px] lg:h-[calc(100vh-53px)]">
            <EcoRouteInspector
              turns={turns}
              faqCache={faqCache}
              onSendMessage={handleSendMessage}
              isSending={isSending}
            />
          </div>
        </main>
      )}

      {/* Persistent Floating AI Assistant Widget on Every Page */}
      <FloatingChatWidget
        turns={turns}
        isSending={isSending}
        onSendMessage={handleSendMessage}
        isOpen={chatOpen}
        onToggleOpen={setChatOpen}
        onOpenSplitView={() => setViewMode('split')}
      />
    </div>
  );
}
