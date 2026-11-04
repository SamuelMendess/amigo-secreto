-- No máximo 5 tentativas automáticas por mensagem. O organizador pode solicitar outra tentativa.
create or replace function public.claim_group_emails(p_group_id uuid default null) returns setof jsonb
language plpgsql security definer set search_path = '' as $$
begin
  update private.email_jobs j set state = 'cancelled', payload = '{}'
  where j.kind = 'invitation' and j.state in ('pending', 'processing') and exists (
    select 1 from public.group_invites i where i.id = j.invite_id and (i.status <> 'pending' or i.expires_at <= now())
  );
  return query with candidates as (
    select id from private.email_jobs where (p_group_id is null or group_id = p_group_id) and attempts < 5
      and ((state = 'pending' and next_attempt_at <= now()) or (state = 'processing' and locked_at < now() - interval '2 minutes'))
    order by created_at for update skip locked limit 10
  ), claimed as (
    update private.email_jobs j set state = 'processing', locked_at = now(), attempts = attempts + 1
    from candidates c where j.id = c.id returning j.*
  ) select jsonb_build_object('id', id, 'recipient', recipient, 'kind', kind, 'payload', payload, 'group_id', group_id, 'attempts', attempts) from claimed;
end;
$$;
create function public.retry_group_emails(p_group_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from public.exchange_groups where id = p_group_id for update;
  if not private.is_owner(p_group_id) then raise exception 'Somente o organizador pode reenviar os avisos.'; end if;
  update private.email_jobs set next_attempt_at = now(), attempts = 0
    where group_id = p_group_id and state = 'pending';
end;
$$;
revoke all on function public.retry_group_emails(uuid) from public, anon;
grant execute on function public.retry_group_emails(uuid) to authenticated;
