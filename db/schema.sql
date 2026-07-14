-- =====================================================================
-- ESQUEMA DO BANCO DE DADOS - SISTEMA DE VITRINE / MARKETPLACE
-- Supabase (PostgreSQL)
--
-- Como usar:
-- 1. Vá em SQL Editor no painel do Supabase e cole este arquivo inteiro
--    (ou rode via CLI: supabase db push).
-- 2. Depois, ative o login com Google em Authentication > Providers,
--    usando o Client ID/Secret do Google Cloud Console.
-- =====================================================================

-- ---------------------------------------------------------------------
-- EXTENSÕES
-- ---------------------------------------------------------------------
create extension if not exists "uuid-ossp";
create extension if not exists postgis;

-- Evita falha caso o script seja executado novamente em uma base já populada.
drop trigger if exists set_updated_at_perfis on public.perfis;
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user() cascade;
drop trigger if exists set_updated_at_lojas on public.lojas;
drop function if exists public.atualizar_localizacao_loja() cascade;
drop trigger if exists set_updated_at_produtos on public.produtos;
drop trigger if exists set_updated_at_pedidos on public.pedidos;

-- ---------------------------------------------------------------------
-- FUNÇÃO AUXILIAR: atualizar updated_at automaticamente
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ---------------------------------------------------------------------
-- PERFIS (estende auth.users do Supabase Auth)
-- Todo usuário (cliente ou vendedor) tem um registro aqui.
-- ---------------------------------------------------------------------
create table if not exists public.perfis (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  telefone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at_perfis
  before update on public.perfis
  for each row execute function public.set_updated_at();

-- cria o perfil automaticamente quando alguém se cadastra (Google ou e-mail)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.perfis (id, nome, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- LOJAS
-- Qualquer perfil pode criar a sua própria loja = "virar vendedor".
-- ---------------------------------------------------------------------
create table if not exists public.lojas (
  id uuid primary key default uuid_generate_v4(),
  dono_id uuid not null references public.perfis(id) on delete cascade,
  nome text not null,
  descricao text,
  whatsapp text not null,
  documento text,
  tipo_documento text default 'cpf' check (tipo_documento in ('cpf','cnpj')),
  endereco text,
  latitude double precision,
  longitude double precision,
  localizacao geography(Point, 4326),
  logo_url text,
  cover_url text,
  primary_color text default '#2563eb',
  secondary_color text default '#0f766e',
  accent_color text default '#f59e0b',
  hero_title text,
  hero_subtitle text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.lojas add column if not exists documento text;
alter table public.lojas add column if not exists tipo_documento text default 'cpf';
alter table public.lojas add column if not exists logo_url text;
alter table public.lojas add column if not exists cover_url text;
alter table public.lojas add column if not exists primary_color text default '#2563eb';
alter table public.lojas add column if not exists secondary_color text default '#0f766e';
alter table public.lojas add column if not exists accent_color text default '#f59e0b';
alter table public.lojas add column if not exists hero_title text;
alter table public.lojas add column if not exists hero_subtitle text;

create index if not exists lojas_localizacao_idx on public.lojas using gist (localizacao);
create index if not exists lojas_dono_id_idx on public.lojas (dono_id);

create trigger set_updated_at_lojas
  before update on public.lojas
  for each row execute function public.set_updated_at();

create or replace function public.atualizar_localizacao_loja()
returns trigger as $$
begin
  if new.latitude is not null and new.longitude is not null then
    new.localizacao := st_setsrid(st_makepoint(new.longitude, new.latitude), 4326)::geography;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_atualizar_localizacao_loja
  before insert or update of latitude, longitude on public.lojas
  for each row execute function public.atualizar_localizacao_loja();

-- ---------------------------------------------------------------------
-- CATEGORIAS (opcional, por loja)
-- ---------------------------------------------------------------------
create table if not exists public.categorias (
  id uuid primary key default uuid_generate_v4(),
  loja_id uuid not null references public.lojas(id) on delete cascade,
  nome text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- PRODUTOS
-- ---------------------------------------------------------------------
create table if not exists public.produtos (
  id uuid primary key default uuid_generate_v4(),
  loja_id uuid not null references public.lojas(id) on delete cascade,
  categoria_id uuid references public.categorias(id) on delete set null,
  nome text not null,
  descricao text,
  preco numeric(10,2) not null check (preco >= 0),
  quantidade_estoque integer not null default 0 check (quantidade_estoque >= 0),
  ativo boolean not null default true,
  destaque boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists produtos_loja_id_idx on public.produtos (loja_id);

create trigger set_updated_at_produtos
  before update on public.produtos
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- FOTOS DOS PRODUTOS
-- ---------------------------------------------------------------------
create table if not exists public.produto_fotos (
  id uuid primary key default uuid_generate_v4(),
  produto_id uuid not null references public.produtos(id) on delete cascade,
  url text not null,
  ordem integer not null default 0
);

create index if not exists produto_fotos_produto_id_idx on public.produto_fotos (produto_id);

-- ---------------------------------------------------------------------
-- VIEW PÚBLICA DA VITRINE
-- NÃO expõe quantidade_estoque - só um booleano "disponivel".
-- É isso que o front-end do cliente deve consultar, nunca a tabela produtos direto.
-- ---------------------------------------------------------------------
drop view if exists public.vw_vitrine_produtos;

create view public.vw_vitrine_produtos as
select
  p.id,
  p.loja_id,
  p.categoria_id,
  p.nome,
  p.descricao,
  p.preco,
  p.destaque,
  (p.quantidade_estoque > 0) as disponivel,
  p.created_at
from public.produtos p
where p.ativo = true;

-- ---------------------------------------------------------------------
-- CARRINHOS
-- Um carrinho é sempre de UM cliente para UMA loja (o checkout vai para
-- o WhatsApp de uma loja só). Só existe um carrinho "aberto" por vez.
-- ---------------------------------------------------------------------
create table if not exists public.carrinhos (
  id uuid primary key default uuid_generate_v4(),
  cliente_id uuid not null references public.perfis(id) on delete cascade,
  loja_id uuid not null references public.lojas(id) on delete cascade,
  status text not null default 'aberto' check (status in ('aberto', 'finalizado', 'cancelado')),
  created_at timestamptz not null default now()
);

create unique index if not exists carrinhos_aberto_unico_idx
  on public.carrinhos (cliente_id, loja_id)
  where status = 'aberto';

create table if not exists public.carrinho_itens (
  id uuid primary key default uuid_generate_v4(),
  carrinho_id uuid not null references public.carrinhos(id) on delete cascade,
  produto_id uuid not null references public.produtos(id) on delete cascade,
  quantidade integer not null check (quantidade > 0),
  preco_unitario numeric(10,2) not null,
  created_at timestamptz not null default now(),
  unique (carrinho_id, produto_id)
);

-- ---------------------------------------------------------------------
-- PEDIDOS
-- ---------------------------------------------------------------------
create table if not exists public.pedidos (
  id uuid primary key default uuid_generate_v4(),
  cliente_id uuid not null references public.perfis(id) on delete cascade,
  loja_id uuid not null references public.lojas(id) on delete cascade,
  status text not null default 'pendente' check (status in ('pendente','confirmado','cancelado','concluido')),
  total numeric(10,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pedidos_loja_id_idx on public.pedidos (loja_id);
create index if not exists pedidos_cliente_id_idx on public.pedidos (cliente_id);

create trigger set_updated_at_pedidos
  before update on public.pedidos
  for each row execute function public.set_updated_at();

create table if not exists public.pedido_itens (
  id uuid primary key default uuid_generate_v4(),
  pedido_id uuid not null references public.pedidos(id) on delete cascade,
  produto_id uuid references public.produtos(id) on delete set null,
  nome_produto text not null,
  quantidade integer not null check (quantidade > 0),
  preco_unitario numeric(10,2) not null
);

-- ---------------------------------------------------------------------
-- INSCRIÇÕES DE PUSH NOTIFICATION (Web Push - notificação no celular)
-- ---------------------------------------------------------------------
create table if not exists public.push_subscriptions (
  id uuid primary key default uuid_generate_v4(),
  usuario_id uuid not null references public.perfis(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- FUNÇÃO: BUSCAR LOJAS PRÓXIMAS DE UMA COORDENADA
-- ---------------------------------------------------------------------
create or replace function public.buscar_lojas_proximas(
  lat double precision,
  lng double precision,
  raio_km double precision default 10
)
returns table (
  id uuid,
  nome text,
  descricao text,
  endereco text,
  logo_url text,
  distancia_km double precision
)
language sql
stable
as $$
  select
    l.id,
    l.nome,
    l.descricao,
    l.endereco,
    l.logo_url,
    st_distance(l.localizacao, st_setsrid(st_makepoint(lng, lat), 4326)::geography) / 1000 as distancia_km
  from public.lojas l
  where l.ativo = true
    and l.localizacao is not null
    and st_dwithin(l.localizacao, st_setsrid(st_makepoint(lng, lat), 4326)::geography, raio_km * 1000)
  order by distancia_km asc;
$$;

-- ---------------------------------------------------------------------
-- FUNÇÃO: FINALIZAR PEDIDO
-- Transação atômica: cria o pedido, copia os itens, baixa o estoque e
-- fecha o carrinho. Chamada pelo backend via supabase.rpc('finalizar_pedido').
-- ---------------------------------------------------------------------
create or replace function public.finalizar_pedido(p_carrinho_id uuid)
returns uuid
language plpgsql
security definer
as $$
declare
  v_cliente_id uuid;
  v_loja_id uuid;
  v_pedido_id uuid;
  v_total numeric(10,2) := 0;
  item record;
begin
  select cliente_id, loja_id into v_cliente_id, v_loja_id
  from public.carrinhos
  where id = p_carrinho_id and status = 'aberto';

  if v_cliente_id is null then
    raise exception 'Carrinho não encontrado ou já finalizado';
  end if;

  if v_cliente_id <> auth.uid() then
    raise exception 'Não autorizado';
  end if;

  insert into public.pedidos (cliente_id, loja_id, status, total)
  values (v_cliente_id, v_loja_id, 'pendente', 0)
  returning id into v_pedido_id;

  for item in
    select ci.produto_id, ci.quantidade, ci.preco_unitario, p.nome as nome_produto, p.quantidade_estoque
    from public.carrinho_itens ci
    join public.produtos p on p.id = ci.produto_id
    where ci.carrinho_id = p_carrinho_id
    for update of p
  loop
    if item.quantidade_estoque < item.quantidade then
      raise exception 'Estoque insuficiente para o produto %', item.nome_produto;
    end if;

    insert into public.pedido_itens (pedido_id, produto_id, nome_produto, quantidade, preco_unitario)
    values (v_pedido_id, item.produto_id, item.nome_produto, item.quantidade, item.preco_unitario);

    update public.produtos
    set quantidade_estoque = quantidade_estoque - item.quantidade
    where id = item.produto_id;

    v_total := v_total + (item.quantidade * item.preco_unitario);
  end loop;

  update public.pedidos set total = v_total where id = v_pedido_id;
  update public.carrinhos set status = 'finalizado' where id = p_carrinho_id;

  return v_pedido_id;
end;
$$;

-- ---------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ---------------------------------------------------------------------
alter table public.perfis enable row level security;
alter table public.lojas enable row level security;
alter table public.categorias enable row level security;
alter table public.produtos enable row level security;
alter table public.produto_fotos enable row level security;
alter table public.carrinhos enable row level security;
alter table public.carrinho_itens enable row level security;
alter table public.pedidos enable row level security;
alter table public.pedido_itens enable row level security;
alter table public.push_subscriptions enable row level security;

drop policy if exists "perfis_leitura_publica" on public.perfis;
drop policy if exists "perfis_update_proprio" on public.perfis;
drop policy if exists "lojas_leitura_publica" on public.lojas;
drop policy if exists "lojas_insert_dono" on public.lojas;
drop policy if exists "lojas_update_dono" on public.lojas;
drop policy if exists "lojas_delete_dono" on public.lojas;
drop policy if exists "categorias_leitura_publica" on public.categorias;
drop policy if exists "categorias_gerencia_dono" on public.categorias;
drop policy if exists "produtos_select_dono" on public.produtos;
drop policy if exists "produtos_insert_dono" on public.produtos;
drop policy if exists "produtos_update_dono" on public.produtos;
drop policy if exists "produtos_delete_dono" on public.produtos;
drop policy if exists "fotos_leitura_publica" on public.produto_fotos;
drop policy if exists "fotos_gerencia_dono" on public.produto_fotos;
drop policy if exists "carrinhos_gerencia_cliente" on public.carrinhos;
drop policy if exists "carrinho_itens_gerencia_cliente" on public.carrinho_itens;
drop policy if exists "pedidos_select_cliente" on public.pedidos;
drop policy if exists "pedidos_select_dono_loja" on public.pedidos;
drop policy if exists "pedidos_insert_cliente" on public.pedidos;
drop policy if exists "pedidos_update_dono_loja" on public.pedidos;
drop policy if exists "pedido_itens_select" on public.pedido_itens;
drop policy if exists "push_subscriptions_gerencia_proprio" on public.push_subscriptions;

create policy "perfis_leitura_publica" on public.perfis
  for select using (true);
create policy "perfis_update_proprio" on public.perfis
  for update using (auth.uid() = id);

create policy "lojas_leitura_publica" on public.lojas
  for select using (ativo = true or dono_id = auth.uid());
create policy "lojas_insert_dono" on public.lojas
  for insert with check (auth.uid() = dono_id);
create policy "lojas_update_dono" on public.lojas
  for update using (auth.uid() = dono_id);
create policy "lojas_delete_dono" on public.lojas
  for delete using (auth.uid() = dono_id);

create policy "categorias_leitura_publica" on public.categorias
  for select using (true);
create policy "categorias_gerencia_dono" on public.categorias
  for all using (exists (select 1 from public.lojas l where l.id = loja_id and l.dono_id = auth.uid()));

-- produtos: SELECT direto na tabela só é liberado para o dono da loja
-- (é a tabela que guarda quantidade_estoque). O público deve consultar
-- vw_vitrine_produtos, que não expõe essa coluna.
create policy "produtos_select_dono" on public.produtos
  for select using (exists (select 1 from public.lojas l where l.id = loja_id and l.dono_id = auth.uid()));
create policy "produtos_insert_dono" on public.produtos
  for insert with check (exists (select 1 from public.lojas l where l.id = loja_id and l.dono_id = auth.uid()));
create policy "produtos_update_dono" on public.produtos
  for update using (exists (select 1 from public.lojas l where l.id = loja_id and l.dono_id = auth.uid()));
create policy "produtos_delete_dono" on public.produtos
  for delete using (exists (select 1 from public.lojas l where l.id = loja_id and l.dono_id = auth.uid()));

create policy "fotos_leitura_publica" on public.produto_fotos
  for select using (true);
create policy "fotos_gerencia_dono" on public.produto_fotos
  for all using (
    exists (
      select 1 from public.produtos p
      join public.lojas l on l.id = p.loja_id
      where p.id = produto_id and l.dono_id = auth.uid()
    )
  );

create policy "carrinhos_gerencia_cliente" on public.carrinhos
  for all using (auth.uid() = cliente_id);

create policy "carrinho_itens_gerencia_cliente" on public.carrinho_itens
  for all using (exists (select 1 from public.carrinhos c where c.id = carrinho_id and c.cliente_id = auth.uid()));

create policy "pedidos_select_cliente" on public.pedidos
  for select using (auth.uid() = cliente_id);
create policy "pedidos_select_dono_loja" on public.pedidos
  for select using (exists (select 1 from public.lojas l where l.id = loja_id and l.dono_id = auth.uid()));
create policy "pedidos_insert_cliente" on public.pedidos
  for insert with check (auth.uid() = cliente_id);
create policy "pedidos_update_dono_loja" on public.pedidos
  for update using (exists (select 1 from public.lojas l where l.id = loja_id and l.dono_id = auth.uid()));

create policy "pedido_itens_select" on public.pedido_itens
  for select using (
    exists (
      select 1 from public.pedidos pd
      where pd.id = pedido_id
        and (pd.cliente_id = auth.uid()
          or exists (select 1 from public.lojas l where l.id = pd.loja_id and l.dono_id = auth.uid()))
    )
  );

create policy "push_subscriptions_gerencia_proprio" on public.push_subscriptions
  for all using (auth.uid() = usuario_id);

-- ---------------------------------------------------------------------
-- GRANTS para os papéis padrão usados pelo Supabase (PostgREST)
-- ---------------------------------------------------------------------
grant usage on schema public to anon, authenticated;

grant select on public.lojas, public.categorias, public.produto_fotos, public.vw_vitrine_produtos, public.perfis
  to anon, authenticated;

grant select, insert, update, delete on public.lojas, public.produtos, public.categorias to authenticated;
grant select, insert, update, delete on public.carrinhos, public.carrinho_itens to authenticated;
grant select, insert, update on public.pedidos to authenticated;
grant select, insert on public.pedido_itens to authenticated;
grant select, insert, update, delete on public.push_subscriptions to authenticated;
grant update on public.perfis to authenticated;

grant execute on function public.buscar_lojas_proximas(double precision, double precision, double precision) to anon, authenticated;
grant execute on function public.finalizar_pedido(uuid) to authenticated;
