-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ViewportKind" AS ENUM ('desktop', 'mobile');

-- CreateEnum
CREATE TYPE "CheckpointStatus" AS ENUM ('active', 'ended');

-- CreateEnum
CREATE TYPE "RunTrigger" AS ENUM ('manual', 'scheduled', 'maintenance');

-- CreateEnum
CREATE TYPE "RunStatus" AS ENUM ('queued', 'running', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "CaptureStatus" AS ENUM ('captured', 'failed');

-- CreateEnum
CREATE TYPE "CaptureFailureReason" AS ENUM ('http_error', 'timeout', 'redirected', 'login_wall', 'navigation_error', 'screenshot_error', 'unknown');

-- CreateEnum
CREATE TYPE "ComparisonKind" AS ENUM ('baseline_vs_capture', 'checkpoint_vs_capture');

-- CreateEnum
CREATE TYPE "ComparisonStatus" AS ENUM ('pending', 'accepted', 'flagged', 'resolved');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('intentional_change', 'cosmetic_minor', 'likely_regression', 'broken');

-- CreateEnum
CREATE TYPE "Recommendation" AS ENUM ('accept_new_baseline', 'keep_and_investigate');

-- CreateEnum
CREATE TYPE "InvestigationStatus" AS ENUM ('open', 'resolved');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "image" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "primaryUrl" TEXT NOT NULL,
    "logoUrl" TEXT,
    "scheduleCron" TEXT,
    "scheduleEnabled" BOOLEAN NOT NULL DEFAULT false,
    "timezone" TEXT NOT NULL DEFAULT 'Australia/Melbourne',
    "thresholdOverride" DOUBLE PRECISION,
    "retentionOverride" INTEGER,
    "lighthouseEnabled" BOOLEAN NOT NULL DEFAULT true,
    "notifyEmails" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "activeCheckpointId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pages" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "maskSelectors" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "waitForSelector" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "page_viewports" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "kind" "ViewportKind" NOT NULL,
    "width" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "page_viewports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "baselines" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "viewport" "ViewportKind" NOT NULL,
    "screenshotKey" TEXT NOT NULL,
    "servedHtmlKey" TEXT,
    "renderedDomKey" TEXT,
    "renderedDomNormalisedKey" TEXT,
    "lighthouseJson" JSONB,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "baselines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checkpoints" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "label" TEXT,
    "status" "CheckpointStatus" NOT NULL DEFAULT 'active',
    "startedById" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedById" TEXT,
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "checkpoints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "runs" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "trigger" "RunTrigger" NOT NULL,
    "checkpointId" TEXT,
    "status" "RunStatus" NOT NULL DEFAULT 'queued',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "summary" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "captures" (
    "id" TEXT NOT NULL,
    "runId" TEXT,
    "checkpointId" TEXT,
    "pageId" TEXT NOT NULL,
    "viewport" "ViewportKind" NOT NULL,
    "status" "CaptureStatus" NOT NULL,
    "failureReason" "CaptureFailureReason",
    "failureDetail" TEXT,
    "screenshotKey" TEXT,
    "servedHtmlKey" TEXT,
    "renderedDomKey" TEXT,
    "renderedDomNormalisedKey" TEXT,
    "lighthouseJson" JSONB,
    "width" INTEGER,
    "height" INTEGER,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "captures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comparisons" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "viewport" "ViewportKind" NOT NULL,
    "kind" "ComparisonKind" NOT NULL,
    "fromBaselineId" TEXT,
    "fromCaptureId" TEXT,
    "toCaptureId" TEXT NOT NULL,
    "changedPixelPct" DOUBLE PRECISION,
    "diffImageKey" TEXT,
    "sourceHtmlDiffKey" TEXT,
    "domDiffKey" TEXT,
    "flagged" BOOLEAN NOT NULL DEFAULT false,
    "status" "ComparisonStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comparisons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessments" (
    "id" TEXT NOT NULL,
    "comparisonId" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "severity" "Severity" NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "summary" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "affectedAreas" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "recommendation" "Recommendation" NOT NULL,
    "recommendationReason" TEXT NOT NULL,
    "createdById" TEXT,
    "rawResponse" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "investigations" (
    "id" TEXT NOT NULL,
    "comparisonId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "viewport" "ViewportKind" NOT NULL,
    "status" "InvestigationStatus" NOT NULL DEFAULT 'open',
    "notes" TEXT,
    "flaggedById" TEXT,
    "flaggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "investigations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" TEXT NOT NULL,
    "anthropicApiKeyEnc" TEXT,
    "assessmentModel" TEXT NOT NULL DEFAULT 'claude-sonnet-4-6',
    "globalThresholdPct" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "globalRetentionDays" INTEGER NOT NULL DEFAULT 90,
    "notifyFrom" TEXT,
    "notifyDefaults" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "clients_activeCheckpointId_key" ON "clients"("activeCheckpointId");

-- CreateIndex
CREATE INDEX "pages_clientId_idx" ON "pages"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "page_viewports_pageId_kind_key" ON "page_viewports"("pageId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "baselines_pageId_viewport_key" ON "baselines"("pageId", "viewport");

-- CreateIndex
CREATE INDEX "checkpoints_clientId_idx" ON "checkpoints"("clientId");

-- CreateIndex
CREATE INDEX "runs_clientId_idx" ON "runs"("clientId");

-- CreateIndex
CREATE INDEX "captures_runId_idx" ON "captures"("runId");

-- CreateIndex
CREATE INDEX "captures_checkpointId_idx" ON "captures"("checkpointId");

-- CreateIndex
CREATE INDEX "captures_pageId_idx" ON "captures"("pageId");

-- CreateIndex
CREATE INDEX "comparisons_runId_idx" ON "comparisons"("runId");

-- CreateIndex
CREATE INDEX "comparisons_pageId_idx" ON "comparisons"("pageId");

-- CreateIndex
CREATE UNIQUE INDEX "assessments_comparisonId_key" ON "assessments"("comparisonId");

-- CreateIndex
CREATE UNIQUE INDEX "investigations_comparisonId_key" ON "investigations"("comparisonId");

-- CreateIndex
CREATE INDEX "investigations_clientId_idx" ON "investigations"("clientId");

-- CreateIndex
CREATE INDEX "investigations_status_idx" ON "investigations"("status");

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_activeCheckpointId_fkey" FOREIGN KEY ("activeCheckpointId") REFERENCES "checkpoints"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pages" ADD CONSTRAINT "pages_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_viewports" ADD CONSTRAINT "page_viewports_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "baselines" ADD CONSTRAINT "baselines_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "baselines" ADD CONSTRAINT "baselines_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkpoints" ADD CONSTRAINT "checkpoints_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkpoints" ADD CONSTRAINT "checkpoints_startedById_fkey" FOREIGN KEY ("startedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkpoints" ADD CONSTRAINT "checkpoints_endedById_fkey" FOREIGN KEY ("endedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "runs" ADD CONSTRAINT "runs_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "runs" ADD CONSTRAINT "runs_checkpointId_fkey" FOREIGN KEY ("checkpointId") REFERENCES "checkpoints"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "captures" ADD CONSTRAINT "captures_runId_fkey" FOREIGN KEY ("runId") REFERENCES "runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "captures" ADD CONSTRAINT "captures_checkpointId_fkey" FOREIGN KEY ("checkpointId") REFERENCES "checkpoints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "captures" ADD CONSTRAINT "captures_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comparisons" ADD CONSTRAINT "comparisons_runId_fkey" FOREIGN KEY ("runId") REFERENCES "runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comparisons" ADD CONSTRAINT "comparisons_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comparisons" ADD CONSTRAINT "comparisons_fromCaptureId_fkey" FOREIGN KEY ("fromCaptureId") REFERENCES "captures"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comparisons" ADD CONSTRAINT "comparisons_toCaptureId_fkey" FOREIGN KEY ("toCaptureId") REFERENCES "captures"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_comparisonId_fkey" FOREIGN KEY ("comparisonId") REFERENCES "comparisons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investigations" ADD CONSTRAINT "investigations_comparisonId_fkey" FOREIGN KEY ("comparisonId") REFERENCES "comparisons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investigations" ADD CONSTRAINT "investigations_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investigations" ADD CONSTRAINT "investigations_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investigations" ADD CONSTRAINT "investigations_flaggedById_fkey" FOREIGN KEY ("flaggedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investigations" ADD CONSTRAINT "investigations_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

