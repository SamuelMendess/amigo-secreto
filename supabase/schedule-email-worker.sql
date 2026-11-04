-- Pré-requisitos: pg_cron, pg_net e os dois segredos do Vault descritos em docs/SETUP.md.
-- cron.schedule atualiza o agendamento caso o nome já exista.
select cron.schedule('amigo-secret-email-worker', '* * * * *', $job$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'amigo_email_worker_url'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-worker-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'amigo_email_worker_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
$job$);
