-- ═════════════════════════════════════════════════════════════════════════════
-- Daily labor log migration — 2026-10-13
-- ADDITIVE ONLY: creates two new tables. Does not alter or read any existing
-- table (labor_entries, clients, employees, ... are untouched). Safe to re-run.
--
-- Job hours will still land in labor_entries exactly as today. These tables hold
-- (a) each person's hours for the day + how they were split, and (b) the non-job
-- "General" labor pool.
--
-- employee_id is the same id the job screens use as snap_id: 'kevin' for Kevin,
-- otherwise the employee's id (as text).
--
-- Run in: Supabase Dashboard → SQL Editor → paste → Run.
-- Rollback: see the bottom of this file.
-- ═════════════════════════════════════════════════════════════════════════════

-- ─── 1. labor_days — one row per person per date ─────────────────────────────
-- date is text 'YYYY-MM-DD' to match labor_entries.date.
-- allocations: the split as entered, e.g. [{ "clientId": "123", "hours": 4.5 }]
--   (General is the remainder, not stored here)
-- submitted_allocations: the split as of the last submit, so a re-submit can zero
--   out a job that was later taken off the day.
create table if not exists labor_days (
  date                  text        not null,
  employee_id           text        not null,
  hours                 numeric     not null default 0,
  status                text        not null default 'draft',   -- 'draft' | 'submitted'
  allocations           jsonb       not null default '[]',
  submitted_allocations jsonb       not null default '[]',
  general_purpose       text        not null default '',
  submitted_at          timestamptz,
  updated_at            timestamptz not null default now(),
  primary key (date, employee_id)
);

-- ─── 2. general_labor — the non-job pool ─────────────────────────────────────
-- One row per person per date. rate is saved at submit time so a later change to
-- someone's hourly rate never rewrites past pay. Null for Kevin (owner, unpaid).
create table if not exists general_labor (
  id           bigint      primary key,
  date         text        not null,
  employee_id  text        not null,
  hours        numeric     not null default 0,
  rate         numeric,
  purpose      text        not null default '',
  updated_at   timestamptz not null default now()
);

create index if not exists general_labor_date_idx on general_labor (date);

-- ─── 3. Realtime ─────────────────────────────────────────────────────────────
alter table labor_days     replica identity full;
alter table general_labor  replica identity full;

do $$
declare t text;
begin
  foreach t in array array['labor_days', 'general_labor'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table %I', t);
    end if;
  end loop;
end $$;

-- ─── 4. Access (same pattern as the mileage tables) ──────────────────────────
alter table labor_days    enable row level security;
alter table general_labor enable row level security;

drop policy if exists "labor_days_app_access"    on labor_days;
drop policy if exists "general_labor_app_access" on general_labor;

create policy "labor_days_app_access"
  on labor_days for all to anon, authenticated using (true) with check (true);

create policy "general_labor_app_access"
  on general_labor for all to anon, authenticated using (true) with check (true);

-- ─── 5. Verify (read-only; run separately after the above) ───────────────────
-- select count(*) from labor_days;       -- expect 0
-- select count(*) from general_labor;    -- expect 0
-- select count(*) from labor_entries;    -- expect the same number as before
-- select tablename from pg_publication_tables
--   where pubname = 'supabase_realtime' and tablename in ('labor_days','general_labor');  -- 2 rows
-- select tablename, policyname from pg_policies
--   where tablename in ('labor_days','general_labor');                                    -- 2 rows

-- ─── ROLLBACK (removes only what this file created) ──────────────────────────
-- drop table if exists general_labor;
-- drop table if exists labor_days;
-- (labor_entries is never touched by this file, so nothing to restore there.)
