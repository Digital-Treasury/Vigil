// Centralised, typed access to environment configuration for the app.

export const env = {
  appUrl: process.env.APP_URL ?? 'http://localhost:3000',
  allowedEmailDomain: process.env.ALLOWED_EMAIL_DOMAIN ?? 'digitaltreasury.com.au',
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  defaultThresholdPct: Number(process.env.DEFAULT_DIFF_THRESHOLD_PCT ?? '1.0'),
  defaultRetentionDays: Number(process.env.DEFAULT_RETENTION_DAYS ?? '90'),
  defaultAssessmentModel: process.env.DEFAULT_ASSESSMENT_MODEL ?? 'claude-sonnet-4-6',
  notifyFrom: process.env.NOTIFY_FROM ?? 'Vigil <vigil@digitaltreasury.com.au>',
  encryptionKey: process.env.ENCRYPTION_KEY ?? '',
} as const;
