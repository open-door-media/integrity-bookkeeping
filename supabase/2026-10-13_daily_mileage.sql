-- ═════════════════════════════════════════════════════════════════════════════
-- Daily mileage log migration — 2026-10-13
-- ADDITIVE ONLY: creates two new tables. Does not alter or read any existing
-- table (mileage_entries, clients, ... are untouched). Safe to re-run.
--
-- Job miles still land in mileage_entries exactly as today. These tables hold
-- (a) the day's total + odometer + the split, and (b) the non-job "General" pool.
--
-- Run in: Supabase Dashboard → SQL Editor → paste → Run.
-- Rollback: see the bottom of this file.
-- ═════════════════════════════════════════════════════════════════════════════

-- ─── 1. mileage_days — one row per date (Step 1 + saved split) ───────────────
-- date is text 'YYYY-MM-DD' to match mileage_entries.date.
-- allocations is the split as entered, so a submitted day can be reopened:
--   [{ "clientId": "123", "miles": 85 }, ...]   (General is the remainder, not stored here)
create table if not exists mileage_days (
  date            text        primary key,
  odometer_start  numeric,                              -- null when miles typed manually
  odometer_end    numeric,
  total_miles     numeric     not null default 0,
  status          text        not null default 'draft', -- 'draft' | 'submitted'
  allocations     jsonb       not null default '[]',
  submitted_at    timestamptz,
  updated_at      timestamptz not null default now()
);

-- ─── 2. general_mileage — the non-job pool ───────────────────────────────────
-- Multiple rows per day allowed (one per purpose). Ids use the same scheme as
-- clients/leads (Date.now() + random, bigint).
create table if not exists general_mileage (
  id          bigint      primary key,
  date        text        not null,
  miles       numeric     not null default 0,
  purpose     text        not null default '',          -- pilot: free-text label, optional
  updated_at  timestamptz not null default now()
);

create index if not exists general_mileage_date_idx on general_mileage (date);

-- ─── 3. Realtime ─────────────────────────────────────────────────────────────
alter table mileage_days     replica identity full;
alter table general_mileage  replica identity full;

do $$
declare t text;
begin
  foreach t in array array['mileage_days', 'general_mileage'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table %I', t);
    end if;
  end loop;
end $$;

-- ─── 4. Access (same pattern as leads_rls) ───────────────────────────────────
alter table mileage_days    enable row level security;
alter table general_mileage enable row level security;

drop policy if exists "mileage_days_app_access"    on mileage_days;
drop policy if exists "general_mileage_app_access" on general_mileage;

create policy "mileage_days_app_access"
  on mileage_days for all to anon, authenticated using (true) with check (true);

create policy "general_mileage_app_access"
  on general_mileage for all to anon, authenticated using (true) with check (true);

-- ─── 5. Verify (read-only; run separately after the above) ───────────────────
-- select count(*) from mileage_days;       -- expect 0
-- select count(*) from general_mileage;    -- expect 0
-- select count(*) from mileage_entries;    -- expect the same number as before
-- select tablename from pg_publication_tables
--   where pubname = 'supabase_realtime' and tablename in ('mileage_days','general_mileage');  -- 2 rows
-- select tablename, policyname from pg_policies
--   where tablename in ('mileage_days','general_mileage');                                    -- 2 rows

-- ─── ROLLBACK (removes only what this file created) ──────────────────────────
-- drop table if exists general_mileage;
-- drop table if exists mileage_days;
-- (mileage_entries is never touched by this file, so nothing to restore there.
--  Note: miles already submitted INTO mileage_entries by the app stay there.)
