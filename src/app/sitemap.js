import { getStandings, getClaudeMds } from "@/lib/queries/rankings";

const BASE = process.env.NEXT_PUBLIC_SITE_URL || "https://versuz.dev";

const STATIC_ROUTES = [
  { path: "/", priority: 1.0, changeFrequency: "daily" },
  { path: "/marketplace", priority: 0.9, changeFrequency: "daily" },
  { path: "/leaderboard", priority: 0.8, changeFrequency: "daily" },
  { path: "/methodology", priority: 0.5, changeFrequency: "monthly" },
  { path: "/about", priority: 0.5, changeFrequency: "monthly" },
  { path: "/status", priority: 0.4, changeFrequency: "weekly" },
  { path: "/submit", priority: 0.4, changeFrequency: "monthly" },
];

export default async function sitemap() {
  const now = new Date();
  const entries = STATIC_ROUTES.map((r) => ({
    url: `${BASE}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));

  try {
    const [skills, claudeMds] = await Promise.all([getStandings(), getClaudeMds()]);
    for (const s of skills) {
      entries.push({
        url: `${BASE}/skills/${s.slug}`,
        lastModified: s.pushedAt ? new Date(s.pushedAt) : now,
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }
    for (const c of claudeMds) {
      entries.push({
        url: `${BASE}/claude-md/${c.project_category || "generic"}/${c.slug}`,
        lastModified: c.pushedAt ? new Date(c.pushedAt) : now,
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }
  } catch {
    // Static routes are still emitted even if Supabase is offline.
  }

  return entries;
}
