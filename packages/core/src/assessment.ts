// Claude assessment contract (Scope §4.6). The strict JSON schema is sent via
// the Anthropic Messages API `output_config.format`; the type + validator are
// shared by the worker (which calls Claude) and the app (which renders it).

import type { SeverityKey } from './status';

export type RecommendationKey = 'accept_new_baseline' | 'keep_and_investigate';

export interface AssessmentResult {
  severity: SeverityKey;
  confidence: number;
  summary: string;
  details: string;
  affected_areas: string[];
  recommendation: RecommendationKey;
  recommendation_reason: string;
}

// JSON Schema for Anthropic structured output. additionalProperties:false + a
// full required[] is mandatory for strict structured outputs.
export const ASSESSMENT_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    severity: {
      type: 'string',
      enum: ['intentional_change', 'cosmetic_minor', 'likely_regression', 'broken'],
    },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    summary: { type: 'string', description: 'one-line plain-English explanation' },
    details: { type: 'string', description: 'longer explanation of what changed and why it matters' },
    affected_areas: { type: 'array', items: { type: 'string' } },
    recommendation: {
      type: 'string',
      enum: ['accept_new_baseline', 'keep_and_investigate'],
    },
    recommendation_reason: { type: 'string' },
  },
  required: [
    'severity',
    'confidence',
    'summary',
    'details',
    'affected_areas',
    'recommendation',
    'recommendation_reason',
  ],
} as const;

const SEVERITIES: SeverityKey[] = [
  'intentional_change',
  'cosmetic_minor',
  'likely_regression',
  'broken',
];
const RECOMMENDATIONS: RecommendationKey[] = ['accept_new_baseline', 'keep_and_investigate'];

/** Parse + validate a Claude response into a typed AssessmentResult. Throws on mismatch. */
export function parseAssessment(raw: unknown): AssessmentResult {
  const obj = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (!obj || typeof obj !== 'object') throw new Error('Assessment is not an object');
  const r = obj as Record<string, unknown>;

  if (!SEVERITIES.includes(r.severity as SeverityKey)) {
    throw new Error(`Invalid severity: ${String(r.severity)}`);
  }
  if (!RECOMMENDATIONS.includes(r.recommendation as RecommendationKey)) {
    throw new Error(`Invalid recommendation: ${String(r.recommendation)}`);
  }
  const confidence = typeof r.confidence === 'number' ? r.confidence : Number(r.confidence);
  if (!Number.isFinite(confidence)) throw new Error('Invalid confidence');

  return {
    severity: r.severity as SeverityKey,
    confidence: Math.min(1, Math.max(0, confidence)),
    summary: String(r.summary ?? ''),
    details: String(r.details ?? ''),
    affected_areas: Array.isArray(r.affected_areas) ? r.affected_areas.map(String) : [],
    recommendation: r.recommendation as RecommendationKey,
    recommendation_reason: String(r.recommendation_reason ?? ''),
  };
}
