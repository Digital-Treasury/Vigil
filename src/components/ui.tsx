'use client';

import { STATUS_META, SEVERITY_META, type Severity } from '@/lib/types';
import type { ReactNode } from 'react';

export function StatusPill({ status, small }: { status: string; small?: boolean }) {
  const meta = STATUS_META[status] ?? STATUS_META.resolved;
  const running = status === 'running';
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: small ? 6 : 7,
        padding: small ? '3px 10px 3px 8px' : '4px 11px 4px 9px',
        borderRadius: 999,
        fontSize: small ? 12 : 12.5,
        fontWeight: 600,
        background: meta.bg,
        color: meta.color,
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          width: small ? 7 : 8,
          height: small ? 7 : 8,
          borderRadius: 999,
          background: meta.color,
          animation: running ? 'vg-pulse 1s var(--ease-in-out) infinite' : undefined,
        }}
      />
      {meta.label}
    </span>
  );
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  const meta = SEVERITY_META[severity];
  if (!meta) return null;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 11px',
        borderRadius: 999,
        fontSize: 12.5,
        fontWeight: 700,
        background: 'rgba(192,50,43,.10)',
        color: meta.color,
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ width: 7, height: 7, borderRadius: 999, background: meta.color }} />
      {meta.label}
    </span>
  );
}

export function Spinner({ size = 26 }: { size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        border: '2.5px solid var(--ink-7)',
        borderTopColor: 'var(--ink-1)',
        animation: 'vg-spin .8s linear infinite',
      }}
    />
  );
}

export function Avatar({ name, size = 38, radius }: { name: string; size?: number; radius?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        flex: 'none',
        borderRadius: radius ?? Math.round(size / 3.8),
        background: 'var(--ink-1)',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: Math.round(size / 2.9),
        fontWeight: 600,
      }}
    >
      {name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => word[0]!.toUpperCase())
        .join('')}
    </div>
  );
}

export function Modal({
  title,
  onClose,
  children,
  footer,
  width = 480,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
}) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        background: 'rgba(10,10,10,.58)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: width,
          maxHeight: '90vh',
          overflowY: 'auto',
          background: 'var(--ink-10)',
          borderRadius: 16,
          boxShadow: 'var(--shadow-3)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 24px',
            borderBottom: '1px solid var(--ink-8)',
          }}
        >
          <h3 style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-.01em', margin: 0 }}>{title}</h3>
          <button
            onClick={onClose}
            className="vg-btn"
            style={{ border: 'none', background: 'none', fontSize: 18, color: 'var(--ink-5)', lineHeight: 1 }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div style={{ padding: '22px 24px' }}>{children}</div>
        {footer && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 10,
              padding: '16px 24px',
              borderTop: '1px solid var(--ink-8)',
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function Toggle({ on, onChange }: { on: boolean; onChange: (next: boolean) => void }) {
  return (
    <div
      onClick={() => onChange(!on)}
      role="switch"
      aria-checked={on}
      style={{
        width: 44,
        height: 26,
        flex: 'none',
        borderRadius: 999,
        background: on ? 'var(--ink-1)' : 'var(--ink-6)',
        position: 'relative',
        cursor: 'pointer',
        transition: 'background .15s var(--ease-out)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 3,
          left: on ? 21 : 3,
          width: 20,
          height: 20,
          borderRadius: 999,
          background: '#fff',
          transition: 'left .15s var(--ease-out)',
        }}
      />
    </div>
  );
}

export function Thumb({
  src,
  width = 48,
  height = 32,
  overlaySrc,
}: {
  src: string | null;
  width?: number;
  height?: number;
  overlaySrc?: string | null;
}) {
  return (
    <div
      style={{
        width,
        height,
        flex: 'none',
        borderRadius: 5,
        background: 'var(--ink-8)',
        border: '1px solid var(--ink-7)',
        overflow: 'hidden',
        position: 'relative',
        backgroundImage: src
          ? undefined
          : 'repeating-linear-gradient(45deg, var(--ink-8), var(--ink-8) 5px, var(--ink-9) 5px, var(--ink-9) 10px)',
      }}
    >
      {src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top', display: 'block' }} />
      )}
      {overlaySrc && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={overlaySrc} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
      )}
    </div>
  );
}

export const VigilLogo = ({ size = 26, fill = '#0A0A0A' }: { size?: number; fill?: string }) => (
  <svg viewBox="0 0 107.72 53.86" style={{ width: size, height: 'auto' }} xmlns="http://www.w3.org/2000/svg">
    <path d="m0,0h26.93C41.79,0,53.86,12.07,53.86,26.93h0c0,14.86-12.07,26.93-26.93,26.93H0V0H0Z" fill={fill} />
    <rect x="53.86" width="53.86" height="19.84" fill={fill} />
  </svg>
);
