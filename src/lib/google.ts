// Google OAuth 2.0 authorization-code flow, restricted to the agency workspace.

export const ALLOWED_DOMAIN = process.env.ALLOWED_EMAIL_DOMAIN || 'digitaltreasury.com.au';

export function googleConfigured(): boolean {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function authUrl(origin: string, state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: `${origin}/api/auth/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    hd: ALLOWED_DOMAIN,
    prompt: 'select_account',
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function exchangeCode(
  origin: string,
  code: string
): Promise<{ email: string; name: string } | { error: string }> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${origin}/api/auth/callback`,
      grant_type: 'authorization_code',
    }),
  });
  if (!res.ok) return { error: 'Token exchange failed' };
  const tokens = (await res.json()) as { id_token?: string };
  if (!tokens.id_token) return { error: 'No id_token returned' };

  // Validate the id_token with Google (checks signature, expiry, audience).
  const info = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(tokens.id_token)}`
  );
  if (!info.ok) return { error: 'Token validation failed' };
  const claims = (await info.json()) as {
    aud?: string;
    email?: string;
    email_verified?: string;
    name?: string;
    hd?: string;
  };
  if (claims.aud !== process.env.GOOGLE_CLIENT_ID) return { error: 'Token audience mismatch' };
  if (claims.email_verified !== 'true' || !claims.email) return { error: 'Email not verified' };
  const domain = claims.email.split('@')[1]?.toLowerCase();
  if (domain !== ALLOWED_DOMAIN.toLowerCase()) return { error: 'wrong_domain' };
  return { email: claims.email, name: claims.name || claims.email.split('@')[0] };
}
