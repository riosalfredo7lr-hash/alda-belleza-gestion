-- AlDa Belleza Gestión — esquema inicial para Supabase
-- Ejecutar en Supabase > SQL Editor.
-- IMPORTANTE: las políticas permiten a cualquier usuario autenticado acceder a los datos.
-- Desactivá el registro público de usuarios en Authentication > Settings y creá solo los dos usuarios autorizados.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  brand text not null default 'Avon' check (brand in ('Avon','Natura','Otra')),
  category text,
  cost numeric(12,2) not null default 0 check (cost >= 0),
  price numeric(12,2) not null default 0 check (price >= 0),
  stock integer not null default 0 check (stock >= 0),
  min_stock integer not null default 2 check (min_stock >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  instagram text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete set null,
  order_type text not null default 'Stock disponible' check (order_type in ('Stock disponible','Encargo')),
  source text not null default 'WhatsApp' check (source in ('WhatsApp','Instagram','Presencial','Otro')),
  order_date date not null default current_date,
  status text not null default 'Pendiente' check (status in ('Pendiente','Esperando producto','Listo para entregar','Entregado','Pagado','Cancelado')),
  total numeric(12,2) not null default 0 check (total >= 0),
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  payment_date date not null default current_date,
  method text not null default 'Efectivo' check (method in ('Efectivo','Transferencia','Tarjeta','Contado','Otro')),
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  description text not null,
  amount numeric(12,2) not null check (amount >= 0),
  expense_date date not null default current_date,
  category text,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.customers enable row level security;
alter table public.orders enable row level security;
alter table public.payments enable row level security;
alter table public.expenses enable row level security;

drop policy if exists "Authenticated users can manage profiles" on public.profiles;
create policy "Authenticated users can manage profiles" on public.profiles for all to authenticated using (true) with check (true);
drop policy if exists "Authenticated users can manage products" on public.products;
create policy "Authenticated users can manage products" on public.products for all to authenticated using (true) with check (true);
drop policy if exists "Authenticated users can manage customers" on public.customers;
create policy "Authenticated users can manage customers" on public.customers for all to authenticated using (true) with check (true);
drop policy if exists "Authenticated users can manage orders" on public.orders;
create policy "Authenticated users can manage orders" on public.orders for all to authenticated using (true) with check (true);
drop policy if exists "Authenticated users can manage payments" on public.payments;
create policy "Authenticated users can manage payments" on public.payments for all to authenticated using (true) with check (true);
drop policy if exists "Authenticated users can manage expenses" on public.expenses;
create policy "Authenticated users can manage expenses" on public.expenses for all to authenticated using (true) with check (true);

-- Los usuarios se crean desde Authentication > Users en el panel de Supabase.
-- Es recomendable crear perfiles para cada usuario:
-- insert into public.profiles (id, display_name) values ('UUID_DEL_USUARIO', 'Nombre');
