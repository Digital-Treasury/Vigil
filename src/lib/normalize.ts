// Normalise a rendered DOM snapshot so volatile, per-request values don't
// register as differences: nonces, CSRF tokens, cache-busting query strings,
// session ids, and framework-generated random ids.

const VOLATILE_ATTRS = ['nonce', 'data-nonce', 'csrf-token', 'data-csrf'];

export function normalizeDom(html: string): string {
  let out = html;

  for (const attr of VOLATILE_ATTRS) {
    out = out.replace(new RegExp(`\\s${attr}="[^"]*"`, 'gi'), ` ${attr}="…"`);
  }

  // WordPress & co: cache-busting `?ver=` / `?v=` / `&t=` query params on assets.
  out = out.replace(/([?&](?:ver|v|t|ts|cb|cache|_)=)[^"'&\s]+/gi, '$1…');

  // Inline CSRF/nonce hidden inputs (WP nonces, form tokens).
  out = out.replace(
    /(<input[^>]*(?:name|id)="[^"]*(?:nonce|csrf|token)[^"]*"[^>]*value=")[^"]*(")/gi,
    '$1…$2'
  );

  // Random/hashed ids some builders regenerate per render (e.g. `id="el-a1b2c3d4"`).
  out = out.replace(/\b(id|for|aria-labelledby|aria-describedby)="([a-z-]*)[0-9a-f]{8,}"/gi, '$1="$2…"');

  // Timestamps in comments (page generated at / cached at).
  out = out.replace(/<!--[\s\S]*?-->/g, (comment) =>
    /\d{4}-\d{2}-\d{2}|\d{2}:\d{2}:\d{2}|cached|generated|served/i.test(comment) ? '<!-- … -->' : comment
  );

  return out;
}
