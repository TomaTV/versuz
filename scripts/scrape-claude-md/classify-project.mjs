/**
 * Project-type classifier.
 *
 * Inputs:
 *   - root file list (package.json, pyproject.toml, …)
 *   - CLAUDE.md content (mentions of stack)
 *   - GitHub-detected primary language
 *
 * Output: best-match project_category (must be one of the CHECK values in
 * supabase migration 0002).
 */

const FILE_SIGNALS = {
  nextjs: ["next.config.js", "next.config.mjs", "next.config.ts"],
  react: ["package.json"], // gated additionally on content keywords
  "python-data": ["requirements.txt", "pyproject.toml", "environment.yml"],
  "backend-api": ["package.json", "go.mod", "Cargo.toml", "pyproject.toml"],
  mobile: ["pubspec.yaml", "ios", "android", "Podfile", "App.tsx"],
  devops: ["Dockerfile", "docker-compose.yml", ".github", "terraform"],
  "ml-training": ["notebooks", "train.py", "configs", "wandb"],
};

const KEYWORD_SIGNALS = {
  nextjs: ["next.js", "next 16", "app router", "server components", "next/font"],
  react: ["react", "jsx", "tsx", "hooks", "useState", "useEffect"],
  "python-data": ["pandas", "numpy", "polars", "duckdb", "jupyter", "notebooks"],
  "backend-api": ["fastapi", "express", "nestjs", "django", "rails", "graphql", "rest", "api endpoints"],
  mobile: ["react native", "flutter", "swift", "kotlin", "expo", "swiftui"],
  devops: ["dockerfile", "kubernetes", "terraform", "ansible", "ci/cd", "github actions"],
  "ml-training": ["pytorch", "tensorflow", "training loop", "huggingface", "wandb", "fine-tune"],
};

const FILE_WEIGHT = 2;
const KEYWORD_WEIGHT = 1;
const LANGUAGE_BONUS = {
  nextjs: { TypeScript: 1, JavaScript: 1 },
  react: { TypeScript: 1, JavaScript: 1 },
  "python-data": { Python: 2 },
  "backend-api": { TypeScript: 0.5, Python: 0.5, Go: 1, Rust: 1, Ruby: 1 },
  mobile: { Swift: 2, Kotlin: 2, Dart: 2 },
  devops: { HCL: 2, Shell: 1 },
  "ml-training": { Python: 2 },
};

export function classifyProject({ rootFiles = [], content = "", language = null }) {
  const rootNames = rootFiles.map((f) => f.name?.toLowerCase() || "").filter(Boolean);
  const haystack = String(content).toLowerCase();

  const scores = {};
  for (const cat of Object.keys(FILE_SIGNALS)) {
    let score = 0;
    // file signals
    for (const sig of FILE_SIGNALS[cat]) {
      if (rootNames.includes(sig.toLowerCase())) score += FILE_WEIGHT;
    }
    // keyword signals
    for (const kw of KEYWORD_SIGNALS[cat] || []) {
      if (haystack.includes(kw)) score += KEYWORD_WEIGHT;
    }
    // language bonus
    if (language && LANGUAGE_BONUS[cat]?.[language]) {
      score += LANGUAGE_BONUS[cat][language];
    }
    scores[cat] = score;
  }

  // tie-break: nextjs > react when both fire (nextjs is more specific)
  if (scores.nextjs > 0 && scores.react > 0) {
    scores.react = scores.react * 0.6;
  }

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [topCat, topScore] = sorted[0];
  const runnerUp = sorted[1]?.[1] || 0;

  if (topScore < 1) return { id: "generic", confidence: 0.3 };

  const confidence = Math.max(
    0.4,
    Math.min(1, topScore / Math.max(topScore + runnerUp, 1))
  );
  return { id: topCat, confidence };
}
