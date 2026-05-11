import { z } from "zod";

const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20).optional(),
  GITHUB_TOKEN: z.string().min(20).optional(),
  GOOGLE_AI_STUDIO_KEY: z.string().min(20).optional(),
  GROQ_API_KEY: z.string().min(20).optional(),
  MISTRAL_API_KEY: z.string().min(20).optional(),
  ANTHROPIC_API_KEY: z.string().min(20).optional(),
  OPENAI_API_KEY: z.string().min(20).optional(),
  DEEPSEEK_API_KEY: z.string().min(20).optional(),
  OPENROUTER_API_KEY: z.string().min(20).optional(),
  BENCH_MODE: z.enum(["dev", "v1", "v1-thrift", "or-v1", "or-thrift", "prod", "gold"]).optional(),
  BENCH_JUDGE_COUNT: z.string().optional(),
  ADMIN_GITHUB_LOGINS: z.string().optional(),
  ADMIN_GITHUB_IDS: z.string().optional(),
  CRON_SECRET: z.string().min(16).optional(),
});

// Empty strings in .env.local should be treated as missing — otherwise zod
// fails the min(20) check and the whole env collapses to {}.
function nonEmpty(v) {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

const parsed = schema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: nonEmpty(process.env.NEXT_PUBLIC_SUPABASE_URL),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: nonEmpty(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  SUPABASE_SERVICE_ROLE_KEY: nonEmpty(process.env.SUPABASE_SERVICE_ROLE_KEY),
  GITHUB_TOKEN: nonEmpty(process.env.GITHUB_TOKEN),
  GOOGLE_AI_STUDIO_KEY: nonEmpty(process.env.GOOGLE_AI_STUDIO_KEY),
  GROQ_API_KEY: nonEmpty(process.env.GROQ_API_KEY),
  MISTRAL_API_KEY: nonEmpty(process.env.MISTRAL_API_KEY),
  ANTHROPIC_API_KEY: nonEmpty(process.env.ANTHROPIC_API_KEY),
  OPENAI_API_KEY: nonEmpty(process.env.OPENAI_API_KEY),
  DEEPSEEK_API_KEY: nonEmpty(process.env.DEEPSEEK_API_KEY),
  OPENROUTER_API_KEY: nonEmpty(process.env.OPENROUTER_API_KEY),
  BENCH_MODE: nonEmpty(process.env.BENCH_MODE),
  BENCH_JUDGE_COUNT: nonEmpty(process.env.BENCH_JUDGE_COUNT),
  ADMIN_GITHUB_LOGINS: nonEmpty(process.env.ADMIN_GITHUB_LOGINS),
  ADMIN_GITHUB_IDS: nonEmpty(process.env.ADMIN_GITHUB_IDS),
  CRON_SECRET: nonEmpty(process.env.CRON_SECRET),
});

if (!parsed.success) {
  console.warn("[versuz] env validation issues:", parsed.error.flatten());
}

export const env = parsed.success ? parsed.data : {};
