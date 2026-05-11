import { redirect } from "next/navigation";

/**
 * /standings index used to be the skill category picker. It's now folded
 * into the unified /leaderboard page (with a Skills/CLAUDE.md toggle).
 * Keeping the URL alive as a redirect so external links don't break.
 *
 * Deep pages /standings/[category] still exist as the actual skill
 * leaderboard for a category — they're not affected.
 */
export default function StandingsRedirect() {
  redirect("/leaderboard");
}
