import { promises as fs } from 'node:fs';
import path from 'node:path';

const DATA_DIR = path.join(process.cwd(), 'data');
const VOTES_FILE = path.join(DATA_DIR, 'votes.json');

type Votes = Record<string, number>;

let memoryCache: Votes | null = null;
let writeQueue: Promise<void> = Promise.resolve();

async function ensureFile(): Promise<Votes> {
  if (memoryCache) return memoryCache;
  try {
    const raw = await fs.readFile(VOTES_FILE, 'utf8');
    memoryCache = JSON.parse(raw) as Votes;
  } catch {
    memoryCache = {};
    try {
      await fs.mkdir(DATA_DIR, { recursive: true });
      await fs.writeFile(VOTES_FILE, '{}', 'utf8');
    } catch {
      // read-only filesystem (e.g., Vercel) — memory-only fallback
    }
  }
  return memoryCache;
}

export async function getVotes(): Promise<Votes> {
  return { ...(await ensureFile()) };
}

export async function recordVote(projectId: string): Promise<Votes> {
  const votes = await ensureFile();
  votes[projectId] = (votes[projectId] ?? 0) + 1;
  writeQueue = writeQueue.then(async () => {
    try {
      await fs.writeFile(VOTES_FILE, JSON.stringify(votes, null, 2), 'utf8');
    } catch {
      // ignore — best-effort persistence
    }
  });
  return { ...votes };
}
