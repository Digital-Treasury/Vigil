'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@vigil/db';
import { currentUser } from '@/lib/session';
import { promoteCaptureToBaseline } from '@/lib/baseline';

function revalidate() {
  revalidatePath('/investigations');
  revalidatePath('/');
}

/** Save / update the free-text note on an investigation. */
export async function updateInvestigationNote(id: string, note: string) {
  await prisma.investigation.update({
    where: { id },
    data: { notes: note.trim() || null },
  });
  revalidatePath('/investigations');
}

/** Mark an investigation resolved (the change was understood / handled by a dev). */
export async function resolveInvestigation(id: string, note?: string) {
  const inv = await prisma.investigation.findUnique({ where: { id } });
  if (!inv) return;
  const user = await currentUser();

  await prisma.investigation.update({
    where: { id },
    data: {
      status: 'resolved',
      notes: note?.trim() ? note.trim() : undefined,
      resolvedById: user?.id ?? null,
      resolvedAt: new Date(),
    },
  });
  await prisma.comparison.update({
    where: { id: inv.comparisonId },
    data: { status: 'resolved', flagged: false },
  });
  revalidate();
}

/** Accept the flagged capture as the new baseline, then resolve the investigation. */
export async function acceptInvestigation(id: string) {
  const inv = await prisma.investigation.findUnique({
    where: { id },
    include: { comparison: { include: { toCapture: true } } },
  });
  if (!inv) return;
  const user = await currentUser();

  const capture = inv.comparison.toCapture;
  if (capture) await promoteCaptureToBaseline(capture, user?.id);

  await prisma.comparison.update({
    where: { id: inv.comparisonId },
    data: { status: 'accepted', flagged: false },
  });
  await prisma.investigation.update({
    where: { id },
    data: { status: 'resolved', resolvedById: user?.id ?? null, resolvedAt: new Date() },
  });
  revalidate();
  revalidatePath(`/clients/${inv.clientId}`);
}

/** Re-open a previously resolved investigation. */
export async function reopenInvestigation(id: string) {
  const inv = await prisma.investigation.findUnique({ where: { id } });
  if (!inv) return;
  await prisma.investigation.update({
    where: { id },
    data: { status: 'open', resolvedById: null, resolvedAt: null },
  });
  await prisma.comparison.update({
    where: { id: inv.comparisonId },
    data: { status: 'flagged', flagged: true },
  });
  revalidate();
}
