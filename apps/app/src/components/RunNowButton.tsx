'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Play, Loader2 } from 'lucide-react';
import { runNow } from '@/lib/actions/clients';

export function RunNowButton({
  clientId,
  variant = 'outline',
}: {
  clientId: string;
  variant?: 'outline' | 'solid';
}) {
  const [pending, start] = useTransition();
  const router = useRouter();

  const cls =
    variant === 'solid'
      ? 'h-10 bg-ink-0 px-[17px] text-[13.5px] text-white'
      : 'h-[34px] border border-ink-7 bg-ink-10 px-[13px] text-[13px] text-ink-1';

  return (
    <button
      type="button"
      disabled={pending}
      onClick={(e) => {
        e.stopPropagation();
        start(async () => {
          const runId = await runNow(clientId);
          router.push(`/runs/${runId}`);
        });
      }}
      className={`flex items-center gap-1.5 rounded-lg font-semibold transition active:scale-[.97] disabled:opacity-60 ${cls}`}
    >
      {pending ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
      Run now
    </button>
  );
}
