import { describe, it, expect } from 'vitest';
import { effectiveThreshold, isFlagged, effectiveRetentionDays } from './thresholds';
import { diffColor, formatDiffPct, severityToHealth } from './status';
import { parsePagesCsv, resolvePageUrl } from './csv';
import { parseAssessment } from './assessment';

describe('thresholds', () => {
  it('client override wins, else global default', () => {
    expect(effectiveThreshold(0.8, 1.0)).toBe(0.8);
    expect(effectiveThreshold(null, 1.0)).toBe(1.0);
  });
  it('flags only above the effective threshold', () => {
    expect(isFlagged(1.2, 1.0)).toBe(true);
    expect(isFlagged(1.0, 1.0)).toBe(false);
    expect(isFlagged(null, 1.0)).toBe(false);
  });
  it('retention = min(client, global cap)', () => {
    expect(effectiveRetentionDays(120, 90)).toBe(90);
    expect(effectiveRetentionDays(30, 90)).toBe(30);
    expect(effectiveRetentionDays(null, 90)).toBe(90);
  });
});

describe('diff banding', () => {
  it('bands colours like the prototype', () => {
    expect(diffColor(null)).toBe('#C0322B');
    expect(diffColor(0)).toBe('#6B6B6B');
    expect(diffColor(0.5)).toBe('#1A8F5F');
    expect(diffColor(3)).toBe('#B47A12');
    expect(diffColor(9)).toBe('#C0322B');
  });
  it('formats percentages', () => {
    expect(formatDiffPct(4.06)).toBe('4.1%');
    expect(formatDiffPct(null)).toBe('—');
  });
  it('maps severity to health', () => {
    expect(severityToHealth('broken')).toBe('broken');
    expect(severityToHealth('intentional_change')).toBe('passed');
    expect(severityToHealth('cosmetic_minor')).toBe('changes');
  });
});

describe('CSV import', () => {
  it('resolves absolute + root-relative URLs, rejects bare paths', () => {
    expect(resolvePageUrl('/pricing', 'https://x.com.au')).toBe('https://x.com.au/pricing');
    expect(resolvePageUrl('https://y.com/a', 'https://x.com.au')).toBe('https://y.com/a');
    expect(resolvePageUrl('pricing', 'https://x.com.au')).toBeNull();
  });
  it('parses rows, validates, and reports invalids', () => {
    const csv = 'label,url,viewports\nHomepage,/,desktop mobile\nPricing,pricing\nContact,/contact';
    const res = parsePagesCsv(csv, 'https://x.com.au');
    expect(res.rows).toHaveLength(3);
    expect(res.validCount).toBe(2);
    expect(res.invalidCount).toBe(1);
    expect(res.rows[0]?.viewports).toEqual(['desktop', 'mobile']);
    expect(res.rows[1]?.valid).toBe(false);
  });
});

describe('assessment parser', () => {
  it('validates and clamps confidence', () => {
    const r = parseAssessment({
      severity: 'likely_regression',
      confidence: 1.4,
      summary: 's',
      details: 'd',
      affected_areas: ['hero'],
      recommendation: 'keep_and_investigate',
      recommendation_reason: 'r',
    });
    expect(r.severity).toBe('likely_regression');
    expect(r.confidence).toBe(1);
  });
  it('throws on bad severity', () => {
    expect(() => parseAssessment({ severity: 'nope' })).toThrow();
  });
});
