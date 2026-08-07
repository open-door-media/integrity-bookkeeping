-- Integrity Bookkeeping — Supabase Schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- Safe to run multiple times (uses IF NOT EXISTS / ON CONFLICT DO NOTHING)

-- ─── Settings (singleton row, id always = 1) ─────────────────────────────────
create table if not exists settings (
  id                  int primary key default 1,
  dp_flat_pct         numeric  not null default 50,
  cons_rate           numeric  not null default 25,
  mileage_rate        numeric  not null default 0.67,
  stmt_fmt            text     not null default 'itemized',
  biz_name            text     not null default 'Integrity Estate Liquidation',
  invoice_contact     text     not null default 'Kevin',
  invoice_address     text     not null default '',
  invoice_address2    text     not null default '',
  invoice_city        text     not null default 'Wichita',
  invoice_state       text     not null default 'KS',
  invoice_zip         text     not null default '',
  invoice_phone       text     not null default '',
  invoice_prefix      text     not null default '',
  invoice_sep         text     not null default '-',
  invoice_start_seq   int      not null default 1,
  invoice_due_days    int      not null default 14,
  invoice_footer      text     not null default 'Thank you for your business!',
  logo_path           text     not null default '',
  stmt_footer         text     not null default 'Thank you — please make checks payable to Integrity Estate Liquidation.',
  invoice_save_path   text     not null default '',
  stmt_save_path      text     not null default '',
  shortcuts           jsonb    not null default '{}',
  next_cn             int      not null default 1,
  next_emp_id         int      not null default 2,
  next_task_id        int      not null default 1
);
insert into settings (id) values (1) on conflict (id) do nothing;

-- ─── Accounts (singleton row, id always = 1) ─────────────────────────────────
create table if not exists accounts (
  id                  int     primary key default 1,
  bank_balance        numeric not null default 0,
  bank_balance_date   text    not null default ''
);
insert into accounts (id) values (1) on conflict (id) do nothing;

-- ─── Employees ───────────────────────────────────────────────────────────────
create table if not exists employees (
  id        bigint  primary key,
  name      text    not null default '',
  rate      numeric,
  is_owner  boolean not null default false,
  active    boolean not null default true,
  phone     text    not null default '',
  notes     text    not null default ''
);

-- ─── Clients ─────────────────────────────────────────────────────────────────
create table if not exists clients (
  id                        bigint   primary key,
  num                       text     not null default '',
  name                      text     not null default '',
  address                   text     not null default '',
  contact                   text     not null default '',
  phone                     text     not null default '',
  email                     text     not null default '',
  bill_to                   text     not null default '',
  bill_addr1                text     not null default '',
  bill_addr2                text     not null default '',
  bill_city                 text     not null default '',
  bill_state                text     not null default '',
  bill_zip                  text     not null default '',
  bill_phone                text     not null default '',
  bill_email                text     not null default '',
  start_date                text     not null default '',
  notes                     text     not null default '',
  status                    text     not null default 'agreement',
  flat_rate                 numeric  not null default 0,
  flat_rate_inv_status      text     not null default 'uninvoiced',
  has_dumpster              boolean  not null default false,
  dumpster_est              numeric  not null default 0,
  dumpster_actual           numeric,
  dumpster_savings_route    text     not null default 'mine',
  dumpster_route            text,
  dumpster_inv_status       text     not null default 'uninvoiced',
  consignment_active        boolean  not null default false,
  consignment_rate          numeric  not null default 25,
  has_consignment           boolean  not null default false,
  consignment_fee           numeric  not null default 0,
  consignment_fee_mode      text     not null default 'combined',
  consignment_fee_inv_status text    not null default 'uninvoiced',
  consignment_type          text     not null default 'fee',
  buyout_amount             numeric  not null default 0,
  buyout_mode               text     not null default 'combined',
  buyout_inv_status         text     not null default 'uninvoiced',
  job_mode                  text     not null default 'cleanout',
  dp_paid                   boolean  not null default false,
  dp_date                   text,
  dp_check                  text     not null default '',
  dp_formula                jsonb    not null default '{"flatPct":50,"dumpsterPct":100}',
  labor_employees           jsonb    not null default '[]',
  labor_dates               jsonb    not null default '[]',
  labor_excluded            jsonb    not null default '[]',
  labor_initialized         boolean  not null default false,
  mileage_dates             jsonb    not null default '[]',
  mileage_rate              numeric,
  archived                  boolean  not null default false,
  created_at                timestamptz not null default now()
);

-- ─── Fees ────────────────────────────────────────────────────────────────────
create table if not exists fees (
  id            bigint  primary key,
  client_id     bigint  not null references clients(id) on delete cascade,
  name          text    not null default '',
  amount        numeric not null default 0,
  actual_amount numeric,
  type          text    not null default 'profit',
  dp_included   boolean not null default true,
  dp_pct        numeric not null default 100,
  routed        text    not null default 'client',
  savings_route text    not null default 'mine',
  inv_status    text    not null default 'uninvoiced'
);

-- ─── Cost Adjustments ────────────────────────────────────────────────────────
create table if not exists cost_adjustments (
  id            bigint  primary key,
  client_id     bigint  not null references clients(id) on delete cascade,
  name          text    not null default '',
  amount        numeric not null default 0,
  actual_amount numeric,
  type          text    not null default 'profit',
  routed        text    not null default 'client',
  savings_route text,
  inv_status    text    not null default 'uninvoiced'
);

-- ─── Private Sales ───────────────────────────────────────────────────────────
create table if not exists private_sales (
  id           bigint   primary key,
  client_id    bigint   not null references clients(id) on delete cascade,
  item_name    text     not null default '',
  name         text     not null default '',
  date         text     not null default '',
  price        numeric  not null default 0,
  client_pct   numeric  not null default 50,
  kevin_bought boolean  not null default false,
  check_status text     not null default 'pending',
  updated_at   bigint
);

-- ─── Down Payment Checks ─────────────────────────────────────────────────────
create table if not exists dp_checks (
  id         bigint  primary key,
  client_id  bigint  not null references clients(id) on delete cascade,
  status     text    not null default 'pending',
  date       text    not null default '',
  ref        text    not null default '',
  amount     numeric not null default 0,
  notes      text    not null default '',
  img        text
);

-- ─── Labor Entries ───────────────────────────────────────────────────────────
create table if not exists labor_entries (
  client_id  bigint  not null references clients(id) on delete cascade,
  snap_id    text    not null,
  date       text    not null,
  reg        numeric not null default 0,
  cons       numeric not null default 0,
  primary key (client_id, snap_id, date)
);

-- ─── Mileage Entries ─────────────────────────────────────────────────────────
create table if not exists mileage_entries (
  client_id  bigint  not null references clients(id) on delete cascade,
  date       text    not null,
  miles      numeric not null default 0,
  primary key (client_id, date)
);

-- ─── Tasks ───────────────────────────────────────────────────────────────────
create table if not exists tasks (
  id         bigint   primary key,
  client_id  bigint   references clients(id) on delete set null,
  text       text     not null default '',
  due        text,
  done       boolean  not null default false,
  updated_at bigint
);

-- ─── Invoices ────────────────────────────────────────────────────────────────
-- lines and checks stored as JSONB (always loaded/saved with the invoice)
create table if not exists invoices (
  id          bigint   primary key,
  client_id   bigint   not null references clients(id) on delete cascade,
  num         text     not null default '',
  year        int,
  status      text     not null default 'unpaid',
  total       numeric  not null default 0,
  notes       text     not null default '',
  created_at  text     not null default '',
  paid_date   text,
  check_num   text,
  due_date    text,
  lines       jsonb    not null default '[]',
  checks      jsonb    not null default '[]'
);

-- ─── Statements ──────────────────────────────────────────────────────────────
-- lines stored as JSONB
create table if not exists statements (
  id          bigint   primary key,
  client_id   bigint   not null references clients(id) on delete cascade,
  status      text     not null default 'draft',
  paid_date   text,
  check_num   text,
  lines       jsonb    not null default '[]',
  created_at  text     not null default ''
);

-- ─── Documents ───────────────────────────────────────────────────────────────
create table if not exists documents (
  id           bigint   primary key,
  name         text     not null default '',
  stored_name  text     not null default '',
  client_id    bigint   references clients(id) on delete set null,
  created_at   text     not null default '',
  type         text     not null default ''
);

-- ─── Manual Entries (Accounts ledger) ───────────────────────────────────────
create table if not exists manual_entries (
  id         bigint   primary key,
  description text    not null default '',
  amount     numeric  not null default 0,
  dir        text     not null default 'in',
  status     text     not null default 'deposited',
  date       text     not null default '',
  ref        text     not null default '',
  client_id  bigint   references clients(id) on delete set null,
  notes      text     not null default ''
);

-- ─── Row Level Security (disable for single-org use, enable later if needed) ──
-- All tables have RLS disabled by default in Supabase for new projects.
-- If you enable RLS, add a policy granting full access to authenticated users:
-- alter table clients enable row level security;
-- create policy "all_access" on clients for all using (true);
-- (Repeat for each table.)
