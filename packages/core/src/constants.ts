// Single-source the product name so a rename is a one-line change.
export const APP_NAME = 'Vigil';
export const APP_TAGLINE = 'Find breakage before the client does.';

export const DEFAULT_TIMEZONE = 'Australia/Melbourne';

// Viewport capture dimensions (full-page, so only width is fixed).
export const VIEWPORTS = {
  desktop: { width: 1440, label: 'Desktop' },
  mobile: { width: 390, label: 'Mobile' },
} as const;

export type ViewportKey = keyof typeof VIEWPORTS;

// The single diff-highlight colour (changed pixels). Magenta-pink.
export const DIFF_HIGHLIGHT = '#FF1F8E';
export const DIFF_HIGHLIGHT_RGB: [number, number, number] = [255, 31, 142];

// Vision-capable Claude models offered for assessment (verified via claude-api).
// Pricing is per million tokens (input / output), for the cost note in the UI.
export const ASSESSMENT_MODELS = [
  { id: 'claude-sonnet-4-6', label: 'Sonnet 4.6 (recommended)', inPerMTok: 3, outPerMTok: 15 },
  { id: 'claude-haiku-4-5', label: 'Haiku 4.5 (cheapest)', inPerMTok: 1, outPerMTok: 5 },
  { id: 'claude-opus-4-8', label: 'Opus 4.8 (strongest)', inPerMTok: 5, outPerMTok: 25 },
] as const;

export const DEFAULT_ASSESSMENT_MODEL = 'claude-sonnet-4-6';
