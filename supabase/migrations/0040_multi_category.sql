-- 0040 — multi-catégorie via JSONB array.
--
-- Avant : chaque skill / claude_md_files a UNE category. Beaucoup d'items
-- légitiments touchent 2-3 domaines (un skill MCP qui parse aussi des PDFs,
-- un CLAUDE.md Next.js qui est aussi mobile-friendly via Capacitor) →
-- placés arbitrairement dans la "primary" cat, perdus dans les autres.
--
-- Après : colonne `categories jsonb[]` additionnelle. La colonne `category`
-- existante reste = bucket "primary" (rétro-compat, pas de breaking change
-- côté queries existantes). `categories` contient TOUTES les cats matchées
-- (y compris la primary), ordonnées par score classifier desc.
--
-- Le classifier (v3) retourne maintenant un array trié. Tous les buckets
-- dont le score atteint >= 50% du leader rentrent dans `categories`.
--
-- Nouveaux buckets ajoutés au CHECK constraint :
--   - claude-skill : skill spécifiquement pour Claude Code (vs générique)
--   - codex       : OpenAI Codex CLI (AGENTS.md style)
--   - cursor-rule : .cursorrules / .cursor/rules/*.md
--   - windsurf-rule : .windsurfrules
--   - antigravity : agentic coding agent
--   - mcp-server  : Model Context Protocol server doc
--   - continue-rule : continue.dev rules
--   - roo-code    : Roo-Code (VS Code agent fork)
--   - cline       : Cline (VS Code agent)

ALTER TABLE skills            ADD COLUMN IF NOT EXISTS categories jsonb DEFAULT '[]'::jsonb;
ALTER TABLE claude_md_files   ADD COLUMN IF NOT EXISTS categories jsonb DEFAULT '[]'::jsonb;

-- GIN indexes pour le filter `categories @> '["mcp-server"]'::jsonb`
CREATE INDEX IF NOT EXISTS skills_categories_gin
  ON skills USING gin (categories);
CREATE INDEX IF NOT EXISTS claude_md_files_categories_gin
  ON claude_md_files USING gin (categories);

-- Étendre le CHECK constraint pour les nouveaux buckets primary.
ALTER TABLE skills DROP CONSTRAINT IF EXISTS skills_category_check;
ALTER TABLE skills
  ADD CONSTRAINT skills_category_check CHECK (category IN (
    'document', 'sql', 'data', 'web', 'shell', 'code', 'other',
    'claude-skill', 'codex', 'cursor-rule', 'windsurf-rule',
    'antigravity', 'mcp-server', 'continue-rule', 'roo-code', 'cline'
  ));

-- CLAUDE.md project_category : ajout des buckets agent-spécifiques.
ALTER TABLE claude_md_files DROP CONSTRAINT IF EXISTS claude_md_files_project_category_check;
ALTER TABLE claude_md_files
  ADD CONSTRAINT claude_md_files_project_category_check CHECK (project_category IN (
    'nextjs', 'react', 'python-data', 'backend-api', 'mobile', 'devops',
    'ml-training', 'generic', 'other',
    'claude-skill', 'codex', 'cursor-rule', 'windsurf-rule',
    'antigravity', 'mcp-server', 'continue-rule', 'roo-code', 'cline'
  ));

-- Backfill : par défaut, `categories` contient la primary category seule.
-- Le script `node scripts/reclassify-all.mjs` populate ensuite avec les
-- catégories secondaires détectées par le classifier v3.
UPDATE skills            SET categories = jsonb_build_array(category) WHERE categories = '[]'::jsonb AND category IS NOT NULL;
UPDATE claude_md_files   SET categories = jsonb_build_array(project_category) WHERE categories = '[]'::jsonb AND project_category IS NOT NULL;

ANALYZE skills;
ANALYZE claude_md_files;
