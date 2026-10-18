create sequence order_number_seq start 1001;

create table orders (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'pending' check (status in ('pending', 'paid')),
  order_number integer unique,
  claim_token text not null unique,
  customer_name text,
  telegram text,
  fulfilment text not null check (fulfilment in ('pickup', 'delivery')),
  map_url text,
  items jsonb not null,
  subtotal_usd numeric(8, 2) not null,
  delivery_fee_usd numeric(8, 2) not null,
  total_usd numeric(8, 2) not null,
  khqr_md5 text not null unique,
  khqr_tran_id text,
  khqr_qr text not null,
  khqr_deeplink text,
  ip_hash text,
  expires_at timestamptz not null,
  last_checked_at timestamptz,
  paid_at timestamptz,
  admin_notified_at timestamptz,
  created_at timestamptz not null default now()
);

create index orders_ip_created_idx on orders (ip_hash, created_at);
create index orders_status_created_idx on orders (status, created_at);

alter table orders enable row level security;

-- Moves pending to paid in one atomic step. Returns a row only for the caller that wins.
create function settle_order(p_md5 text) returns setof orders language sql set search_path = public as $$
  update orders
     set status = 'paid',
         paid_at = now(),
         order_number = nextval('order_number_seq'),
         ip_hash = null
   where khqr_md5 = p_md5 and status = 'pending'
  returning *;
$$;

revoke all on function settle_order(text) from public, anon, authenticated;
