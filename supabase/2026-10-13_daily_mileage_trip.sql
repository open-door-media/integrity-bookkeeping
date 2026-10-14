-- ═════════════════════════════════════════════════════════════════════════════
-- Daily mileage: trip-in-progress flag — 2026-10-13
-- ADDITIVE ONLY: adds one column to mileage_days (the new table from
-- 2026-10-13_daily_mileage.sql). No other table is touched. Safe to re-run.
--
-- trip_active = true while Kevin has pressed "Start Trip" and not yet "End Trip",
-- so the app remembers an unfinished trip after it is closed and reopened.
--
-- Run in: Supabase Dashboard → SQL Editor → paste → Run.
-- ═════════════════════════════════════════════════════════════════════════════

alter table mileage_days
  add column if not exists trip_active boolean not null default false;

-- ─── Verify (read-only; run separately after the above) ──────────────────────
-- select column_name, data_type, column_default
--   from information_schema.columns
--   where table_name = 'mileage_days' and column_name = 'trip_active';   -- expect 1 row
-- select count(*) from mileage_entries;   -- expect the same number as before

-- ─── ROLLBACK ────────────────────────────────────────────────────────────────
-- alter table mileage_days drop column if exists trip_active;
