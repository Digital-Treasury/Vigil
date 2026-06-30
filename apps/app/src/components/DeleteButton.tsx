'use client';

import { useTransition } from 'react';
import { Trash2, Loader2 } from 'lucide-react';

export function DeleteButton({
  action,
  confirmMessage,
  label,
  className,
  iconOnly = false,
}: {
  action: () => Promise<void>;
  confirmMessage: string;
  label?: string;
  className?: string;
  iconOnly?: boolean;
}) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!window.confirm(confirmMessage)) return;
        start(() => action());
      }}
      title={label ?? 'Delete'}
      className={
        className ??
        'flex items-center gap-1.5 text-[13px] font-semibold text-danger transition hover:opacity-80 disabled:opacity-60'
      }
    >
      {pending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
      {!iconOnly && label}
    </button>
  );
}
