import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';

// Wrap a route handler with auth + error handling.
export function guarded(handler) {
  return async (request, ctx) => {
    try {
      const session = await requireSession();
      return await handler(request, ctx, session);
    } catch (err) {
      const status = err.status || 500;
      return NextResponse.json({ error: err.message || 'Server error' }, { status });
    }
  };
}

export function badRequest(message) {
  const err = new Error(message);
  err.status = 400;
  return err;
}
