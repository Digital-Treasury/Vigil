'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutGrid, Flag, Settings as SettingsIcon, LogOut } from 'lucide-react';
import { APP_NAME } from '@vigil/core';
import { Logo } from './Logo';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  badge?: number;
}

export function Sidebar({
  user,
  openInvestigations,
  signOutAction,
}: {
  user?: { name?: string | null; email?: string | null; image?: string | null };
  openInvestigations: number;
  signOutAction: () => Promise<void>;
}) {
  const pathname = usePathname();
  const items: NavItem[] = [
    { href: '/', label: 'Dashboard', icon: LayoutGrid },
    { href: '/investigations', label: 'Investigations', icon: Flag, badge: openInvestigations },
    { href: '/settings', label: 'Settings', icon: SettingsIcon },
  ];

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' || pathname.startsWith('/clients') : pathname.startsWith(href);

  const initials = (user?.name ?? user?.email ?? 'DT')
    .split(/[\s@.]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('');

  return (
    <aside className="sticky top-0 flex h-screen w-[236px] flex-none flex-col border-r border-ink-7 bg-ink-10">
      <div className="flex items-center gap-2.5 px-[22px] pb-[18px] pt-[22px]">
        <Logo size={26} />
        <span className="text-[19px] font-bold tracking-tight text-ink-1">{APP_NAME}</span>
      </div>

      <nav className="flex flex-col gap-0.5 px-3 py-2">
        {items.map((it) => {
          const active = isActive(it.href);
          const Icon = it.icon;
          return (
            <Link
              key={it.href}
              href={it.href}
              className="flex items-center gap-[11px] rounded-[9px] px-3 py-[9px] text-sm transition"
              style={{
                fontWeight: active ? 600 : 500,
                background: active ? 'var(--color-ink-1)' : 'transparent',
                color: active ? '#fff' : 'var(--color-ink-3)',
              }}
            >
              <Icon size={18} />
              <span className="flex-1">{it.label}</span>
              {it.badge ? (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1.5 text-[11px] font-bold text-white">
                  {it.badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-ink-7 px-3 py-3.5">
        <div className="flex items-center gap-2.5 rounded-[9px] px-2.5 py-2">
          <div className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-ink-1 text-[12px] font-semibold text-white">
            {initials || 'DT'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-semibold leading-tight text-ink-1">
              {user?.name ?? 'Signed in'}
            </div>
            <div className="truncate text-[11px] text-ink-5">{user?.email}</div>
          </div>
          <form action={signOutAction}>
            <button type="submit" title="Sign out" className="text-ink-5 hover:text-ink-2">
              <LogOut size={16} />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
