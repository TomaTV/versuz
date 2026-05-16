import { NextResponse } from "next/server";
import { getIndexCounts, getLeaderboardCategories } from "@/lib/queries/rankings";

// Cache edge 60s + SWR 5min. Cette route est hit par DbStatusBanner (1×/page)
// + LiveStatsGrid polling 30s + HeroLiveBar polling 60s. Sans cache, chaque
// visiteur = N invocations/min. Avec `s-maxage=60`, ~1 invocation/min global
// indépendamment du nb d'users → win massif Fluid Active CPU.
//
// Les helpers internes (getIndexCounts, getLeaderboardCategories) sont déjà
// wrapped dans unstable_cache 300s, donc même sur cache miss edge la DB
// hit est rare. Compte des items change de quelques unités/jour pendant le
// scrape — 60s staleness invisible pour l'user.
export const revalidate = 60;

export async function GET() {
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
        // Edge cache 60s + serve-stale 5min pendant revalidation background.
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    }
  );
}
