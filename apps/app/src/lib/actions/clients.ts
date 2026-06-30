'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@vigil/db';
import { enqueueRun, removeClientSchedule, enqueueCheckpointCaptures } from '@/lib/queue';

const emailsField = z
  .string()
  .optional()
  .transform((s) =>
    (s ?? '')
      .split(/[\s,;]+/)
      .map((e) => e.trim())
      .filter(Boolean),
  );

const ClientInput = z.object({
  name: z.string().min(1, 'Name is required'),
  primaryUrl: z.string().url('Enter a valid URL (including https://)'),
  logoUrl: z.string().url().optional().or(z.literal('').transform(() => undefined)),
  notifyEmails: emailsField,
  lighthouseEnabled: z.coerce.boolean().default(true),
  thresholdOverride: z
    .union([z.coerce.number().min(0).max(100), z.literal('').transform(() => undefined)])
    .optional(),
  retentionOverride: z
    .union([z.coerce.number().int().min(1), z.literal('').transform(() => undefined)])
    .optional(),
});

export type ActionResult = { ok: true } | { ok: false; error: string };

function fields(formData: FormData) {
  return {
    name: formData.get('name'),
    primaryUrl: formData.get('primaryUrl'),
    logoUrl: formData.get('logoUrl') ?? '',
    notifyEmails: formData.get('notifyEmails') ?? '',
    lighthouseEnabled: formData.get('lighthouseEnabled') === 'on',
    thresholdOverride: formData.get('thresholdOverride') ?? '',
    retentionOverride: formData.get('retentionOverride') ?? '',
  };
}

export async function createClient(formData: FormData) {
  const parsed = ClientInput.safeParse(fields(formData));
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? 'Invalid input');
  }
  const client = await prisma.client.create({ data: parsed.data });
  revalidatePath('/');
  redirect(`/clients/${client.id}`);
}

export async function updateClient(id: string, formData: FormData) {
  const parsed = ClientInput.safeParse(fields(formData));
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? 'Invalid input');
  }
  await prisma.client.update({ where: { id }, data: parsed.data });
  revalidatePath(`/clients/${id}`);
  revalidatePath('/');
  redirect(`/clients/${id}`);
}

export async function deleteClient(id: string) {
  await removeClientSchedule(id);
  await prisma.client.delete({ where: { id } });
  revalidatePath('/');
  redirect('/');
}

/** Start a maintenance checkpoint (marks the client's checkpoint active).
 *  The "before" capture set is enqueued in P4; here we set up the state. */
export async function startCheckpoint(clientId: string) {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: { pages: { where: { enabled: true }, include: { viewports: true } } },
  });
  if (!client || client.activeCheckpointId) return;
  const cp = await prisma.checkpoint.create({ data: { clientId, status: 'active' } });
  await prisma.client.update({ where: { id: clientId }, data: { activeCheckpointId: cp.id } });

  // Capture the "before" set across all the client's pages/viewports.
  const units = client.pages.flatMap((p) => {
    const vps = (p.viewports.length ? p.viewports.map((v) => v.kind) : ['desktop']) as (
      | 'desktop'
      | 'mobile'
    )[];
    return vps.map((viewport) => ({ pageId: p.id, viewport }));
  });
  if (units.length) await enqueueCheckpointCaptures(cp.id, units);

  revalidatePath(`/clients/${clientId}`);
  revalidatePath('/');
}

export async function endCheckpoint(clientId: string) {
  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client?.activeCheckpointId) return;
  await prisma.checkpoint.update({
    where: { id: client.activeCheckpointId },
    data: { status: 'ended', endedAt: new Date() },
  });
  await prisma.client.update({ where: { id: clientId }, data: { activeCheckpointId: null } });
  revalidatePath(`/clients/${clientId}`);
  revalidatePath('/');
}

/** Trigger an immediate manual run for a client (enqueued; worker processes it). */
export async function runNow(clientId: string) {
  const run = await prisma.run.create({
    data: { clientId, trigger: 'manual', status: 'queued' },
  });
  await enqueueRun({ runId: run.id, clientId });
  revalidatePath('/');
  revalidatePath(`/clients/${clientId}`);
  return run.id;
}
