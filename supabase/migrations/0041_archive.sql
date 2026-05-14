-- 0041 — archive flag pour cacher items broken / déclarés inutiles
--
-- Décision UX (V1.5) : on garde TOUT afficher dans /marketplace par défaut
-- (la pagination scale à 100k+ items grâce aux indexes 0037). MAIS certains
-- items évidemment broken doivent être cachés du marketplace + sitemap +
-- leaderboard :
--   - near-duplicates détectés par desc_hash (script dedup-descriptions.mjs)
--   - items spam / inappropriés (action admin)
--   - items dont le scrape a renvoyé du contenu corrupted
--
-- `is_archived` est PAS auto-flagged sur des heuristiques quality < X / stars
-- < Y. Un item à 0 star peut être génial. Seul l'admin OU le script dedup
-- met le flag.

ALTER TABLE skills            ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false;
ALTER TABLE claude_md_files   ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false;

-- Index partiel : la majorité des rows ne sera jamais archivée, l'index
-- partiel WHERE is_archived=false est tiny et accélère le filter par défaut.
CREATE INDEX IF NOT EXISTS skills_not_archived_idx
  ON skills (id) WHERE is_archived = false;
CREATE INDEX IF NOT EXISTS claude_md_files_not_archived_idx
  ON claude_md_files (id) WHERE is_archived = false;

ANALYZE skills;
ANALYZE claude_md_files;
