-- ═════════════════════════════════════════════════════════════════════════════
-- Leads migration — 2026-10-13
-- ADDITIVE ONLY: creates new tables. Does not alter or read any existing table
-- (clients, tasks, notes, ... are untouched). Safe to re-run (IF NOT EXISTS).
--
-- Run in: Supabase Dashboard → SQL Editor → paste → Run.
-- Rollback: see the bottom of this file.
-- ═════════════════════════════════════════════════════════════════════════════

-- ─── 1. leads ────────────────────────────────────────────────────────────────
-- ids use the same scheme as clients (Date.now() + random, bigint) so nothing
-- needs an id-mapping layer.
create table if not exists leads (
  id          bigint      primary key,
  name        text        not null default '',      -- → clients.name
  address     text        not null default '',      -- → clients.address (Job Address)
  phone       text        not null default '',      -- → clients.phone   (Contact Phone)
  email       text        not null default '',      -- → clients.email   (Contact Email)
  next_task   text        not null default '',      -- Next Task
  notes       text        not null default '',      -- Notes
  status      text        not null default 'lead',  -- 'lead' | 'converted'
  client_id   bigint      references clients(id) on delete set null,  -- set when converted
  archived    boolean     not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists leads_status_idx    on leads (status);
create index if not exists leads_client_id_idx on leads (client_id);

-- ─── 2. OPTIONAL: per-lead notes list and tasks list ─────────────────────────
-- Only run this block if leads need MULTIPLE notes / tasks beyond the single
-- Notes + Next Task fields above. Skip it otherwise; it can be added later.
--
-- create table if not exists lead_notes (
--   id          bigint      primary key,
--   lead_id     bigint      not null references leads(id) on delete cascade,
--   title       text        not null default '',
--   body        text        not null default '',
--   pinned      boolean     not null default false,
--   created_at  timestamptz not null default now(),
--   updated_at  timestamptz not null default now()
-- );
-- create index if not exists lead_notes_lead_idx on lead_notes (lead_id);
--
-- create table if not exists lead_tasks (
--   id          bigint      primary key,
--   lead_id     bigint      not null references leads(id) on delete cascade,
--   text        text        not null default '',
--   due         text,
--   done        boolean     not null default false,
--   updated_at  timestamptz not null default now()
-- );
-- create index if not exists lead_tasks_lead_idx on lead_tasks (lead_id);

-- ─── 3. Realtime ─────────────────────────────────────────────────────────────
-- Full rows on UPDATE/DELETE events so the app never sees partial payloads.
alter table leads replica identity full;

-- Add to the realtime publication only if not already a member (re-run safe).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'leads'
  ) then
    alter publication supabase_realtime add table leads;
  end if;
end $$;

-- ─── 4. Access ───────────────────────────────────────────────────────────────
-- Matches the existing tables: RLS is not enabled (see schema.sql line ~243).
-- Tables created in the SQL editor are accessible with the same key the apps
-- already use. If you later enable RLS on clients, enable it here too.

-- ─── 5. Verify (read-only; run separately after the above) ───────────────────
-- select count(*) from leads;                      -- expect 0
-- select count(*) from clients;                    -- expect the same number as before
-- select tablename from pg_publication_tables
--   where pubname = 'supabase_realtime' and tablename = 'leads';   -- expect 1 row

-- ─── ROLLBACK (removes only what this file created) ──────────────────────────
-- drop table if exists lead_tasks;
-- drop table if exists lead_notes;
-- drop table if exists leads;
