export type ViewMode = 'storefront' | 'split';

export type StorefrontPage = 'home' | 'esg';

export type InspectorTab = 'all' | 'thoughts' | 'esg';

export type PipelineStepSubTab = 0 | 1 | 2 | 3 | 4;

export type RoutePath = 'CACHE_HIT' | 'LEVEL_1_7' | 'LEVEL_8_10';

export type StripCategory = 'FILLER' | 'CITY' | 'DATE' | 'PRONOUN';

export interface PromptTokenSpan {
  text: string;
  stripped: boolean;
  category?: StripCategory;
}

export interface NlpStripResult {
  originalPrompt: string;
  strippedPrompt: string;
  tokenSpans: PromptTokenSpan[];
  strippedCount: number;
  originalWordCount: number;
  strippedWordCount: number;
  latencyMs: number;
}

export interface FaqCacheEntry {
  id: string;
  question: string;
  answer: string;
  category: string;
  hits: number;
  source: 'preloaded' | 'learned';
  addedAt: string;
}

export interface VectorSimilarityResult {
  similarityPercent: number;
  matchedFaqQuestion: string;
  matchedFaqId: string;
  modelLabel: string;
  latencyMs: number;
  isConflictDetected: boolean;
  coordinatePreview: number[];
}

export interface BenchmarkMetrics {
  baselineTokens: number;
  baselineInputTokens: number;
  baselineOutputTokens: number;
  baselineElectricityWh: number;
  baselineWaterMl: number;
  baselineCostUsd: number;
  usedTokens: number;
  usedElectricityWh: number;
  usedWaterMl: number;
  usedCostUsd: number;
  savedTokens: number;
  savedPercent: number;
  savedElectricityWh: number;
  savedWaterMl: number;
  savedCostUsd: number;
}

export interface ChatTurnRecord {
  id: string;
  timestamp: string;
  question: string;
  answer: string;
  routePath: RoutePath;
  routeLabel: string;
  modelName: string;
  nlp: NlpStripResult;
  vector: VectorSimilarityResult;
  metrics: BenchmarkMetrics;
  aiThoughts: string[];
  addedToCache: boolean;
  usedLiveAi: boolean;
}
