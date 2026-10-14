-- ═════════════════════════════════════════════════════════════════════════════
-- Leads RLS policy — 2026-10-13
-- Touches ONLY the `leads` table. Keeps RLS enabled and adds a policy so the
-- apps (which connect as role `anon`, no user sign-in) can read/write leads.
-- Safe to re-run. Rollback at the bottom.
-- ═════════════════════════════════════════════════════════════════════════════

alter table leads enable row level security;   -- already on; stated explicitly

drop policy if exists "leads_app_access" on leads;

create policy "leads_app_access"
  on leads
  for all                              -- select, insert, update, delete
  to anon, authenticated               -- 'authenticated' so future sign-in keeps working
  using (true)
  with check (true);

-- Realtime respects RLS, so the select side of this policy is also what lets
-- live lead changes reach the apps.

-- ─── Verify (read-only, run separately) ──────────────────────────────────────
-- select policyname, roles, cmd from pg_policies where tablename = 'leads';
--   expect: leads_app_access | {anon,authenticated} | ALL

-- ─── ROLLBACK ────────────────────────────────────────────────────────────────
-- drop policy if exists "leads_app_access" on leads;
-- (RLS stays on, so leads become inaccessible to the apps again — the state you have now.)
