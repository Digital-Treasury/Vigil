import fs from 'fs';
import path from 'path';
import { structuredPatch } from 'diff';
import { CAPTURES_DIR } from './db';
import type { Capture } from './types';

export interface DiffLine {
  type: 'context' | 'add' | 'del' | 'hunk';
  text: string;
}

function readCapture(rel: string | null): string {
  if (!rel) return '';
  try {
    return fs.readFileSync(path.join(CAPTURES_DIR, rel), 'utf8');
  } catch {
    return '';
  }
}

function toLines(before: string, after: string, maxLines = 4000): DiffLine[] {
  const patch = structuredPatch('before', 'after', before, after, '', '', { context: 3 });
  const lines: DiffLine[] = [];
  for (const hunk of patch.hunks) {
    lines.push({
      type: 'hunk',
      text: `@@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@`,
    });
    for (const line of hunk.lines) {
      if (lines.length >= maxLines) return lines;
      if (line.startsWith('+')) lines.push({ type: 'add', text: line.slice(1) });
      else if (line.startsWith('-')) lines.push({ type: 'del', text: line.slice(1) });
      else lines.push({ type: 'context', text: line.slice(1) });
    }
  }
  return lines;
}

/** Structured line diffs for the review UI. */
export function codeDiffLines(before: Capture, after: Capture) {
  return {
    html: toLines(readCapture(before.html_path), readCapture(after.html_path)),
    dom: toLines(readCapture(before.dom_path), readCapture(after.dom_path)),
  };
}

/** Compact text form for the Claude assessment prompt. */
export function codeDiffSummary(before: Capture, after: Capture, maxChars = 6000) {
  const render = (lines: DiffLine[]) => {
    const text = lines
      .filter((l) => l.type !== 'context')
      .map((l) => (l.type === 'add' ? `+ ${l.text}` : l.type === 'del' ? `- ${l.text}` : l.text))
      .join('\n');
    if (!text) return '(no differences)';
    return text.length > maxChars ? `${text.slice(0, maxChars)}\n… (truncated)` : text;
  };
  const lines = codeDiffLines(before, after);
  return { html: render(lines.html), dom: render(lines.dom) };
}
