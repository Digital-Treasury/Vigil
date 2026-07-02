export type Viewport = 'desktop' | 'mobile';

export type RunTrigger = 'manual' | 'scheduled' | 'maintenance';
export type RunStatus = 'running' | 'complete';

export type ResultStatus = 'running' | 'passed' | 'changes' | 'broken' | 'error';
export type ReviewState = 'none' | 'pending' | 'accepted' | 'flagged';

export type Severity = 'intentional' | 'minor' | 'regression' | 'broken';

export interface Client {
  id: number;
  name: string;
  url: string;
  notify_emails: string; // JSON array
  threshold_override: number | null;
  retention_override: number | null;
  lighthouse_enabled: number;
  schedule_enabled: number;
  schedule_freq: 'daily' | 'weekly';
  schedule_day: number; // 0=Sun..6=Sat, used when weekly
  schedule_time: string; // "06:00"
  checkpoint_id: number | null;
  created_at: string;
}

export interface Page {
  id: number;
  client_id: number;
  label: string;
  url: string;
  viewports: string; // JSON array of Viewport
  mask_selectors: string; // JSON array of CSS selectors
  wait_selector: string | null;
  sort: number;
  created_at: string;
}

export interface Capture {
  id: number;
  page_id: number;
  run_id: number | null;
  checkpoint_id: number | null;
  viewport: Viewport;
  status: 'ok' | 'error';
  error: string | null;
  screenshot_path: string | null;
  html_path: string | null;
  dom_path: string | null;
  mask_rects: string; // JSON array of {x,y,width,height}
  lighthouse: string | null; // JSON {performance,accessibility,bestPractices,seo}
  width: number | null;
  height: number | null;
  created_at: string;
}

export interface Baseline {
  id: number;
  page_id: number;
  viewport: Viewport;
  capture_id: number;
  approved_by: string;
  approved_at: string;
}

export interface Checkpoint {
  id: number;
  client_id: number;
  started_by: string;
  started_at: string;
  ended_at: string | null;
}

export interface Run {
  id: number;
  client_id: number;
  trigger: RunTrigger;
  checkpoint_id: number | null;
  status: RunStatus;
  started_at: string;
  finished_at: string | null;
  email_sent: number;
}

export interface RunResult {
  id: number;
  run_id: number;
  page_id: number;
  viewport: Viewport;
  capture_id: number | null;
  status: ResultStatus;
  review: ReviewState;
  reviewed_by: string | null;
  reviewed_at: string | null;
  diff_baseline_pct: number | null;
  diff_checkpoint_pct: number | null;
  diff_baseline_img: string | null;
  diff_checkpoint_img: string | null;
  baseline_capture_id: number | null;
  checkpoint_capture_id: number | null;
  assessment: string | null; // JSON ClaudeAssessment
  created_at: string;
}

export interface Investigation {
  id: number;
  result_id: number;
  client_id: number;
  page_id: number;
  note: string;
  flagged_by: string;
  flagged_at: string;
  status: 'open' | 'resolved';
  resolved_by: string | null;
  resolved_at: string | null;
}

export interface ClaudeAssessment {
  severity: Severity;
  summary: string;
  detail: string;
  affected_areas: string[];
  recommendation: 'accept' | 'investigate';
  reasoning: string;
  assessed_at: string;
  assessed_by: string;
}

export interface LighthouseScores {
  performance: number | null;
  accessibility: number | null;
  bestPractices: number | null;
  seo: number | null;
}

export const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  passed: { label: 'Passed', color: '#1A8F5F', bg: 'rgba(26,143,95,.10)' },
  changes: { label: 'Changes found', color: '#B47A12', bg: 'rgba(180,122,18,.12)' },
  broken: { label: 'Likely regression', color: '#C0322B', bg: 'rgba(192,50,43,.10)' },
  running: { label: 'Running', color: '#2F6FB0', bg: 'rgba(47,111,176,.10)' },
  resolved: { label: 'Resolved', color: '#6B6B6B', bg: 'rgba(107,107,107,.10)' },
  accepted: { label: 'Accepted', color: '#6B6B6B', bg: 'rgba(107,107,107,.10)' },
  error: { label: 'Capture failed', color: '#C0322B', bg: 'rgba(192,50,43,.10)' },
};

export const SEVERITY_META: Record<Severity, { label: string; color: string }> = {
  intentional: { label: 'Intentional change', color: '#1A8F5F' },
  minor: { label: 'Minor cosmetic', color: '#B47A12' },
  regression: { label: 'Likely regression', color: '#C0322B' },
  broken: { label: 'Broken', color: '#8E1F1A' },
};
