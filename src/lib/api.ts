import { NextResponse } from 'next/server';
import { getSession, type Session } from './session';

export async function requireUser(): Promise<Session> {
  const session = await getSession();
  if (!session) throw new ApiError(401, 'Unauthorized');
  return session;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type Handler = (
  req: Request,
  ctx: { params: Promise<Record<string, string | string[]>> }
) => Promise<Response>;

/** Wraps a route handler with auth + uniform error responses. */
export function handler(fn: Handler): Handler {
  return async (req, ctx) => {
    try {
      return await fn(req, ctx);
    } catch (err) {
      if (err instanceof ApiError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
      console.error('[vigil] api error:', err);
      const message = err instanceof Error ? err.message : 'Internal error';
      return NextResponse.json({ error: message }, { status: 500 });
    }
  };
}
