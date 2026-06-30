import { STATUS, type HealthStatus } from '@vigil/core';

export function HealthDot({ status, pulse = false }: { status: HealthStatus; pulse?: boolean }) {
  const s = STATUS[status];
  return (
    <span
      style={{
        width: 8,
        height: 8,
        borderRadius: 999,
        background: s.color,
        display: 'inline-block',
        animation: pulse ? 'vg-pulse 1s ease-in-out infinite' : undefined,
      }}
    />
  );
}

export function StatusPill({
  status,
  label,
  pulse = false,
}: {
  status: HealthStatus;
  label?: string;
  pulse?: boolean;
}) {
  const s = STATUS[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12.5px] font-semibold"
      style={{ background: s.bg, color: s.color }}
    >
      <HealthDot status={status} pulse={pulse} />
      {label ?? s.label}
    </span>
  );
}
