import { redirect } from "next/navigation";

/**
 * /claude-md index is folded into /leaderboard?type=claude-md.
 * Deep pages /claude-md/[category] still exist as the per-project leaderboard.
 */
export default function ClaudeMdRedirect() {
  redirect("/leaderboard?type=claude-md");
}
