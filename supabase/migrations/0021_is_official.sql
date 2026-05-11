-- 0021_is_official.sql
--
-- Badge "Official" (independant de la trust ladder) : true quand l'org
-- GitHub fait partie d'une whitelist curated (anthropic, google, openai,
-- vercel, stripe, supabase, etc.). Auto-attribué au scrape, miroir SQL
-- de `src/lib/official-orgs.js`.

ALTER TABLE skills           ADD COLUMN IF NOT EXISTS is_official BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE claude_md_files  ADD COLUMN IF NOT EXISTS is_official BOOLEAN NOT NULL DEFAULT FALSE;

-- Index partiel : ne stocke que les rows is_official=true (rare, <1% du registry)
CREATE INDEX IF NOT EXISTS idx_skills_is_official          ON skills(is_official)          WHERE is_official = TRUE;
CREATE INDEX IF NOT EXISTS idx_claude_md_files_is_official ON claude_md_files(is_official) WHERE is_official = TRUE;

-- Backfill : flag les rows existants dont metadata.owner match la whitelist.
-- IMPORTANT : si tu mets à jour `src/lib/official-orgs.js`, ajoute aussi
-- l'org ici (ou re-exécute le backfill via /admin).
WITH official AS (
  SELECT LOWER(owner) AS owner FROM (VALUES
    ('anthropics'), ('anthropic'),
    ('openai'),
    ('google'), ('google-deepmind'), ('googleapis'), ('google-research'), ('google-gemini'),
    ('meta-llama'), ('huggingface'), ('mistralai'), ('deepseek-ai'), ('xai-org'),
    ('microsoft'), ('azure'), ('aws'), ('amazon'),
    ('vercel'), ('cloudflare'), ('supabase'), ('stripe'), ('github'),
    ('mongodb'), ('redis'), ('elastic'),
    ('docker'), ('kubernetes'),
    ('pytorch'), ('tensorflow'),
    ('facebook'), ('apple')
  ) AS t(owner)
)
UPDATE skills SET is_official = TRUE
WHERE LOWER(metadata->>'owner') IN (SELECT owner FROM official);

WITH official AS (
  SELECT LOWER(owner) AS owner FROM (VALUES
    ('anthropics'), ('anthropic'),
    ('openai'),
    ('google'), ('google-deepmind'), ('googleapis'), ('google-research'), ('google-gemini'),
    ('meta-llama'), ('huggingface'), ('mistralai'), ('deepseek-ai'), ('xai-org'),
    ('microsoft'), ('azure'), ('aws'), ('amazon'),
    ('vercel'), ('cloudflare'), ('supabase'), ('stripe'), ('github'),
    ('mongodb'), ('redis'), ('elastic'),
    ('docker'), ('kubernetes'),
    ('pytorch'), ('tensorflow'),
    ('facebook'), ('apple')
  ) AS t(owner)
)
UPDATE claude_md_files SET is_official = TRUE
WHERE LOWER(metadata->>'owner') IN (SELECT owner FROM official);
