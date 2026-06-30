'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Flag, Loader2 } from 'lucide-react';
import { startCheckpoint, endCheckpoint } from '@/lib/actions/clients';

export function CheckpointToggle({ clientId, active }: { clientId: string; active: boolean }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await (active ? endCheckpoint(clientId) : startCheckpoint(clientId));
          router.refresh();
        })
      }
      className="flex h-10 items-center gap-1.5 rounded-[10px] border border-ink-7 bg-ink-10 px-[15px] text-[13.5px] font-semibold text-ink-1 transition active:scale-[.98] disabled:opacity-60"
    >
      {pending ? <Loader2 size={16} className="animate-spin" /> : <Flag size={16} />}
      {active ? 'End checkpoint' : 'Start checkpoint'}
    </button>
  );
}
