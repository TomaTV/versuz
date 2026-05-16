import {
  getStandings,
  getClaudeMds,
  getRankableCategories,
  getProjectCategories,
} from "@/lib/queries/rankings";
import { getAllPosts } from "@/lib/blog";

const BASE = process.env.NEXT_PUBLIC_SITE_URL || "https://versuz.dev";

const STATIC_ROUTES = [
  { path: "/", priority: 1.0, changeFrequency: "daily" },
  { path: "/marketplace", priority: 0.9, changeFrequency: "daily" },
  { path: "/leaderboard", priority: 0.9, changeFrequency: "daily" },
  { path: "/methodology", priority: 0.6, changeFrequency: "monthly" },
  { path: "/blog", priority: 0.7, changeFrequency: "weekly" },
  { path: "/achievements", priority: 0.7, changeFrequency: "daily" },
  { path: "/badges", priority: 0.6, changeFrequency: "monthly" },
  { path: "/pricing", priority: 0.6, changeFrequency: "monthly" },
  { path: "/enterprise", priority: 0.7, changeFrequency: "monthly" },
  { path: "/about", priority: 0.5, changeFrequency: "monthly" },
  { path: "/faq", priority: 0.5, changeFrequency: "monthly" },
  { path: "/changelog", priority: 0.5, changeFrequency: "weekly" },
  { path: "/api-docs", priority: 0.5, changeFrequency: "monthly" },
  { path: "/status", priority: 0.3, changeFrequency: "weekly" },
  { path: "/submit", priority: 0.4, changeFrequency: "monthly" },
  { path: "/feed", priority: 0.4, changeFrequency: "weekly" },
];

// Item priority tiering — Googlebot brûle son crawl budget si tous les
// 5000+ items sortent à 0.6. On signale ce qui mérite d'être crawlé en
// premier : top 50 = 0.8, top 500 = 0.6, rest = 0.4. Le score `benchScore`
// ou `qualityScore` sert d'ordre par défaut.
function itemPriority(rank, total) {
  if (rank < 50) return 0.8;
  if (rank < 500) return 0.6;
  return 0.4;
}

function rankItems(items) {
  return [...items].sort((a, b) => {
    const sa = a.benchScore ?? a.qualityScore ?? 0;
    const sb = b.benchScore ?? b.qualityScore ?? 0;
    return sb - sa;
  });
}

export default async function sitemap() {
  const now = new Date();
  const entries = STATIC_ROUTES.map((r) => ({
    url: `${BASE}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));

  try {
    const [skills, claudeMds, skillCategories, claudeCategories] = await Promise.all([
      getStandings(),
      getClaudeMds(),
      getRankableCategories(),
      getProjectCategories(),
    ]);

    // Skill category index pages (/standings/{cat}) + SEO best pages
    // (/best/skill/{cat}). Both feed long-tail "Best Claude SQL skill" queries.
    for (const cat of skillCategories) {
      if (cat.id === "all" || cat.id === "other") continue;
      entries.push({
        url: `${BASE}/standings/${cat.id}`,
        lastModified: now,
        changeFrequency: "daily",
        priority: 0.75,
      });
      entries.push({
        url: `${BASE}/best/skill/${cat.id}`,
        lastModified: now,
        changeFrequency: "daily",
        priority: 0.8,
      });
    }

    // CLAUDE.md category index pages + best pages
    for (const cat of claudeCategories) {
      if (!cat.id) continue;
      entries.push({
        url: `${BASE}/claude-md/${cat.id}`,
        lastModified: now,
        changeFrequency: "daily",
        priority: 0.7,
      });
      entries.push({
        url: `${BASE}/best/claude-md/${cat.id}`,
        lastModified: now,
        changeFrequency: "daily",
        priority: 0.8,
      });
    }

    const rankedSkills = rankItems(skills);
    const rankedClaudeMds = rankItems(claudeMds);

    rankedSkills.forEach((s, i) => {
      entries.push({
        url: `${BASE}/skills/${s.slug}`,
        lastModified: s.pushedAt ? new Date(s.pushedAt) : now,
        changeFrequency: i < 100 ? "daily" : "weekly",
        priority: itemPriority(i, rankedSkills.length),
      });
    });

    rankedClaudeMds.forEach((c, i) => {
      entries.push({
        url: `${BASE}/claude-md/${c.project_category || "generic"}/${c.slug}`,
        lastModified: c.pushedAt ? new Date(c.pushedAt) : now,
        changeFrequency: i < 100 ? "daily" : "weekly",
        priority: itemPriority(i, rankedClaudeMds.length),
      });
    });

    // Blog posts — small list, all surfaced at high priority
    for (const post of getAllPosts()) {
      entries.push({
        url: `${BASE}/blog/${post.slug}`,
        lastModified: post.dateISO ? new Date(post.dateISO) : now,
        changeFrequency: "monthly",
        priority: 0.7,
      });
    }
  } catch {
    // Static routes are still emitted even if Supabase is offline.
  }

  return entries;
}
