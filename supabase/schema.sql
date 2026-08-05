-- Simplicity — schema Supabase (free tier)
-- Corré esto en: Supabase → SQL Editor → New query → Run

-- Extensiones
create extension if not exists "pgcrypto";

-- ── Productos ───────────────────────────────────────────────────
create table if not exists public.products (
  id text primary key,
  slug text not null unique,
  title text not null,
  description text not null default '',
  category text not null default '',
  price numeric(12, 2) not null default 0,
  original_price numeric(12, 2) not null default 0,
  currency text not null default 'BOB',
  images jsonb not null default '[]'::jsonb,
  featured boolean not null default false,
  type text not null default 'available'
    check (type in ('available', 'unavailable', 'hidden', 'promotional')),
  handle_stock boolean not null default false,
  current_stock integer not null default 0,
  position integer not null default 0,
  options jsonb not null default '[]'::jsonb,
  created_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists products_category_idx on public.products (category);
create index if not exists products_type_idx on public.products (type);
create index if not exists products_position_idx on public.products (position);

-- ── Pedidos ─────────────────────────────────────────────────────
create table if not exists public.orders (
  id text primary key,
  access_token text not null unique,
  status text not null default 'pending_payment'
    check (status in ('pending_payment', 'pending_review', 'paid', 'cancelled')),
  fulfillment_status text not null default 'unfulfilled'
    check (fulfillment_status in (
      'unfulfilled', 'preparing', 'ready_pickup', 'shipped', 'delivered', 'cancelled'
    )),
  customer_name text not null,
  customer_phone text not null,
  customer_city text not null,
  fulfillment text not null check (fulfillment in ('pickup', 'delivery')),
  customer_address text,
  customer_note text,
  customer_location jsonb,
  items jsonb not null default '[]'::jsonb,
  subtotal numeric(12, 2) not null default 0,
  currency text not null default 'BOB',
  receipt_path text,
  receipt_uploaded_at timestamptz,
  admin_note text,
  stock_reserved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_status_idx on public.orders (status);
create index if not exists orders_fulfillment_status_idx on public.orders (fulfillment_status);
create index if not exists orders_created_at_idx on public.orders (created_at desc);
create index if not exists orders_customer_phone_idx on public.orders (customer_phone);

-- ── updated_at automático ───────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

-- ── Storage: comprobantes privados ──────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'receipts',
  'receipts',
  false,
  8388608,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
    'application/pdf'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ── RLS: todo cerrado al cliente; la app usa service role ────────
alter table public.products enable row level security;
alter table public.orders enable row level security;

-- Sin policies para anon/authenticated → solo service_role puede leer/escribir.
-- (El service role bypasea RLS.)

-- Storage: bloquear acceso público directo
drop policy if exists "receipts no public read" on storage.objects;
drop policy if exists "receipts no public write" on storage.objects;

-- No creamos policies abiertas. El backend sube/lee con service role.
