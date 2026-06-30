'use client';

import { useTransition, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, Loader2, Check } from 'lucide-react';
import { recaptureBaseline } from '@/lib/actions/pages';

export function RecaptureButton({ clientId, pageId }: { clientId: string; pageId: string }) {
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
  const router = useRouter();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await recaptureBaseline(clientId, pageId);
          setDone(true);
          router.refresh();
          setTimeout(() => setDone(false), 4000);
        })
      }
      className="flex h-10 items-center gap-1.5 rounded-[10px] border border-ink-7 bg-ink-10 px-[15px] text-[13.5px] font-semibold text-ink-1 transition active:scale-[.98] disabled:opacity-60"
    >
      {pending ? <Loader2 size={15} className="animate-spin" /> : done ? <Check size={15} className="text-pass" /> : <RefreshCw size={15} />}
      {done ? 'Queued' : 'Re-capture & set baseline'}
    </button>
  );
}
