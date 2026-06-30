import { ClientForm } from '@/components/ClientForm';
import { createClient } from '@/lib/actions/clients';

export default function NewClientPage() {
  return <ClientForm action={createClient} title="Add client" submitLabel="Add client & capture pages" />;
}
