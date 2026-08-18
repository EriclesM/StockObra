-- ObraStock — estrutura completa do banco Supabase
-- Execute este arquivo uma única vez no SQL Editor do seu projeto.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) >= 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists public.works (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete restrict,
  name text not null check (char_length(trim(name)) >= 2),
  address text not null check (char_length(trim(address)) >= 5),
  status text not null default 'Planejada' check (status in ('Planejada', 'Em andamento', 'Concluída')),
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  sku text unique,
  name text not null check (char_length(trim(name)) >= 2),
  unit text not null,
  minimum_stock numeric(12,3) not null default 0 check (minimum_stock >= 0),
  sale_price numeric(12,2) not null default 0 check (sale_price >= 0),
  current_stock numeric(12,3) not null default 0 check (current_stock >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists public.movements (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('entrada', 'saida')),
  product_id uuid not null references public.products(id) on delete restrict,
  work_id uuid references public.works(id) on delete restrict,
  supplier text,
  quantity numeric(12,3) not null check (quantity > 0),
  unit_value numeric(12,2) not null check (unit_value >= 0),
  total_value numeric(14,2) generated always as (quantity * unit_value) stored,
  movement_date date not null default current_date,
  performed_by uuid not null default auth.uid(),
  notes text not null default '',
  created_at timestamptz not null default now(),
  constraint movements_performed_by_fkey foreign key (performed_by) references public.profiles(id) on delete restrict,
  constraint movement_supplier_check check (type = 'saida' or (supplier is not null and char_length(trim(supplier)) >= 2))
);

-- Garante compatibilidade com instalações anteriores: a obra é opcional
-- tanto nas entradas quanto nas saídas.
alter table public.movements drop constraint if exists movement_destination_check;

create index if not exists works_client_id_idx on public.works(client_id);
create index if not exists movements_product_id_idx on public.movements(product_id);
create index if not exists movements_work_id_idx on public.movements(work_id);
create index if not exists movements_performed_by_idx on public.movements(performed_by);
create index if not exists movements_date_idx on public.movements(movement_date desc);

-- Cria automaticamente o perfil público quando alguém se cadastra no Auth.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Atualiza o saldo dentro da mesma transação e bloqueia saída sem estoque.
create or replace function public.apply_stock_movement()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  available numeric(12,3);
begin
  select current_stock
    into available
    from public.products
   where id = new.product_id
   for update;

  if available is null then
    raise exception 'Produto não encontrado.';
  end if;

  if new.type = 'saida' and available < new.quantity then
    raise exception 'Estoque insuficiente. Disponível: %', available;
  end if;

  update public.products
     set current_stock = current_stock + case when new.type = 'entrada' then new.quantity else -new.quantity end,
         updated_at = now()
   where id = new.product_id;

  return new;
end;
$$;

drop trigger if exists before_movement_insert on public.movements;
create trigger before_movement_insert
  before insert on public.movements
  for each row execute procedure public.apply_stock_movement();

-- Segurança: nenhum dado é acessível sem login.
alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.works enable row level security;
alter table public.products enable row level security;
alter table public.movements enable row level security;

drop policy if exists "Authenticated users can read profiles" on public.profiles;
create policy "Authenticated users can read profiles"
  on public.profiles for select to authenticated using (true);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists "Authenticated users can manage clients" on public.clients;
create policy "Authenticated users can manage clients"
  on public.clients for all to authenticated using (true) with check (true);

drop policy if exists "Authenticated users can manage works" on public.works;
create policy "Authenticated users can manage works"
  on public.works for all to authenticated using (true) with check (true);

drop policy if exists "Authenticated users can read products" on public.products;
create policy "Authenticated users can read products"
  on public.products for select to authenticated using (true);

drop policy if exists "Authenticated users can insert products" on public.products;
create policy "Authenticated users can insert products"
  on public.products for insert to authenticated with check (true);

drop policy if exists "Authenticated users can update products" on public.products;
create policy "Authenticated users can update products"
  on public.products for update to authenticated using (true) with check (true);

drop policy if exists "Authenticated users can delete products" on public.products;
create policy "Authenticated users can delete products"
  on public.products for delete to authenticated using (true);

drop policy if exists "Authenticated users can read movements" on public.movements;
create policy "Authenticated users can read movements"
  on public.movements for select to authenticated using (true);

drop policy if exists "Authenticated users can insert movements" on public.movements;
create policy "Authenticated users can insert movements"
  on public.movements for insert to authenticated
  with check ((select auth.uid()) = performed_by);

-- Remove permissões automáticas do schema público antes de liberar apenas o necessário.
revoke all on public.profiles, public.clients, public.works, public.products, public.movements from anon, authenticated;

grant select on public.profiles, public.clients, public.works, public.products, public.movements to authenticated;
grant update (full_name) on public.profiles to authenticated;
grant insert, update, delete on public.clients, public.works to authenticated;
grant insert (sku, name, unit, minimum_stock, sale_price, active),
      update (sku, name, unit, minimum_stock, sale_price, active),
      delete on public.products to authenticated;
grant insert (type, product_id, work_id, supplier, quantity, unit_value, movement_date, notes)
  on public.movements to authenticated;

-- O saldo só pode ser alterado pela função de movimentação.
revoke update (current_stock) on public.products from authenticated;
revoke update, delete on public.movements from authenticated;
