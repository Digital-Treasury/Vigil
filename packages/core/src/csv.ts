// CSV page-import parser (Scope §4.2). Accepts `label,url[,viewports]` rows,
// validates URLs, and returns parsed rows + per-row validity for the preview.

import { VIEWPORTS, type ViewportKey } from './constants';

export interface ParsedPageRow {
  label: string;
  url: string;
  viewports: ViewportKey[];
  valid: boolean;
  error?: string;
}

export interface CsvParseResult {
  rows: ParsedPageRow[];
  validCount: number;
  invalidCount: number;
}

function splitCsvLine(line: string): string[] {
  // Minimal CSV: supports quoted fields with embedded commas.
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function parseViewports(raw: string | undefined): ViewportKey[] {
  if (!raw) return ['desktop'];
  const parts = raw
    .split(/[|;\s]+/)
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean);
  const vps = parts.filter((p): p is ViewportKey => p in VIEWPORTS);
  return vps.length ? Array.from(new Set(vps)) : ['desktop'];
}

/**
 * Resolve a CSV `url` cell against a client's primary URL. Accepts absolute URLs
 * or root-relative paths (e.g. `/pricing`). Returns null if it can't be made valid.
 */
export function resolvePageUrl(cell: string, primaryUrl: string): string | null {
  const v = cell.trim();
  if (!v) return null;
  try {
    if (/^https?:\/\//i.test(v)) return new URL(v).toString();
    if (v.startsWith('/')) return new URL(v, primaryUrl).toString();
    return null; // bare paths without a leading slash are rejected (matches prototype)
  } catch {
    return null;
  }
}

export function parsePagesCsv(content: string, primaryUrl: string): CsvParseResult {
  const lines = content
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // Skip a header row if present (first cell looks like "label").
  if (lines.length && /^label\b/i.test(lines[0]!)) lines.shift();

  const rows: ParsedPageRow[] = lines.map((line) => {
    const cells = splitCsvLine(line);
    const label = (cells[0] ?? '').trim();
    const urlCell = (cells[1] ?? '').trim();
    const viewports = parseViewports(cells[2]);
    const resolved = resolvePageUrl(urlCell, primaryUrl);

    if (!label) return { label, url: urlCell, viewports, valid: false, error: 'missing label' };
    if (!resolved) {
      return {
        label,
        url: urlCell,
        viewports,
        valid: false,
        error: urlCell ? 'invalid URL' : 'missing URL',
      };
    }
    return { label, url: resolved, viewports, valid: true };
  });

  return {
    rows,
    validCount: rows.filter((r) => r.valid).length,
    invalidCount: rows.filter((r) => !r.valid).length,
  };
}
