-- EmailGolem Tables Migration
-- Run via Supabase Dashboard SQL Editor or CLI

-- Emails table
create table if not exists emails (
  id uuid primary key default gen_random_uuid(),
  gmail_id text unique not null,
  subject text,
  from_address text,
  snippet text,
  score int,
  category text,  -- 'interview', 'urgent', 'job', 'subscription', 'newsletter', etc.
  received_at timestamptz,
  scored_at timestamptz default now(),
  notified boolean default false
);

-- Subscriptions table
create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  service_name text not null,
  amount decimal(10,2),
  currency text default 'USD',
  frequency text,  -- 'monthly', 'yearly', 'one-time'
  status text default 'active',  -- 'active', 'cancelled', 'paused'
  first_seen timestamptz default now(),
  last_payment timestamptz,
  created_at timestamptz default now()
);

-- Payments table
create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid references subscriptions(id),
  email_id uuid references emails(id),
  amount decimal(10,2),
  currency text default 'USD',
  paid_at timestamptz,
  created_at timestamptz default now()
);

-- Indexes
create index if not exists emails_category_idx on emails(category);
create index if not exists emails_received_idx on emails(received_at);
create index if not exists payments_paid_at_idx on payments(paid_at);

-- Enable RLS (Row Level Security) - optional, disable for now since we use anon key
-- alter table emails enable row level security;
-- alter table subscriptions enable row level security;
-- alter table payments enable row level security;
