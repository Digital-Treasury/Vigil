import { PageForm } from '@/components/PageForm';
import { createPage } from '@/lib/actions/pages';

export default async function NewPagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <PageForm
      action={createPage.bind(null, id)}
      title="Add page"
      submitLabel="Add page"
      backHref={`/clients/${id}?tab=pages`}
    />
  );
}
