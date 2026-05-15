import { NextResponse } from "next/server";
import { connection } from "next/server";
import { getIndexCounts, getLeaderboardCategories } from "@/lib/queries/rankings";

export async function GET() {
  // No cache : chaque poll re-fetch la DB. `connection()` est l'API
  // Next 16 qui remplace `export const dynamic = "force-dynamic"` sous
  // cacheComponents — marque explicitement la route comme dynamic.
  await connection();
  const [counts, rankedSkills, rankedClaudeMd] = await Promise.all([
    getIndexCounts(),
    getLeaderboardCategories("skill"),
    getLeaderboardCategories("claude_md"),
  ]);
  const rankedTotal =
    rankedSkills.reduce((s, c) => s + (c.count || 0), 0) +
    rankedClaudeMd.reduce((s, c) => s + (c.count || 0), 0);

  return NextResponse.json(
    {
      skills: counts.skills,
      claudeMds: counts.claudeMds,
      ranked: rankedTotal,
      asOf: counts.asOf,
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}
