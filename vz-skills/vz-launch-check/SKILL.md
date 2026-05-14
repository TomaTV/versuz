---
name: vz-launch-check
description: Verify a Versuz deployment is ready for production launch. Checks env vars, DNS resolution, Stripe webhook configuration, Supabase RLS policies, OAuth callbacks, sitemap validity, and cron jobs. Outputs a categorised pass/fail report with exact remediation steps for each failure. Use the day before going live, or after any DNS / Stripe / Supabase config change.
tools: ["bash", "read", "web_fetch"]
model: claude-opus-4-7
license: Versuz Featured
---

# vz-launch-check

Pre-flight checklist for "I'm about to flip versuz.dev live, what did I forget?"

## When to use

- **J-1 before launch** : you bought the domain, set up DNS, configured Stripe live, but you want a sanity-check before flipping the redirect from `localhost:3000`.
- **After config drift** : someone (or auto-rotate) changed an env var, a Stripe webhook secret expired, a DNS record was updated. Re-run to confirm nothing broke.
- **Post-incident** : after fixing a prod issue, verify the fix didn't regress something else.

## When NOT to use

- For continuous monitoring (use the `/status` page + a real uptime monitor like Pingdom).
- For load testing (use k6 / artillery).
- To debug a specific failure (use the matching focused skill : `vz-bench-debug`, `vz-stripe-connect`).

## What it checks

The skill walks 6 categories in order, halts on any **HARD** failure, warns on **SOFT** failures.

### 1. Environment variables (HARD)

Compares `.env.production` (Vercel scope) against the required set :

```
NEXT_PUBLIC_SITE_URL=https://versuz.dev
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
STRIPE_SECRET_KEY (must start sk_live_)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY (must start pk_live_)
STRIPE_WEBHOOK_SECRET
CRON_SECRET
ADMIN_GITHUB_LOGINS
ADMIN_GITHUB_IDS
BENCH_MODE
OPENROUTER_API_KEY (or per-provider equivalents)
GITHUB_TOKEN
```

Reports : present / missing / wrong-prefix (sk_test_ instead of sk_live_).

### 2. DNS + SSL (HARD)

- `dig versuz.dev` returns 76.76.21.21 (Vercel apex)
- `dig www.versuz.dev` returns cname.vercel-dns.com
- `curl -I https://versuz.dev` returns 200 + valid Let's Encrypt cert
- `curl -I https://www.versuz.dev` returns 301 redirect to apex

### 3. Stripe live config (HARD)

- `stripe accounts retrieve` confirms account is in live mode
- Webhook endpoint `https://versuz.dev/api/webhooks/stripe` is registered
- Webhook listens to all 6 required events :
  `checkout.session.completed`, `account.updated`, `payment_intent.payment_failed`,
  `charge.refunded`, `charge.dispute.created`, `charge.dispute.closed`
- Connect is enabled (Express + Marketplace business model)

### 4. Supabase prod config (HARD)

- Auth Site URL = `https://versuz.dev` (not localhost)
- Redirect URLs include `https://versuz.dev/auth/callback`
- RLS policies on `purchases`, `cli_submissions`, `profiles` are enabled (not `permissive: true` to public)
- Storage bucket `premium-content` is private
- All migrations 0001-0041 applied

### 5. OAuth GitHub (HARD)

- Homepage URL = `https://versuz.dev`
- Authorization callback URL = `https://kbtiblzfbtvoepfgeiue.supabase.co/auth/v1/callback`

### 6. SEO + crons (SOFT)

- `https://versuz.dev/sitemap.xml` returns valid XML
- `https://versuz.dev/robots.txt` returns 200
- Vercel Crons tab shows all jobs from `vercel.json`
- `CRON_SECRET` matches what code expects (sample one cron URL → 200, not 401)

## Output format

Markdown report :

```
# Versuz launch check — 2026-05-13 14:30 UTC

## ✅ PASSED (4 / 6)
- env vars
- DNS + SSL
- Stripe live
- OAuth GitHub

## ❌ FAILED (1 hard)
- Supabase Auth Site URL still = localhost:3000
  Fix : Supabase dashboard → Auth → Site URL → "https://versuz.dev"
  Then redeploy on Vercel (env var change is enough, no code change).

## ⚠ WARN (1 soft)
- Sitemap missing rss feed entries
  Fix : check that `/api/feed/skills.xml` is reachable (currently 404)
  Severity : low — Google still indexes via /sitemap.xml
```

## Implementation notes

The skill should :
1. Read `.env.local` first to know what's expected (test env)
2. Probe Vercel env via `vercel env ls` if available
3. Do all HTTP probes from the user's machine (not from inside Vercel) so cold-DNS issues show up
4. Time-out each probe at 5s, never block more than 90s total
5. Output the report to STDOUT + write a copy to `launch-check-<timestamp>.md`

## Related skills

- `vz-stripe-connect` for deep Stripe-specific debug
- `vz-bench-debug` for bench engine specifically
- `vz-sql-migrate` for migration application
