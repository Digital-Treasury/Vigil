// Status & severity vocabulary — colours ported verbatim from the design
// prototype (Vigil.dc.html STATUS / SEV maps). Colour appears in exactly two
// places in the product: status indicators and the diff highlight. Never use
// these for decoration.

export type HealthStatus = 'passed' | 'changes' | 'broken' | 'running' | 'resolved' | 'error';

export interface StatusStyle {
  label: string;
  color: string;
  bg: string;
}

export const STATUS: Record<HealthStatus, StatusStyle> = {
  passed: { label: 'Passed', color: '#1A8F5F', bg: 'rgba(26,143,95,.10)' },
  changes: { label: 'Changes found', color: '#B47A12', bg: 'rgba(180,122,18,.12)' },
  broken: { label: 'Likely regression', color: '#C0322B', bg: 'rgba(192,50,43,.10)' },
  running: { label: 'Running', color: '#2F6FB0', bg: 'rgba(47,111,176,.10)' },
  resolved: { label: 'Resolved', color: '#6B6B6B', bg: 'rgba(107,107,107,.10)' },
  error: { label: 'Capture failed', color: '#C0322B', bg: 'rgba(192,50,43,.10)' },
};

// Claude severity (DB enum) → label + colour.
export type SeverityKey =
  | 'intentional_change'
  | 'cosmetic_minor'
  | 'likely_regression'
  | 'broken';

export const SEVERITY: Record<SeverityKey, StatusStyle> = {
  intentional_change: { label: 'Intentional change', color: '#1A8F5F', bg: 'rgba(26,143,95,.10)' },
  cosmetic_minor: { label: 'Minor cosmetic', color: '#B47A12', bg: 'rgba(180,122,18,.10)' },
  likely_regression: { label: 'Likely regression', color: '#C0322B', bg: 'rgba(192,50,43,.10)' },
  broken: { label: 'Broken', color: '#8E1F1A', bg: 'rgba(142,31,26,.10)' },
};

// Map a severity to the coarse health status used for run/page colouring.
export function severityToHealth(sev: SeverityKey): HealthStatus {
  switch (sev) {
    case 'intentional_change':
      return 'passed';
    case 'cosmetic_minor':
      return 'changes';
    case 'likely_regression':
    case 'broken':
      return 'broken';
  }
}

// Colour for a diff-percentage figure, banded exactly as the prototype:
//   '—' (no capture) → danger; 0 → muted; <1% → green; <=5% → amber; >5% → danger.
export function diffColor(pct: number | null | undefined): string {
  if (pct === null || pct === undefined || Number.isNaN(pct)) return '#C0322B';
  if (pct === 0) return '#6B6B6B';
  if (pct < 1) return '#1A8F5F';
  if (pct <= 5) return '#B47A12';
  return '#C0322B';
}

export function formatDiffPct(pct: number | null | undefined): string {
  if (pct === null || pct === undefined || Number.isNaN(pct)) return '—';
  return `${pct.toFixed(1)}%`;
}
