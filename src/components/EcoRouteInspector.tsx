import { useEffect, useState } from 'react';
import {
  BookOpen,
  BrainCircuit,
  Calculator,
  Check,
  Code2,
  Copy,
  Cpu,
  DollarSign,
  Droplets,
  Filter,
  GitBranch,
  Layers,
  Leaf,
  Sparkles,
  Terminal,
  Zap,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type {
  ChatTurnRecord,
  FaqCacheEntry,
  InspectorTab,
  PipelineStepSubTab,
} from '../types.ts';
import {
  BASELINE_BENCHMARK,
  computeDifficultyScore,
  PRESET_PROMPTS,
  scoreAllCachedFaqs,
} from '../utils/ecoRouteEngine.ts';

interface EcoRouteInspectorProps {
  turns: ChatTurnRecord[];
  faqCache: FaqCacheEntry[];
  onSendMessage: (text: string) => void;
  isSending: boolean;
}

const RAW_POLICY_EXCERPT = `LULULEMON ATHLETICA CANADA INC. — MASTER GUEST EDUCATION POLICY MANUAL (2,500 WORDS)
Section 1.1 General Return Eligibility: Guests returning merchandise purchased via shop.lululemon.com/en-ca or brick-and-mortar retail locations across British Columbia, Alberta, Saskatchewan, Manitoba, Ontario, Quebec, New Brunswick, Nova Scotia, Prince Edward Island, Newfoundland and Labrador must present items in unworn, unwashed condition with original hangtags affixed within thirty (30) calendar days of fulfillment...
Section 1.2 Exceptions & We Made Too Much: Markdown items designated as Final Sale are ineligible for standard tender refunds unless covered by statutory provincial consumer protection or Lululemon Quality Promise seam/fabric manufacturing defects...`;

const COMPRESSED_CHEAT_SHEET = `# LULULEMON CANADA CHEAT SHEET (380 WORDS · STEP 0 COMPRESSED)
- Standard Returns: 30 days, unworn/unwashed, tags attached, free mail or in-store.
- Gifts: Gift receipt or purchaser email lookup; refunds to e-gift card.
- Final Sale (WMTM): Non-returnable unless manufacturing defect (Quality Promise).
- Quality Promise: Free seam repair or e-gift card replacement upon store/GEC inspection.
- Missing Receipt: Look up via Membership email/phone or store Quality Promise check.
- Gift Cards: Never expire in Canada; dated promo credits verified by GEC.`;

const STEP_CODE_BLOCKS: Record<
  PipelineStepSubTab,
  {
    stepNumber: PipelineStepSubTab;
    tabTitle: string;
    shortLabel: string;
    ruleSummary: string;
    codeTitle: string;
    languageLabel: string;
    code: string;
  }
> = {
  0: {
    stepNumber: 0,
    tabTitle: '0 · Rulebook & FAQ',
    shortLabel: 'Pre-Launch Cache',
    ruleSummary:
      'Before launching, run the high AI agent once to build a condensed rulebook (2,500w → 380w) and pre-cache basic FAQ answers as 22MB encoder vectors.',
    codeTitle: 'Step 0 · Pre-Launch Rulebook Condenser & FAQ Vector Seeder',
    languageLabel: 'Python · Run Once Pre-Launch',
    code: `# Step 0: Run High-AI Agent ONCE before launch to condense rulebook & seed FAQ cache
def build_prelaunch_cache(high_ai_agent, minilm_22mb_encoder, raw_manual: str, raw_faqs: list[dict]):
    # 1. Compress 2,500-word company manual into a 380-word runtime cheat sheet
    condensed_rulebook = high_ai_agent.summarize(
        system="Compress policy into dense bullet rules preserving all return/defect clauses.",
        text=raw_manual,
        max_words=380,
    )

    # 2. Vectorize basic FAQ Q&As once with the 22MB encoder for 0-token runtime hits
    faq_vector_cache = []
    for item in raw_faqs:
        unit_vec = minilm_22mb_encoder.encode(item["question"], normalize_embeddings=True)
        faq_vector_cache.append({
            "id": item["id"],
            "question": item["question"],
            "answer": item["answer"],
            "vector": unit_vec,  # Saved in RAM/Redis for 2ms lookup
            "hits": 0,
        })

    return {"rulebook": condensed_rulebook, "faq_cache": faq_vector_cache}`,
  },
  1: {
    stepNumber: 1,
    tabTitle: '1 · NLP & NER',
    shortLabel: 'Strip Noise',
    ruleSummary:
      'Python NLP & NER scripts strip cities, dates, names, pronouns, and irrelevant conversational fluff before any model touches the prompt.',
    codeTitle: 'Step 1 · Python NLP & NER Prompt Sanitizer (0% AI · 1ms CPU)',
    languageLabel: 'Python · Regex + NER',
    code: `# Step 1: Strip irrelevant cities, dates, names, pronouns & filler (0% AI · 1ms CPU)
import re

NER_AND_FILLER_RULES = [
    ("DATE",    r"\\b(last\\s+(?:tuesday|monday|week)|yesterday|today)\\b"),
    ("CITY",    r"\\b(?:in\\s+)?(toronto|vancouver|markham|montreal|calgary|ottawa)\\b"),
    ("NAME",    r"\\b(?:my name is|i'm|this is)\\s+[A-Z][a-z]+(?:\\s+[A-Z][a-z]+)?\\b"),
    ("PRONOUN", r"\\b(for\\s+my\\s+(?:sister|brother|friend)|i|me|my|myself)\\b"),
    ("FILLER",  r"\\b(hey|hi|hello|basically|um|uh|actually|please|thanks)\\b"),
]

def strip_irrelevant_details(raw_prompt: str) -> dict:
    cleaned = raw_prompt.strip()
    removed = []
    for label, pattern in NER_AND_FILLER_RULES:
        for match in re.finditer(pattern, cleaned, flags=re.IGNORECASE):
            removed.append({"category": label, "text": match.group(0)})
        cleaned = re.sub(pattern, " ", cleaned, flags=re.IGNORECASE)

    cleaned = re.sub(r"\\s{2,}", " ", cleaned).strip(" ,.-")
    return {
        "cleaned_prompt": cleaned or raw_prompt,
        "removed_spans": removed,
        "words_before": len(raw_prompt.split()),
        "words_after": len(cleaned.split()),
    }`,
  },
  2: {
    stepNumber: 2,
    tabTitle: '2 · 22MB Vector',
    shortLabel: 'Encode & Scan',
    ruleSummary:
      'Tiny 22MB MiniLM encoder turns the cleaned question into coordinate vectors by meaning and scans the saved cache for an existing match.',
    codeTitle: 'Step 2 · 22MB MiniLM-L6-v2 Vector Encoder & Cosine Cache Scan',
    languageLabel: 'Python · 22MB INT8 ONNX',
    code: `# Step 2: Convert cleaned prompt -> unit vector & scan saved FAQ cache (0% GenAI · 2ms)
import math

def cosine_similarity(vec_a: list[float], vec_b: list[float]) -> float:
    dot = sum(a * b for a, b in zip(vec_a, vec_b))
    norm_a = math.sqrt(sum(a * a for a in vec_a))
    norm_b = math.sqrt(sum(b * b for b in vec_b))
    return dot / (norm_a * norm_b) if (norm_a and norm_b) else 0.0

def vectorize_and_scan_cache(cleaned_prompt: str, encoder_22mb, faq_cache: list[dict]) -> dict:
    # 22MB all-MiniLM-L6-v2 outputs L2-normalized 384-d semantic coordinates
    prompt_vector = encoder_22mb.encode(cleaned_prompt, normalize_embeddings=True)

    scored_entries = []
    for entry in faq_cache:
        score = cosine_similarity(prompt_vector, entry["vector"])
        scored_entries.append({"entry": entry, "similarity": round(score * 100, 1)})

    scored_entries.sort(key=lambda row: row["similarity"], reverse=True)
    best = scored_entries[0] if scored_entries else None
    return {
        "vector_preview": [round(x, 4) for x in prompt_vector[:6]],
        "best_match": best,
        "all_scores": scored_entries,
    }`,
  },
  3: {
    stepNumber: 3,
    tabTitle: '3 · 90%+ Cache',
    shortLabel: 'Instant Answer',
    ruleSummary:
      'If similarity is 90% or higher, hand the shopper the saved FAQ answer directly with 0 LLM tokens, 0.00 Wh electricity, and $0.0000 API cost.',
    codeTitle: 'Step 3 · 90%+ Semantic Cache Hit Gate (0% Generative AI)',
    languageLabel: 'Python · Fast Path',
    code: `# Step 3: If match >= 90%, return saved FAQ answer immediately with 0 AI tokens
CACHE_HIT_THRESHOLD = 90.0

def serve_if_cache_hit(scan_result: dict) -> dict | None:
    best = scan_result.get("best_match")
    if not best or best["similarity"] < CACHE_HIT_THRESHOLD:
        return None  # Proceed to Step 4 (1-10 difficulty scorer)

    faq_entry = best["entry"]
    faq_entry["hits"] += 1

    return {
        "route": "CACHE_HIT",
        "similarity_percent": best["similarity"],
        "answer": faq_entry["answer"],
        "tokens_used": 0,          # vs. 3,500 baseline (100% saved)
        "electricity_wh": 0.00,    # vs. 3.00 Wh baseline
        "water_ml": 0.0,           # vs. 25.5 mL baseline
        "cost_usd": 0.0000,        # vs. $0.0106 baseline
    }`,
  },
  4: {
    stepNumber: 4,
    tabTitle: '4 · 1–10 Router',
    shortLabel: 'Small vs Big AI',
    ruleSummary:
      'Not in cache (< 90%): score difficulty 1–10. Level 1–7 (60–89%) uses GPT-4o-mini + cheat sheet; Level 8–10 (< 60% or opposing rules like Final Sale + Lost Receipt) escalates to big AI.',
    codeTitle: 'Step 4 · 1–10 Difficulty Scorer & Tiered AI Dispatcher',
    languageLabel: 'Python · Tiered Routing',
    code: `# Step 4: Score difficulty 1-10 when cache < 90% and dispatch to Small vs. Big AI
OPPOSING_RULES = ("final sale", "final-sale", "ripped", "defect", "expired", "lost receipt")

def score_difficulty_and_route(cleaned_prompt: str, similarity_pct: float, rulebook: str, cache):
    triggers = [kw for kw in OPPOSING_RULES if kw in cleaned_prompt.lower()]
    has_opposing_rules = len(triggers) >= 2

    # Level 8-10: < 60% similarity OR opposing rules (e.g. Final Sale + Lost Receipt)
    if has_opposing_rules or similarity_pct < 60.0:
        difficulty = 9 if has_opposing_rules else 8
        reply = big_flagship_ai.generate(prompt=cleaned_prompt, context=rulebook)
        return {"score": difficulty, "tier": "LEVEL_8_10", "model": "GPT-4o", "tokens": 1150, "reply": reply}

    # Level 1-7: 60-89% similarity (minor missing rule doesn't matter -> small eco-model)
    difficulty = max(1, min(7, round(1 + ((89 - similarity_pct) / 29) * 6)))
    reply = small_eco_ai.generate(prompt=cleaned_prompt, context=rulebook)  # GPT-4o-mini (420 tokens)

    # Auto-learn answer back into the 22MB FAQ vector cache for future 0-token hits
    cache.learn(question=cleaned_prompt, answer=reply)
    return {"score": difficulty, "tier": "LEVEL_1_7", "model": "GPT-4o-mini", "tokens": 420, "reply": reply}`,
  },
};

export function EcoRouteInspector({
  turns,
  faqCache,
  onSendMessage,
  isSending,
}: EcoRouteInspectorProps) {
  const [activeTab, setActiveTab] = useState<InspectorTab>('all');
  const [activeStep, setActiveStep] = useState<PipelineStepSubTab>(1);
  const [visibleThoughtCount, setVisibleThoughtCount] = useState(0);
  const [copiedStep, setCopiedStep] = useState<PipelineStepSubTab | null>(null);

  // CFO Calculator sliders (defaults: 150,000 daily chats, 50% cache hit rate)
  const [dailyChats, setDailyChats] = useState(150_000);
  const [cacheHitRate, setCacheHitRate] = useState(50);

  // Live ESG tab scale toggle
  const [esgScaleMode, setEsgScaleMode] = useState<'single' | 'scale'>('single');

  const latestTurn = turns.length > 0 ? turns[turns.length - 1] : null;

  // Stream AI thoughts line-by-line on every new message
  useEffect(() => {
    if (!latestTurn) {
      setVisibleThoughtCount(0);
      return;
    }

    setVisibleThoughtCount(1);
    const timers: number[] = [];
    const totalThoughts = latestTurn.aiThoughts.length;
    for (let idx = 2; idx <= totalThoughts; idx++) {
      const timer = window.setTimeout(() => {
        setVisibleThoughtCount(idx);
      }, idx * 240);
      timers.push(timer);
    }

    return () => {
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, [latestTurn?.id]);

  // CFO Calculator Math
  const monthlyChats = dailyChats * 30;
  const cacheFraction = cacheHitRate / 100;
  const miniFraction = Math.max(0, (1 - cacheFraction) * 0.8);
  const giantFraction = Math.max(0, (1 - cacheFraction) * 0.2);

  const rawBlendedPerChat =
    cacheFraction * 0.0106 + miniFraction * 0.0104 + giantFraction * 0.0064;
  const calibratedSavingsPerChat = rawBlendedPerChat * 0.962596;
  const monthlyApiSavingsUsd = monthlyChats * calibratedSavingsPerChat;
  const annualApiSavingsUsd = monthlyApiSavingsUsd * 12;

  const avgWhSavedPerChat =
    cacheFraction * 3.0 + miniFraction * 2.88 + giantFraction * 1.9;
  const annualKwhSaved = ((dailyChats * 365 * avgWhSavedPerChat) / 1000) * 0.986;
  const annualLitresSaved = annualKwhSaved * 8.5;

  const gainshareMonthlyUsd = monthlyApiSavingsUsd * 0.2;
  const esgWidgetSaasUsd = 1500;
  const totalEcoRouteMonthlyUsd = gainshareMonthlyUsd + esgWidgetSaasUsd;

  // Live ESG Dashboard Totals
  const sessionSavedTokens = turns.reduce((s, t) => s + t.metrics.savedTokens, 0);
  const sessionSavedWh = turns.reduce((s, t) => s + t.metrics.savedElectricityWh, 0);
  const sessionSavedWaterMl = turns.reduce((s, t) => s + t.metrics.savedWaterMl, 0);
  const sessionSavedCostUsd = turns.reduce((s, t) => s + t.metrics.savedCostUsd, 0);

  const avgSavedTokens = turns.length > 0 ? sessionSavedTokens / turns.length : 3080;
  const avgSavedWh = turns.length > 0 ? sessionSavedWh / turns.length : 2.74;
  const avgSavedCost = turns.length > 0 ? sessionSavedCostUsd / turns.length : 0.00959;

  const annualChats = 150_000 * 365;
  const scaleAnnualTokensB = (avgSavedTokens * annualChats) / 1_000_000_000;
  const scaleAnnualKwh = (avgSavedWh * annualChats) / 1000;
  const scaleAnnualWaterLiters = scaleAnnualKwh * 8.5;
  const scaleAnnualCostUsd = avgSavedCost * annualChats;

  const tokenGoal =
    sessionSavedTokens >= 14000 ? 35000 : sessionSavedTokens >= 7000 ? 14000 : 10500;
  const tokenPct = Math.min(100, Math.round((sessionSavedTokens / tokenGoal) * 100));
  const whPct = Math.min(100, Math.round((sessionSavedWh / 10) * 100));
  const waterPct = Math.min(100, Math.round((sessionSavedWaterMl / 85) * 100));
  const costPct = Math.min(100, Math.round((sessionSavedCostUsd / 0.035) * 100));

  const handleCopyStepCode = async (stepNum: PipelineStepSubTab) => {
    try {
      await navigator.clipboard.writeText(STEP_CODE_BLOCKS[stepNum].code);
      setCopiedStep(stepNum);
      window.setTimeout(() => setCopiedStep(null), 1800);
    } catch {
      setCopiedStep(null);
    }
  };

  const tabs: Array<{ id: InspectorTab; label: string; icon: typeof Layers }> = [
    { id: 'all', label: '5-Step Pipeline & Code', icon: Layers },
    { id: 'thoughts', label: 'AI Real-Time Thoughts', icon: BrainCircuit },
    { id: 'esg', label: 'Live ESG Dashboard', icon: Leaf },
  ];

  const stepTabs: Array<{
    step: PipelineStepSubTab;
    label: string;
    icon: typeof BookOpen;
    statusText: string;
    statusTone: 'emerald' | 'sky' | 'amber' | 'neutral';
  }> = [
    {
      step: 0,
      label: '0 · Rulebook & FAQ',
      icon: BookOpen,
      statusText: `${faqCache.length} cached`,
      statusTone: 'emerald',
    },
    {
      step: 1,
      label: '1 · NLP & NER',
      icon: Filter,
      statusText: latestTurn ? `-${latestTurn.nlp.strippedCount} spans` : '1ms CPU',
      statusTone: latestTurn ? 'emerald' : 'neutral',
    },
    {
      step: 2,
      label: '2 · 22MB Encoder',
      icon: Cpu,
      statusText: latestTurn ? `${latestTurn.vector.similarityPercent}% top` : '2ms CPU',
      statusTone: latestTurn ? 'emerald' : 'neutral',
    },
    {
      step: 3,
      label: '3 · 90%+ Cache',
      icon: Zap,
      statusText: latestTurn
        ? latestTurn.routePath === 'CACHE_HIT'
          ? 'HIT (0 tok)'
          : 'Below 90%'
        : '90%+ gate',
      statusTone: latestTurn
        ? latestTurn.routePath === 'CACHE_HIT'
          ? 'emerald'
          : 'neutral'
        : 'neutral',
    },
    {
      step: 4,
      label: '4 · 1–10 Router',
      icon: GitBranch,
      statusText: latestTurn
        ? latestTurn.routePath === 'CACHE_HIT'
          ? 'Bypassed'
          : latestTurn.routePath === 'LEVEL_1_7'
          ? 'Lvl 1–7 Mini'
          : 'Lvl 8–10 Big AI'
        : 'Lvl 1–10',
      statusTone: latestTurn
        ? latestTurn.routePath === 'LEVEL_1_7'
          ? 'sky'
          : latestTurn.routePath === 'LEVEL_8_10'
          ? 'amber'
          : 'neutral'
        : 'neutral',
    },
  ];

  const currentStepMeta = STEP_CODE_BLOCKS[activeStep];

  const allFaqScores = latestTurn
    ? scoreAllCachedFaqs(latestTurn.nlp.strippedPrompt, faqCache)
    : [];

  const difficultyMeta = latestTurn
    ? computeDifficultyScore(latestTurn.vector, latestTurn.routePath)
    : null;

  const tokenComparisonData = latestTurn
    ? [
        {
          name: 'Without EcoRoute',
          tokens: latestTurn.metrics.baselineTokens,
          fill: '#94A3B8',
        },
        {
          name: 'With EcoRoute',
          tokens: latestTurn.metrics.usedTokens,
          fill:
            latestTurn.routePath === 'CACHE_HIT'
              ? '#059669'
              : latestTurn.routePath === 'LEVEL_1_7'
              ? '#0284C7'
              : '#D97706',
        },
      ]
    : [];

  const renderWaitingPresetsCard = (stepPromptHint: string) => (
    <div className="rounded-xl border border-neutral-200 bg-[#FAFAFA] p-4">
      <p className="text-xs font-bold text-[#1D1D1D]">
        No shopper prompt active yet — trigger a test prompt to see Step {activeStep} work live
      </p>
      <p className="mt-0.5 text-[11px] text-neutral-500">{stepPromptHint}</p>
      <div className="mt-3 grid grid-cols-1 gap-2">
        {PRESET_PROMPTS.map((p) => (
          <button
            key={p.id}
            type="button"
            disabled={isSending}
            onClick={() => onSendMessage(p.text)}
            className="rounded-lg border border-neutral-200 bg-white p-2.5 text-left transition-colors hover:border-[#059669] hover:bg-emerald-50/40"
          >
            <p className="text-xs font-bold text-[#1D1D1D]">{p.badge}</p>
            <p className="mt-0.5 truncate text-[11px] text-neutral-600">“{p.text}”</p>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <aside
      aria-label="EcoRoute backend engine inspector"
      className="flex h-full flex-col border-l border-neutral-200 bg-[#F8FAFC] text-[#1D1D1D]"
    >
      {/* Inspector Header + 3 Main Tabs */}
      <div className="border-b border-neutral-200 bg-white px-4 pt-3">
        <div className="flex items-center justify-between gap-2 pb-2.5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#059669]">
              EcoRoute Backend Engine
            </p>
            <h2 className="font-[var(--font-display)] text-sm font-bold text-[#1D1D1D]">
              5-Step Pipeline, Live AI Thoughts &amp; ESG Impact
            </h2>
          </div>
          <span className="font-mono text-[11px] text-neutral-500 tabular-nums">
            {turns.length} {turns.length === 1 ? 'msg' : 'msgs'} routed
          </span>
        </div>

        <div role="tablist" aria-label="Inspector views" className="flex gap-1 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'border-[#059669] text-[#059669]'
                    : 'border-transparent text-neutral-500 hover:text-[#1D1D1D]'
                }`}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* TAB 1: 5-STEP PIPELINE SUBTABS (0..4) — EACH SHOWING WORK + ITS OWN SEPARATE CODE */}
        {activeTab === 'all' && (
          <>
            {/* 5 Subtab Selector Strip (Steps 0, 1, 2, 3, 4) */}
            <div
              role="tablist"
              aria-label="EcoRoute 5-step architecture subtabs"
              className="grid grid-cols-2 gap-2 sm:grid-cols-5"
            >
              {stepTabs.map((item) => {
                const Icon = item.icon;
                const isSelected = activeStep === item.step;
                const toneClasses =
                  item.statusTone === 'emerald'
                    ? 'text-[#059669]'
                    : item.statusTone === 'sky'
                    ? 'text-sky-600'
                    : item.statusTone === 'amber'
                    ? 'text-amber-600'
                    : 'text-neutral-500';

                return (
                  <button
                    key={item.step}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    onClick={() => setActiveStep(item.step)}
                    className={`flex flex-col items-start rounded-xl border p-2.5 text-left transition-all ${
                      isSelected
                        ? 'border-[#059669] bg-emerald-50/70 shadow-sm'
                        : 'border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50'
                    }`}
                  >
                    <div className="flex w-full items-center justify-between gap-1">
                      <Icon
                        className={`h-3.5 w-3.5 ${
                          isSelected ? 'text-[#059669]' : 'text-neutral-500'
                        }`}
                        aria-hidden="true"
                      />
                      <span className={`font-mono text-[10px] font-semibold tabular-nums ${toneClasses}`}>
                        {item.statusText}
                      </span>
                    </div>
                    <span className="mt-1.5 text-[11px] font-bold leading-tight text-[#1D1D1D]">
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Active Subtab Header + Rule Explanation */}
            <div className="rounded-xl border border-neutral-200 bg-white p-4 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-2 border-b border-neutral-100 pb-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#059669]">
                    Step {currentStepMeta.stepNumber} · {currentStepMeta.shortLabel}
                  </p>
                  <h3 className="mt-0.5 font-[var(--font-display)] text-sm font-bold text-[#1D1D1D]">
                    {currentStepMeta.codeTitle}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-neutral-600">
                    {currentStepMeta.ruleSummary}
                  </p>
                </div>
                <span className="rounded-full bg-neutral-100 px-2.5 py-1 font-mono text-[10px] font-semibold text-neutral-700">
                  {currentStepMeta.languageLabel}
                </span>
              </div>

              {/* SUBTAB 0 WORK: PRE-LAUNCH CONDENSED RULEBOOK + CACHED FAQ VECTOR STORE */}
              {activeStep === 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-[#1D1D1D]">
                      Showing Work · Step 0 Pre-Launch Compression &amp; Seeded Cache
                    </p>
                    <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-[#059669] tabular-nums">
                      2,500w → 380w (85% smaller context)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    <div className="rounded-lg border border-red-200 bg-red-50/40 p-3">
                      <p className="text-[11px] font-bold text-red-700">
                        Before · Raw Master Policy (2,500 words)
                      </p>
                      <pre className="mt-1.5 max-h-28 overflow-y-auto whitespace-pre-wrap font-mono text-[10px] leading-relaxed text-neutral-600">
                        {RAW_POLICY_EXCERPT}
                      </pre>
                    </div>
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-3">
                      <p className="text-[11px] font-bold text-[#059669]">
                        After · Condensed Rulebook (380 words)
                      </p>
                      <pre className="mt-1.5 max-h-28 overflow-y-auto whitespace-pre-wrap font-mono text-[10px] leading-relaxed text-[#1D1D1D]">
                        {COMPRESSED_CHEAT_SHEET}
                      </pre>
                    </div>
                  </div>

                  <div>
                    <p className="mb-1.5 text-[11px] font-bold text-[#1D1D1D]">
                      Saved FAQ Vector Store ({faqCache.length} entries pre-cached for 22MB encoder)
                    </p>
                    <div className="overflow-x-auto rounded-lg border border-neutral-200">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-neutral-100 bg-neutral-50 text-[11px] text-neutral-500">
                            <th className="py-1.5 pl-3 pr-2 font-medium">Saved FAQ Question</th>
                            <th className="px-2 py-1.5 font-medium">Source</th>
                            <th className="py-1.5 pl-2 pr-3 text-right font-medium">Hits</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                          {faqCache.map((entry) => (
                            <tr key={entry.id}>
                              <td className="py-2 pl-3 pr-2 font-medium text-[#1D1D1D]">
                                {entry.question}
                              </td>
                              <td className="px-2 py-2 whitespace-nowrap">
                                <span
                                  className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                    entry.source === 'learned'
                                      ? 'bg-emerald-50 text-[#059669]'
                                      : 'bg-neutral-100 text-neutral-600'
                                  }`}
                                >
                                  {entry.source === 'learned' ? 'Auto-Learned' : 'Pre-cached'}
                                </span>
                              </td>
                              <td className="py-2 pl-2 pr-3 text-right font-mono text-neutral-700 tabular-nums">
                                {entry.hits.toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* SUBTAB 1 WORK: PYTHON NLP & NER STRIPPER */}
              {activeStep === 1 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-[#1D1D1D]">
                      Showing Work · Step 1 Live Stripping Trace
                    </p>
                    {latestTurn && (
                      <span className="font-mono text-[11px] text-[#059669] tabular-nums">
                        {latestTurn.nlp.latencyMs}ms CPU · {latestTurn.nlp.originalWordCount}w →{' '}
                        {latestTurn.nlp.strippedWordCount}w
                      </span>
                    )}
                  </div>

                  {!latestTurn ? (
                    renderWaitingPresetsCard(
                      'Preset 2 ("Hey I bought black Align leggings in Toronto last Tuesday for my sister...") shows red strikethrough NER removal in action.'
                    )
                  ) : (
                    <div className="space-y-3">
                      <div className="rounded-lg border border-neutral-200 bg-[#FAFAFA] p-3">
                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                          Original Input (Stripped Entities Highlighted in Red)
                        </p>
                        <div className="text-xs leading-relaxed">
                          {latestTurn.nlp.tokenSpans.map((span, idx) =>
                            span.stripped ? (
                              <span
                                key={idx}
                                title={`Stripped (${span.category})`}
                                className="mx-0.5 inline-block rounded bg-red-50 px-1.5 py-0.5 text-red-600 line-through decoration-red-600 decoration-2"
                              >
                                {span.text}{' '}
                                <span className="text-[9px] font-mono uppercase no-underline text-red-500">
                                  [{span.category}]
                                </span>
                              </span>
                            ) : (
                              <span key={idx} className="font-medium text-[#1D1D1D]">
                                {span.text}{' '}
                              </span>
                            )
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#059669]">
                            Cleaned Output Passed to Step 2
                          </p>
                          <p className="mt-1 text-xs font-bold text-[#1D1D1D]">
                            “{latestTurn.nlp.strippedPrompt}”
                          </p>
                        </div>
                        <div className="rounded-lg border border-neutral-200 bg-white p-3">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                            Word &amp; Token Reduction (0% AI)
                          </p>
                          <p className="mt-1 font-mono text-sm font-bold text-[#1D1D1D] tabular-nums">
                            {latestTurn.nlp.strippedCount} noisy spans removed (
                            {latestTurn.nlp.originalWordCount > 0
                              ? Math.round(
                                  ((latestTurn.nlp.originalWordCount -
                                    latestTurn.nlp.strippedWordCount) /
                                    latestTurn.nlp.originalWordCount) *
                                    100
                                )
                              : 0}
                            % shorter)
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* SUBTAB 2 WORK: 22MB ENCODER COORDINATES & CACHE SCAN */}
              {activeStep === 2 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-[#1D1D1D]">
                      Showing Work · Step 2 Vector Projection &amp; Cache Scan
                    </p>
                    {latestTurn && (
                      <span className="font-mono text-[11px] text-[#059669] tabular-nums">
                        {latestTurn.vector.modelLabel} · {latestTurn.vector.latencyMs}ms CPU
                      </span>
                    )}
                  </div>

                  {!latestTurn ? (
                    renderWaitingPresetsCard(
                      'Send any question to inspect the 22MB MiniLM vector coordinates and live cosine scores against every cached FAQ.'
                    )
                  ) : (
                    <div className="space-y-3">
                      <div className="rounded-lg border border-neutral-200 bg-[#FAFAFA] p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                          Cleaned Prompt → Meaning Coordinates (Vector Preview)
                        </p>
                        <p className="mt-1 text-xs font-semibold text-[#1D1D1D]">
                          “{latestTurn.nlp.strippedPrompt}”
                        </p>
                        <p className="mt-1.5 rounded bg-[#1D1D1D] px-2.5 py-1.5 font-mono text-[11px] text-emerald-300 tabular-nums">
                          vec = [{latestTurn.vector.coordinatePreview.join(', ')}, …]
                        </p>
                      </div>

                      <div className="rounded-lg border border-neutral-200 bg-white p-3 space-y-2">
                        <p className="text-[11px] font-bold text-[#1D1D1D]">
                          Cosine Similarity Against Cached FAQ Vectors
                        </p>
                        {allFaqScores.map((item, idx) => (
                          <div key={item.id} className="space-y-1">
                            <div className="flex items-center justify-between gap-2 text-[11px]">
                              <span
                                className={`truncate ${
                                  idx === 0 ? 'font-bold text-[#1D1D1D]' : 'text-neutral-600'
                                }`}
                              >
                                {idx === 0 ? 'Nearest: ' : ''}“{item.question}”
                              </span>
                              <span className="shrink-0 font-mono font-bold text-[#1D1D1D] tabular-nums">
                                {item.similarityPercent}%
                              </span>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
                              <div
                                className="h-full rounded-full transition-all duration-300"
                                style={{
                                  width: `${item.similarityPercent}%`,
                                  backgroundColor:
                                    item.similarityPercent >= 90
                                      ? '#059669'
                                      : item.similarityPercent >= 60
                                      ? '#0284C7'
                                      : '#D97706',
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* SUBTAB 3 WORK: 90%+ CACHE HIT HANDOFF */}
              {activeStep === 3 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-[#1D1D1D]">
                      Showing Work · Step 3 90%+ Cache Gate
                    </p>
                    {latestTurn && (
                      <span
                        className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] font-bold ${
                          latestTurn.routePath === 'CACHE_HIT'
                            ? 'bg-[#059669] text-white'
                            : 'bg-neutral-100 text-neutral-600'
                        }`}
                      >
                        {latestTurn.routePath === 'CACHE_HIT'
                          ? 'GATE PASSED (≥ 90%)'
                          : `GATE MISSED (${latestTurn.vector.similarityPercent}% < 90%)`}
                      </span>
                    )}
                  </div>

                  {!latestTurn ? (
                    renderWaitingPresetsCard(
                      'Try Preset 1 ("What is your return policy?") to trigger an instant 95% match cache hit with 0 generative AI tokens.'
                    )
                  ) : latestTurn.routePath === 'CACHE_HIT' ? (
                    <div className="space-y-2.5">
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#059669]">
                          Matched Saved FAQ ({latestTurn.vector.similarityPercent}% ≥ 90%)
                        </p>
                        <p className="mt-1 text-xs font-bold text-[#1D1D1D]">
                          FAQ: “{latestTurn.vector.matchedFaqQuestion}”
                        </p>
                        <p className="mt-1.5 text-xs leading-relaxed text-neutral-700">
                          {latestTurn.answer}
                        </p>
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-center font-mono text-[11px] tabular-nums">
                        <div className="rounded-lg border border-neutral-200 bg-[#FAFAFA] p-2">
                          <p className="font-sans text-[10px] text-neutral-500">Tokens</p>
                          <p className="font-bold text-[#059669]">0</p>
                        </div>
                        <div className="rounded-lg border border-neutral-200 bg-[#FAFAFA] p-2">
                          <p className="font-sans text-[10px] text-neutral-500">Electricity</p>
                          <p className="font-bold text-[#059669]">0.00 Wh</p>
                        </div>
                        <div className="rounded-lg border border-neutral-200 bg-[#FAFAFA] p-2">
                          <p className="font-sans text-[10px] text-neutral-500">Water</p>
                          <p className="font-bold text-[#059669]">0.0 mL</p>
                        </div>
                        <div className="rounded-lg border border-neutral-200 bg-[#FAFAFA] p-2">
                          <p className="font-sans text-[10px] text-neutral-500">API Cost</p>
                          <p className="font-bold text-[#059669]">$0.0000</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-neutral-200 bg-[#FAFAFA] p-3 text-xs">
                      <p className="font-semibold text-[#1D1D1D]">
                        Similarity was {latestTurn.vector.similarityPercent}% (below the 90% Cache
                        Hit threshold)
                        {latestTurn.vector.isConflictDetected
                          ? ' and opposing policy rules were detected.'
                          : '.'}
                      </p>
                      <p className="mt-1 text-neutral-600">
                        Step 3 did not return a cached answer, so execution continued to{' '}
                        <button
                          type="button"
                          onClick={() => setActiveStep(4)}
                          className="font-bold text-[#059669] underline"
                        >
                          Step 4 · 1–10 Difficulty Router
                        </button>
                        .
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* SUBTAB 4 WORK: 1–10 DIFFICULTY ROUTER + BENCHMARK LEDGER + RECHARTS CHART */}
              {activeStep === 4 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-[#1D1D1D]">
                      Showing Work · Step 4 Difficulty Score (1–10) &amp; Model Dispatch
                    </p>
                    {difficultyMeta && (
                      <span className="font-mono text-xs font-bold text-[#1D1D1D] tabular-nums">
                        Score: {difficultyMeta.score}/10
                      </span>
                    )}
                  </div>

                  {!latestTurn || !difficultyMeta ? (
                    renderWaitingPresetsCard(
                      'Compare Preset 2 (Level 1–7 → GPT-4o-mini) vs. Preset 3 (Level 8–10 Opposing Rules → Big AI).'
                    )
                  ) : (
                    <div className="space-y-3">
                      <div className="rounded-lg border border-neutral-200 bg-[#FAFAFA] p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span
                            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold text-white ${
                              latestTurn.routePath === 'CACHE_HIT'
                                ? 'bg-[#059669]'
                                : latestTurn.routePath === 'LEVEL_1_7'
                                ? 'bg-sky-600'
                                : 'bg-amber-600'
                            }`}
                          >
                            {latestTurn.routeLabel}
                          </span>
                          <span className="text-xs font-medium text-neutral-600">
                            {difficultyMeta.bandLabel}
                          </span>
                        </div>

                        {/* 1-10 Difficulty Meter */}
                        <div className="mt-3 grid grid-cols-10 gap-1">
                          {Array.from({ length: 10 }, (_, idx) => {
                            const lvl = idx + 1;
                            const active = lvl <= difficultyMeta.score;
                            const barColor =
                              lvl <= 7 ? 'bg-sky-600' : 'bg-amber-600';
                            return (
                              <div key={lvl} className="text-center">
                                <div
                                  className={`h-2 rounded-sm ${
                                    active ? barColor : 'bg-neutral-200'
                                  }`}
                                />
                                <span className="font-mono text-[9px] text-neutral-500 tabular-nums">
                                  {lvl}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                        <p className="mt-2 text-xs text-neutral-600">{difficultyMeta.summary}</p>
                      </div>

                      {/* Baseline vs EcoRoute Ledger + Recharts */}
                      <div className="rounded-lg border border-neutral-200 bg-white p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#1D1D1D]">
                            Compute &amp; Token Savings Ledger
                          </span>
                          <span className="font-mono text-xs font-bold text-[#059669] tabular-nums">
                            {latestTurn.metrics.savedPercent}% Tokens Saved
                          </span>
                        </div>

                        <table className="mt-2 w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-neutral-200 text-[11px] text-neutral-500">
                              <th className="py-1 font-medium">Metric</th>
                              <th className="py-1 text-right font-medium">Baseline</th>
                              <th className="py-1 text-right font-medium">EcoRoute</th>
                              <th className="py-1 text-right font-medium text-[#059669]">Saved</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-neutral-100 font-mono text-[11px] tabular-nums">
                            <tr>
                              <td className="py-1.5 font-sans font-medium text-neutral-700">
                                Tokens
                              </td>
                              <td className="py-1.5 text-right text-neutral-500">
                                {latestTurn.metrics.baselineTokens.toLocaleString()}
                              </td>
                              <td className="py-1.5 text-right font-semibold">
                                {latestTurn.metrics.usedTokens.toLocaleString()}
                              </td>
                              <td className="py-1.5 text-right font-bold text-[#059669]">
                                -{latestTurn.metrics.savedTokens.toLocaleString()}
                              </td>
                            </tr>
                            <tr>
                              <td className="py-1.5 font-sans font-medium text-neutral-700">
                                Electricity
                              </td>
                              <td className="py-1.5 text-right text-neutral-500">
                                {latestTurn.metrics.baselineElectricityWh.toFixed(2)} Wh
                              </td>
                              <td className="py-1.5 text-right font-semibold">
                                {latestTurn.metrics.usedElectricityWh.toFixed(2)} Wh
                              </td>
                              <td className="py-1.5 text-right font-bold text-[#059669]">
                                -{latestTurn.metrics.savedElectricityWh.toFixed(2)} Wh
                              </td>
                            </tr>
                            <tr>
                              <td className="py-1.5 font-sans font-medium text-neutral-700">
                                Water
                              </td>
                              <td className="py-1.5 text-right text-neutral-500">
                                {latestTurn.metrics.baselineWaterMl.toFixed(1)} mL
                              </td>
                              <td className="py-1.5 text-right font-semibold">
                                {latestTurn.metrics.usedWaterMl.toFixed(1)} mL
                              </td>
                              <td className="py-1.5 text-right font-bold text-[#059669]">
                                -{latestTurn.metrics.savedWaterMl.toFixed(1)} mL
                              </td>
                            </tr>
                            <tr>
                              <td className="py-1.5 font-sans font-medium text-neutral-700">
                                Cloud Cost
                              </td>
                              <td className="py-1.5 text-right text-neutral-500">
                                ${latestTurn.metrics.baselineCostUsd.toFixed(4)}
                              </td>
                              <td className="py-1.5 text-right font-semibold">
                                ${latestTurn.metrics.usedCostUsd.toFixed(4)}
                              </td>
                              <td className="py-1.5 text-right font-bold text-[#059669]">
                                -${latestTurn.metrics.savedCostUsd.toFixed(4)}
                              </td>
                            </tr>
                          </tbody>
                        </table>

                        <div className="mt-3 h-24 w-full border-t border-neutral-100 pt-2">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={tokenComparisonData}
                              layout="vertical"
                              margin={{ top: 0, right: 16, left: 10, bottom: 0 }}
                            >
                              <CartesianGrid
                                stroke="#E2E8F0"
                                strokeDasharray="3 3"
                                horizontal={false}
                              />
                              <XAxis
                                type="number"
                                domain={[0, BASELINE_BENCHMARK.tokens]}
                                tick={{
                                  fill: '#64748B',
                                  fontSize: 10,
                                  fontFamily: 'JetBrains Mono',
                                }}
                                axisLine={false}
                                tickLine={false}
                              />
                              <YAxis
                                type="category"
                                dataKey="name"
                                width={108}
                                tick={{ fill: '#1D1D1D', fontSize: 11, fontWeight: 600 }}
                                axisLine={false}
                                tickLine={false}
                              />
                              <Tooltip
                                formatter={(val) => [
                                  `${Number(val ?? 0).toLocaleString()} tokens`,
                                  'Tokens',
                                ]}
                              />
                              <Bar dataKey="tokens" radius={[0, 4, 4, 0]} barSize={18}>
                                {tokenComparisonData.map((entry) => (
                                  <Cell key={entry.name} fill={entry.fill} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* DEDICATED CODE BLOCK FOR THIS SPECIFIC SUBTAB */}
              <div className="border-t border-neutral-100 pt-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Code2 className="h-4 w-4 text-[#059669]" aria-hidden="true" />
                    <span className="text-xs font-bold text-[#1D1D1D]">
                      Step {currentStepMeta.stepNumber} Code Implementation
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyStepCode(currentStepMeta.stepNumber)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-2.5 py-1 text-xs font-semibold text-[#1D1D1D] hover:bg-neutral-50"
                  >
                    {copiedStep === currentStepMeta.stepNumber ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-[#059669]" aria-hidden="true" />
                        <span className="text-[#059669]">Copied Step {currentStepMeta.stepNumber}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Copy Step {currentStepMeta.stepNumber} Code</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="mt-2.5 overflow-x-auto rounded-xl bg-[#1D1D1D] p-4 font-mono text-[11px] leading-relaxed text-emerald-300">
                  <code>{currentStepMeta.code}</code>
                </pre>
              </div>
            </div>

            {/* CFO Savings & 20% Gainshare Calculator */}
            <div className="rounded-xl border border-neutral-200 bg-white p-4 space-y-4">
              <div className="flex items-center gap-2">
                <Calculator className="h-4 w-4 text-[#059669]" aria-hidden="true" />
                <h3 className="font-[var(--font-display)] text-sm font-bold text-[#1D1D1D]">
                  CFO Savings &amp; 20% Gainshare Calculator
                </h3>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <div className="flex justify-between text-xs">
                    <label htmlFor="daily-chats-slider" className="font-semibold">
                      Daily Chats
                    </label>
                    <span className="font-mono font-bold tabular-nums">
                      {dailyChats.toLocaleString()}/day
                    </span>
                  </div>
                  <input
                    id="daily-chats-slider"
                    type="range"
                    min={10_000}
                    max={500_000}
                    step={10_000}
                    value={dailyChats}
                    onChange={(e) => setDailyChats(Number(e.target.value))}
                    className="mt-1.5 w-full accent-[#059669]"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs">
                    <label htmlFor="cache-rate-slider" className="font-semibold">
                      Cache Hit Rate
                    </label>
                    <span className="font-mono font-bold text-[#059669] tabular-nums">
                      {cacheHitRate}%
                    </span>
                  </div>
                  <input
                    id="cache-rate-slider"
                    type="range"
                    min={20}
                    max={80}
                    step={5}
                    value={cacheHitRate}
                    onChange={(e) => setCacheHitRate(Number(e.target.value))}
                    className="mt-1.5 w-full accent-[#059669]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-neutral-200 bg-[#FAFAFA] p-3">
                  <p className="text-[11px] text-neutral-500">Client Monthly API Savings</p>
                  <p className="mt-0.5 font-mono text-lg font-bold text-[#1D1D1D] tabular-nums">
                    ${Math.round(monthlyApiSavingsUsd).toLocaleString()}/mo
                  </p>
                  <p className="font-mono text-[10px] text-neutral-500 tabular-nums">
                    ${Math.round(annualApiSavingsUsd).toLocaleString()}/yr ·{' '}
                    {Math.round(annualKwhSaved).toLocaleString()} kWh ·{' '}
                    {Math.round(annualLitresSaved).toLocaleString()} L
                  </p>
                </div>

                <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-3">
                  <p className="text-[11px] font-semibold text-[#059669]">
                    EcoRoute Revenue (1 Brand)
                  </p>
                  <p className="mt-0.5 font-mono text-lg font-bold text-[#059669] tabular-nums">
                    ${Math.round(totalEcoRouteMonthlyUsd).toLocaleString()}/mo
                  </p>
                  <p className="font-mono text-[10px] text-neutral-700 tabular-nums">
                    20% Gainshare (${Math.round(gainshareMonthlyUsd).toLocaleString()}) + $1,500 ESG
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* TAB 2: REAL-TIME AI THOUGHTS STREAM */}
        {activeTab === 'thoughts' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-neutral-200 bg-[#1D1D1D] p-5 text-white">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                  <h3 className="font-[var(--font-display)] text-sm font-bold text-white">
                    Real-Time AI Reasoning &amp; Router Thoughts
                  </h3>
                </div>
                {latestTurn && (
                  <span className="font-mono text-[11px] text-emerald-300">
                    {latestTurn.usedLiveAi ? 'Live Gemini + Router' : 'Deterministic Engine'}
                  </span>
                )}
              </div>

              <p className="mt-1.5 text-xs text-neutral-300">
                Inspect every internal thought step as the router strips noise, evaluates vector
                coordinates, selects a model tier, and formulates the Lululemon Canada reply.
              </p>

              {!latestTurn ? (
                <div className="mt-4 rounded-xl border border-neutral-700 bg-neutral-900 p-4 text-xs text-neutral-400">
                  <p>No active prompt yet. Trigger a preset to stream live AI thoughts:</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {PRESET_PROMPTS.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        disabled={isSending}
                        onClick={() => onSendMessage(p.text)}
                        className="rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-[11px] font-semibold text-white hover:border-emerald-500 hover:text-emerald-300"
                      >
                        {p.shortLabel}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mt-4 space-y-2.5">
                  <div className="rounded-lg border border-neutral-700 bg-neutral-900 px-3.5 py-2.5 text-xs">
                    <span className="text-neutral-400">Active Customer Prompt: </span>
                    <span className="font-medium text-white">“{latestTurn.question}”</span>
                  </div>

                  <div className="space-y-2">
                    {latestTurn.aiThoughts.slice(0, visibleThoughtCount).map((thought, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2.5 rounded-lg border border-neutral-800 bg-neutral-900/90 p-3 font-mono text-[11px] leading-relaxed text-emerald-200"
                      >
                        <Sparkles
                          className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400"
                          aria-hidden="true"
                        />
                        <span>{thought}</span>
                      </div>
                    ))}

                    {visibleThoughtCount < latestTurn.aiThoughts.length && (
                      <p className="px-2 font-mono text-[11px] text-neutral-400">
                        Streaming next reasoning step...
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Prior Turn Thought History */}
            {turns.length > 1 && (
              <div className="rounded-xl border border-neutral-200 bg-white p-4">
                <p className="text-xs font-bold text-[#1D1D1D]">
                  Earlier Session Thought Summaries
                </p>
                <div className="mt-2.5 divide-y divide-neutral-100">
                  {turns
                    .slice(0, -1)
                    .reverse()
                    .map((t) => (
                      <div key={t.id} className="py-2.5 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate font-semibold text-[#1D1D1D]">
                            “{t.question}”
                          </span>
                          <span className="shrink-0 font-mono text-[11px] text-[#059669]">
                            {t.routeLabel}
                          </span>
                        </div>
                        <p className="mt-1 font-mono text-[11px] text-neutral-500">
                          {t.aiThoughts[t.aiThoughts.length - 1]}
                        </p>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: LIVE ESG DASHBOARD UPDATE */}
        {activeTab === 'esg' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-neutral-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#059669]">
                    Live ESG Impact Telemetry
                  </p>
                  <h3 className="font-[var(--font-display)] text-sm font-bold text-[#1D1D1D]">
                    Real-Time Sustainability Dashboard Update
                  </h3>
                </div>

                <div className="flex rounded-lg border border-neutral-200 bg-[#FAFAFA] p-1 text-[11px] font-semibold">
                  <button
                    type="button"
                    onClick={() => setEsgScaleMode('single')}
                    className={`rounded-md px-2.5 py-1 transition-colors ${
                      esgScaleMode === 'single'
                        ? 'bg-[#1D1D1D] text-white'
                        : 'text-neutral-600 hover:text-[#1D1D1D]'
                    }`}
                  >
                    Single Live ({turns.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setEsgScaleMode('scale')}
                    className={`rounded-md px-2.5 py-1 transition-colors ${
                      esgScaleMode === 'scale'
                        ? 'bg-[#059669] text-white'
                        : 'text-neutral-600 hover:text-[#1D1D1D]'
                    }`}
                  >
                    150k/day Scale
                  </button>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-neutral-200 bg-[#FAFAFA] p-3.5">
                  <div className="flex items-center justify-between text-xs text-neutral-500">
                    <span className="font-semibold">Tokens Saved</span>
                    <Cpu className="h-3.5 w-3.5 text-[#059669]" aria-hidden="true" />
                  </div>
                  <p className="mt-1 font-mono text-xl font-bold text-[#1D1D1D] tabular-nums">
                    {esgScaleMode === 'single'
                      ? `${sessionSavedTokens.toLocaleString()} tok`
                      : `~${scaleAnnualTokensB.toFixed(1)}B / yr`}
                  </p>
                  <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-neutral-200">
                    <div
                      className="h-full rounded-full bg-[#059669] transition-all duration-500"
                      style={{ width: `${esgScaleMode === 'single' ? tokenPct : 88}%` }}
                    />
                  </div>
                </div>

                <div className="rounded-lg border border-neutral-200 bg-[#FAFAFA] p-3.5">
                  <div className="flex items-center justify-between text-xs text-neutral-500">
                    <span className="font-semibold">Electricity Saved</span>
                    <Zap className="h-3.5 w-3.5 text-amber-600" aria-hidden="true" />
                  </div>
                  <p className="mt-1 font-mono text-xl font-bold text-[#1D1D1D] tabular-nums">
                    {esgScaleMode === 'single'
                      ? `${sessionSavedWh.toFixed(2)} Wh`
                      : `~${Math.round(scaleAnnualKwh).toLocaleString()} kWh/yr`}
                  </p>
                  <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-neutral-200">
                    <div
                      className="h-full rounded-full bg-amber-500 transition-all duration-500"
                      style={{ width: `${esgScaleMode === 'single' ? whPct : 91}%` }}
                    />
                  </div>
                </div>

                <div className="rounded-lg border border-neutral-200 bg-[#FAFAFA] p-3.5">
                  <div className="flex items-center justify-between text-xs text-neutral-500">
                    <span className="font-semibold">Cooling &amp; Grid Water</span>
                    <Droplets className="h-3.5 w-3.5 text-sky-600" aria-hidden="true" />
                  </div>
                  <p className="mt-1 font-mono text-xl font-bold text-[#1D1D1D] tabular-nums">
                    {esgScaleMode === 'single'
                      ? `${sessionSavedWaterMl.toFixed(1)} mL`
                      : `~${(scaleAnnualWaterLiters / 1_000_000).toFixed(2)}M L/yr`}
                  </p>
                  <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-neutral-200">
                    <div
                      className="h-full rounded-full bg-sky-600 transition-all duration-500"
                      style={{ width: `${esgScaleMode === 'single' ? waterPct : 91}%` }}
                    />
                  </div>
                </div>

                <div className="rounded-lg border border-neutral-200 bg-[#FAFAFA] p-3.5">
                  <div className="flex items-center justify-between text-xs text-neutral-500">
                    <span className="font-semibold">Cloud API Cost Saved</span>
                    <DollarSign className="h-3.5 w-3.5 text-[#059669]" aria-hidden="true" />
                  </div>
                  <p className="mt-1 font-mono text-xl font-bold text-[#059669] tabular-nums">
                    {esgScaleMode === 'single'
                      ? `$${sessionSavedCostUsd.toFixed(4)}`
                      : `~$${Math.round(scaleAnnualCostUsd).toLocaleString()}/yr`}
                  </p>
                  <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-neutral-200">
                    <div
                      className="h-full rounded-full bg-[#1D1D1D] transition-all duration-500"
                      style={{ width: `${esgScaleMode === 'single' ? costPct : 90}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Live Per-Message ESG Feed */}
            <div className="rounded-xl border border-neutral-200 bg-white p-4">
              <p className="text-xs font-bold text-[#1D1D1D]">
                Live ESG Delta Feed (Every Chat Update)
              </p>
              {turns.length === 0 ? (
                <p className="mt-2 text-xs text-neutral-500">
                  Send any question in the floating AI widget to watch real-time token,
                  electricity, water, and cost savings append here.
                </p>
              ) : (
                <div className="mt-2.5 divide-y divide-neutral-100">
                  {[...turns].reverse().map((turn) => (
                    <div
                      key={turn.id}
                      className="flex items-center justify-between gap-3 py-2.5 text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-[#1D1D1D]">{turn.question}</p>
                        <p className="text-[11px] text-neutral-500">{turn.routeLabel}</p>
                      </div>
                      <div className="shrink-0 text-right font-mono text-[11px] text-[#059669] tabular-nums">
                        <p>-{turn.metrics.savedTokens.toLocaleString()} tok</p>
                        <p>
                          -{turn.metrics.savedElectricityWh.toFixed(2)} Wh · -
                          {turn.metrics.savedWaterMl.toFixed(1)} mL
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
