'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma, type ViewportKind } from '@vigil/db';
import { VIEWPORTS, parsePagesCsv, type ViewportKey } from '@vigil/core';

const VP_KINDS: ViewportKey[] = ['desktop', 'mobile'];

function linesToList(raw: FormDataEntryValue | null): string[] {
  return String(raw ?? '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
}

function selectedViewports(formData: FormData): ViewportKey[] {
  const vps = VP_KINDS.filter((k) => formData.get(`vp_${k}`) === 'on');
  return vps.length ? vps : ['desktop'];
}

const PageInput = z.object({
  label: z.string().min(1, 'Label is required'),
  url: z.string().url('Enter a valid URL (including https://)'),
  waitForSelector: z.string().optional().transform((s) => (s?.trim() ? s.trim() : null)),
});

async function setViewports(pageId: string, viewports: ViewportKey[]) {
  await prisma.pageViewport.deleteMany({ where: { pageId } });
  await prisma.pageViewport.createMany({
    data: viewports.map((kind) => ({
      pageId,
      kind: kind as ViewportKind,
      width: VIEWPORTS[kind].width,
    })),
  });
}

export async function createPage(clientId: string, formData: FormData) {
  const parsed = PageInput.safeParse({
    label: formData.get('label'),
    url: formData.get('url'),
    waitForSelector: formData.get('waitForSelector') ?? '',
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'Invalid input');

  const page = await prisma.page.create({
    data: {
      clientId,
      label: parsed.data.label,
      url: parsed.data.url,
      waitForSelector: parsed.data.waitForSelector,
      maskSelectors: linesToList(formData.get('maskSelectors')),
    },
  });
  await setViewports(page.id, selectedViewports(formData));
  revalidatePath(`/clients/${clientId}`);
  redirect(`/clients/${clientId}?tab=pages`);
}

export async function updatePage(clientId: string, pageId: string, formData: FormData) {
  const parsed = PageInput.safeParse({
    label: formData.get('label'),
    url: formData.get('url'),
    waitForSelector: formData.get('waitForSelector') ?? '',
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'Invalid input');

  await prisma.page.update({
    where: { id: pageId },
    data: {
      label: parsed.data.label,
      url: parsed.data.url,
      waitForSelector: parsed.data.waitForSelector,
      maskSelectors: linesToList(formData.get('maskSelectors')),
    },
  });
  await setViewports(pageId, selectedViewports(formData));
  revalidatePath(`/clients/${clientId}`);
  revalidatePath(`/clients/${clientId}/pages/${pageId}`);
  redirect(`/clients/${clientId}/pages/${pageId}`);
}

export async function deletePage(clientId: string, pageId: string) {
  await prisma.page.delete({ where: { id: pageId } });
  revalidatePath(`/clients/${clientId}`);
  redirect(`/clients/${clientId}?tab=pages`);
}

/** CSV page import (Scope §4.2): parse, validate, create the valid rows. */
export async function importPagesCsv(clientId: string, csv: string) {
  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) throw new Error('Client not found');
  const { rows } = parsePagesCsv(csv, client.primaryUrl);
  const valid = rows.filter((r) => r.valid);

  for (const row of valid) {
    const page = await prisma.page.create({
      data: { clientId, label: row.label, url: row.url },
    });
    await setViewports(page.id, row.viewports);
  }
  revalidatePath(`/clients/${clientId}`);
  return { imported: valid.length, skipped: rows.length - valid.length };
}
