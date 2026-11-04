# Amigo Secreto

Aplicativo React para criar grupos de 2 a 50 participantes, convidar por e-mail, compartilhar desejos e realizar um sorteio sigiloso. Cada conta pode organizar e participar de vários grupos.

## Primeira versão

- Cadastro com confirmação de e-mail, login, saída e recuperação de senha pelo Supabase Auth.
- Grupo com data configurável, orçamento em centavos, moeda e recado.
- Organizador também participa; os demais entram por convites individuais vinculados ao e-mail, válidos por 7 dias.
- Até 50 vagas por grupo, incluindo os convites pendentes. Convites podem ser cancelados antes do aceite.
- Lista de desejos com título, link e dicas. Só o dono e quem o tirou leem essa lista.
- Sorteio uniforme no PostgreSQL, sem autopares: cada pessoa dá e recebe exatamente um presente.
- Resultado acessível somente ao próprio participante, inclusive para quem organiza.
- Fila de e-mail persistente com tentativas limitadas, retomada e chave de idempotência por mensagem.
- Interface responsiva em português, ícones e manifesto para instalação pelo navegador.

Depois do sorteio, os participantes ficam fechados nesta edição. Restrições entre casais, novo sorteio, saída/remoção de participantes confirmados, rateio de despesas e mensagens anônimas ficam para as próximas entregas. A aplicação usa internet; não guarda resultados em um cache offline.

## Desenvolvimento

Requer Node.js 22.12+ ou 24 e npm.

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Preencha `.env.local` com a URL e a chave pública do projeto Supabase. Sem configuração, a entrada mostra uma mensagem de preparação e mantém o cadastro desabilitado.

```powershell
npm test
npm run lint
npm run build
npm run test:ui
```

Os testes de UI usam respostas controladas do Auth/API e **não enviam e-mails**. No Windows usam o Edge instalado; em outros sistemas, instale o Chromium de teste com `npx playwright install chromium`. É possível selecionar outro navegador com `PLAYWRIGHT_CHANNEL`. A migração real e suas permissões são executadas nos testes de banco com PostgreSQL em WebAssembly (PGlite).

## Ativar o serviço

Siga [SETUP.md](docs/SETUP.md) para aplicar migrações, configurar Auth e Resend, publicar a função e ligar o agendador. Nenhuma chave secreta deve usar o prefixo `VITE_`.

A publicação do frontend sozinha não ativa os cadastros e convites: o banco, o Auth e a função de e-mail também precisam estar configurados. A função de e-mail valida a sessão e a propriedade do grupo no servidor antes de acessar a fila.

## Estrutura

- `src/components`: entrada, grupos, convites, desejos e resultado.
- `src/lib`: acesso ao backend e formatação.
- `supabase/migrations`: tabelas, permissões, convites, sorteio e fila.
- `supabase/functions/process-emails`: envio pelo Resend, exclusivo do servidor.
- `supabase/schedule-email-worker.sql`: agendador opcional de desenvolvimento, necessário em produção para retomar a fila com o app fechado.
- `tests`: permissões, capacidade, sorteio, templates, handler de e-mail e navegação.

Os arquivos de participantes, fotos e guias antigos pertencem à edição de 2025. O novo aplicativo não importa a lista fixa. As migrações são aditivas e não alteram `food_items` ou `expenses` antigos; as permissões dessas tabelas legadas devem ser revisadas na migração da edição antiga.

## Validação e limites

Os testes locais cobrem grupos de 2, 10 e 50 pessoas, isolamento entre usuários, impossibilidade de escrever pares diretamente, convite por destinatário, expiração, limite de vagas e repetição do comando de sorteio. Locks de linha e uma única transação serializam aceite, convite e sorteio no PostgreSQL. Concorrência com múltiplas conexões e envio/recuperação reais precisam de verificação no projeto Supabase configurado.

Há limites de 10 grupos criados e 100 convites por organizador em 24 horas para conter abuso inicial. As notificações confirmam aceite do pedido pelo provedor, não chegada à caixa de entrada. Tratamento de bounces/complaints por webhook é uma evolução necessária antes de aumentar substancialmente o envio público. A autenticação do domínio e os limites de envio precisam ser configurados antes de abrir inscrições.

O limite de 50 é por grupo. O volume total de grupos e os limites do plano contratado determinam a capacidade total da plataforma. As permissões protegem participantes e organizadores na aplicação; administradores da infraestrutura ainda têm acesso administrativo aos dados.
