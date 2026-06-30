import { notFound } from 'next/navigation';
import { prisma } from '@vigil/db';
import { ClientForm } from '@/components/ClientForm';
import { updateClient } from '@/lib/actions/clients';

export const dynamic = 'force-dynamic';

export default async function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await prisma.client.findUnique({ where: { id } });
  if (!client) notFound();

  const update = updateClient.bind(null, id);
  return (
    <ClientForm
      action={update}
      title={`Edit ${client.name}`}
      submitLabel="Save changes"
      backHref={`/clients/${id}`}
      initial={{
        name: client.name,
        primaryUrl: client.primaryUrl,
        logoUrl: client.logoUrl,
        notifyEmails: client.notifyEmails,
        lighthouseEnabled: client.lighthouseEnabled,
        thresholdOverride: client.thresholdOverride,
        retentionOverride: client.retentionOverride,
        scheduleEnabled: client.scheduleEnabled,
        scheduleCron: client.scheduleCron,
        timezone: client.timezone,
      }}
    />
  );
}
