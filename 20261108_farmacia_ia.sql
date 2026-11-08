-- FarmacIA: contadores de uso da IA online (só a Edge Function acessa, com a service role).
-- Rode uma vez no SQL Editor do Supabase.

create table if not exists public.farmacia_ia_cota (
  dia        date    not null,
  provedor   text    not null,
  tokens     bigint  not null default 0,
  pedidos    integer not null default 0,
  esgotada   boolean not null default false,
  primary key (dia, provedor)
);

create table if not exists public.farmacia_ia_cid (
  dia     date    not null,
  cid     text    not null,
  pedidos integer not null default 0,
  primary key (dia, cid)
);

alter table public.farmacia_ia_cota enable row level security;
alter table public.farmacia_ia_cid  enable row level security;
-- Sem políticas: ninguém acessa pela chave pública. A Edge Function usa a service role (ignora RLS).

-- Soma o uso de um provedor no dia (atômico).
create or replace function public.farmacia_ia_somar(p_dia date, p_prov text, p_tokens int)
returns table (tokens bigint, pedidos int, esgotada boolean)
language sql security definer set search_path = public as $$
  insert into farmacia_ia_cota as c (dia, provedor, tokens, pedidos)
  values (p_dia, p_prov, greatest(p_tokens, 0), 1)
  on conflict (dia, provedor) do update
    set tokens = c.tokens + greatest(p_tokens, 0), pedidos = c.pedidos + 1
  returning c.tokens, c.pedidos, c.esgotada;
$$;

-- Conta um pedido do usuário anônimo (cid) no dia e devolve o total.
create or replace function public.farmacia_ia_contar_cid(p_dia date, p_cid text)
returns int
language sql security definer set search_path = public as $$
  insert into farmacia_ia_cid as u (dia, cid, pedidos) values (p_dia, p_cid, 1)
  on conflict (dia, cid) do update set pedidos = u.pedidos + 1
  returning u.pedidos;
$$;

revoke all on function public.farmacia_ia_somar(date, text, int) from public, anon, authenticated;
revoke all on function public.farmacia_ia_contar_cid(date, text) from public, anon, authenticated;

-- Limpeza opcional (rode de vez em quando): apaga contadores com mais de 7 dias.
-- delete from public.farmacia_ia_cid  where dia < current_date - 7;
-- delete from public.farmacia_ia_cota where dia < current_date - 30;
