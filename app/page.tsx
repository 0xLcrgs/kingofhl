import { cookies } from "next/headers";
import { projects } from "@/lib/projects";
import { getVotes } from "@/lib/storage";
import { VoteBoard } from "./vote-board";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [votes, store] = await Promise.all([getVotes(), cookies()]);
  const votedFor = store.get("hl_vote")?.value ?? null;

  return (
    <main className="relative">
      <VoteBoard
        projects={projects}
        initialVotes={votes}
        initialVotedFor={votedFor}
      />
    </main>
  );
}
