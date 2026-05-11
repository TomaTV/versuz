// Versuz mock data

const SKILLS = [
  { id: 'pdf-extract', name: 'pdf-extract', author: 'anthropic-skills', category: 'Document', rank: 1, elo: 1487, delta: 12, installs: 24300, runs: 18420, winRate: 0.72 },
  { id: 'sql-genie', name: 'sql-genie', author: 'tinybird/skills', category: 'SQL', rank: 2, elo: 1471, delta: 8, installs: 19800, runs: 16210, winRate: 0.69 },
  { id: 'csv-surgeon', name: 'csv-surgeon', author: 'k-marek', category: 'Data', rank: 3, elo: 1458, delta: -3, installs: 12400, runs: 9870, winRate: 0.65 },
  { id: 'web-scry', name: 'web-scry', author: 'browseros', category: 'Web', rank: 4, elo: 1442, delta: 4, installs: 8210, runs: 7102, winRate: 0.61 },
  { id: 'pdf-fast', name: 'pdf-fast', author: 'mistral-labs', category: 'Document', rank: 5, elo: 1433, delta: -1, installs: 6740, runs: 5103, winRate: 0.58 },
  { id: 'sql-eli5', name: 'sql-eli5', author: 'devraj', category: 'SQL', rank: 6, elo: 1419, delta: 6, installs: 5200, runs: 3984, winRate: 0.55 },
  { id: 'docx-rewrite', name: 'docx-rewrite', author: 'reclaim/openworks', category: 'Document', rank: 7, elo: 1404, delta: 2, installs: 4980, runs: 3611, winRate: 0.53 },
  { id: 'pandas-pal', name: 'pandas-pal', author: 'h-saunders', category: 'Data', rank: 8, elo: 1391, delta: -7, installs: 4200, runs: 3022, winRate: 0.49 },
  { id: 'shell-sage', name: 'shell-sage', author: 'fishshell-skills', category: 'Shell', rank: 9, elo: 1378, delta: 0, installs: 3950, runs: 2877, winRate: 0.47 },
  { id: 'pdf-ocr', name: 'pdf-ocr', author: 'tesseract-ai', category: 'Document', rank: 10, elo: 1361, delta: -4, installs: 3110, runs: 2455, winRate: 0.44 },
  { id: 'kbd-macro', name: 'kbd-macro', author: 'ergodox', category: 'Shell', rank: 11, elo: 1349, delta: 1, installs: 2880, runs: 2031, winRate: 0.42 },
  { id: 'jq-ninja', name: 'jq-ninja', author: 'unspecified', category: 'Data', rank: 12, elo: 1336, delta: -2, installs: 2440, runs: 1722, winRate: 0.39 },
];

const CATEGORIES = [
  { id: 'all', label: 'All', count: 247 },
  { id: 'document', label: 'Document', count: 38 },
  { id: 'sql', label: 'SQL', count: 22 },
  { id: 'data', label: 'Data', count: 41 },
  { id: 'web', label: 'Web', count: 19 },
  { id: 'shell', label: 'Shell', count: 14 },
  { id: 'code', label: 'Code', count: 67 },
];

const FEATURED_BATTLE = {
  a: {
    name: 'pdf-extract',
    author: 'anthropic-skills',
    score: 8.71,
    judges: [
      { name: 'Opus 4.7', score: 0.91 },
      { name: 'GPT-5', score: 0.84 },
      { name: 'Gemini 2.5', score: 0.78 },
    ],
  },
  b: {
    name: 'pdf-fast',
    author: 'mistral-labs',
    score: 6.42,
    judges: [
      { name: 'Opus 4.7', score: 0.62 },
      { name: 'GPT-5', score: 0.71 },
      { name: 'Gemini 2.5', score: 0.59 },
    ],
  },
  winner: 'a',
  rationale: {
    judge: 'Opus 4.7',
    text: 'pdf-extract preserved table structure across all 30 tasks. pdf-fast collapsed multi-column layouts on tasks 7, 14, and 22, and dropped footnote markers. Speed advantage did not offset structural loss.',
  },
};

// Skill detail mock
const SKILL_DETAIL = {
  id: 'pdf-extract',
  name: 'pdf-extract',
  author: 'anthropic-skills',
  category: 'Document',
  rank: 1,
  elo: 1487,
  elo7d: [1462, 1465, 1471, 1468, 1475, 1483, 1487],
  installs: 24300,
  runs: 18420,
  winRate: 0.72,
  battles: 184,
  github: 'github.com/anthropic-skills/pdf-extract',
  description: 'Extract text, tables, and structure from PDFs of any complexity. Handles multi-column layouts, footnotes, and form fields. Outputs clean markdown.',
  judges: [
    { name: 'Claude Opus 4.7', score: 0.91, weight: 0.34, verdict: 'Strong on structural fidelity. Preserved every column-break and footnote anchor across the 30-task suite. Slight degradation on rotated scans.', },
    { name: 'GPT-5', score: 0.84, weight: 0.33, verdict: 'Reliable extraction with consistent markdown output. Lost two header rows in tax-form task #19. Otherwise unblemished.' },
    { name: 'Gemini 2.5 Pro', score: 0.78, weight: 0.33, verdict: 'Handled OCR fallback gracefully but over-aggressive in dropping page numbers. Cleanup felt opinionated.' },
  ],
  taskScores: [
    { id: 1, name: 'extract-table-2col', score: 0.94, status: 'pass' },
    { id: 2, name: 'extract-table-merged', score: 0.88, status: 'pass' },
    { id: 3, name: 'multi-column-academic', score: 0.91, status: 'pass' },
    { id: 4, name: 'footnotes-preserve', score: 0.96, status: 'pass' },
    { id: 5, name: 'form-fields-flat', score: 0.79, status: 'pass' },
    { id: 6, name: 'form-fields-nested', score: 0.72, status: 'pass' },
    { id: 7, name: 'rotated-page-90', score: 0.58, status: 'partial' },
    { id: 8, name: 'rotated-page-270', score: 0.61, status: 'partial' },
    { id: 9, name: 'scanned-low-dpi', score: 0.34, status: 'fail' },
    { id: 10, name: 'scanned-mid-dpi', score: 0.81, status: 'pass' },
    { id: 11, name: 'tax-form-1040', score: 0.85, status: 'pass' },
    { id: 12, name: 'tax-form-w2', score: 0.92, status: 'pass' },
    { id: 13, name: 'invoice-en', score: 0.94, status: 'pass' },
    { id: 14, name: 'invoice-de', score: 0.87, status: 'pass' },
    { id: 15, name: 'invoice-jp', score: 0.71, status: 'pass' },
  ],
};

window.SKILLS = SKILLS;
window.CATEGORIES = CATEGORIES;
window.FEATURED_BATTLE = FEATURED_BATTLE;
window.SKILL_DETAIL = SKILL_DETAIL;
