import { notFound } from 'next/navigation';
import { prisma } from '@vigil/db';
import { PageForm } from '@/components/PageForm';
import { updatePage } from '@/lib/actions/pages';

export const dynamic = 'force-dynamic';

export default async function EditPagePage({
  params,
}: {
  params: Promise<{ id: string; pageId: string }>;
}) {
  const { id, pageId } = await params;
  const page = await prisma.page.findUnique({ where: { id: pageId }, include: { viewports: true } });
  if (!page || page.clientId !== id) notFound();

  return (
    <PageForm
      action={updatePage.bind(null, id, pageId)}
      title={`Edit ${page.label}`}
      submitLabel="Save changes"
      backHref={`/clients/${id}/pages/${pageId}`}
      initial={{
        label: page.label,
        url: page.url,
        viewports: page.viewports.map((v) => v.kind),
        maskSelectors: page.maskSelectors,
        waitForSelector: page.waitForSelector,
      }}
    />
  );
}
