// Pure parsing for the bulk client import — kept free of UI imports so it's testable.
//
// Accepted line formats (header row optional, mixable):
//   https://client-site.com.au/some-page              ← bare URL; client + label derived
//   Client Name,https://client-site.com.au/page       ← explicit client
//   Client Name,/pricing,Pricing,desktop|mobile       ← path + label + viewports

export interface ParsedRow {
  raw: string;
  client: string;
  clientUrl: string;
  label: string;
  url: string;
  viewports: string[];
  valid: boolean;
  reason?: string;
}

function titleCase(text: string): string {
  return text
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => word[0]!.toUpperCase() + word.slice(1))
    .join(' ');
}

function isUrlish(cell: string): boolean {
  return /^https?:\/\//i.test(cell) || /^[a-z0-9.-]+\.[a-z]{2,}(\/|$)/i.test(cell);
}

function normalizeUrl(cell: string): string {
  return /^https?:\/\//i.test(cell) ? cell : `https://${cell}`;
}

function deriveClientName(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    return titleCase(host.split('.')[0]);
  } catch {
    return '';
  }
}

function deriveLabel(url: string): string {
  try {
    const path = new URL(url).pathname.replace(/\/+$/, '');
    if (!path || path === '/') return 'Homepage';
    return titleCase(decodeURIComponent(path.split('/').filter(Boolean).pop()!));
  } catch {
    return '';
  }
}

function parseViewports(cell: string | undefined): string[] {
  if (!cell) return ['desktop'];
  const list = cell
    .split(/[|;/ ]+/)
    .map((v) => v.trim().toLowerCase())
    .filter((v) => ['desktop', 'mobile'].includes(v));
  return list.length ? list : ['desktop'];
}

export function parseImport(text: string): ParsedRow[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line, i) => !(i === 0 && /^(client|name)\s*,/i.test(line)))
    .map((raw) => {
      const cells = raw.split(',').map((cell) => cell.trim().replace(/^"|"$/g, ''));
      let client = '';
      let url = '';
      let label = '';
      let viewports: string[] = ['desktop'];

      if (cells.length === 1 || isUrlish(cells[0])) {
        // Bare URL (optionally followed by label, viewports)
        url = normalizeUrl(cells[0]);
        client = deriveClientName(url);
        label = cells[1] || deriveLabel(url);
        viewports = parseViewports(cells[2]);
      } else {
        // client, url-or-path, label?, viewports?
        client = cells[0];
        url = cells[1] || '';
        if (url && !url.startsWith('/')) url = normalizeUrl(url);
        label = cells[2] || (url ? deriveLabel(url.startsWith('/') ? `https://x.com${url}` : url) : '');
        viewports = parseViewports(cells[3]);
      }

      let clientUrl = '';
      let valid = true;
      let reason: string | undefined;
      if (!client) { valid = false; reason = 'no client name'; }
      else if (!url) { valid = false; reason = 'no URL'; }
      else if (url.startsWith('/')) { valid = false; reason = 'path needs a client row with a full URL first'; }
      else {
        try {
          clientUrl = new URL(url).origin;
        } catch {
          valid = false;
          reason = 'invalid URL';
        }
      }
      if (valid && !label) label = 'Homepage';
      return { raw, client, clientUrl, label, url, viewports, valid, reason };
    })
    .map((row, _i, rows) => {
      // Resolve path-only rows against the nearest full-URL row for the same client.
      if (!row.valid && row.reason?.startsWith('path')) {
        const sibling = rows.find((r) => r.valid && r.client.toLowerCase() === row.client.toLowerCase());
        if (sibling) {
          const cells = row.raw.split(',').map((c) => c.trim());
          const path = cells[1];
          return {
            ...row,
            url: sibling.clientUrl + path,
            clientUrl: sibling.clientUrl,
            label: cells[2] || deriveLabel(sibling.clientUrl + path),
            valid: true,
            reason: undefined,
          };
        }
      }
      return row;
    });
}

export function groupImport(rows: ParsedRow[]) {
  const groups = new Map<
    string,
    { name: string; url: string; pages: { label: string; url: string; viewports: string[] }[] }
  >();
  for (const row of rows.filter((r) => r.valid)) {
    const key = row.client.toLowerCase();
    if (!groups.has(key)) groups.set(key, { name: row.client, url: row.clientUrl, pages: [] });
    groups.get(key)!.pages.push({ label: row.label, url: row.url, viewports: row.viewports });
  }
  return Array.from(groups.values());
}

export const CLIENT_TEMPLATE = `client,url,label,viewports
Northbridge Dental,https://northbridgedental.com.au/,Homepage,desktop|mobile
Northbridge Dental,/services,Services,desktop
Northbridge Dental,/contact,Contact,desktop
Harbour Legal,https://harbourlegal.com.au/,Homepage,desktop|mobile
Harbour Legal,/our-team,Our Team,desktop
Curio Coffee Roasters,https://curiocoffee.com.au/,Homepage,desktop
`;

export const PAGE_TEMPLATE = `label,url,viewports
Homepage,/,desktop|mobile
Services,/services,desktop
Pricing,/pricing,desktop|mobile
Contact,/contact,desktop
`;
