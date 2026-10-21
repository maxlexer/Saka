create table products (
  slug text primary key check (slug ~ '^[a-z0-9-]+$'),
  name text not null check (char_length(name) between 1 and 80),
  family text not null check (family in ('fresh', 'woody', 'oriental', 'aromatic')),
  description text not null,
  notes_top text[] not null default '{}',
  notes_heart text[] not null default '{}',
  notes_base text[] not null default '{}',
  mood text not null,
  occasion text not null,
  vibes text[] not null default '{}',
  occasions text[] not null default '{}',
  available boolean not null default true,
  sort integer not null,
  updated_at timestamptz not null default now()
);

create table size_prices (
  size_ml integer primary key check (size_ml in (10, 20, 50)),
  price_usd numeric(8, 2) not null check (price_usd > 0 and price_usd < 1000)
);

create table admin_login_attempts (
  id bigint generated always as identity primary key,
  ip_hash text not null,
  created_at timestamptz not null default now()
);

create index admin_login_attempts_ip_created_idx on admin_login_attempts (ip_hash, created_at);

alter table products enable row level security;
alter table size_prices enable row level security;
alter table admin_login_attempts enable row level security;
