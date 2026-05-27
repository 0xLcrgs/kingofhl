import { promises as fs } from "node:fs";
import path from "node:path";
import { Redis } from "@upstash/redis";

type Votes = Record<string, number>;
const VOTES_KEY = "kingofhl:votes";

function tryRedis(): Redis | null {
  const url =
    process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL ?? "";
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN ?? "";
  if (!url || !token) return null;
  try {
    return new Redis({ url, token });
  } catch {
    return null;
  }
}

const redis = tryRedis();

const DATA_DIR = path.join(process.cwd(), "data");
const VOTES_FILE = path.join(DATA_DIR, "votes.json");
let memoryCache: Votes | null = null;
let writeQueue: Promise<void> = Promise.resolve();

async function ensureFile(): Promise<Votes> {
  if (memoryCache) return memoryCache;
  try {
    const raw = await fs.readFile(VOTES_FILE, "utf8");
    memoryCache = JSON.parse(raw) as Votes;
  } catch {
    memoryCache = {};
    try {
      await fs.mkdir(DATA_DIR, { recursive: true });
      await fs.writeFile(VOTES_FILE, "{}", "utf8");
    } catch {
      // read-only — memory-only fallback
    }
  }
  return memoryCache;
}

function asNumberMap(input: Record<string, unknown> | null): Votes {
  if (!input) return {};
  const out: Votes = {};
  for (const [k, v] of Object.entries(input)) {
    const n = typeof v === "number" ? v : Number(v);
    if (Number.isFinite(n) && n > 0) out[k] = n;
  }
  return out;
}

export async function getVotes(): Promise<Votes> {
  if (redis) {
    const all = await redis.hgetall<Record<string, unknown>>(VOTES_KEY);
    return asNumberMap(all);
  }
  return { ...(await ensureFile()) };
}

export async function recordVote(projectId: string): Promise<Votes> {
  if (redis) {
    await redis.hincrby(VOTES_KEY, projectId, 1);
    const all = await redis.hgetall<Record<string, unknown>>(VOTES_KEY);
    return asNumberMap(all);
  }
  const votes = await ensureFile();
  votes[projectId] = (votes[projectId] ?? 0) + 1;
  writeQueue = writeQueue.then(async () => {
    try {
      await fs.writeFile(VOTES_FILE, JSON.stringify(votes, null, 2), "utf8");
    } catch {
      // ignore — best-effort
    }
  });
  return { ...votes };
}
