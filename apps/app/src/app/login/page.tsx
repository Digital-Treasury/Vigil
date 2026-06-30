import { ShieldAlert } from 'lucide-react';
import { APP_NAME } from '@vigil/core';
import { Logo } from '@/components/Logo';
import { signIn } from '@/auth';
import { ALLOWED_EMAIL_DOMAIN } from '@/auth.config';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const denied = error === 'AccessDenied';

  async function continueWithGoogle() {
    'use server';
    await signIn('google', { redirectTo: '/' });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-0 px-6">
      <div className="w-full max-w-[380px] text-center text-white">
        <div className="mb-8 flex items-center justify-center gap-3">
          <Logo size={34} fill="#fff" />
          <span className="text-[30px] font-bold tracking-tight">{APP_NAME}</span>
        </div>
        <h1 className="mb-2 text-[26px] font-bold leading-tight tracking-tight text-white">
          Find breakage before
          <br />
          the client does.
        </h1>
        <p className="mb-8 text-sm leading-relaxed text-[#8A8A8A]">
          Visual &amp; code regression testing for the
          <br />
          Digital Treasury fleet.
        </p>

        <form action={continueWithGoogle}>
          <button
            type="submit"
            className="flex h-12 w-full items-center justify-center gap-2.5 rounded-[11px] bg-white text-[15px] font-semibold text-ink-0 transition active:scale-[.98]"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.4 14.97.4 12 .4A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 6.93 9.14 4.75 12 4.75z"
              />
            </svg>
            Continue with Google
          </button>
        </form>

        <p className="mt-[18px] text-xs leading-relaxed text-[#6B6B6B]">
          Access is restricted to the
          <br />
          <span className="text-[#CFCFCF]">{ALLOWED_EMAIL_DOMAIN}</span> workspace.
        </p>

        {denied && (
          <div className="mt-[18px] flex items-center justify-center gap-2.5 rounded-[10px] border border-[rgba(192,50,43,.4)] bg-[rgba(192,50,43,.12)] px-3.5 py-2.5">
            <ShieldAlert size={16} className="text-[#E58781]" />
            <span className="text-left text-[12.5px] text-[#E58781]">
              That account isn&apos;t on the {ALLOWED_EMAIL_DOMAIN} workspace.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
