import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
import { projects } from '@/lib/projects';
import { getVotes, recordVote } from '@/lib/storage';
import { checkRateLimit, clientIp } from '@/lib/rate-limit';

const COOKIE_NAME = 'hl_vote';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function rateHeaders(result: { remaining: number; resetAt: number }) {
  return {
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
  };
}

export async function GET() {
  const store = await cookies();
  const votedFor = store.get(COOKIE_NAME)?.value ?? null;
  const votes = await getVotes();
  return NextResponse.json({ votes, votedFor });
}

export async function POST(req: Request) {
  const h = await headers();
  const host = h.get('host');
  const origin = h.get('origin');
  if (origin) {
    try {
      const originHost = new URL(origin).host;
      if (originHost !== host) {
        return NextResponse.json({ error: 'bad_origin' }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: 'bad_origin' }, { status: 403 });
    }
  }

  const ip = clientIp(req);
  const rate = checkRateLimit(`vote:${ip}`);
  if (!rate.ok) {
    return NextResponse.json(
      { error: 'rate_limited' },
      { status: 429, headers: rateHeaders(rate) },
    );
  }

  const store = await cookies();
  const existing = store.get(COOKIE_NAME)?.value;
  if (existing) {
    const votes = await getVotes();
    return NextResponse.json(
      { error: 'already_voted', votedFor: existing, votes },
      { status: 409, headers: rateHeaders(rate) },
    );
  }

  let body: { projectId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'invalid_body' },
      { status: 400, headers: rateHeaders(rate) },
    );
  }

  const projectId = typeof body.projectId === 'string' ? body.projectId : '';
  if (!projects.some(p => p.id === projectId)) {
    return NextResponse.json(
      { error: 'unknown_project' },
      { status: 400, headers: rateHeaders(rate) },
    );
  }

  const votes = await recordVote(projectId);
  store.set(COOKIE_NAME, projectId, {
    maxAge: COOKIE_MAX_AGE,
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  });

  return NextResponse.json(
    { votes, votedFor: projectId },
    { headers: rateHeaders(rate) },
  );
}
