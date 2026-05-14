"use client";

import { useState, useMemo, useEffect, useTransition, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { MarketplaceCard } from "@/components/marketplace/marketplace-card";

const TIER_OPTIONS = [
  { id: "all", label: "All" },
  { id: "free", label: "Free" },
  { id: "premium", label: "Premium" },
  { id: "featured", label: "Featured" },
];

const VERIFIED_OPTIONS = [
  { id: "any", label: "Any trust" },
  { id: "1", label: "Claimed+" },
  { id: "2", label: "Verified+" },
  { id: "3", label: "Reviewed+" },
];

const OFFICIAL_OPTIONS = [
  { id: "any", label: "Any" },
  { id: "true", label: "Official only" },
];

const SOURCE_OPTIONS = [
  { id: "any", label: "Any source" },
  { id: "github", label: "GitHub" },
  { id: "web-directory", label: "Web directory" },
  { id: "gitlab", label: "GitLab" },
  { id: "sourcegraph", label: "Sourcegraph" },
  { id: "grepapp", label: "grep.app" },
  { id: "aggregator", label: "Awesome list" },
  { id: "submit", label: "Submitted" },
  { id: "cli", label: "CLI" },
  { id: "other", label: "Other" },
];

// Normalize raw `source` strings written by various scrapers (legacy +
// current). Real values seen in production : github-search, web-directory,
// gitlab, sourcegraph, github-mass, mega-github, github-fresh, etc. We
// merge them into the canonical SOURCE_OPTIONS buckets above.
function normalizeSource(raw) {
  if (!raw) return "github";
  const s = String(raw).toLowerCase();
  // Anything containing "github" maps to GitHub (catches mega-github too)
  if (s.includes("github")) return "github";
  if (s.includes("sourcegraph")) return "sourcegraph";
  if (s.includes("grep")) return "grepapp";
  if (s.includes("gitlab")) return "gitlab";
  if (s.includes("aggregator") || s.includes("awesome")) return "aggregator";
  if (s.includes("web-directory") || s.includes("directory")) return "web-directory";
  if (s === "submit" || s.startsWith("submit:")) return "submit";
  if (s === "cli" || s.startsWith("cli:")) return "cli";
  return "other";
}

const QUALITY_OPTIONS = [
  { id: "any", label: "Any quality" },
  { id: "60", label: "60+" },
  { id: "70", label: "70+" },
  { id: "80", label: "80+" },
  { id: "90", label: "90+" },
];

const TOKENS_OPTIONS = [
  { id: "any", label: "Any size" },
  { id: "small", label: "Small (<500)" },
  { id: "medium", label: "Medium (500-2k)" },
  { id: "large", label: "Large (2k+)" },
];

const SORT_OPTIONS = [
  { id: "prior", label: "Prior" },
  { id: "elo", label: "Score (bench)" },
  { id: "quality", label: "Quality" },
  { id: "stars", label: "Stars" },
  { id: "recent", label: "Recent" },
  { id: "name", label: "Name" },
];

const TYPE_OPTIONS = [
  { id: "skills", label: "Skills" },
  { id: "claude-md", label: "CLAUDE.md" },
];

const BUNDLE_OPTIONS = [
  { id: "any", label: "Any" },
  { id: "bundle", label: "Bundles only" },
  { id: "single", label: "Single items" },
];

const PAGE_SIZE = 50;

/**
 * Marketplace grid — filter state syncs to the URL so the server returns the
 * correct page of matching rows. Search input is debounced (500ms). Client-side
 * refinements (topics, elo/recent sort, skills token bucket) apply on top of
 * the server page where the API does not yet mirror the filter.
 */
export function MarketplaceGrid({
  items: serverItems = [],
  totalCount = 0,
  currentPage = 1,
  totalPages: serverTotalPages = 1,
  skillCategories = [],
  projectCategories = [],
  availableSources = [],
  ownedSkillSlugs = [],
  ownedClaudeMdSlugs = [],
  authoredSkillSlugs = [],
  authoredClaudeMdSlugs = [],
  initial = {},
}) {
  // Trim SOURCE_OPTIONS to only the sources actually present in the DB
  // (with optional counts shown). Avoids dead filter buckets that no row
  // populates (GitLab / Manual / searchcode etc. that no scraper writes).
  const availableSourceIds = useMemo(
    () => new Set(availableSources.map((s) => s.id)),
    [availableSources]
  );
  const sourceCountById = useMemo(() => {
    const m = new Map();
    for (const s of availableSources) m.set(s.id, s.count);
    return m;
  }, [availableSources]);
  const filteredSourceOptions = useMemo(() => {
    if (availableSources.length === 0) return SOURCE_OPTIONS;
    return SOURCE_OPTIONS.filter(
      (o) => o.id === "any" || availableSourceIds.has(o.id)
    ).map((o) =>
      o.id === "any"
        ? o
        : { ...o, label: `${o.label} (${sourceCountById.get(o.id) || 0})` }
    );
  }, [availableSourceIds, sourceCountById, availableSources.length]);
  const ownedSkills = useMemo(() => new Set(ownedSkillSlugs), [ownedSkillSlugs]);
  const ownedClaudeMds = useMemo(() => new Set(ownedClaudeMdSlugs), [ownedClaudeMdSlugs]);
  const authoredSkills = useMemo(() => new Set(authoredSkillSlugs), [authoredSkillSlugs]);
  const authoredClaudeMds = useMemo(() => new Set(authoredClaudeMdSlugs), [authoredClaudeMdSlugs]);
  const router = useRouter();
  const pathname = usePathname();

  const [type, setType] = useState(initial.type === "claude-md" ? "claude-md" : "skills");
  const [cat, setCat] = useState(initial.cat || "all");
  const [tier, setTier] = useState(initial.tier || "all");
  const [verified, setVerified] = useState(initial.verified || "any");
  const [official, setOfficial] = useState(initial.official === "true" ? "true" : "any");
  const [source, setSource] = useState(initial.source || "any");
  const [quality, setQuality] = useState(initial.quality || "any");
  const [tokens, setTokens] = useState(initial.tokens || "any");
  const [bundle, setBundle] = useState(initial.bundle || "any");
  const [sort, setSort] = useState(initial.sort || "prior");
  const [query, setQuery] = useState(initial.q || "");
  const [topics, setTopics] = useState(() =>
    initial.topics ? initial.topics.split(",").filter(Boolean) : []
  );
  const urlPage = Math.max(1, Number(initial.page) || 1);

  // Refine panel toggle — collapsed by default to keep the page lean.
  // Auto-opens if any filter or sort is already active via URL.
  const [refineOpen, setRefineOpen] = useState(
    initial.tier !== undefined ||
    initial.verified !== undefined ||
    initial.official !== undefined ||
    initial.source !== undefined ||
    initial.quality !== undefined ||
    initial.tokens !== undefined ||
    initial.bundle !== undefined ||
    initial.sort !== undefined
  );

  // Compare picker — track up to 2 selected slugs for /compare. Cleared
  // automatically when switching type (skills <-> claude-md) since you
  // can't compare across kinds.
  const [compareSlugs, setCompareSlugs] = useState([]);
  useEffect(() => {
    setCompareSlugs([]);
  }, [type]);
  const toggleCompare = (slug) => {
    setCompareSlugs((prev) => {
      if (prev.includes(slug)) return prev.filter((s) => s !== slug);
      if (prev.length >= 2) return [prev[1], slug]; // FIFO replace oldest
      return [...prev, slug];
    });
  };

  const [isPending, startTransition] = useTransition();

  // Helper: navigate with transition (non-blocking UI)
  const navigate = (params) => {
    const qs = params.toString();
    const url = qs ? `${pathname}?${qs}` : pathname;
    startTransition(() => {
      router.replace(url, { scroll: false });
    });
  };

  // Build params from current state
  const buildParams = (overrides = {}) => {
    const s = {
      type,
      cat,
      tier,
      verified,
      official,
      source,
      quality,
      tokens,
      bundle,
      sort,
      query,
      topics,
      page: urlPage,
      ...overrides,
    };
    const p = new URLSearchParams();
    if (s.type !== "skills") p.set("type", s.type);
    if (s.cat !== "all") p.set("cat", s.cat);
    if (s.tier !== "all") p.set("tier", s.tier);
    if (s.verified !== "any") p.set("verified", s.verified);
    if (s.official !== "any") p.set("official", s.official);
    if (s.source !== "any") p.set("source", s.source);
    if (s.quality !== "any") p.set("quality", s.quality);
    if (s.tokens !== "any") p.set("tokens", s.tokens);
    if (s.bundle !== "any") p.set("bundle", s.bundle);
    if (s.sort !== "prior") p.set("sort", s.sort);
    if (s.query?.trim()) p.set("q", s.query.trim());
    if (s.topics?.length) p.set("topics", s.topics.join(","));
    if (s.page > 1) p.set("page", String(s.page));
    return p;
  };

  const queryNavSkipRef = useRef(true);
  // Debounce search input only (500ms)
  useEffect(() => {
    if (queryNavSkipRef.current) {
      queryNavSkipRef.current = false;
      return;
    }
    const handle = setTimeout(() => {
      navigate(buildParams({ page: 1 }));
    }, 500);
    return () => clearTimeout(handle);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const filtersNavSkipRef = useRef(true);
  const filterDebounceRef = useRef(null);
  // Tokens is now server-side (via metadata->>byte_count for skills, and
  // word_count for claude_md) → triggers nav like bundle.
  useEffect(() => {
    if (filtersNavSkipRef.current) {
      filtersNavSkipRef.current = false;
      return;
    }
    clearTimeout(filterDebounceRef.current);
    filterDebounceRef.current = setTimeout(() => {
      navigate(buildParams({ page: 1 }));
    }, 140);
    return () => clearTimeout(filterDebounceRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [official, tier, verified, source, quality, bundle, tokens, sort, cat, type, topics]);

  const sourceItems = serverItems;
  const dedupCats = (cats) => {
    const seen = new Set();
    return cats.filter((c) => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });
  };
  const categories = dedupCats(
    type === "skills" ? skillCategories : projectCategories
  );

  const filtered = useMemo(() => {
    let list = sourceItems;

    // Single-pass filtering for better performance
    const catLower = cat.toLowerCase();
    const q = query.trim().toLowerCase();
    const minVerified = verified !== "any" ? Number(verified) : null;
    const minQuality = quality !== "any" ? Number(quality) : null;
    const isOfficialOnly = official === "true";
    const sourceFilter = source !== "any" ? source : null;
    const tokensFilter = tokens !== "any" ? tokens : null;
    const bundleFilter = bundle !== "any" ? bundle : null;
    const hasTopics = topics.length > 0;

    list = list.filter((s) => {
      // Category filter — multi-cat aware (migration 0040).
      // Un item avec `categories=["mcp-server","document"]` doit apparaître
      // quand l'user filtre par "document". On checke d'abord l'array
      // `categories`, puis fallback à la primary `category` / `categoryId` /
      // `project_category` pour les rows legacy.
      if (cat !== "all") {
        const catArray = Array.isArray(s.categories) ? s.categories : [];
        const matchesArray = catArray.some(
          (c) => (c || "").toLowerCase() === catLower
        );
        if (!matchesArray) {
          if (type === "skills") {
            if (
              (s.category || "").toLowerCase() !== catLower &&
              (s.categoryId || "").toLowerCase() !== catLower
            ) {
              return false;
            }
          } else if (s.project_category !== cat) {
            return false;
          }
        }
      }

      // Tier filter
      if (tier !== "all" && (s.tier || "free") !== tier) return false;

      // Verified filter
      if (minVerified !== null && (s.verificationLevel ?? 0) < minVerified) return false;

      // Official filter
      if (isOfficialOnly && !s.isOfficial) return false;

      // Source filter — normalize the raw DB value (codesearch:sourcegraph,
      // grep.app, aggregator:awesome-list, etc.) to a canonical id before
      // comparing against the filter selection.
      if (sourceFilter && normalizeSource(s.source) !== sourceFilter) return false;

      // Quality filter
      if (minQuality !== null && (s.qualityScore ?? 0) < minQuality) return false;

      // Tokens filter — signal hierarchy :
      //   1. word_count (claude_md only, generated col)
      //   2. metadata.byte_count (set by backfill-byte-counts.mjs from
      //      Storage object size, post-migration) → bytes/4 ≈ tokens
      //   3. metadata.word_count_hint (legacy scrape signal, ~25% coverage)
      //   4. metadata.bundle_size_bytes (bundled skills only, ~2%)
      //   5. skill_md_content.length (legacy inline, ~66 Forbidden rows)
      if (tokensFilter) {
        let approxTokens = null;
        if (s.word_count != null) {
          approxTokens = Math.round(s.word_count * 1.3);
        } else if (s.metadata?.byte_count != null) {
          approxTokens = Math.round(Number(s.metadata.byte_count) / 4);
        } else if (s.metadata?.word_count_hint != null) {
          approxTokens = Math.round(Number(s.metadata.word_count_hint) * 1.3);
        } else if (s.metadata?.bundle_size_bytes != null) {
          approxTokens = Math.round(Number(s.metadata.bundle_size_bytes) / 4);
        } else if (typeof s.skill_md_content === "string" && s.skill_md_content.length > 0) {
          approxTokens = Math.round(s.skill_md_content.length / 4);
        }
        if (approxTokens != null) {
          if (tokensFilter === "small" && approxTokens >= 500) return false;
          if (tokensFilter === "medium" && (approxTokens < 500 || approxTokens > 2000)) return false;
          if (tokensFilter === "large" && approxTokens <= 2000) return false;
        }
      }

      // Bundle filter — handled SERVER-side via is_bundled generated column
      // (migration 0044). Skipping the client refinement that was previously
      // here : it used 3 signals (skill_type, repoSkillCount, bundle_files)
      // whose semantics drifted from what the server returns, so the client
      // would re-exclude items the server had correctly included.
      //
      // Note on the two "bundle" concepts in Versuz :
      //   1. skill_type=bundled : the SKILL.md itself ships with companions
      //      (scripts/, refs/) → this filter targets this
      //   2. repoSkillCount > 1 : the GitHub repo contains multiple skills
      //      → surfaced via the /repo/[owner]/[repo] page + bundle callout
      // We treat them separately on purpose.

      // Search filter
      if (q) {
        if (
          !(s.name || "").toLowerCase().includes(q) &&
          !(s.slug || "").toLowerCase().includes(q) &&
          !(s.author || "").toLowerCase().includes(q) &&
          !(s.repo || "").toLowerCase().includes(q) &&
          !(s.description || "").toLowerCase().includes(q)
        ) {
          return false;
        }
      }

      // Topics filter
      if (hasTopics) {
        const itemTopics = Array.isArray(s.topics) ? s.topics : [];
        if (!topics.every((t) => itemTopics.includes(t))) return false;
      }

      return true;
    });

    // Sorting
    if (sort === "stars") list.sort((a, b) => (b.stars || 0) - (a.stars || 0));
    else if (sort === "quality") {
      list.sort((a, b) => (b.qualityScore ?? -1) - (a.qualityScore ?? -1));
    } else if (sort === "name") {
      list.sort((a, b) =>
        (a.name || a.slug || "").localeCompare(b.name || b.slug || "")
      );
    } else if (sort === "recent") {
      list.sort(
        (a, b) =>
          new Date(b.pushedAt || 0).getTime() - new Date(a.pushedAt || 0).getTime()
      );
    } else if (sort === "elo") {
      // Pure bench score sort — items without an Elo land last
      list.sort((a, b) => {
        const aHas = a.elo != null;
        const bHas = b.elo != null;
        if (aHas && !bHas) return -1;
        if (!aHas && bHas) return 1;
        if (!aHas && !bHas) return 0;
        return b.elo - a.elo;
      });
    } else if (sort === "prior") {
      // Composite sort : Elo (real bench) > qualityScore (LLM judge) > prior (cold-start).
      // Items without any signal land last.
      const score = (s) => {
        if (s.elo != null) return 10000 + s.elo;
        if (s.qualityScore != null) return 1000 + s.qualityScore;
        return s.prior ?? 0;
      };
      list.sort((a, b) => score(b) - score(a));
    } else list.sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));

    // Diversity interleave (sort=prior uniquement) : limite à MAX 2 items
    // consécutifs du même owner. Sans ça, un mega-repo (facebook avec 20
    // SKILL.md) prend les 20 premières slots → flood visuel.
    // L'algo garde l'ordre relatif global (priors hauts d'abord) mais reporte
    // les items du même owner après un cooldown.
    if (sort === "prior" && list.length > 6) {
      const MAX_CONSECUTIVE = 2;
      const sorted = [...list];
      const interleaved = [];
      const deferred = new Map(); // owner → array of items deferred
      let lastOwner = null;
      let consecutiveCount = 0;
      while (sorted.length > 0 || [...deferred.values()].some((q) => q.length > 0)) {
        // Pick next : si on n'a pas dépassé le cap, prendre la tête de sorted.
        // Sinon prendre dans deferred (le plus haut prior d'un autre owner).
        let picked = null;
        if (sorted.length > 0) {
          const head = sorted[0];
          const ownerHead = (head.author || head.metadata?.owner || "").toLowerCase();
          if (ownerHead !== lastOwner || consecutiveCount < MAX_CONSECUTIVE) {
            picked = sorted.shift();
          } else {
            // Defer head, try un autre owner du sorted
            const otherIdx = sorted.findIndex((it) => {
              const o = (it.author || it.metadata?.owner || "").toLowerCase();
              return o !== lastOwner;
            });
            if (otherIdx > 0) {
              picked = sorted.splice(otherIdx, 1)[0];
            } else {
              // Que des items du même owner restant → defer le head, continue
              const headOwner = ownerHead;
              const q = deferred.get(headOwner) || [];
              q.push(sorted.shift());
              deferred.set(headOwner, q);
              continue;
            }
          }
        } else {
          // Sorted vidé → pull depuis deferred par prior desc
          let bestOwner = null;
          let bestPrior = -Infinity;
          for (const [o, q] of deferred) {
            if (q.length === 0) continue;
            const p = q[0].prior ?? 0;
            if (p > bestPrior) { bestPrior = p; bestOwner = o; }
          }
          if (!bestOwner) break;
          picked = deferred.get(bestOwner).shift();
        }
        if (!picked) break;
        const ownerPicked = (picked.author || picked.metadata?.owner || "").toLowerCase();
        if (ownerPicked === lastOwner) consecutiveCount += 1;
        else { lastOwner = ownerPicked; consecutiveCount = 1; }
        interleaved.push(picked);
      }
      list = interleaved;
    }

    // Pinning order at top of grid :
    //   1. BOOSTED first — paid placement always wins top slot (npm / Algolia
    //      convention : sponsored content is most prominent because it's paid).
    //   2. FEATURED next — Versuz editorial. Distinctive sponsored-style card
    //      treatment regardless of position.
    // V1.5 sponsored distribution — 4 sponsored per page at FIXED ZONES :
    //   - 1 top zone (positions 0-3, first row)
    //   - 1 middle zone (positions ~22-28)
    //   - 1 bottom zone (positions ~38-44, leaves 4-6 items after so it's
    //     not glued to the very last row)
    //
    // Why fixed zones instead of fully random : predictable scan rhythm.
    // User's eye learns "ad up top, ad middle, ad bottom" — way less
    // disruptive than random placement. Each zone has small jitter (seeded
    // per item) so different sponsored land at slightly different positions
    // page-to-page, no specific item always at slot #1.
    const SPONSORED_PER_PAGE = 4;
    const ZONES = [
      { min: 0, max: 3 },     // top : within first row
      { min: 22, max: 28 },   // middle : center of page
      { min: 38, max: 44 },   // bottom : not last row
    ];

    const sponsoredAll = list.filter(
      (s) => s.isBoosted || (s.tier || "free") === "featured"
    );
    const sponsoredSlugSet = new Set(sponsoredAll.map((s) => s.slug));
    const restPool = list.filter((s) => !sponsoredSlugSet.has(s.slug));

    const seed = Math.floor(new Date().getTime() / (1000 * 60 * 60 * 24));
    function seededHash(str, salt) {
      let h = salt;
      for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
      return h;
    }
    const sponsoredShuffled = [...sponsoredAll].sort(
      (a, b) => seededHash(a.slug, seed) - seededHash(b.slug, seed)
    );

    const out = [];
    let restCursor = 0;
    let sponsoredCursor = 0;
    const totalCount = sponsoredAll.length + restPool.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

    for (let p = 0; p < totalPages; p++) {
      const slice = sponsoredShuffled.slice(sponsoredCursor, sponsoredCursor + SPONSORED_PER_PAGE);
      sponsoredCursor += slice.length;

      // Sponsored items are now 1-column items (no longer 2-col span)
      // We want 50 visual slots total, so calculate how many normal items needed
      const sponsoredSlots = slice.length;
      const targetVisualSlots = 50;
      const restNeeded = Math.max(0, targetVisualSlots - sponsoredSlots);
      const restSlice = restPool.slice(restCursor, restCursor + restNeeded);
      restCursor += restSlice.length;

      const pageItems = [...restSlice];

      // Compute insert positions, one per zone, with jittered position inside
      // the zone (seeded by item slug + page so each page differs).
      const positions = [];
      for (let i = 0; i < slice.length && i < ZONES.length; i++) {
        const z = ZONES[i];
        const range = Math.max(1, z.max - z.min);
        let pos = z.min + (seededHash(slice[i].slug, seed + p) % range);
        // Clamp to current page length (small pages might not have a "bottom" zone)
        pos = Math.min(pos, pageItems.length);
        positions.push(pos);
      }
      // Insert from highest position to lowest so earlier inserts don't
      // shift later positions.
      const inserts = positions
        .map((pos, i) => ({ pos, item: slice[i] }))
        .sort((a, b) => b.pos - a.pos);
      for (const { pos, item } of inserts) {
        pageItems.splice(pos, 0, item);
      }
      out.push(...pageItems);
    }
    if (sponsoredCursor < sponsoredShuffled.length) {
      out.push(...sponsoredShuffled.slice(sponsoredCursor));
    }
    return out;
  }, [sourceItems, cat, tier, verified, official, source, quality, tokens, bundle, sort, type, query, topics]);

  // "Sponsored" treatment : pinned items (boosted + featured) get a taller
  // card with description always visible, distinctive outline. Same width as
  // normal cards (no grid span) so the layout stays uniform — it's the
  // height + content density that signals "this is sponsored / editorial".
  // Mirrors the npm / Algolia / skillsmp sponsored card pattern.
  const sponsoredSlugs = useMemo(() => {
    const set = new Set();
    for (const s of filtered) {
      if (s.isBoosted) set.add(s.slug);
      else if ((s.tier || "free") === "featured") set.add(s.slug);
    }
    return set;
  }, [filtered]);
  // Kept for backwards-compat with MarketplaceCard's featured prop —
  // no items get the 2-col span anymore.
  const featuredSlugs = useMemo(() => new Set(), []);

  // Counts for the transparency banner (so it can show "4 featured + 6 boosted")
  const pinnedStats = useMemo(() => {
    const f = filtered.filter((s) => (s.tier || "free") === "featured").slice(0, 4).length;
    const featuredSet = new Set(
      filtered.filter((s) => (s.tier || "free") === "featured").slice(0, 4).map((s) => s.slug)
    );
    const b = filtered.filter((s) => s.isBoosted && !featuredSet.has(s.slug)).slice(0, 6).length;
    return { featured: f, boosted: b };
  }, [filtered]);

  // Top topics across the currently visible source (filter chips).
  // Filter out singletons (count <= 1) — those add noise without filter
  // power. Cap at 12 most-popular so the row stays one wrap or two max.
  // Always include any topic the user has already selected (so the chip
  // stays visible to deselect).
  const topTopics = useMemo(() => {
    const counts = new Map();
    for (const it of sourceItems) {
      const ts = Array.isArray(it.topics) ? it.topics : [];
      for (const t of ts) counts.set(t, (counts.get(t) || 0) + 1);
    }
    const all = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    const selected = new Set(topics);
    const popular = all.filter(([id, count]) => count > 1 || selected.has(id));
    return popular.slice(0, 12).map(([id, count]) => ({ id, count }));
  }, [sourceItems, topics]);

  // Items are already paginated by the server — display them directly
  const visible = filtered;

  // Filtres CLIENT-side seulement (le serveur en applique déjà beaucoup) :
  //   - bundle : dépend de metadata.repoSkillCount calculé en JS
  //   - tokens : pour skills, pas indexé côté server (word_count absent)
  // Le serveur applique : cat, tier, verified, official, source, quality,
  // tokens-pour-claude_md, q (search), topics (migration 0037).
  // Tous les filtres marketplace sont désormais server-side : tier, verified,
  // official, source, quality, bundle (mig 0044+0046), tokens (mig 0048).
  // `totalCount` du server reflète déjà le bon count → on l'affiche direct
  // sans compensation client-side.
  const isSkillKind = type === "skills";
  const hasClientSideFilters = false;
  const displayCount = hasClientSideFilters ? filtered.length : totalCount;
  const VISUAL_SLOTS_PER_PAGE = 50;
  const totalPages = Math.max(
    1,
    Math.ceil(
      (hasClientSideFilters ? filtered.length : totalCount) / VISUAL_SLOTS_PER_PAGE
    )
  );
  const safePage = Math.min(currentPage, totalPages);

  const toggleTopic = (id) => {
    setTopics((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };
  const onTypeChange = (id) => {
    setType(id);
    setCat("all");
    setTopics([]);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 32,
        // Keep the grid fully visible during server refetch — the client-side
        // `filtered` useMemo above already applies every active filter to the
        // currently-visible items, so users get instant feedback. The thin
        // progress bar below is enough signal that something is refreshing.
        opacity: 1,
      }}
    >
      {isPending && (
        <div
          className="vz-filter-nav-bar"
          role="progressbar"
          aria-busy="true"
          aria-label="Mise à jour des filtres"
        >
          <div className="vz-filter-nav-bar__chunk" />
        </div>
      )}
      {/* Type toggle */}
      <div
        style={{
          display: "flex",
          gap: 0,
          border: "1px solid var(--rule)",
          padding: 4,
          background: "var(--surface)",
          width: "fit-content",
        }}
      >
        {TYPE_OPTIONS.map((t) => {
          const active = t.id === type;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onTypeChange(t.id)}
              style={{
                padding: "10px 20px",
                fontFamily: "var(--font-sans)",
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
                border: "none",
                color: active ? "var(--bg)" : "var(--fg-muted)",
                background: active ? "var(--fg)" : "transparent",
                transition: "background 0.2s ease, color 0.2s ease",
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Categories pills — own row, just narrowing scope */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        {categories.map((c) => (
          <PillBtn
            key={c.id}
            label={c.label}
            count={c.count}
            active={cat === c.id}
            onClick={() => {
              setCat(c.id);
            }}
          />
        ))}
      </div>

      {/* Search + Refine row — primary discovery controls, given visual weight */}
      <div
        style={{
          display: "flex",
          alignItems: "stretch",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "stretch", flex: "1 1 320px", border: "1px solid var(--rule-strong)", background: "var(--bg)" }}>
          <span
            aria-hidden
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 14px",
              color: "var(--fg-muted)",
              fontSize: 16,
              borderRight: "1px solid var(--rule)",
            }}
          >
            ⌕
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${type === "skills" ? "skills" : "CLAUDE.md"} by name, author, description…`}
            style={{
              flex: 1,
              padding: "12px 14px",
              border: "none",
              background: "transparent",
              color: "var(--fg)",
              fontFamily: "var(--font-sans)",
              fontSize: 14,
              outline: "none",
              minWidth: 0,
            }}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              style={{
                padding: "0 14px",
                border: "none",
                borderLeft: "1px solid var(--rule)",
                background: "transparent",
                color: "var(--fg-muted)",
                fontFamily: "var(--font-mono)",
                fontSize: 16,
                cursor: "pointer",
              }}
            >
              ×
            </button>
          )}
        </div>
        {(() => {
          const activeCount =
            (tier !== "all" ? 1 : 0) +
            (verified !== "any" ? 1 : 0) +
            (official !== "any" ? 1 : 0) +
            (source !== "any" ? 1 : 0) +
            (quality !== "any" ? 1 : 0) +
            (tokens !== "any" ? 1 : 0) +
            (bundle !== "any" ? 1 : 0) +
            (sort !== "prior" ? 1 : 0);
          return (
            <button
              type="button"
              onClick={() => setRefineOpen((v) => !v)}
              aria-expanded={refineOpen}
              style={{
                padding: "12px 22px",
                fontFamily: "var(--font-sans)",
                fontSize: 14,
                fontWeight: 500,
                color: activeCount > 0 || refineOpen ? "var(--bg)" : "var(--fg)",
                background: activeCount > 0 || refineOpen ? "var(--fg)" : "var(--bg)",
                border: "1px solid var(--fg)",
                cursor: "pointer",
                whiteSpace: "nowrap",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                transition: "background .15s ease, color .15s ease",
              }}
            >
              <span aria-hidden style={{ fontSize: 14, lineHeight: 1 }}>≡</span>
              <span>Filters</span>
              {activeCount > 0 && (
                <span
                  style={{
                    background: "var(--accent)",
                    color: "var(--bg)",
                    padding: "1px 7px",
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    letterSpacing: 0,
                    minWidth: 20,
                    textAlign: "center",
                  }}
                >
                  {activeCount}
                </span>
              )}
              <span aria-hidden style={{ fontSize: 10, opacity: 0.7 }}>
                {refineOpen ? "▴" : "▾"}
              </span>
            </button>
          );
        })()}
      </div>

      {/* Refine panel — only mounted when toggled open. Single home for ALL
          display controls (filters + sort) → no duplicates with the stats row. */}
      {refineOpen && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            flexWrap: "wrap",
            padding: "12px 14px",
            background: "var(--surface)",
            border: "1px solid var(--rule)",
          }}
        >
          <CompactSelect
            label="Tier"
            value={tier}
            onChange={(v) => setTier(v)}
            options={TIER_OPTIONS}
          />
          <CompactSelect
            label="Trust"
            value={verified}
            onChange={(v) => setVerified(v)}
            options={VERIFIED_OPTIONS}
          />
          <CompactSelect
            label="Official"
            value={official}
            onChange={(v) => setOfficial(v)}
            options={OFFICIAL_OPTIONS}
          />
          <CompactSelect
            label="Source"
            value={source}
            onChange={(v) => setSource(v)}
            options={filteredSourceOptions}
          />
          <CompactSelect
            label="Quality"
            value={quality}
            onChange={(v) => setQuality(v)}
            options={QUALITY_OPTIONS}
          />
          {/* Tokens filter — works on claude_md via word_count (generated)
              and on skills via metadata.byte_count (backfilled from Storage
              object size). Run `node scripts/backfill-byte-counts.mjs --apply`
              once to populate the skills side. */}
          <CompactSelect
            label="Tokens"
            value={tokens}
            onChange={(v) => setTokens(v)}
            options={TOKENS_OPTIONS}
          />
          {/* Bundle filter only applies to skills (claude_md is always one file). */}
          {type === "skills" && (
            <CompactSelect
              label="Bundle"
              value={bundle}
              onChange={(v) => setBundle(v)}
              options={BUNDLE_OPTIONS}
            />
          )}
          <TopicAdder
            topTopics={topTopics}
            currentTopics={topics}
            onAdd={(t) => {
              if (!topics.includes(t)) setTopics([...topics, t]);
            }}
          />
          <span style={{ borderLeft: "1px solid var(--rule)", height: 20, opacity: 0.5 }} />
          <CompactSelect
            label="Sort"
            value={sort}
            onChange={(v) => setSort(v)}
            options={SORT_OPTIONS}
          />
          {(tier !== "all" || verified !== "any" || official !== "any" || source !== "any" || quality !== "any" || tokens !== "any" || bundle !== "any" || sort !== "prior" || cat !== "all" || topics.length > 0) && (
            <button
              type="button"
              onClick={() => {
                setTier("all"); setVerified("any"); setOfficial("any"); setSource("any"); setQuality("any"); setTokens("any"); setBundle("any"); setSort("prior"); setCat("all"); setTopics([]); setQuery("");
              }}
              style={{
                marginLeft: "auto",
                padding: "6px 10px",
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "var(--crimson)",
                background: "transparent",
                border: "1px solid var(--rule)",
                cursor: "pointer",
              }}
            >
              ↺ Clear all
            </button>
          )}
        </div>
      )}

      {/* Search bar moved into the result-count row below for compactness. */}

      {/* Active filter chips — feedback visuel quand un filtre vient de
          l'URL (`?topics=mcp`, `?official=true`, etc.). Sans ça, l'user
          tape l'URL et voit la liste filtrée mais aucune trace du critère
          actif → impossible de désélectionner. */}
      {(topics.length > 0 || official !== "any" || verified !== "any" || tier !== "all" || source !== "any" || quality !== "any" || tokens !== "any" || bundle !== "any") && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
            padding: "2px 0",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: "var(--fg-muted)",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              padding: "4px 0",
              marginRight: 4,
            }}
          >
            Active:
          </span>
          {topics.map((t) => (
            <FilterChip key={`topic-${t}`} label={`topic: ${t}`} onRemove={() => setTopics((prev) => prev.filter((x) => x !== t))} />
          ))}
          {official === "true" && (
            <FilterChip label="official only" onRemove={() => setOfficial("any")} />
          )}
          {source !== "any" && (
            <FilterChip label={`source: ${filteredSourceOptions.find((o) => o.id === source)?.label || source}`} onRemove={() => setSource("any")} />
          )}
          {verified !== "any" && (
            <FilterChip label={`trust ≥ ${VERIFIED_OPTIONS.find((o) => o.id === verified)?.label || verified}`} onRemove={() => setVerified("any")} />
          )}
          {tier !== "all" && (
            <FilterChip label={`tier: ${tier}`} onRemove={() => setTier("all")} />
          )}
          {quality !== "any" && (
            <FilterChip label={`quality ≥ ${quality}`} onRemove={() => setQuality("any")} />
          )}
          {tokens !== "any" && (
            <FilterChip label={`size: ${tokens}`} onRemove={() => setTokens("any")} />
          )}
          {bundle !== "any" && (
            <FilterChip label={`bundle: ${BUNDLE_OPTIONS.find((o) => o.id === bundle)?.label || bundle}`} onRemove={() => setBundle("any")} />
          )}
        </div>
      )}

      {/* Result count */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          color: "var(--fg)",
          letterSpacing: "0.04em",
          borderBottom: "1px solid var(--rule)",
          paddingBottom: 12,
        }}
      >
        <span style={{ fontWeight: 500 }}>
          {displayCount} {type === "skills" ? "skills" : "files"}
          {cat !== "all" && <span style={{ color: "var(--fg-muted)" }}> in {cat}</span>}
          {query && <span style={{ color: "var(--fg-muted)" }}> matching &quot;{query.slice(0, 30)}&quot;</span>}
          {isPending && (
            <span style={{ color: "var(--accent)", marginLeft: 10, fontWeight: 400 }}>
              Updating…
            </span>
          )}
        </span>
        {totalPages > 1 && (
          <span style={{ whiteSpace: "nowrap", color: "var(--fg-muted)" }}>
            Page <strong style={{ color: "var(--fg)" }}>{safePage}</strong> / {totalPages}
          </span>
        )}
      </div>

      {/* Card grid */}
      {filtered.length === 0 ? (
        <div
          style={{
            padding: "80px 24px",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
            border: "1px dashed var(--rule-strong)",
            background: "var(--surface)",
          }}
        >
          <span
            aria-hidden
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "var(--fg-muted)",
              padding: "4px 10px",
              border: "1px solid var(--rule-strong)",
            }}
          >
            0 results
          </span>
          <p
            style={{
              margin: 0,
              fontFamily: "var(--font-display)",
              fontSize: 28,
              fontWeight: 400,
              letterSpacing: "-0.02em",
              color: "var(--fg)",
              maxWidth: 480,
              lineHeight: 1.25,
            }}
          >
            No items <em style={{ color: "var(--accent)" }}>match</em> these filters.
          </p>
          <p
            style={{
              margin: 0,
              fontSize: 13,
              lineHeight: 1.6,
              color: "var(--fg-muted)",
              maxWidth: 420,
            }}
          >
            Try clearing one or more filters, or browse a different kind
            (<button
              type="button"
              onClick={() => onTypeChange(type === "skills" ? "claude-md" : "skills")}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--accent)",
                borderBottom: "1px solid var(--accent)",
                cursor: "pointer",
                fontFamily: "inherit",
                fontSize: "inherit",
                padding: 0,
              }}
            >
              switch to {type === "skills" ? "CLAUDE.md" : "skills"}
            </button>).
          </p>
          <button
            type="button"
            onClick={() => {
              setTier("all"); setVerified("any"); setOfficial("any");
              setSource("any"); setQuality("any"); setTokens("any");
              setBundle("any"); setSort("prior"); setCat("all");
              setTopics([]); setQuery("");
            }}
            style={{
              marginTop: 8,
              padding: "10px 20px",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--bg)",
              background: "var(--accent)",
              border: "1px solid var(--accent)",
              cursor: "pointer",
            }}
          >
            ↺ Clear all filters
          </button>
        </div>
      ) : (
        <>
          {/* Sponsored disclosure — items with the FEATURED/SPONSORED ribbon
              are sprinkled randomly within each page. Tooltip explains why. */}
          {(pinnedStats.featured > 0 || pinnedStats.boosted > 0) && (
            <div
              style={{
                marginBottom: 12,
                padding: "6px 0",
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                color: "var(--fg-muted)",
                letterSpacing: "0.06em",
                display: "flex",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <span style={{ opacity: 0.8 }}>
                Items with the <span style={{ color: "var(--accent)" }}>★ Featured</span> or{" "}
                <span style={{ color: "var(--amber)" }}>★ Sponsored</span>{" "}
                ribbon appear randomly within each page — pinning doesn&apos;t affect rank or Elo on{" "}
                <a href="/leaderboard" style={{ color: "var(--fg-muted)", borderBottom: "1px solid var(--rule)", textDecoration: "none" }}>
                  /leaderboard
                </a>.
              </span>
            </div>
          )}
          <div
            style={{
              display: "grid",
              // `auto-fit` (not auto-fill) collapses empty tracks at end of
              // last row so cards stretch to fill width — no more dead empty
              // cells when item count isn't divisible by columns.
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 14,
              // `dense` packs sponsored 2-col-span cards into gaps — without
              // it, span-2 items push smaller items down and create empty
              // half-cells in the middle of the grid.
              gridAutoFlow: "dense",
            }}
          >
            {visible.map((item) => {
              const kind = type === "skills" ? "skill" : "claude_md";
              const owned = (kind === "skill" ? ownedSkills : ownedClaudeMds).has(item.slug);
              const authored = (kind === "skill" ? authoredSkills : authoredClaudeMds).has(item.slug);
              const compareChecked = compareSlugs.includes(item.slug);
              return (
                <MarketplaceCard
                  key={item.slug}
                  item={item}
                  kind={kind}
                  leader={item.rank === 1}
                  owned={owned}
                  authored={authored}
                  featured={featuredSlugs.has(item.slug)}
                  sponsored={sponsoredSlugs.has(item.slug)}
                  compareChecked={compareChecked}
                  onCompareToggle={() => toggleCompare(item.slug)}
                />
              );
            })}
          </div>
          {totalPages > 1 && (
            <Pagination
              page={safePage}
              totalPages={totalPages}
              onChange={(p) => navigate(buildParams({ page: p }))}
            />
          )}
        </>
      )}

      {/* Floating compare bar — visible when at least 1 item is selected */}
      {compareSlugs.length > 0 && (
        <CompareBar
          slugs={compareSlugs}
          kind={type === "skills" ? "skill" : "claude-md"}
          onClear={() => setCompareSlugs([])}
          onRemove={(slug) =>
            setCompareSlugs((prev) => prev.filter((s) => s !== slug))
          }
        />
      )}
    </div>
  );
}

function CompareBar({ slugs, kind, onClear, onRemove }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const canCompare = slugs.length === 2;
  const compareHref = canCompare
    ? `/compare?a=${encodeURIComponent(slugs[0])}&b=${encodeURIComponent(slugs[1])}&kind=${kind}`
    : "#";
  if (!mounted) return null;
  return createPortal(
    <div
      role="region"
      aria-label="Compare items"
      style={{
        position: "fixed",
        left: "50%",
        bottom: 24,
        transform: "translateX(-50%)",
        zIndex: 9998,
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "14px 18px",
        background: "var(--fg)",
        color: "var(--bg)",
        boxShadow: "0 12px 40px -8px rgba(20,18,14,0.5)",
        maxWidth: "calc(100% - 32px)",
        flexWrap: "wrap",
        animation: "vz-compare-bar-in .25s ease-out",
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "rgba(242,238,230,0.6)",
        }}
      >
        Compare · {slugs.length}/2
      </span>
      <span style={{ display: "inline-flex", gap: 6, flexWrap: "wrap" }}>
        {slugs.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onRemove(s)}
            title={`Remove ${s}`}
            style={{
              padding: "4px 10px",
              border: "1px solid rgba(242,238,230,0.3)",
              background: "transparent",
              color: "var(--bg)",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.04em",
              cursor: "pointer",
            }}
          >
            {s} ✕
          </button>
        ))}
      </span>
      <Link
        href={compareHref}
        aria-disabled={!canCompare}
        onClick={(e) => {
          if (!canCompare) e.preventDefault();
        }}
        style={{
          padding: "8px 16px",
          background: canCompare ? "var(--accent)" : "rgba(242,238,230,0.1)",
          color: canCompare ? "var(--bg)" : "rgba(242,238,230,0.4)",
          fontFamily: "var(--font-sans)",
          fontSize: 13,
          fontWeight: 500,
          textDecoration: "none",
          cursor: canCompare ? "pointer" : "not-allowed",
        }}
      >
        Compare → {canCompare ? "" : `pick ${2 - slugs.length} more`}
      </Link>
      <button
        type="button"
        onClick={onClear}
        style={{
          padding: "8px 12px",
          background: "transparent",
          border: "1px solid rgba(242,238,230,0.2)",
          color: "rgba(242,238,230,0.7)",
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          letterSpacing: "0.06em",
          cursor: "pointer",
        }}
      >
        Clear
      </button>
    </div>,
    document.body
  );
}

function Pagination({ page, totalPages, onChange }) {
  const prev = () => onChange(Math.max(1, page - 1));
  const next = () => onChange(Math.min(totalPages, page + 1));
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: 12,
        marginTop: 24,
        fontFamily: "var(--font-mono)",
        fontSize: 12,
        color: "var(--fg-muted)",
        letterSpacing: "0.06em",
      }}
    >
      <button
        type="button"
        onClick={prev}
        disabled={page === 1}
        style={{
          padding: "8px 14px",
          border: "1px solid var(--rule)",
          background: "transparent",
          color: page === 1 ? "var(--fg-muted)" : "var(--fg)",
          cursor: page === 1 ? "not-allowed" : "pointer",
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          letterSpacing: "0.06em",
        }}
      >
        ← PREV
      </button>
      <span style={{ minWidth: 80, textAlign: "center" }}>
        {page} / {totalPages}
      </span>
      <button
        type="button"
        onClick={next}
        disabled={page === totalPages}
        style={{
          padding: "8px 14px",
          border: "1px solid var(--rule)",
          background: "transparent",
          color: page === totalPages ? "var(--fg-muted)" : "var(--fg)",
          cursor: page === totalPages ? "not-allowed" : "pointer",
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          letterSpacing: "0.06em",
        }}
      >
        NEXT →
      </button>
    </div>
  );
}

function CompactSelect({ label, value, onChange, options }) {
  const active = options[0] && value !== options[0].id;
  return (
    <label
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        color: "var(--fg-muted)",
        letterSpacing: "0.06em",
      }}
    >
      <span>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: "5px 8px",
          border: `1px solid ${active ? "var(--accent)" : "var(--rule)"}`,
          background: active ? "var(--accent-soft)" : "var(--bg)",
          color: active ? "var(--accent)" : "var(--fg)",
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          letterSpacing: "0.06em",
          cursor: "pointer",
          minWidth: 100,
        }}
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}

function TopicAdder({ topTopics, currentTopics, onAdd }) {
  const [val, setVal] = useState("");
  const [open, setOpen] = useState(false);
  const datalistId = "topic-adder-suggestions";
  const submit = () => {
    const v = val.trim().toLowerCase();
    if (v) onAdd(v);
    setVal("");
    setOpen(false);
  };
  return (
    <label
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        color: "var(--fg-muted)",
        letterSpacing: "0.06em",
      }}
    >
      <span>Topic</span>
      <input
        type="text"
        list={datalistId}
        value={val}
        placeholder="+ add…"
        onChange={(e) => setVal(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); submit(); }
          if (e.key === "Escape") { setVal(""); setOpen(false); }
        }}
        style={{
          padding: "5px 8px",
          width: 96,
          border: `1px solid ${val ? "var(--accent)" : "var(--rule)"}`,
          background: "var(--bg)",
          color: "var(--fg)",
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          letterSpacing: "0.04em",
        }}
      />
      <datalist id={datalistId}>
        {(topTopics || [])
          .filter((t) => !currentTopics.includes(t.id))
          .slice(0, 20)
          .map((t) => (
            <option key={t.id} value={t.id}>{t.count}</option>
          ))}
      </datalist>
    </label>
  );
}

function FilterChip({ label, onRemove }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 4px 4px 10px",
        background: "var(--accent-soft)",
        border: "1px solid var(--accent)",
        color: "var(--accent)",
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        letterSpacing: "0.06em",
      }}
    >
      <span>{label}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove filter: ${label}`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 16,
          height: 16,
          padding: 0,
          background: "transparent",
          border: "none",
          color: "var(--accent)",
          cursor: "pointer",
          fontSize: 14,
          lineHeight: 1,
        }}
      >
        ×
      </button>
    </span>
  );
}

function FilterGroup({ label, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          color: "var(--fg-muted)",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{children}</div>
    </div>
  );
}

function PillBtn({ label, count, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-active={active ? "true" : undefined}
      className="vz-pill-btn"
    >
      {label}
      {count != null && <span style={{ opacity: 0.6 }}>{count}</span>}
    </button>
  );
}
