// Effective threshold & retention helpers (Scope §4.5, §4.14).

/** Effective diff threshold % = client override ?? global default. */
export function effectiveThreshold(
  clientOverride: number | null | undefined,
  globalDefault: number,
): number {
  return clientOverride ?? globalDefault;
}

/** A comparison is flagged when changed-pixel % exceeds the effective threshold. */
export function isFlagged(
  changedPixelPct: number | null | undefined,
  effectiveThresholdPct: number,
): boolean {
  if (changedPixelPct === null || changedPixelPct === undefined) return false;
  return changedPixelPct > effectiveThresholdPct;
}

/** Effective retention days = min(client setting, global cap). */
export function effectiveRetentionDays(
  clientOverride: number | null | undefined,
  globalCap: number,
): number {
  if (clientOverride === null || clientOverride === undefined) return globalCap;
  return Math.min(clientOverride, globalCap);
}
