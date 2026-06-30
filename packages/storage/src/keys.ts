// Storage key builders. Keys are opaque to the DB (stored as *_key columns) and
// identical across drivers, so moving local → R2 never rewrites references.

export type Artifact =
  | 'screenshot'
  | 'served-html'
  | 'rendered-dom'
  | 'rendered-dom-normalised'
  | 'lighthouse'
  | 'diff-image'
  | 'source-html-diff'
  | 'dom-diff';

const EXT: Record<Artifact, string> = {
  screenshot: 'webp',
  'served-html': 'html',
  'rendered-dom': 'html',
  'rendered-dom-normalised': 'html',
  lighthouse: 'json',
  'diff-image': 'png',
  'source-html-diff': 'txt',
  'dom-diff': 'txt',
};

export function captureKey(captureId: string, viewport: string, artifact: Artifact): string {
  return `captures/${captureId}/${viewport}-${artifact}.${EXT[artifact]}`;
}

export function comparisonKey(comparisonId: string, artifact: Artifact): string {
  return `comparisons/${comparisonId}/${artifact}.${EXT[artifact]}`;
}

export function baselineKey(baselineId: string, viewport: string, artifact: Artifact): string {
  return `baselines/${baselineId}/${viewport}-${artifact}.${EXT[artifact]}`;
}

export function clientLogoKey(clientId: string, ext: string): string {
  return `clients/${clientId}/logo.${ext}`;
}
