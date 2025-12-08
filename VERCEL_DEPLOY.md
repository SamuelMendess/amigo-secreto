🚀 CONECTAR VERCEL - PASSO A PASSO

═══════════════════════════════════════════════════════════════════════════════

VOCÊ ESTÁ AQUI:
✅ GitHub atualizado com todos os commits
✅ Código no repositório público
⏳ Faltam 5 passos para estar ONLINE!

═══════════════════════════════════════════════════════════════════════════════

PASSO 1: Acesse Vercel
────────────────────────

1. Abra https://vercel.com
2. Faça login com sua conta GitHub
   (se não tiver, crie uma conta)
3. Clique em "Add New..." → "Project"


PASSO 2: Selecione o Repositório
──────────────────────────────────

1. Procure por "amigo-secreto"
2. Clique em "Import"


PASSO 3: Configure o Projeto
──────────────────────────

Na tela de configuração:

Root Directory: ./
Build Command: npm run build
Output Directory: dist
Install Command: npm install

(Já deve estar preenchido, mas verifique!)


PASSO 4: Adicione Variáveis de Ambiente ⭐ SUPER IMPORTANTE
──────────────────────────────────────────────────────

Clique em "Environment Variables" e adicione:

Nome: VITE_SUPABASE_URL
Valor: [Copie de: https://app.supabase.com → Settings → API → Project URL]

Nome: VITE_SUPABASE_ANON_KEY
Valor: [Copie de: https://app.supabase.com → Settings → API → anon public]

Clique em "Add" para cada uma


PASSO 5: Deploy
─────────────

1. Clique em "Deploy"
2. Aguarde (leva ~2-3 minutos)
3. Quando aparecer ✅, seu site está ONLINE!


RESULTADO FINAL:
════════════════════════════════════════════════════════════════════════════════

Seu site estará em:
https://seu-projeto.vercel.app

Vocês podem:
✅ Acessar de qualquer lugar
✅ Adicionar itens ao Mural
✅ Ver sincronização em tempo real
✅ Compartilhar a URL com amigos


DICAS IMPORTANTES:
═══════════════════════════════════════════════════════════════════════════════

1. Se o deploy falhar, verifique as variáveis de ambiente
2. Certifique-se que copiou as chaves corretas do Supabase
3. Não esqueça de salvar após adicionar as variáveis
4. O primeiro deploy leva mais tempo, os próximos são rápidos


DEPOIS DO DEPLOY:
═════════════════════════════════════════════════════════════════════════════════

Toda vez que você fizer:
$ git push origin main

Vercel automaticamente:
1. Detecta a mudança
2. Faz build
3. Publica o site

SEM você fazer nada! 🎉


ESTÁ PRONTO?
═════════════════════════════════════════════════════════════════════════════════

[ ] GitHub tem o código ✅
[ ] Criou conta Vercel
[ ] Importou o projeto
[ ] Adicionou variáveis
[ ] Clicou em Deploy
[ ] Site está ONLINE!


PRÓXIMA ETAPA:
═════════════════════════════════════════════════════════════════════════════════

1. Acesse sua URL no Vercel
2. Clique em um participante
3. Vá ao Mural da Ceia
4. Adicione um item
5. Sincronização funciona? ✨

Se funcionar, PARABÉNS! 🎉
Seu site está PRODUÇÃO!

═══════════════════════════════════════════════════════════════════════════════

Qualquer dúvida, leia:
- DEPLOYMENT.md (tem mais detalhes)
- SUPABASE_SETUP.md (confirmar credenciais)
