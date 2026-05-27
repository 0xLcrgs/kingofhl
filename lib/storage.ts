import { promises as fs } from "node:fs";
import path from "node:path";
import Redis from "ioredis";

type Votes = Record<string, number>;
const VOTES_KEY = "kingofhl:votes";

declare global {
  // eslint-disable-next-line no-var
  var __kingofhlRedis: Redis | null | undefined;
}

function getRedis(): Redis | null {
  if (globalThis.__kingofhlRedis !== undefined) {
    return globalThis.__kingofhlRedis;
  }
  const url = process.env.REDIS_URL ?? process.env.KV_URL ?? "";
  if (!url) {
    globalThis.__kingofhlRedis = null;
    return null;
  }
  try {
    const client = new Redis(url, {
      lazyConnect: false,
      maxRetriesPerRequest: 2,
      enableReadyCheck: false,
      family: 0,
    });
    client.on("error", err => {
      console.error("redis error", err.message);
    });
    globalThis.__kingofhlRedis = client;
    return client;
  } catch (err) {
    console.error("redis init failed", err);
    globalThis.__kingofhlRedis = null;
    return null;
  }
}

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

function asNumberMap(input: Record<string, string> | null): Votes {
  if (!input) return {};
  const out: Votes = {};
  for (const [k, v] of Object.entries(input)) {
    const n = Number(v);
    if (Number.isFinite(n) && n > 0) out[k] = n;
  }
  return out;
}

export async function getVotes(): Promise<Votes> {
  const redis = getRedis();
  if (redis) {
    const all = await redis.hgetall(VOTES_KEY);
    return asNumberMap(all);
  }
  return { ...(await ensureFile()) };
}

export async function recordVote(projectId: string): Promise<Votes> {
  const redis = getRedis();
  if (redis) {
    await redis.hincrby(VOTES_KEY, projectId, 1);
    const all = await redis.hgetall(VOTES_KEY);
    return asNumberMap(all);
  }
  const votes = await ensureFile();
  votes[projectId] = (votes[projectId] ?? 0) + 1;
  writeQueue = writeQueue.then(async () => {
    try {
      await fs.writeFile(VOTES_FILE, JSON.stringify(votes, null, 2), "utf8");
    } catch {
      // best-effort
    }
  });
  return { ...votes };
}
