-- 0017 — allow 'partial' status on cycles for the mid-run budget guardrail.
--
-- When `npm run bench` halts mid-run because BENCH_BUDGET_USD has been
-- crossed, we mark the cycle 'partial' (not 'completed' nor 'failed') so
-- /admin/cycles can surface the state and the operator can re-run with a
-- higher budget to finish the remaining outputs.

alter table cycles drop constraint if exists cycles_status_check;
alter table cycles
  add constraint cycles_status_check
  check (
    status = any (
      array['queued'::text, 'running'::text, 'completed'::text, 'failed'::text, 'partial'::text]
    )
  );
