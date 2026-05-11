---
name: vz-sql-migrate
description: Write production-safe Postgres migrations with explicit forward + rollback, lock-aware DDL, and idempotence checks. Catches the classic mistakes (NOT NULL on big tables, missing CONCURRENTLY, ALTER TYPE blocking writes) before they ship. Use when modifying a Postgres schema in production.
tools: ["bash", "read", "write"]
model: claude-opus-4-7
license: Versuz Featured
---

# vz-sql-migrate

A Postgres migration is a write operation under load. Forget that and you
ship 3 minutes of downtime. This skill writes migrations that survive
production traffic.

## When to use

- Modifying schema on a Postgres DB with active traffic
- Working in Supabase / Neon / RDS / self-hosted Postgres 13+
- The user says "add a column" or "change a type" — pause, then apply this

## When NOT to use

- Greenfield project with no data → just write the CREATE TABLE
- Read-only analytics replica → no concurrent writes to worry about

## The 8 lock-aware rules

Memorize these. They are non-negotiable in production.

| # | Operation | Locks | Safe pattern |
|---|---|---|---|
| 1 | `ADD COLUMN` (no default) | `ACCESS EXCLUSIVE`, instant | ✓ Always safe |
| 2 | `ADD COLUMN ... DEFAULT 'x'` | Locks while table rewrites | Postgres 11+ : safe (no rewrite). Older : split into 3 steps |
| 3 | `SET NOT NULL` | Full table scan under lock | Add CHECK NOT VALID first → VALIDATE → SET NOT NULL |
| 4 | `ALTER TYPE` (e.g. int→bigint) | Full rewrite, blocks writes | Add new col → backfill in batches → swap → drop old |
| 5 | `CREATE INDEX` | Blocks writes | Use `CREATE INDEX CONCURRENTLY` |
| 6 | `DROP INDEX` | `ACCESS EXCLUSIVE`, instant on small | Use `DROP INDEX CONCURRENTLY` for big indexes |
| 7 | `ADD FOREIGN KEY` | Locks both tables for validation | Use `NOT VALID` first, then `VALIDATE CONSTRAINT` later |
| 8 | `ADD UNIQUE CONSTRAINT` | Locks during validation | Build unique index `CONCURRENTLY` first → constraint inherits |

## Workflow

### Step 1 — Survey the table

```sql
select pg_size_pretty(pg_total_relation_size('schema.table')) as total_size,
       (select count(*) from schema.table) as rowcount;
```

If `rowcount > 1M` OR `total_size > 1GB` → assume locks matter.

### Step 2 — Write forward + rollback

Always pair them. If you can't roll back, you can't ship.

```sql
-- forward (file: 0042_add_user_archived.sql)
alter table users add column archived_at timestamptz;
create index concurrently if not exists idx_users_archived_at
  on users(archived_at) where archived_at is not null;

-- rollback (file: 0042_add_user_archived_rollback.sql)
drop index concurrently if exists idx_users_archived_at;
alter table users drop column if exists archived_at;
```

### Step 3 — Backfill in batches (for any data migration)

Never `update users set X = Y;` on > 100k rows. Use cursor-based batching :

```sql
do $$
declare
  done int := 0;
  batch int;
begin
  loop
    update users set archived_at = updated_at
    where id in (
      select id from users
      where archived_at is null and updated_at < '2025-01-01'
      limit 5000
    );
    get diagnostics batch = row_count;
    done := done + batch;
    raise notice 'backfilled % so far', done;
    exit when batch = 0;
    perform pg_sleep(0.2);   -- breathing room for replicas
  end loop;
end $$;
```

### Step 4 — Idempotence check

Migrations must be re-runnable. Use `IF NOT EXISTS` / `IF EXISTS` everywhere :

```sql
alter table users add column if not exists archived_at timestamptz;
create index if not exists idx_users_archived_at on users(archived_at);
create extension if not exists pgcrypto;
```

For things without `IF NOT EXISTS` (e.g. ALTER TYPE) wrap in a check :

```sql
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'users' and column_name = 'old_col'
      and data_type = 'bigint'
  ) then
    alter table users alter column old_col type bigint;
  end if;
end $$;
```

## Anti-patterns (NEVER do these in prod)

- `truncate` on a populated table — use `delete in batches` instead
- `alter table ... add column ... not null` in one statement on > 10k rows
- `create index` (without `concurrently`) on a busy table
- `drop column` without first deploying app code that stops reading it (zero-downtime needs 2 deploys)
- Mixing DDL and big DML in one transaction (locks held longer)

## RLS-specific (Supabase)

When adding RLS policies, deploy in this order :

1. Migration A : add policies BUT with `using (true)` (permissive)
2. Deploy app code that uses the new policies
3. Migration B : tighten the `using` clauses to the real predicates

This avoids the brief window where a policy exists but app code doesn't
respect it.

## Verification before shipping

```bash
# Lint with sqlfluff
sqlfluff lint --dialect postgres migration.sql

# Dry-run on a copy
psql -d staging_clone -f migration.sql

# Check lock pressure during dev test
psql -c "select * from pg_locks where granted = false"
```

## Output format

For each migration, return :

```
=== Forward ===
<SQL>

=== Rollback ===
<SQL>

=== Lock analysis ===
- ALTER TABLE ... ADD COLUMN : ACCESS EXCLUSIVE, instant (no rewrite, default is null)
- CREATE INDEX CONCURRENTLY : ShareUpdateExclusiveLock, allows reads/writes
- Estimated downtime : 0ms

=== Backfill plan ===
<empty if no data migration, else cursor-based batch script>

=== Pre-flight checklist ===
[ ] table size checked (`pg_total_relation_size`)
[ ] rollback tested on staging
[ ] no concurrent migrations in flight
[ ] app code already deployed if removing/renaming
```
