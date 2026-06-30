import { parse, serialize, defaultTreeAdapter } from 'parse5';

// Normalise rendered DOM before diffing (Scope §4.5): strip volatile noise so a
// line diff reflects real structural change, not per-load churn. Conservative by
// design — over-stripping hides real regressions, so the rules are explicit and
// versioned here.

const VOLATILE_ATTR_EXACT = new Set([
  'nonce',
  'data-nonce',
  'csrf-token',
  'x-csrf-token',
  'data-csrf',
  'data-csrf-token',
  'data-reactid',
  'data-react-checksum',
  'data-turbo-track',
]);

// Whole attributes whose NAME matches these are dropped (framework runtime hooks).
const VOLATILE_ATTR_PREFIX = /^data-(reactid|react-|v-[0-9a-f]|svelte-|astro-|n-|turbo-|hk=)/i;

// Random-id patterns that appear inside id/for/aria-* values.
const VOLATILE_ID_PATTERNS: RegExp[] = [
  /:r[0-9a-z]+:/gi, // React useId
  /:R[0-9a-z]+:/g, // React useId (newer)
  /\bradix-[a-z0-9:-]+/gi,
  /\bheadlessui-[a-z0-9:-]+/gi,
  /\bmui-[0-9]+\b/gi,
];

// Hashed class tokens (emotion / styled-components / CSS modules).
const HASHED_CLASS_PATTERNS: RegExp[] = [
  /\bcss-[a-z0-9]{5,}\b/gi,
  /\bsc-[a-zA-Z0-9]{6,}\b/g,
  /\b([A-Za-z][\w-]*?)_[A-Za-z0-9]{5,}\b/g, // Name_hash → Name_*
];

// Cache-busting query params on asset URLs.
const CACHE_BUST_PARAMS = new Set(['v', 'ver', 'version', 't', 'ts', '_', 'cb', 'cache', 'rev', 'hash']);

const ISO_TS = /\b\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:?\d{2})?\b/g;

const SKIP_TEXT_PARENTS = new Set(['pre', 'code', 'script', 'style', 'textarea']);

function normaliseIdValue(value: string): string {
  let v = value;
  for (const p of VOLATILE_ID_PATTERNS) v = v.replace(p, '⟨id⟩');
  return v;
}

function normaliseClassValue(value: string): string {
  let v = value;
  for (const p of HASHED_CLASS_PATTERNS) {
    v = v.replace(p, (m, name) => (name ? `${name}_⟨h⟩` : '⟨h⟩'));
  }
  return v;
}

function normaliseUrlValue(value: string): string {
  const qIndex = value.indexOf('?');
  if (qIndex === -1) return value;
  const base = value.slice(0, qIndex);
  const query = value.slice(qIndex + 1);
  const kept = query
    .split('&')
    .filter((pair) => {
      const key = pair.split('=')[0]?.toLowerCase() ?? '';
      return !CACHE_BUST_PARAMS.has(key);
    })
    .join('&');
  return kept ? `${base}?${kept}` : base;
}

interface ElementNode {
  tagName: string;
  attrs: { name: string; value: string }[];
  childNodes?: unknown[];
}
interface TextNode {
  nodeName: '#text';
  value: string;
  parentNode?: { tagName?: string };
}

function isElement(node: unknown): node is ElementNode {
  return !!node && typeof node === 'object' && 'tagName' in node && 'attrs' in node;
}
function isText(node: unknown): node is TextNode {
  return !!node && typeof node === 'object' && (node as { nodeName?: string }).nodeName === '#text';
}

function transformElement(el: ElementNode): void {
  const attrs = el.attrs
    .filter((a) => !VOLATILE_ATTR_EXACT.has(a.name) && !VOLATILE_ATTR_PREFIX.test(a.name))
    .map((a) => {
      let value = a.value;
      if (a.name === 'id' || a.name === 'for' || a.name.startsWith('aria-')) {
        value = normaliseIdValue(value);
      } else if (a.name === 'class') {
        value = normaliseClassValue(value);
      } else if (a.name === 'src' || a.name === 'href' || a.name === 'srcset') {
        value = a.name === 'srcset'
          ? value.split(',').map((s) => normaliseUrlValue(s.trim())).join(', ')
          : normaliseUrlValue(value);
      }
      return { name: a.name, value };
    });
  // deterministic attribute order
  attrs.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  el.attrs = attrs;
}

function walk(node: unknown): void {
  if (isElement(node)) transformElement(node);
  if (isText(node)) {
    const parentTag = node.parentNode?.tagName?.toLowerCase();
    if (!parentTag || !SKIP_TEXT_PARENTS.has(parentTag)) {
      let v = node.value.replace(ISO_TS, '⟨ts⟩');
      v = v.replace(/[\t\f\v ]*\n[\t\f\v \n]*/g, '\n').replace(/[ \t]{2,}/g, ' ');
      node.value = v;
    }
  }
  const children = (node as { childNodes?: unknown[] }).childNodes;
  if (Array.isArray(children)) for (const c of children) walk(c);
}

/** Parse, strip volatile noise, sort attributes, collapse whitespace, re-serialise. */
export function normaliseDom(html: string): string {
  const doc = parse(html, { treeAdapter: defaultTreeAdapter });
  walk(doc);
  return serialize(doc, { treeAdapter: defaultTreeAdapter });
}
