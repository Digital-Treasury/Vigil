import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

export const DATA_DIR = process.env.VIGIL_DATA_DIR || path.join(process.cwd(), 'data');
export const CAPTURES_DIR = path.join(DATA_DIR, 'captures');

declare global {
  // eslint-disable-next-line no-var
  var __vigilDb: Database.Database | undefined;
}

function open(): Database.Database {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(CAPTURES_DIR, { recursive: true });
  const db = new Database(path.join(DATA_DIR, 'vigil.db'));
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  migrate(db);
  return db;
}

export function getDb(): Database.Database {
  if (!globalThis.__vigilDb) globalThis.__vigilDb = open();
  return globalThis.__vigilDb;
}

function migrate(db: Database.Database) {
  db.exec(`
  CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    notify_emails TEXT NOT NULL DEFAULT '[]',
    threshold_override REAL,
    retention_override INTEGER,
    lighthouse_enabled INTEGER NOT NULL DEFAULT 1,
    schedule_enabled INTEGER NOT NULL DEFAULT 0,
    schedule_freq TEXT NOT NULL DEFAULT 'weekly',
    schedule_day INTEGER NOT NULL DEFAULT 1,
    schedule_time TEXT NOT NULL DEFAULT '06:00',
    checkpoint_id INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS pages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    url TEXT NOT NULL,
    viewports TEXT NOT NULL DEFAULT '["desktop"]',
    mask_selectors TEXT NOT NULL DEFAULT '[]',
    wait_selector TEXT,
    sort INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS checkpoints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    started_by TEXT NOT NULL,
    started_at TEXT NOT NULL DEFAULT (datetime('now')),
    ended_at TEXT
  );

  CREATE TABLE IF NOT EXISTS runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    trigger TEXT NOT NULL,
    checkpoint_id INTEGER REFERENCES checkpoints(id),
    status TEXT NOT NULL DEFAULT 'running',
    started_at TEXT NOT NULL DEFAULT (datetime('now')),
    finished_at TEXT,
    email_sent INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS captures (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    page_id INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    run_id INTEGER REFERENCES runs(id) ON DELETE SET NULL,
    checkpoint_id INTEGER REFERENCES checkpoints(id) ON DELETE SET NULL,
    viewport TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ok',
    error TEXT,
    screenshot_path TEXT,
    html_path TEXT,
    dom_path TEXT,
    mask_rects TEXT NOT NULL DEFAULT '[]',
    lighthouse TEXT,
    width INTEGER,
    height INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS baselines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    page_id INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    viewport TEXT NOT NULL,
    capture_id INTEGER NOT NULL REFERENCES captures(id),
    approved_by TEXT NOT NULL,
    approved_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(page_id, viewport)
  );

  CREATE TABLE IF NOT EXISTS run_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id INTEGER NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
    page_id INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    viewport TEXT NOT NULL,
    capture_id INTEGER REFERENCES captures(id),
    status TEXT NOT NULL DEFAULT 'running',
    review TEXT NOT NULL DEFAULT 'none',
    reviewed_by TEXT,
    reviewed_at TEXT,
    diff_baseline_pct REAL,
    diff_checkpoint_pct REAL,
    diff_baseline_img TEXT,
    diff_checkpoint_img TEXT,
    baseline_capture_id INTEGER REFERENCES captures(id),
    checkpoint_capture_id INTEGER REFERENCES captures(id),
    assessment TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS investigations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    result_id INTEGER NOT NULL REFERENCES run_results(id) ON DELETE CASCADE,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    page_id INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    note TEXT NOT NULL DEFAULT '',
    flagged_by TEXT NOT NULL,
    flagged_at TEXT NOT NULL DEFAULT (datetime('now')),
    status TEXT NOT NULL DEFAULT 'open',
    resolved_by TEXT,
    resolved_at TEXT
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sign_ins (
    email TEXT PRIMARY KEY,
    name TEXT NOT NULL DEFAULT '',
    last_seen TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_pages_client ON pages(client_id);
  CREATE INDEX IF NOT EXISTS idx_runs_client ON runs(client_id, started_at);
  CREATE INDEX IF NOT EXISTS idx_results_run ON run_results(run_id);
  CREATE INDEX IF NOT EXISTS idx_captures_page ON captures(page_id, viewport, created_at);
  CREATE INDEX IF NOT EXISTS idx_investigations_status ON investigations(status);
  `);
}

// ---------- settings ----------

export const SETTING_DEFAULTS: Record<string, string> = {
  anthropic_api_key: '',
  global_threshold: '1.0',
  retention_days: '90',
  notify_from: 'vigil@digitaltreasury.com.au',
  notify_only_on_changes: '1',
};

export function getSetting(key: string): string {
  const row = getDb().prepare('SELECT value FROM settings WHERE key = ?').get(key) as
    | { value: string }
    | undefined;
  return row?.value ?? SETTING_DEFAULTS[key] ?? '';
}

export function setSetting(key: string, value: string) {
  getDb()
    .prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
    .run(key, value);
}

export function clientThreshold(client: { threshold_override: number | null }): number {
  if (client.threshold_override != null) return client.threshold_override;
  return parseFloat(getSetting('global_threshold')) || 1.0;
}

export function recordSignIn(email: string, name: string) {
  getDb()
    .prepare(
      `INSERT INTO sign_ins (email, name, last_seen) VALUES (?, ?, datetime('now'))
       ON CONFLICT(email) DO UPDATE SET name = excluded.name, last_seen = datetime('now')`
    )
    .run(email, name);
}
