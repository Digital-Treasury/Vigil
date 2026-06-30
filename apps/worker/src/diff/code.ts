import { createTwoFilesPatch, diffLines } from 'diff';

export interface CodeDiffSummary {
  added: number;
  removed: number;
  notable: string[];
}

/** Classic unified (add/remove) diff text, rendered as a code-diff in the UI. */
export function unifiedDiff(before: string, after: string, label: string): string {
  return createTwoFilesPatch(`${label} — baseline`, `${label} — capture`, before, after, '', '', {
    context: 3,
  });
}

/** Counts + a few notable changed lines, for the Claude assessment text input. */
export function diffSummary(before: string, after: string): CodeDiffSummary {
  const parts = diffLines(before, after);
  let added = 0;
  let removed = 0;
  const notable: string[] = [];
  for (const part of parts) {
    if (part.added) {
      added += part.count ?? 0;
      collectNotable(part.value, '+', notable);
    } else if (part.removed) {
      removed += part.count ?? 0;
      collectNotable(part.value, '-', notable);
    }
  }
  return { added, removed, notable: notable.slice(0, 12) };
}

function collectNotable(block: string, sign: '+' | '-', out: string[]) {
  for (const raw of block.split('\n')) {
    const line = raw.trim();
    if (!line || out.length >= 24) continue;
    out.push(`${sign} ${line.slice(0, 160)}`);
  }
}

export function changedLineCount(before: string, after: string): number {
  const { added, removed } = diffSummary(before, after);
  return added + removed;
}
