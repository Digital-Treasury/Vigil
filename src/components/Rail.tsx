'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutGrid, Flag, Settings, LogOut } from 'lucide-react';
import { VigilLogo } from './ui';
import { useApi } from '@/lib/useApi';

export default function Rail({ userName, userEmail }: { userName: string; userEmail: string }) {
  const pathname = usePathname();
  const { data } = useApi<{ investigations: unknown[] }>('/api/investigations', 30_000);
  const badge = data?.investigations.length ?? 0;

  const section = pathname.startsWith('/investigations')
    ? 'investigations'
    : pathname.startsWith('/settings')
      ? 'settings'
      : 'dashboard';

  const items = [
    { id: 'dashboard', href: '/', icon: LayoutGrid, label: 'Dashboard', badge: 0 },
    { id: 'investigations', href: '/investigations', icon: Flag, label: 'Investigations', badge },
    { id: 'settings', href: '/settings', icon: Settings, label: 'Settings', badge: 0 },
  ];

  return (
    <aside
      style={{
        width: 236,
        flex: 'none',
        background: 'var(--ink-10)',
        borderRight: '1px solid var(--ink-7)',
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: 0,
        height: '100vh',
      }}
    >
      <div style={{ padding: '22px 22px 18px', display: 'flex', alignItems: 'center', gap: 11 }}>
        <VigilLogo size={26} />
        <span style={{ fontSize: 19, fontWeight: 700, letterSpacing: '-.02em', color: 'var(--ink-1)' }}>Vigil</span>
      </div>

      <nav style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {items.map((item) => {
          const active = section === item.id;
          const Icon = item.icon;
          return (
            <Link
              key={item.id}
              href={item.href}
              className="vg-btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 11,
                width: '100%',
                textAlign: 'left',
                border: 'none',
                fontSize: 14,
                fontWeight: active ? 600 : 500,
                padding: '9px 12px',
                borderRadius: 9,
                background: active ? 'var(--ink-1)' : 'transparent',
                color: active ? '#fff' : 'var(--ink-3)',
                textDecoration: 'none',
              }}
            >
              <Icon size={18} strokeWidth={1.9} />
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge > 0 && (
                <span
                  style={{
                    minWidth: 20,
                    height: 20,
                    padding: '0 6px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 999,
                    background: 'var(--status-danger)',
                    color: '#fff',
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div style={{ marginTop: 'auto', padding: '14px 12px', borderTop: '1px solid var(--ink-7)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 9 }}>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 999,
              background: 'var(--ink-1)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {userName
              .split(/\s+/)
              .filter(Boolean)
              .slice(0, 2)
              .map((w) => w[0]!.toUpperCase())
              .join('')}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--ink-1)',
                lineHeight: 1.2,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {userName}
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-5)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {userEmail}
            </div>
          </div>
          <form action="/api/auth/logout" method="post" style={{ display: 'flex' }}>
            <button
              type="submit"
              className="vg-btn"
              style={{ border: 'none', background: 'none', color: 'var(--ink-5)', display: 'flex', padding: 0 }}
              title="Sign out"
            >
              <LogOut size={16} strokeWidth={1.9} />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
