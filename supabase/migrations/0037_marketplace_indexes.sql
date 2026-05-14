-- 0037 — marketplace indexes for scale at 100k+ items
--
-- Pré-2026-05 le marketplace + landing chargent ~20k rows en RAM via
-- liveSkills() / liveClaudeMds() chunked fetch (chunks de 1000). À 100k
-- items, GET / met 43s en dev. Solution : refactor en pagination serveur
-- (range + count exact) + indexes composites pour que le `ORDER BY ...
-- LIMIT 50` soit un Index Scan, pas un Seq Scan + sort.
--
-- IMPORTANT : tous les indexes sont CREATE INDEX IF NOT EXISTS pour être
-- idempotents. Si tu re-run la migration aucun effet.

-- ─────────── skills ───────────

-- Sort default marketplace : promoted_until DESC NULLS LAST, verification_level DESC, github_stars DESC
CREATE INDEX IF NOT EXISTS skills_marketplace_default_idx
  ON skills (promoted_until DESC NULLS LAST, verification_level DESC, github_stars DESC NULLS LAST);

-- Sort par stars seul (?sort=stars)
CREATE INDEX IF NOT EXISTS skills_stars_idx
  ON skills (github_stars DESC NULLS LAST);

-- Sort par quality_score (?sort=quality) + leaderboard quality fallback
CREATE INDEX IF NOT EXISTS skills_quality_idx
  ON skills (quality_score DESC NULLS LAST, github_stars DESC NULLS LAST);

-- Filter combinés tier + verification_level (Refine panel)
CREATE INDEX IF NOT EXISTS skills_tier_verification_idx
  ON skills (tier, verification_level);

-- Filter par category (déjà existant probablement mais idempotent)
CREATE INDEX IF NOT EXISTS skills_category_idx
  ON skills (category);

-- Filter par source (Refine source pill, migration 0033 a déjà créé l'index
-- de base — celui-ci ajoute un composite avec stars pour les listes filtrées)
CREATE INDEX IF NOT EXISTS skills_source_stars_idx
  ON skills (source, github_stars DESC NULLS LAST);

-- Search ILIKE name/slug/description : trigram pour ILIKE %term% rapide
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS skills_name_trgm_idx
  ON skills USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS skills_slug_trgm_idx
  ON skills USING gin (slug gin_trgm_ops);
CREATE INDEX IF NOT EXISTS skills_description_trgm_idx
  ON skills USING gin (description gin_trgm_ops);

-- ─────────── claude_md_files ───────────

-- Sort default
CREATE INDEX IF NOT EXISTS claude_md_files_marketplace_default_idx
  ON claude_md_files (promoted_until DESC NULLS LAST, verification_level DESC, github_stars DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS claude_md_files_stars_idx
  ON claude_md_files (github_stars DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS claude_md_files_quality_idx
  ON claude_md_files (quality_score DESC NULLS LAST, github_stars DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS claude_md_files_tier_verification_idx
  ON claude_md_files (tier, verification_level);

CREATE INDEX IF NOT EXISTS claude_md_files_project_category_idx
  ON claude_md_files (project_category);

CREATE INDEX IF NOT EXISTS claude_md_files_source_stars_idx
  ON claude_md_files (source, github_stars DESC NULLS LAST);

-- word_count filter (tokens Small/Medium/Large + stub filter >= 40)
CREATE INDEX IF NOT EXISTS claude_md_files_word_count_idx
  ON claude_md_files (word_count);

CREATE INDEX IF NOT EXISTS claude_md_files_slug_trgm_idx
  ON claude_md_files USING gin (slug gin_trgm_ops);
CREATE INDEX IF NOT EXISTS claude_md_files_description_trgm_idx
  ON claude_md_files USING gin (description gin_trgm_ops);

-- ─────────── RPC for top topics by kind ───────────
-- Remplace le scan client-side de tous les items pour aggréger les topics.
-- Marche sur metadata->'topics' JSONB array. SECURITY DEFINER pour bypass RLS.

CREATE OR REPLACE FUNCTION top_topics_by_kind(p_kind text, p_limit int DEFAULT 12)
RETURNS TABLE(topic text, count bigint) AS $$
BEGIN
  IF p_kind = 'skill' THEN
    RETURN QUERY
      SELECT jsonb_array_elements_text(metadata->'topics') AS topic, COUNT(*) AS count
      FROM skills
      WHERE jsonb_typeof(metadata->'topics') = 'array'
      GROUP BY topic
      ORDER BY count DESC
      LIMIT p_limit;
  ELSE
    RETURN QUERY
      SELECT jsonb_array_elements_text(metadata->'topics') AS topic, COUNT(*) AS count
      FROM claude_md_files
      WHERE jsonb_typeof(metadata->'topics') = 'array'
        AND (word_count >= 40 OR word_count IS NULL)
      GROUP BY topic
      ORDER BY count DESC
      LIMIT p_limit;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────── RPC for top ranked skills (landing top 10) ───────────
-- Remplace getStandings(category).slice(0, 10) qui chargait 20k rows pour
-- en garder 10. Une seule query LIMIT 10 avec filter + sort indexed.

CREATE OR REPLACE FUNCTION top_ranked_skills_by_category(p_category text, p_limit int DEFAULT 10)
RETURNS SETOF skills AS $$
BEGIN
  RETURN QUERY
    SELECT * FROM skills
    WHERE category = p_category
    ORDER BY
      promoted_until DESC NULLS LAST,
      verification_level DESC,
      github_stars DESC NULLS LAST,
      name ASC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recalculer les stats après ajout d'indexes (sinon le planner ne sait pas
-- encore qu'ils existent).
ANALYZE skills;
ANALYZE claude_md_files;
