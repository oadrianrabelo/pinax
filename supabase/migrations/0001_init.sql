-- Kairos · esquema de sincronização
-- Rode no SQL Editor do Supabase (ou `supabase db push`).

-- Itens: o documento inteiro em jsonb; o servidor só precisa saber quem é o dono e quando mudou.
create table if not exists public.items (
  id          text primary key,
  user_id     uuid not null default auth.uid() references auth.users on delete cascade,
  data        jsonb not null,
  updated_at  bigint not null,              -- relógio do cliente (ms): "último a escrever vence"
  deleted     boolean not null default false, -- lápide, para apagar também nos outros aparelhos
  server_ts   timestamptz not null default clock_timestamp() -- cursor de "o que mudou desde…"
);
create index if not exists items_user_server_ts on public.items (user_id, server_ts);

-- Preferências de aparência (fontes, cores, ...)
create table if not exists public.prefs (
  user_id     uuid primary key default auth.uid() references auth.users on delete cascade,
  data        jsonb not null,
  updated_at  bigint not null
);

-- Cada pessoa só enxerga e altera o que é seu
alter table public.items enable row level security;
alter table public.prefs enable row level security;
drop policy if exists "items: dono" on public.items;
create policy "items: dono" on public.items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "prefs: dono" on public.prefs;
create policy "prefs: dono" on public.prefs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Ignora escrita mais antiga que a guardada (conflito entre aparelhos)
create or replace function public.items_lww() returns trigger language plpgsql as $$
begin
  if new.updated_at < old.updated_at then return null; end if;
  return new;
end $$;
drop trigger if exists items_a_lww on public.items;
create trigger items_a_lww before update on public.items for each row execute function public.items_lww();

-- Carimba a hora do servidor em toda escrita (clock_timestamp é único por linha)
create or replace function public.items_touch() returns trigger language plpgsql as $$
begin
  new.server_ts = clock_timestamp();
  return new;
end $$;
drop trigger if exists items_b_touch on public.items;
create trigger items_b_touch before insert or update on public.items for each row execute function public.items_touch();

-- Tempo real: mudanças chegam nos outros aparelhos na hora
do $$ begin
  alter publication supabase_realtime add table public.items;
exception when duplicate_object then null; end $$;
