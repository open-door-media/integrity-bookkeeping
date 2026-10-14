-- ═════════════════════════════════════════════════════════════════════════════
-- Daily mileage: submit support — 2026-10-13
-- ADDITIVE ONLY: adds two columns to mileage_days (the new table from
-- 2026-10-13_daily_mileage.sql). No other table is touched. Safe to re-run.
--
-- submitted_allocations: the split as it was when last submitted. Lets a re-submit
--   zero out a job that was later taken off the day (otherwise its old miles would
--   stay in mileage_entries).
-- general_purpose: the optional "purpose" label for the day's General miles, so it
--   can be shown again if the day is reopened and re-submitted.
--
-- Run in: Supabase Dashboard → SQL Editor → paste → Run.
-- Run this BEFORE using the new app version: the app writes both columns on every save.
-- ═════════════════════════════════════════════════════════════════════════════

alter table mileage_days
  add column if not exists submitted_allocations jsonb not null default '[]',
  add column if not exists general_purpose       text  not null default '';

-- ─── Verify (read-only; run separately after the above) ──────────────────────
-- select column_name, data_type from information_schema.columns
--   where table_name = 'mileage_days'
--     and column_name in ('submitted_allocations', 'general_purpose');   -- expect 2 rows
-- select count(*) from mileage_entries;   -- expect the same number as before

-- ─── ROLLBACK ────────────────────────────────────────────────────────────────
-- alter table mileage_days drop column if exists submitted_allocations;
-- alter table mileage_days drop column if exists general_purpose;
