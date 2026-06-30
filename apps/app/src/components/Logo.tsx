// Digital Treasury / Vigil mark.
export function Logo({ size = 26, fill = '#0A0A0A' }: { size?: number; fill?: string }) {
  return (
    <svg viewBox="0 0 107.72 53.86" style={{ width: size, height: 'auto' }} aria-hidden>
      <path
        d="m0,0h26.93C41.79,0,53.86,12.07,53.86,26.93h0c0,14.86-12.07,26.93-26.93,26.93H0V0H0Z"
        fill={fill}
      />
      <rect x="53.86" width="53.86" height="19.84" fill={fill} />
    </svg>
  );
}
