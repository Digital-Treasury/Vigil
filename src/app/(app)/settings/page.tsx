'use client';

import { useState } from 'react';
import { Users, KeyRound, Bell, Mail } from 'lucide-react';
import { useApi, patch, post } from '@/lib/useApi';
import { Spinner, Toggle } from '@/components/ui';
import { formatWhen } from '@/lib/format';

interface Settings {
  domain: string;
  anthropic_key_set: boolean;
  anthropic_key_masked: string;
  global_threshold: string;
  retention_days: string;
  notify_from: string;
  notify_only_on_changes: boolean;
  smtp_configured: boolean;
  team: { email: string; name: string; last_seen: string }[];
}

export default function SettingsPage() {
  const { data, loading, refresh } = useApi<Settings>('/api/settings');
  const [keyInput, setKeyInput] = useState('');
  const [editingKey, setEditingKey] = useState(false);
  const [keyTest, setKeyTest] = useState<{ ok: boolean; error?: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [threshold, setThreshold] = useState<string | null>(null);
  const [retention, setRetention] = useState<string | null>(null);
  const [smtpTest, setSmtpTest] = useState<{ ok: boolean; error?: string } | null>(null);

  if (loading && !data) {
    return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 120 }}><Spinner /></div>;
  }
  if (!data) return null;

  return (
    <div style={{ padding: '34px 40px 60px', maxWidth: 680 }}>
      <div className="dt-eyebrow" style={{ marginBottom: 8 }}>Global</div>
      <h1 style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-.02em', margin: '0 0 22px' }}>Settings</h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Team & access */}
        <div className="card" style={{ padding: '22px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 6 }}>
            <Users size={16} color="var(--ink-3)" />
            <span style={{ fontSize: 15, fontWeight: 600 }}>Team &amp; access</span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--ink-5)', margin: '0 0 14px', lineHeight: 1.5 }}>
            Sign-in is restricted to the <strong style={{ color: 'var(--ink-2)' }}>{data.domain}</strong> Google Workspace.
            Anyone in the workspace can sign in.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {data.team.length === 0 && <span style={{ fontSize: 13, color: 'var(--ink-5)' }}>No sign-ins recorded yet.</span>}
            {data.team.map((member, i) => (
              <div key={member.email} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: i > 0 ? '1px solid var(--ink-8)' : 'none' }}>
                <div style={{ width: 28, height: 28, borderRadius: 999, background: 'var(--ink-1)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600 }}>
                  {(member.name || member.email).split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('')}
                </div>
                <span style={{ fontSize: 13.5, color: 'var(--ink-2)' }}>{member.name || member.email}</span>
                <span style={{ fontSize: 12, color: 'var(--ink-5)', marginLeft: 'auto' }}>last seen {formatWhen(member.last_seen)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Anthropic API key */}
        <div className="card" style={{ padding: '22px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 6 }}>
            <KeyRound size={16} color="var(--ink-3)" />
            <span style={{ fontSize: 15, fontWeight: 600 }}>Anthropic API key</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginLeft: 'auto', fontSize: 12, fontWeight: 600, color: data.anthropic_key_set ? 'var(--status-success)' : 'var(--ink-5)' }}>
              <span style={{ width: 7, height: 7, borderRadius: 999, background: data.anthropic_key_set ? 'var(--status-success)' : 'var(--ink-5)' }} />
              {data.anthropic_key_set ? (keyTest ? (keyTest.ok ? 'Connected' : 'Connection failed') : 'Set') : 'Not set'}
            </span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--ink-5)', margin: '0 0 14px', lineHeight: 1.5 }}>
            Powers the manual &quot;Ask Claude&quot; assessments. Assessments are never automatic — each one is an explicit, billable request.
          </p>
          <div style={{ display: 'flex', gap: 9 }}>
            {editingKey || !data.anthropic_key_set ? (
              <input
                className="input input-mono"
                style={{ flex: 1, height: 40 }}
                placeholder="sk-ant-…"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                autoFocus={editingKey}
              />
            ) : (
              <div
                style={{ flex: 1, display: 'flex', alignItems: 'center', height: 40, padding: '0 13px', border: '1px solid var(--ink-7)', borderRadius: 10, fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--ink-3)', cursor: 'pointer' }}
                onClick={() => setEditingKey(true)}
                title="Click to replace"
              >
                {data.anthropic_key_masked}
              </div>
            )}
            {(editingKey || !data.anthropic_key_set) && (
              <button
                className="vg-btn btn-secondary"
                style={{ height: 40 }}
                disabled={!keyInput.trim()}
                onClick={async () => {
                  await patch('/api/settings', { anthropic_api_key: keyInput.trim() });
                  setKeyInput('');
                  setEditingKey(false);
                  setKeyTest(null);
                  refresh();
                }}
              >
                Save
              </button>
            )}
            <button
              className="vg-btn btn-secondary"
              style={{ height: 40 }}
              disabled={!data.anthropic_key_set || testing}
              onClick={async () => {
                setTesting(true);
                setKeyTest(await post('/api/settings/test-anthropic'));
                setTesting(false);
              }}
            >
              {testing ? 'Testing…' : 'Test connection'}
            </button>
          </div>
          {keyTest && !keyTest.ok && (
            <div style={{ fontSize: 12.5, color: 'var(--status-danger)', marginTop: 10 }}>{keyTest.error}</div>
          )}
          {keyTest?.ok && (
            <div style={{ fontSize: 12.5, color: 'var(--status-success)', marginTop: 10 }}>Connection OK — assessments are ready to use.</div>
          )}
        </div>

        {/* Thresholds + retention */}
        <div style={{ display: 'flex', gap: 14 }}>
          <div className="card" style={{ flex: 1, padding: '22px 24px' }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 5 }}>Default diff threshold</div>
            <p style={{ fontSize: 12.5, color: 'var(--ink-5)', margin: '0 0 13px', lineHeight: 1.5 }}>Clients can override this.</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                className="input"
                style={{ width: 90, fontWeight: 600 }}
                value={threshold ?? data.global_threshold}
                onChange={(e) => setThreshold(e.target.value)}
                onBlur={async () => {
                  if (threshold !== null) {
                    await patch('/api/settings', { global_threshold: threshold });
                    setThreshold(null);
                    refresh();
                  }
                }}
              />
              <span style={{ color: 'var(--ink-5)' }}>%</span>
            </div>
          </div>
          <div className="card" style={{ flex: 1, padding: '22px 24px' }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 5 }}>Retention cap</div>
            <p style={{ fontSize: 12.5, color: 'var(--ink-5)', margin: '0 0 13px', lineHeight: 1.5 }}>Caps any per-client setting.</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                className="input"
                style={{ width: 90, fontWeight: 600 }}
                value={retention ?? data.retention_days}
                onChange={(e) => setRetention(e.target.value)}
                onBlur={async () => {
                  if (retention !== null) {
                    await patch('/api/settings', { retention_days: retention });
                    setRetention(null);
                    refresh();
                  }
                }}
              />
              <span style={{ color: 'var(--ink-5)' }}>days</span>
            </div>
          </div>
        </div>

        {/* Notification defaults */}
        <div className="card" style={{ padding: '22px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 6 }}>
            <Bell size={16} color="var(--ink-3)" />
            <span style={{ fontSize: 15, fontWeight: 600 }}>Notification defaults</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginLeft: 'auto', fontSize: 12, fontWeight: 600, color: data.smtp_configured ? 'var(--status-success)' : 'var(--status-warning)' }}>
              <span style={{ width: 7, height: 7, borderRadius: 999, background: data.smtp_configured ? 'var(--status-success)' : 'var(--status-warning)' }} />
              {data.smtp_configured ? 'SMTP configured' : 'SMTP not configured'}
            </span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--ink-5)', margin: '0 0 14px', lineHeight: 1.5 }}>
            Emails send via the SMTP server in the environment config (see README).
            From-address: <strong style={{ color: 'var(--ink-2)' }}>{data.notify_from}</strong>
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 12 }}>
            <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>Email only when a run finds changes</span>
            <div style={{ marginLeft: 'auto' }}>
              <Toggle
                on={data.notify_only_on_changes}
                onChange={async (on) => {
                  await patch('/api/settings', { notify_only_on_changes: on });
                  refresh();
                }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 9, alignItems: 'center' }}>
            <input
              className="input"
              style={{ flex: 1, height: 38, fontSize: 13 }}
              defaultValue={data.notify_from}
              onBlur={async (e) => {
                if (e.target.value.trim() && e.target.value !== data.notify_from) {
                  await patch('/api/settings', { notify_from: e.target.value.trim() });
                  refresh();
                }
              }}
            />
            <button
              className="vg-btn btn-secondary"
              style={{ height: 38, fontSize: 13 }}
              disabled={!data.smtp_configured}
              onClick={async () => setSmtpTest(await post('/api/settings/test-smtp'))}
            >
              <Mail size={14} /> Test SMTP
            </button>
          </div>
          {smtpTest && (
            <div style={{ fontSize: 12.5, color: smtpTest.ok ? 'var(--status-success)' : 'var(--status-danger)', marginTop: 10 }}>
              {smtpTest.ok ? 'SMTP connection verified.' : smtpTest.error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
