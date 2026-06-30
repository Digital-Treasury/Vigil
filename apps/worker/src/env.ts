import 'dotenv/config';

export const env = {
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  appUrl: process.env.APP_URL ?? 'http://localhost:3000',
  defaultTimezone: process.env.DEFAULT_TIMEZONE ?? 'Australia/Melbourne',
  screenshotConcurrency: Number(process.env.SCREENSHOT_CONCURRENCY ?? '3'),
  lighthouseConcurrency: Number(process.env.LIGHTHOUSE_CONCURRENCY ?? '1'),
  navTimeoutMs: Number(process.env.CAPTURE_NAV_TIMEOUT_MS ?? '45000'),
  settleMs: Number(process.env.CAPTURE_SETTLE_MS ?? '1000'),
  screenshotMaxHeight: Number(process.env.SCREENSHOT_MAX_HEIGHT ?? '15000'),
  resendApiKey: process.env.RESEND_API_KEY ?? '',
  notifyFrom: process.env.NOTIFY_FROM ?? 'Vigil <vigil@digitaltreasury.com.au>',
  defaultThresholdPct: Number(process.env.DEFAULT_DIFF_THRESHOLD_PCT ?? '1.0'),
  defaultRetentionDays: Number(process.env.DEFAULT_RETENTION_DAYS ?? '90'),
  databaseUrl: process.env.DATABASE_URL ?? '',
  backupCron: process.env.BACKUP_CRON ?? '30 3 * * *',
  pruneCron: process.env.PRUNE_CRON ?? '0 3 * * *',
  defaultTimezoneForJobs: process.env.DEFAULT_TIMEZONE ?? 'Australia/Melbourne',
} as const;
