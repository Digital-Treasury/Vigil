'use client';

import { useState, useTransition } from 'react';
import { Key, Loader2, Check, AlertCircle, Plug } from 'lucide-react';
import { ASSESSMENT_MODELS } from '@vigil/core';
import {
  updateGlobalSettings,
  saveAnthropicKey,
  testAnthropicConnection,
  type ActionResult,
} from '@/lib/actions/settings';

const label = 'mb-2 block text-xs font-semibold text-ink-4';
const input =
  'h-[42px] w-full rounded-[10px] border border-ink-7 bg-ink-10 px-3.5 text-sm text-ink-1 outline-none focus:border-ink-3';
const card = 'rounded-[14px] border border-ink-7 bg-ink-10 px-6 py-[22px]';

interface Initial {
  assessmentModel: string;
  globalThresholdPct: number;
  globalRetentionDays: number;
  notifyFrom: string;
  hasApiKey: boolean;
  maskedKey: string | null;
}

function Banner({ result }: { result: ActionResult | null }) {
  if (!result) return null;
  const ok = result.ok;
  const text = ok ? result.message : result.error;
  return (
    <div
      className="flex items-center gap-2 rounded-[10px] px-3.5 py-2.5 text-[13px]"
      style={{
        background: ok ? 'rgba(26,143,95,.08)' : 'rgba(192,50,43,.08)',
        border: `1px solid ${ok ? 'rgba(26,143,95,.3)' : 'rgba(192,50,43,.3)'}`,
        color: ok ? '#0F6B45' : '#992822',
      }}
    >
      {ok ? <Check size={15} /> : <AlertCircle size={15} />}
      {text}
    </div>
  );
}

export function SettingsForm({ initial }: { initial: Initial }) {
  // ── global settings ──
  const [globalResult, setGlobalResult] = useState<ActionResult | null>(null);
  const [savingGlobal, startGlobal] = useTransition();
  const onSaveGlobal = (formData: FormData) =>
    startGlobal(async () => setGlobalResult(await updateGlobalSettings(formData)));

  // ── api key ──
  const [keyInput, setKeyInput] = useState('');
  const [keyResult, setKeyResult] = useState<ActionResult | null>(null);
  const [testResult, setTestResult] = useState<ActionResult | null>(null);
  const [savingKey, startSaveKey] = useTransition();
  const [testing, startTest] = useTransition();

  const onSaveKey = () =>
    startSaveKey(async () => {
      const r = await saveAnthropicKey(keyInput);
      setKeyResult(r);
      if (r.ok) setKeyInput('');
    });
  const onTest = () =>
    startTest(async () => setTestResult(await testAnthropicConnection(keyInput)));

  return (
    <div className="flex flex-col gap-7">
      {/* Anthropic / Claude assessment */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <Key size={16} className="text-ink-3" />
          <h2 className="text-[15px] font-bold text-ink-1">Claude assessment</h2>
        </div>
        <div className={`${card} flex flex-col gap-4`}>
          <div>
            <label className={label}>ANTHROPIC API KEY</label>
            {initial.hasApiKey && (
              <p className="mb-2 inline-flex items-center gap-1.5 text-[12.5px] text-ink-5">
                <Check size={13} className="text-pass" /> A key is stored
                <span className="font-mono text-ink-4">{initial.maskedKey}</span>. Enter a new value to replace it.
              </p>
            )}
            <input
              type="password"
              autoComplete="off"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              className={`${input} font-mono`}
              placeholder={initial.hasApiKey ? '•••••••• (leave blank to keep)' : 'sk-ant-…'}
            />
            <p className="mt-1.5 text-[12px] leading-relaxed text-ink-5">
              Encrypted at rest (AES-256-GCM) and never logged. Used only for manual “Ask Claude” assessments.
            </p>
          </div>
          <Banner result={keyResult} />
          <Banner result={testResult} />
          <div className="flex items-center gap-2.5">
            <button
              onClick={onSaveKey}
              disabled={savingKey || (!keyInput.trim() && !initial.hasApiKey)}
              className="flex h-10 items-center gap-2 rounded-[10px] bg-ink-0 px-[18px] text-[13.5px] font-semibold text-white disabled:opacity-50"
            >
              {savingKey && <Loader2 size={14} className="animate-spin" />}
              {keyInput.trim() ? 'Save key' : 'Clear key'}
            </button>
            <button
              onClick={onTest}
              disabled={testing || (!keyInput.trim() && !initial.hasApiKey)}
              className="flex h-10 items-center gap-2 rounded-[10px] border border-ink-7 bg-ink-10 px-4 text-[13.5px] font-semibold text-ink-1 disabled:opacity-50"
            >
              {testing ? <Loader2 size={14} className="animate-spin" /> : <Plug size={15} />}
              Test connection
            </button>
          </div>
        </div>
      </section>

      {/* Global settings */}
      <section>
        <h2 className="mb-3 text-[15px] font-bold text-ink-1">Global defaults</h2>
        <form action={onSaveGlobal} className={`${card} flex flex-col gap-4`}>
          <div>
            <label className={label}>ASSESSMENT MODEL</label>
            <select name="assessmentModel" defaultValue={initial.assessmentModel} className={input}>
              {ASSESSMENT_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label} — ${m.inPerMTok}/${m.outPerMTok} per MTok
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-[12px] text-ink-5">Vision model used for “Ask Claude”. ~$0.03–0.05 per assessment on Sonnet.</p>
          </div>
          <div className="flex gap-3.5">
            <div className="flex-1">
              <label className={label}>DEFAULT DIFF THRESHOLD %</label>
              <input name="globalThresholdPct" type="number" step="0.1" min="0" defaultValue={initial.globalThresholdPct} className={input} />
              <p className="mt-1.5 text-[12px] text-ink-5">Clients can override this.</p>
            </div>
            <div className="flex-1">
              <label className={label}>RETENTION CAP (days)</label>
              <input name="globalRetentionDays" type="number" min="1" defaultValue={initial.globalRetentionDays} className={input} />
              <p className="mt-1.5 text-[12px] text-ink-5">Caps any per-client value.</p>
            </div>
          </div>
          <div>
            <label className={label}>NOTIFICATION FROM ADDRESS</label>
            <input name="notifyFrom" defaultValue={initial.notifyFrom} className={input} placeholder="Vigil <vigil@digitaltreasury.com.au>" />
          </div>
          <Banner result={globalResult} />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={savingGlobal}
              className="flex h-10 items-center gap-2 rounded-[10px] bg-ink-0 px-[18px] text-[13.5px] font-semibold text-white disabled:opacity-60"
            >
              {savingGlobal && <Loader2 size={14} className="animate-spin" />}
              Save settings
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
