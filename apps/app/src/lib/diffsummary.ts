// Summarise a stored unified diff into counts + a few notable lines, for the
// concise text the Claude assessment receives (not the full dumps — Scope §4.6).
export function summariseUnifiedDiff(label: string, unified: string): string {
  if (!unified.trim()) return `${label}: no change.`;
  const lines = unified.split('\n');
  const added = lines
    .filter((l) => l.startsWith('+') && !l.startsWith('+++'))
    .map((l) => l.slice(1).trim())
    .filter(Boolean);
  const removed = lines
    .filter((l) => l.startsWith('-') && !l.startsWith('---'))
    .map((l) => l.slice(1).trim())
    .filter(Boolean);
  const notable = [
    ...removed.slice(0, 6).map((l) => `- ${l.slice(0, 160)}`),
    ...added.slice(0, 6).map((l) => `+ ${l.slice(0, 160)}`),
  ];
  return `${label}: +${added.length}/-${removed.length} lines.\n${notable.join('\n')}`;
}
