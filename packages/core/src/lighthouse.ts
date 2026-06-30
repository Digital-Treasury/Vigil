// Lighthouse result shape stored on a capture (the four category scores 0–100
// plus key lab metrics). Surfaced as baseline-vs-current deltas (Scope §4.7).

export interface LighthouseScores {
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
}

export interface LighthouseMetrics {
  lcpMs?: number;
  fcpMs?: number;
  tbtMs?: number;
  cls?: number;
  siMs?: number;
}

export interface LighthouseData {
  scores: LighthouseScores;
  metrics?: LighthouseMetrics;
  fetchedAt?: string;
}

export const LH_CATEGORIES: { key: keyof LighthouseScores; label: string }[] = [
  { key: 'performance', label: 'Performance' },
  { key: 'accessibility', label: 'Accessibility' },
  { key: 'bestPractices', label: 'Best practices' },
  { key: 'seo', label: 'SEO' },
];

export function asLighthouse(json: unknown): LighthouseData | null {
  if (!json || typeof json !== 'object') return null;
  const s = (json as { scores?: unknown }).scores;
  if (!s || typeof s !== 'object') return null;
  return json as LighthouseData;
}
