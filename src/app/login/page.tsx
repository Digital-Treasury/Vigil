import { VigilLogo } from '@/components/ui';
import { ShieldAlert } from 'lucide-react';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--ink-0)',
        padding: 24,
      }}
    >
      <div style={{ width: '100%', maxWidth: 380, textAlign: 'center', color: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 13, marginBottom: 30 }}>
          <VigilLogo size={34} fill="#fff" />
          <span style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-.02em' }}>Vigil</span>
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-.02em', margin: '0 0 8px', lineHeight: 1.2 }}>
          Find breakage before
          <br />
          the client does.
        </h1>
        <p style={{ fontSize: 14, color: '#8A8A8A', margin: '0 0 32px', lineHeight: 1.5 }}>
          Visual &amp; code regression testing for the
          <br />
          Digital Treasury fleet.
        </p>
        <a
          href="/api/auth/login"
          className="vg-btn"
          style={{
            width: '100%',
            height: 48,
            borderRadius: 11,
            border: 'none',
            background: '#fff',
            color: '#0A0A0A',
            fontSize: 15,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            textDecoration: 'none',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
            <path fill="#EA4335" d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.4 14.97.4 12 .4A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 6.93 9.14 4.75 12 4.75z" />
          </svg>
          Continue with Google
        </a>
        <p style={{ fontSize: 12, color: '#6B6B6B', margin: '18px 0 0', lineHeight: 1.5 }}>
          Access is restricted to the
          <br />
          <span style={{ color: '#CFCFCF' }}>digitaltreasury.com.au</span> workspace.
        </p>
        {error === 'wrong_domain' && (
          <div
            style={{
              marginTop: 18,
              display: 'flex',
              alignItems: 'center',
              gap: 9,
              justifyContent: 'center',
              padding: '11px 14px',
              border: '1px solid rgba(192,50,43,.4)',
              background: 'rgba(192,50,43,.12)',
              borderRadius: 10,
            }}
          >
            <ShieldAlert size={16} color="#E58781" />
            <span style={{ fontSize: 12.5, color: '#E58781', textAlign: 'left' }}>
              That account isn&apos;t on the digitaltreasury.com.au workspace.
            </span>
          </div>
        )}
        {error === 'auth_failed' && (
          <div
            style={{
              marginTop: 18,
              padding: '11px 14px',
              border: '1px solid rgba(192,50,43,.4)',
              background: 'rgba(192,50,43,.12)',
              borderRadius: 10,
              fontSize: 12.5,
              color: '#E58781',
            }}
          >
            Sign-in failed — please try again.
          </div>
        )}
        {error === 'not_configured' && (
          <div
            style={{
              marginTop: 18,
              padding: '11px 14px',
              border: '1px solid rgba(180,122,18,.4)',
              background: 'rgba(180,122,18,.12)',
              borderRadius: 10,
              fontSize: 12.5,
              color: '#E5C381',
              textAlign: 'left',
              lineHeight: 1.5,
            }}
          >
            Google sign-in isn&apos;t configured yet. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET (see README), or
            set DEV_AUTH_BYPASS=1 for local testing.
          </div>
        )}
      </div>
    </div>
  );
}
