# Ativação da primeira versão

## 1. Banco e autenticação

No projeto Supabase, ative e-mail/senha e mantenha a confirmação de e-mail habilitada. Configure senha mínima de 8 caracteres. Aplique as migrações em ordem, preferencialmente primeiro em um ambiente de teste:

```powershell
npx supabase login
npx supabase link --project-ref SEU_PROJECT_REF
npx supabase db push
```

As duas migrações em `supabase/migrations` também podem ser executadas, em ordem e integralmente, no SQL Editor. Não execute o SQL dos guias antigos de 2025 para criar a plataforma.

Configure a **Site URL** com o endereço do app. Em **Redirect URLs**, permita apenas seus endereços, incluindo `/auth/callback`, `/update-password` e `/invite/*`. Para desenvolvimento, acrescente os equivalentes em `http://localhost:5173`. Teste o retorno da confirmação de cadastro e da recuperação de senha, inclusive quando o cadastro começou por um convite.

Para cadastro público, configure Cloudflare Turnstile no Supabase Auth e use a chave pública correspondente em `VITE_TURNSTILE_SITE_KEY`. Não habilite o CAPTCHA no servidor sem configurar a mesma integração no frontend. O widget é opcional no ambiente local.

## 2. Frontend

Copie `.env.example` para `.env.local` e preencha as variáveis públicas. Na hospedagem, configure as mesmas variáveis antes de executar `npm run build`. A chave pública pode aparecer no navegador; as políticas RLS controlam o acesso. `SUPABASE_SERVICE_ROLE_KEY` e `RESEND_API_KEY` nunca podem aparecer no frontend.

O `vercel.json` contém o fallback das rotas para a SPA e os cabeçalhos básicos. Para outra hospedagem, configure o mesmo fallback. A instalação pelo navegador exige HTTPS em produção e usa o manifesto e os ícones de `public/`.

## 3. Domínio e e-mails de autenticação

No Resend, verifique um domínio ou subdomínio que você controla, configure SPF/DKIM e uma política DMARC apropriada. Use um endereço desse domínio como remetente. O endereço de teste do Resend não atende convidados externos.

Configure o SMTP personalizado no Supabase Auth para confirmação e recuperação de senha. O serviço embutido do Supabase é destinado a testes. Ajuste os limites de Auth e do provedor para o número de pessoas que entrarão juntas. Desative rastreamento de cliques nos e-mails de autenticação para preservar os links de uso único.

Documentação: [Supabase SMTP](https://supabase.com/docs/guides/auth/auth-smtp), [domínios Resend](https://resend.com/docs/dashboard/domains/introduction).

## 4. Convites e avisos de sorteio

Copie `.env.functions.example` para `.env.functions` (ignorado pelo Git), preencha os valores e configure os segredos:

```powershell
npx supabase secrets set --env-file .env.functions
npx supabase functions deploy process-emails
```

`APP_URL` deve ser a origem exata do app, sem barra final. O CORS aceita somente essa origem. Para desenvolvimento da função use a origem local; para produção use o domínio publicado. `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` são disponibilizadas automaticamente pelo ambiente das Edge Functions.

O arquivo `supabase/config.toml` desliga a validação de JWT do gateway somente nesta função. O handler exige e valida o JWT pelo `Auth.getUser`, verifica e-mail confirmado e propriedade do grupo. O agendador usa um segredo diferente em `x-worker-secret`, nunca entregue ao navegador.

## 5. Retomada automática da fila

O app tenta enviar imediatamente após o convite e o sorteio. Para que falhas sejam retomadas com o navegador fechado:

1. Habilite `pg_cron` e `pg_net` no Supabase.
2. Em Vault, crie `amigo_email_worker_url` com `https://SEU_PROJECT_REF.supabase.co/functions/v1/process-emails`.
3. Em Vault, crie `amigo_email_worker_secret` com o mesmo segredo forte e aleatório de `EMAIL_WORKER_SECRET`. Use no mínimo 32 bytes de aleatoriedade.
4. Execute `supabase/schedule-email-worker.sql` no SQL Editor.

O agendador processa até 10 mensagens por execução, uma vez por minuto. Mensagens ficam em uma fila privada, com backoff e no máximo 5 tentativas automáticas. O organizador pode solicitar outra tentativa na tela. Um erro de e-mail nunca refaz o sorteio.

O Resend mantém as chaves de idempotência por 24 horas; a fila preserva os envios confirmados permanentemente. Uma tentativa manual muito posterior a uma falha ambígua pode reenviar um aviso. Não reabra automaticamente mensagens antigas já enviadas. As chamadas são espaçadas, mas aumentos de volume entre vários workers exigem adequar o limite global do provedor.

## 6. Conferência antes de abrir o app

Valide com duas caixas de e-mail suas: criação e confirmação da conta, convite, aceite pela conta correta, recuperação de senha, sorteio e consulta individual das dicas. Verifique que outro grupo não aparece e que o organizador não lê a lista completa de pares pela API. Teste bloqueio de um 51º participante, dois pedidos simultâneos de sorteio e falha do provedor com retomada pelo agendador.

Os testes locais não usam contas reais do Supabase nem enviam mensagens pelo Resend. Há testes de SQL/RLS em PGlite e testes de navegador com respostas controladas; a conferência real depende desta configuração.

Os planos de hospedagem, banco e e-mail precisam comportar uso público. A análise local de dependências de produção deve ser repetida com `npm audit --omit=dev`; o conjunto antigo de ESLint pode conter avisos de dependências apenas de desenvolvimento. Não aplique atualizações incompatíveis automaticamente.
