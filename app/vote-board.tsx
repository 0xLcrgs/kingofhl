"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { Project } from "@/lib/projects";

type Props = {
  projects: Project[];
  initialVotes: Record<string, number>;
  initialVotedFor: string | null;
};

type Sort = "votes" | "az";

export function VoteBoard({ projects, initialVotes, initialVotedFor }: Props) {
  const [votes, setVotes] = useState<Record<string, number>>(initialVotes);
  const [votedFor, setVotedFor] = useState<string | null>(initialVotedFor);
  const [pending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("votes");
  const [justVoted, setJustVoted] = useState<Project | null>(null);
  const shareRef = useRef<HTMLDivElement>(null);

  const totalVotes = useMemo(
    () => Object.values(votes).reduce((sum, n) => sum + n, 0),
    [votes],
  );

  const ranked = useMemo(() => {
    return [...projects].sort((a, b) => {
      const va = votes[a.id] ?? 0;
      const vb = votes[b.id] ?? 0;
      if (vb !== va) return vb - va;
      return a.name.localeCompare(b.name);
    });
  }, [projects, votes]);

  const top3 = ranked.slice(0, 3);
  const rest = ranked.slice(3);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = sort === "az" ? [...projects].sort((a, b) => a.name.localeCompare(b.name)) : rest;
    if (!q) return base;
    return base.filter(
      p =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q),
    );
  }, [projects, rest, query, sort]);

  useEffect(() => {
    if (justVoted && shareRef.current) {
      shareRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [justVoted]);

  function castVote(project: Project) {
    if (votedFor || pending) return;
    setError(null);
    setPendingId(project.id);
    startTransition(async () => {
      try {
        const res = await fetch("/api/vote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId: project.id }),
        });
        const data = await res.json();
        if (!res.ok) {
          if (data.votedFor) setVotedFor(data.votedFor);
          if (data.votes) setVotes(data.votes);
          setError(
            data.error === "already_voted"
              ? "You've already voted on this device."
              : "Something went wrong. Try again.",
          );
          return;
        }
        setVotes(data.votes);
        setVotedFor(data.votedFor);
        setJustVoted(project);
      } catch {
        setError("Network error. Try again.");
      } finally {
        setPendingId(null);
      }
    });
  }

  const votedProject = votedFor ? projects.find(p => p.id === votedFor) ?? null : null;
  const leader = top3[0];
  const leaderShare = leader && totalVotes > 0 ? ((votes[leader.id] ?? 0) / totalVotes) * 100 : 0;

  return (
    <>
      <StickyLeader
        leader={leader}
        leaderShare={leaderShare}
        totalVotes={totalVotes}
        votedProject={votedProject}
      />

      <Hero
        totalVotes={totalVotes}
        leader={leader}
        leaderShare={leaderShare}
        projectCount={projects.length}
      />

      {votedProject ? (
        <div ref={shareRef} className="mx-auto max-w-6xl px-5">
          <SharePanel project={votedProject} highlight={justVoted?.id === votedProject.id} />
        </div>
      ) : null}

      <Podium
        top3={top3}
        votes={votes}
        totalVotes={totalVotes}
        votedFor={votedFor}
        pendingId={pendingId}
        pending={pending}
        onVote={castVote}
      />

      <section id="contenders" className="mx-auto max-w-6xl px-5 pb-24 scroll-mt-20">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-white">
              The contenders
            </h2>
            <p className="mt-1 text-sm text-zinc-400">
              {projects.length} front-ends &amp; wallets. Tap to cast your vote — outbound links
              are referral codes that earn the site.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search…"
              className="w-full max-w-xs rounded-full border border-zinc-800 bg-zinc-950/60 px-4 py-2 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-hl focus:ring-2 focus:ring-hl/30"
            />
            <button
              onClick={() => setSort(sort === "votes" ? "az" : "votes")}
              className="rounded-full border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-xs uppercase tracking-wider text-zinc-300 transition hover:border-hl hover:text-white"
            >
              {sort === "votes" ? "Sort A–Z" : "Sort by votes"}
            </button>
          </div>
        </div>

        {error ? (
          <div className="mb-6 rounded-2xl border border-amber-700/50 bg-amber-950/40 px-4 py-3 text-sm text-amber-200">
            {error}
          </div>
        ) : null}

        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(project => (
            <ProjectCard
              key={project.id}
              project={project}
              votes={votes[project.id] ?? 0}
              totalVotes={totalVotes}
              voted={votedFor === project.id}
              disabled={!!votedFor}
              pending={pendingId === project.id}
              onVote={() => castVote(project)}
            />
          ))}
        </ul>

        {filtered.length === 0 ? (
          <p className="py-16 text-center text-sm text-zinc-500">
            No matches for &ldquo;{query}&rdquo;.
          </p>
        ) : null}
      </section>

      <Footer total={totalVotes} count={projects.length} />
    </>
  );
}

function Hero({
  totalVotes,
  leader,
  leaderShare,
  projectCount,
}: {
  totalVotes: number;
  leader: Project | undefined;
  leaderShare: number;
  projectCount: number;
}) {
  return (
    <header className="relative overflow-hidden">
      <div className="absolute inset-0 bg-grain opacity-50" aria-hidden />
      <div className="relative mx-auto max-w-6xl px-5 pt-16 pb-12 sm:pt-24 sm:pb-16">
        <div className="inline-flex items-center gap-2 rounded-full border border-hl/30 bg-hl/5 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-hl">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-hl opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-hl" />
          </span>
          Live poll
        </div>
        <h1 className="mt-5 text-5xl font-semibold leading-[1.05] tracking-tight text-white sm:text-7xl">
          King of <span className="text-hl">Hyperliquid</span>.
          <br className="hidden sm:block" />
          <span className="text-zinc-500">Who&apos;s the best front-end?</span>
        </h1>
        <p className="mt-5 max-w-xl text-base text-zinc-400 sm:text-lg">
          {projectCount} contenders. One vote per person. The community picks the winner.
        </p>

        <div className="mt-8 grid max-w-2xl grid-cols-3 gap-3 sm:gap-6">
          <Stat label="Total votes" value={totalVotes.toLocaleString()} />
          <Stat label="Contenders" value={projectCount.toString()} />
          <Stat
            label="Leader"
            value={leader ? leader.name : "—"}
            sub={leader && totalVotes > 0 ? `${leaderShare.toFixed(0)}%` : null}
          />
        </div>
      </div>
    </header>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string | null }) {
  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/50 px-4 py-3 backdrop-blur">
      <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-500">
        {label}
      </div>
      <div className="mt-1 truncate text-base font-semibold text-white sm:text-lg">
        {value}
      </div>
      {sub ? <div className="text-xs text-hl">{sub}</div> : null}
    </div>
  );
}

function Podium({
  top3,
  votes,
  totalVotes,
  votedFor,
  pendingId,
  pending,
  onVote,
}: {
  top3: Project[];
  votes: Record<string, number>;
  totalVotes: number;
  votedFor: string | null;
  pendingId: string | null;
  pending: boolean;
  onVote: (p: Project) => void;
}) {
  if (top3.length === 0) return null;
  // Arrange: 2 - 1 - 3 visually
  const order = [top3[1], top3[0], top3[2]].filter(Boolean) as Project[];
  const heights = [
    "sm:h-56", // 2nd place
    "sm:h-72", // 1st place
    "sm:h-48", // 3rd place
  ];
  const rankMap = new Map(top3.map((p, i) => [p.id, i + 1] as const));

  return (
    <section className="mx-auto max-w-6xl px-5 pb-14">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">
          Top 3 right now
        </h2>
      </div>
      <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-3">
        {order.map((project, i) => {
          const rank = rankMap.get(project.id) ?? i + 1;
          const count = votes[project.id] ?? 0;
          const share = totalVotes > 0 ? (count / totalVotes) * 100 : 0;
          const isLeader = rank === 1;
          return (
            <PodiumCard
              key={project.id}
              project={project}
              rank={rank}
              count={count}
              share={share}
              height={heights[i] ?? "sm:h-56"}
              isLeader={isLeader}
              voted={votedFor === project.id}
              disabled={!!votedFor}
              pending={pendingId === project.id}
              busy={pending}
              onVote={() => onVote(project)}
            />
          );
        })}
      </div>
    </section>
  );
}

function PodiumCard({
  project,
  rank,
  count,
  share,
  height,
  isLeader,
  voted,
  disabled,
  pending,
  busy,
  onVote,
}: {
  project: Project;
  rank: number;
  count: number;
  share: number;
  height: string;
  isLeader: boolean;
  voted: boolean;
  disabled: boolean;
  pending: boolean;
  busy: boolean;
  onVote: () => void;
}) {
  const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉";
  return (
    <div
      className={`relative flex flex-col justify-end overflow-hidden rounded-3xl border p-5 transition ${
        isLeader
          ? "border-hl/50 bg-gradient-to-b from-hl/[0.08] to-zinc-950 shadow-[0_0_60px_-15px_rgba(151,252,228,0.45)]"
          : "border-zinc-800 bg-zinc-950/60"
      } ${height} h-44`}
    >
      <div className="absolute right-4 top-4 text-3xl">{medal}</div>
      <Logo project={project} size={isLeader ? 72 : 56} />
      <div className="mt-4 flex items-baseline justify-between gap-2">
        <h3 className="truncate text-lg font-semibold text-white">{project.name}</h3>
        <div className={`text-xl font-bold tabular-nums ${isLeader ? "text-hl" : "text-white"}`}>
          {count}
        </div>
      </div>
      <p className="line-clamp-2 text-xs text-zinc-400">{project.description}</p>
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800/80">
        <div
          className={`h-full rounded-full transition-all ${isLeader ? "bg-hl" : "bg-zinc-500"}`}
          style={{ width: `${share}%` }}
        />
      </div>
      <div className="mt-4 flex items-center gap-2">
        <VoteButton
          voted={voted}
          disabled={disabled}
          pending={pending}
          busy={busy}
          onClick={onVote}
          variant={isLeader ? "primary" : "subtle"}
        />
        <VisitButton url={project.url} />
      </div>
    </div>
  );
}

function ProjectCard({
  project,
  votes,
  totalVotes,
  voted,
  disabled,
  pending,
  onVote,
}: {
  project: Project;
  votes: number;
  totalVotes: number;
  voted: boolean;
  disabled: boolean;
  pending: boolean;
  onVote: () => void;
}) {
  const share = totalVotes > 0 ? (votes / totalVotes) * 100 : 0;
  return (
    <li
      className={`group relative flex flex-col overflow-hidden rounded-2xl border bg-zinc-950/60 p-4 transition hover:-translate-y-0.5 ${
        voted
          ? "border-hl shadow-[0_0_30px_-10px_rgba(151,252,228,0.6)]"
          : "border-zinc-800 hover:border-zinc-600"
      }`}
    >
      <div className="flex items-start gap-3">
        <Logo project={project} size={44} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-base font-semibold text-white">
              {project.name}
            </h3>
            <StatusPill status={project.status} />
          </div>
          <p className="mt-0.5 line-clamp-2 text-xs text-zinc-400">
            {project.description}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <div
            key={votes}
            className={`text-lg font-bold tabular-nums animate-count-up ${voted ? "text-hl" : "text-white"}`}
          >
            {votes}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-zinc-500">
            {share.toFixed(0)}%
          </div>
        </div>
      </div>

      <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-zinc-800/70">
        <div
          className={`h-full transition-all ${voted ? "bg-hl" : "bg-zinc-600"}`}
          style={{ width: `${share}%` }}
        />
      </div>

      <div className="mt-4 flex items-center gap-2">
        <VoteButton
          voted={voted}
          disabled={disabled}
          pending={pending}
          busy={false}
          onClick={onVote}
          variant="primary"
        />
        <VisitButton url={project.url} />
      </div>
    </li>
  );
}

function Logo({ project, size }: { project: Project; size: number }) {
  const [src, setSrc] = useState(project.logo);
  const handle = project.xHandle;
  const initials = project.name
    .replace(/[^A-Za-z0-9 ]/g, "")
    .split(/\s+/)
    .slice(0, 2)
    .map(s => s[0])
    .join("")
    .toUpperCase();

  if (!src) {
    return (
      <div
        className="flex shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-xs font-bold text-zinc-400"
        style={{ width: size, height: size }}
      >
        {initials || "?"}
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={`${project.name} logo`}
      width={size}
      height={size}
      loading="lazy"
      onError={() => {
        if (handle && src.includes("unavatar.io")) {
          // try fallback via twitter route
          setSrc(`https://unavatar.io/twitter/${handle}?fallback=https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png`);
        } else {
          setSrc("");
        }
      }}
      className="shrink-0 rounded-xl border border-zinc-800 bg-zinc-900 object-cover"
      style={{ width: size, height: size }}
    />
  );
}

function StatusPill({ status }: { status: string }) {
  const styles =
    status === "Live"
      ? "border-hl/30 bg-hl/10 text-hl"
      : status === "Beta"
        ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
        : "border-zinc-700 bg-zinc-800/60 text-zinc-400";
  return (
    <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] uppercase tracking-wider ${styles}`}>
      {status}
    </span>
  );
}

function VoteButton({
  voted,
  disabled,
  pending,
  busy,
  onClick,
  variant = "primary",
}: {
  voted: boolean;
  disabled: boolean;
  pending: boolean;
  busy: boolean;
  onClick: () => void;
  variant?: "primary" | "subtle";
}) {
  const label = voted
    ? "✓ Voted"
    : pending
      ? "Voting…"
      : disabled
        ? "Closed"
        : "Vote";
  const base =
    "flex-1 rounded-full px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed";
  const tone = voted
    ? "bg-hl text-black"
    : disabled
      ? "bg-zinc-900 text-zinc-600 border border-zinc-800"
      : variant === "primary"
        ? "bg-white text-black hover:bg-hl"
        : "bg-zinc-800 text-white hover:bg-zinc-700";
  return (
    <button type="button" onClick={onClick} disabled={disabled || busy} className={`${base} ${tone}`}>
      {label}
    </button>
  );
}

function VisitButton({ url }: { url: string }) {
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="rounded-full border border-zinc-700 px-3 py-2 text-sm font-semibold text-zinc-200 transition hover:border-hl hover:text-hl"
    >
      Visit ↗
    </a>
  );
}

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "";

function SharePanel({ project, highlight }: { project: Project; highlight: boolean }) {
  const [origin, setOrigin] = useState(SITE_URL);
  useEffect(() => {
    if (!SITE_URL) setOrigin(window.location.origin);
  }, []);
  const handleTag = project.xHandle ? `@${project.xHandle}` : project.name;
  const tweet = `I just voted ${handleTag} as the best @HyperliquidX front-end 🏆\n\nCast yours 👇`;
  const intent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweet)}${origin ? `&url=${encodeURIComponent(origin)}` : ""}`;

  return (
    <div
      className={`my-8 overflow-hidden rounded-3xl border border-hl/40 bg-gradient-to-br from-hl/[0.12] via-zinc-950 to-zinc-950 p-6 sm:p-8 ${highlight ? "animate-float-in" : ""}`}
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Logo project={project} size={64} />
          <div>
            <div className="text-xs font-medium uppercase tracking-[0.2em] text-hl">
              Your vote
            </div>
            <div className="mt-1 text-2xl font-semibold text-white">
              {project.name}
            </div>
            <p className="mt-1 max-w-md text-sm text-zinc-400">
              Tell the world — tagging the team helps it spread.
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <a
            href={intent}
            target="_blank"
            rel="noopener noreferrer"
            className="animate-pulse-glow rounded-full bg-white px-5 py-3 text-center text-sm font-semibold text-black transition hover:bg-hl"
          >
            Share on X 𝕏
          </a>
          {project.url ? (
            <a
              href={project.url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-zinc-700 px-5 py-3 text-center text-sm font-semibold text-white transition hover:border-hl hover:text-hl"
            >
              Open {project.name} ↗
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function StickyLeader({
  leader,
  leaderShare,
  totalVotes,
  votedProject,
}: {
  leader: Project | undefined;
  leaderShare: number;
  totalVotes: number;
  votedProject: Project | null;
}) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    function onScroll() {
      setShow(window.scrollY > 420);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!leader) return null;

  return (
    <div
      className={`fixed inset-x-0 top-0 z-40 transition-transform duration-300 ${show ? "translate-y-0" : "-translate-y-full"}`}
    >
      <div className="border-b border-zinc-800/80 bg-black/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-5 py-2.5">
          <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.18em] text-hl">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-hl opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-hl" />
            </span>
            Live
          </div>

          <div className="hidden h-5 w-px shrink-0 bg-zinc-800 sm:block" />

          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Logo project={leader} size={24} />
            <span className="hidden text-xs uppercase tracking-wider text-zinc-500 sm:inline">
              Leading
            </span>
            <span className="truncate text-sm font-semibold text-white">
              {leader.name}
            </span>
            <span className="shrink-0 text-xs tabular-nums text-hl">
              {leaderShare.toFixed(0)}%
            </span>
          </div>

          <div className="hidden text-xs tabular-nums text-zinc-400 sm:block">
            {totalVotes.toLocaleString()} vote{totalVotes === 1 ? "" : "s"}
          </div>

          {votedProject ? (
            <div className="ml-2 flex items-center gap-1.5 rounded-full border border-hl/40 bg-hl/10 px-2.5 py-1 text-[11px] font-semibold text-hl">
              <span>✓</span>
              <span className="hidden sm:inline">You voted</span>
              <span className="max-w-[8rem] truncate">{votedProject.name}</span>
            </div>
          ) : (
            <a
              href="#vote"
              onClick={e => {
                e.preventDefault();
                document
                  .getElementById("contenders")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
              className="ml-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-black transition hover:bg-hl"
            >
              Vote
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function Footer({ total, count }: { total: number; count: number }) {
  return (
    <footer className="border-t border-zinc-900 bg-black/40">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-3 px-5 py-8 text-xs text-zinc-500 sm:flex-row sm:items-center">
        <div>
          {total.toLocaleString()} vote{total === 1 ? "" : "s"} across {count} projects.
        </div>
        <div>
          Outbound links use referral codes. Not affiliated with Hyper Foundation.
        </div>
      </div>
    </footer>
  );
}
