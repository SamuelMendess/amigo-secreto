-- Estrutura independente das tabelas da edição de 2025.
create schema if not exists amigo_private;
revoke all on schema amigo_private from public, anon, authenticated;

create table public.exchange_groups (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id),
  name text not null check (char_length(trim(name)) between 3 and 80),
  event_date date not null,
  budget_cents integer not null check (budget_cents between 0 and 100000000),
  currency text not null default 'BRL' check (currency in ('BRL', 'EUR', 'USD')),
  description text not null default '' check (char_length(description) <= 1000),
  status text not null default 'open' check (status in ('open', 'drawn')),
  drawn_at timestamptz,
  created_at timestamptz not null default now()
);
create table public.group_members (
  group_id uuid not null references public.exchange_groups(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  display_name text not null check (char_length(display_name) between 1 and 80),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
create index group_members_user_idx on public.group_members(user_id);
create table public.group_invites (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.exchange_groups(id) on delete cascade,
  email text not null check (char_length(email) <= 254),
  token_hash text not null unique,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  email_state text not null default 'queued' check (email_state in ('queued', 'sent', 'failed')),
  expires_at timestamptz not null default now() + interval '7 days',
  created_at timestamptz not null default now()
);
create index group_invites_group_idx on public.group_invites(group_id);
create unique index group_invites_pending_email_idx on public.group_invites(group_id, email) where status = 'pending';
create table public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null,
  user_id uuid not null default auth.uid(),
  title text not null check (char_length(trim(title)) between 1 and 120),
  url text not null default '' check (char_length(url) <= 2000 and (url = '' or url ~ '^https?://')),
  notes text not null default '' check (char_length(notes) <= 1000),
  created_at timestamptz not null default now(),
  foreign key (group_id, user_id) references public.group_members(group_id, user_id) on delete cascade
);
create index wishlist_owner_idx on public.wishlist_items(group_id, user_id);
create table public.draw_assignments (
  group_id uuid not null references public.exchange_groups(id),
  giver_id uuid not null,
  recipient_id uuid not null,
  primary key (group_id, giver_id),
  unique (group_id, recipient_id),
  check (giver_id <> recipient_id),
  foreign key (group_id, giver_id) references public.group_members(group_id, user_id),
  foreign key (group_id, recipient_id) references public.group_members(group_id, user_id)
);
create table amigo_private.email_jobs (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.exchange_groups(id) on delete cascade,
  invite_id uuid references public.group_invites(id),
  recipient text not null,
  kind text not null check (kind in ('invitation', 'draw_ready')),
  payload jsonb not null,
  state text not null default 'pending' check (state in ('pending', 'processing', 'sent', 'cancelled')),
  attempts integer not null default 0,
  locked_at timestamptz,
  next_attempt_at timestamptz not null default now(),
  provider_id text,
  created_at timestamptz not null default now()
);
create index email_jobs_due_idx on amigo_private.email_jobs(state, next_attempt_at);

create function amigo_private.is_member(p_group uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.group_members where group_id = p_group and user_id = auth.uid());
$$;
create function amigo_private.is_owner(p_group uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.exchange_groups where id = p_group and owner_id = auth.uid());
$$;
create function amigo_private.verified_email() returns text
language plpgsql stable security definer set search_path = '' as $$
declare v_email text;
begin
  select lower(email) into v_email from auth.users where id = auth.uid() and email_confirmed_at is not null;
  if v_email is null then raise exception 'Confirme seu e-mail antes de continuar.'; end if;
  return v_email;
end;
$$;
create function amigo_private.display_name() returns text
language sql stable security definer set search_path = '' as $$
  select left(coalesce(nullif(trim(raw_user_meta_data->>'display_name'), ''), split_part(email, '@', 1)), 80)
  from auth.users where id = auth.uid();
$$;
-- Os primeiros 32 bits de um UUID v4 são aleatórios; rejeição evita viés de módulo.
create function amigo_private.random_below(p_upper integer) returns integer
language plpgsql volatile set search_path = '' as $$
declare v_value bigint; v_limit bigint;
begin
  if p_upper < 1 then raise exception 'Intervalo inválido.'; end if;
  v_limit := 4294967296 - (4294967296 % p_upper);
  loop
    v_value := ('x' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))::bit(32)::bigint;
    exit when v_value < v_limit;
  end loop;
  return (v_value % p_upper)::integer;
end;
$$;

alter table public.exchange_groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_invites enable row level security;
alter table public.wishlist_items enable row level security;
alter table public.draw_assignments enable row level security;
create policy groups_read on public.exchange_groups for select to authenticated using (amigo_private.is_member(id));
create policy members_read on public.group_members for select to authenticated using (amigo_private.is_member(group_id));
create policy invites_read on public.group_invites for select to authenticated using (amigo_private.is_owner(group_id));
create policy assignments_read on public.draw_assignments for select to authenticated using (giver_id = auth.uid() and amigo_private.is_member(group_id));
create policy wishes_read on public.wishlist_items for select to authenticated using (
  amigo_private.is_member(group_id) and (user_id = auth.uid() or exists (
    select 1 from public.draw_assignments d where d.group_id = wishlist_items.group_id
      and d.giver_id = auth.uid() and d.recipient_id = wishlist_items.user_id
  ))
);
create policy wishes_insert on public.wishlist_items for insert to authenticated with check (user_id = auth.uid() and amigo_private.is_member(group_id));
create policy wishes_update on public.wishlist_items for update to authenticated using (user_id = auth.uid() and amigo_private.is_member(group_id)) with check (user_id = auth.uid() and amigo_private.is_member(group_id));
create policy wishes_delete on public.wishlist_items for delete to authenticated using (user_id = auth.uid() and amigo_private.is_member(group_id));
-- As tabelas de associação, convite e sorteio só podem ser alteradas pelas funções abaixo.
revoke all on public.exchange_groups, public.group_members, public.group_invites, public.wishlist_items, public.draw_assignments from anon, authenticated;
grant select on public.exchange_groups, public.group_members, public.group_invites, public.wishlist_items, public.draw_assignments to authenticated;
grant insert, update, delete on public.wishlist_items to authenticated;
grant usage on schema amigo_private to authenticated;
grant execute on function amigo_private.is_member(uuid), amigo_private.is_owner(uuid) to authenticated;

create function public.create_exchange_group(p_name text, p_event_date date, p_budget_cents integer, p_currency text, p_description text default '') returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  perform amigo_private.verified_email();
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0));
  if (select count(*) from public.exchange_groups where owner_id = auth.uid() and created_at > now() - interval '1 day') >= 10 then
    raise exception 'Você atingiu o limite de 10 novos grupos por dia.';
  end if;
  if p_event_date < current_date then raise exception 'Escolha uma data a partir de hoje.'; end if;
  insert into public.exchange_groups(owner_id, name, event_date, budget_cents, currency, description)
    values (auth.uid(), trim(p_name), p_event_date, p_budget_cents, p_currency, trim(p_description)) returning id into v_id;
  insert into public.group_members(group_id, user_id, display_name) values (v_id, auth.uid(), amigo_private.display_name());
  return v_id;
end;
$$;

create function public.create_group_invite(p_group_id uuid, p_email text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_group public.exchange_groups; v_email text := lower(trim(p_email)); v_id uuid; v_token text; v_slots integer;
begin
  perform amigo_private.verified_email();
  -- O mesmo bloqueio serializa convite, aceite e sorteio.
  select * into v_group from public.exchange_groups where id = p_group_id for update;
  if v_group.owner_id is distinct from auth.uid() then raise exception 'Somente o organizador pode convidar.'; end if;
  if v_group.status <> 'open' then raise exception 'Este grupo já foi sorteado.'; end if;
  if v_email is null or char_length(v_email) > 254 or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Informe um e-mail válido.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0));
  if (select count(*) from public.group_invites i join public.exchange_groups g on g.id = i.group_id where g.owner_id = auth.uid() and i.created_at > now() - interval '1 day') >= 100 then
    raise exception 'Limite diário de convites atingido. Tente novamente amanhã.';
  end if;
  if exists (select 1 from public.group_members m join auth.users u on u.id = m.user_id where m.group_id = p_group_id and lower(u.email) = v_email) then raise exception 'Esta pessoa já participa do grupo.'; end if;
  update public.group_invites set status = 'revoked' where group_id = p_group_id and status = 'pending' and expires_at <= now();
  if exists (select 1 from public.group_invites where group_id = p_group_id and email = v_email and status = 'pending') then raise exception 'Já existe um convite pendente para este e-mail.'; end if;
  select (select count(*) from public.group_members where group_id = p_group_id) + (select count(*) from public.group_invites where group_id = p_group_id and status = 'pending') into v_slots;
  if v_slots >= 50 then raise exception 'O grupo atingiu 50 vagas, incluindo os convites pendentes.'; end if;
  v_token := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  insert into public.group_invites(group_id, email, token_hash) values (p_group_id, v_email, encode(sha256(convert_to(v_token, 'UTF8')), 'hex')) returning id into v_id;
  insert into amigo_private.email_jobs(group_id, invite_id, recipient, kind, payload) values (p_group_id, v_id, v_email, 'invitation', jsonb_build_object('token', v_token, 'group_name', v_group.name));
  return v_id;
end;
$$;

create function public.inspect_group_invite(p_token text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_inv public.group_invites; v_group public.exchange_groups; v_email text := amigo_private.verified_email();
begin
  select * into v_inv from public.group_invites where token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex');
  if v_inv.id is null or v_inv.email <> v_email or v_inv.status = 'revoked' or (v_inv.status = 'pending' and v_inv.expires_at <= now()) then
    raise exception 'Convite indisponível. Entre com o e-mail que recebeu o convite ou peça um novo ao organizador.';
  end if;
  select * into v_group from public.exchange_groups where id = v_inv.group_id;
  return jsonb_build_object('group_id', v_group.id, 'name', v_group.name, 'event_date', v_group.event_date, 'status', v_inv.status);
end;
$$;
create function public.accept_group_invite(p_token text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_inv public.group_invites; v_group public.exchange_groups; v_email text := amigo_private.verified_email(); v_group_id uuid;
begin
  select group_id into v_group_id from public.group_invites where token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex');
  select * into v_group from public.exchange_groups where id = v_group_id for update;
  select * into v_inv from public.group_invites where token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex') for update;
  if v_inv.id is null or v_inv.email <> v_email or v_inv.status = 'revoked' then raise exception 'Convite indisponível para esta conta.'; end if;
  if v_inv.status = 'accepted' and amigo_private.is_member(v_group_id) then return v_group_id; end if;
  if v_inv.status <> 'pending' or v_inv.expires_at <= now() then raise exception 'Este convite expirou. Peça um novo ao organizador.'; end if;
  if v_group.status <> 'open' then raise exception 'O sorteio deste grupo já foi realizado.'; end if;
  if (select count(*) from public.group_members where group_id = v_group_id) >= 50 then raise exception 'O grupo atingiu 50 participantes.'; end if;
  insert into public.group_members(group_id, user_id, display_name) values (v_group_id, auth.uid(), amigo_private.display_name());
  update public.group_invites set status = 'accepted' where id = v_inv.id;
  update amigo_private.email_jobs set state = 'cancelled', payload = '{}' where invite_id = v_inv.id and state <> 'sent';
  return v_group_id;
end;
$$;
create function public.revoke_group_invite(p_invite_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_group_id uuid;
begin
  select group_id into v_group_id from public.group_invites where id = p_invite_id;
  perform 1 from public.exchange_groups where id = v_group_id for update;
  if not amigo_private.is_owner(v_group_id) then raise exception 'Somente o organizador pode cancelar convites.'; end if;
  update public.group_invites set status = 'revoked' where id = p_invite_id and status = 'pending';
  update amigo_private.email_jobs set state = 'cancelled', payload = '{}' where invite_id = p_invite_id and state <> 'sent';
end;
$$;

create function public.draw_group(p_group_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_group public.exchange_groups; v_ids uuid[]; v_recipients uuid[]; v_count integer; v_i integer; v_j integer; v_temp uuid; v_valid boolean;
begin
  perform amigo_private.verified_email();
  select * into v_group from public.exchange_groups where id = p_group_id for update;
  if v_group.owner_id is distinct from auth.uid() then raise exception 'Somente o organizador pode sortear.'; end if;
  if v_group.status = 'drawn' then return; end if;
  if exists(select 1 from public.group_invites where group_id = p_group_id and status = 'pending' and expires_at > now()) then raise exception 'Aguarde os convites pendentes ou cancele-os antes de sortear.'; end if;
  select array_agg(user_id order by user_id) into v_ids from public.group_members where group_id = p_group_id;
  v_count := coalesce(array_length(v_ids, 1), 0);
  if v_count < 2 or v_count > 50 then raise exception 'O sorteio precisa de 2 a 50 participantes confirmados.'; end if;
  -- Fisher-Yates uniforme; rejeitar pontos fixos mantém uniformidade entre os sorteios válidos.
  loop
    v_recipients := v_ids;
    for v_i in reverse v_count..2 loop
      v_j := amigo_private.random_below(v_i) + 1;
      v_temp := v_recipients[v_i]; v_recipients[v_i] := v_recipients[v_j]; v_recipients[v_j] := v_temp;
    end loop;
    v_valid := true;
    for v_i in 1..v_count loop
      if v_ids[v_i] = v_recipients[v_i] then v_valid := false; exit; end if;
    end loop;
    exit when v_valid;
  end loop;
  for v_i in 1..v_count loop
    insert into public.draw_assignments(group_id, giver_id, recipient_id) values (p_group_id, v_ids[v_i], v_recipients[v_i]);
  end loop;
  update public.exchange_groups set status = 'drawn', drawn_at = now() where id = p_group_id;
  insert into amigo_private.email_jobs(group_id, recipient, kind, payload)
    select p_group_id, u.email, 'draw_ready', jsonb_build_object('group_name', v_group.name)
    from public.group_members m join auth.users u on u.id = m.user_id where m.group_id = p_group_id;
end;
$$;

-- Fila persistente: somente o serviço de e-mail pode obter endereços e tokens.
create function public.claim_group_emails(p_group_id uuid default null) returns setof jsonb
language plpgsql security definer set search_path = '' as $$
begin
  update amigo_private.email_jobs j set state = 'cancelled', payload = '{}'
  where j.kind = 'invitation' and j.state in ('pending', 'processing') and exists (
    select 1 from public.group_invites i where i.id = j.invite_id and (i.status <> 'pending' or i.expires_at <= now())
  );
  return query with candidates as (
    select id from amigo_private.email_jobs where (p_group_id is null or group_id = p_group_id)
      and ((state = 'pending' and next_attempt_at <= now()) or (state = 'processing' and locked_at < now() - interval '2 minutes'))
    order by created_at for update skip locked limit 10
  ), claimed as (
    update amigo_private.email_jobs j set state = 'processing', locked_at = now(), attempts = attempts + 1
    from candidates c where j.id = c.id returning j.*
  ) select jsonb_build_object('id', id, 'recipient', recipient, 'kind', kind, 'payload', payload, 'group_id', group_id, 'attempts', attempts) from claimed;
end;
$$;
create function public.finish_group_email(p_job_id uuid, p_sent boolean, p_provider_id text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare v_invite uuid;
begin
  update amigo_private.email_jobs set state = case when p_sent then 'sent' else 'pending' end,
    provider_id = coalesce(p_provider_id, provider_id), locked_at = null,
    payload = case when p_sent then '{}'::jsonb else payload end,
    next_attempt_at = now() + interval '1 minute' * least(60, power(2, least(attempts, 6)))
    where id = p_job_id and state = 'processing' returning invite_id into v_invite;
  update public.group_invites set email_state = case when p_sent then 'sent' else 'failed' end where id = v_invite;
end;
$$;
create function public.group_email_status(p_group_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not amigo_private.is_owner(p_group_id) then raise exception 'Acesso não permitido.'; end if;
  return (select jsonb_build_object('pending', count(*) filter (where state in ('pending', 'processing')), 'sent', count(*) filter (where state = 'sent')) from amigo_private.email_jobs where group_id = p_group_id);
end;
$$;

revoke all on all functions in schema amigo_private from public, anon, authenticated;
grant execute on function amigo_private.is_member(uuid), amigo_private.is_owner(uuid) to authenticated;
revoke all on function public.create_exchange_group(text,date,integer,text,text), public.create_group_invite(uuid,text), public.inspect_group_invite(text), public.accept_group_invite(text), public.revoke_group_invite(uuid), public.draw_group(uuid), public.group_email_status(uuid) from public, anon;
grant execute on function public.create_exchange_group(text,date,integer,text,text), public.create_group_invite(uuid,text), public.inspect_group_invite(text), public.accept_group_invite(text), public.revoke_group_invite(uuid), public.draw_group(uuid), public.group_email_status(uuid) to authenticated;
revoke all on function public.claim_group_emails(uuid), public.finish_group_email(uuid,boolean,text) from public, anon, authenticated;
grant execute on function public.claim_group_emails(uuid), public.finish_group_email(uuid,boolean,text) to service_role;
grant select on public.exchange_groups to service_role;
