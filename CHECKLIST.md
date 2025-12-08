# ✅ Checklist de Deploy - Amigo Secreto

## 🟢 Desenvolvimento (CONCLUÍDO ✅)

- [x] Contagem regressiva com animações
- [x] Cards interativos dos participantes
- [x] Modal com lista de desejos
- [x] Mural da Ceia com funcionalidade
- [x] Transições suaves
- [x] Botão "Voltar ao topo"
- [x] Design responsivo
- [x] Integração com Supabase

---

## 🔵 Setup Supabase (TODO ⏳)

Você vai precisar fazer isso uma única vez:

### 1️⃣ Criar Conta

- [ ] Acessar https://supabase.com
- [ ] Fazer Sign Up com GitHub ou Email
- [ ] Confirmar email

### 2️⃣ Criar Projeto

- [ ] Clicar "New Project"
- [ ] Nome: `amigo-secreto`
- [ ] Definir senha
- [ ] Escolher região (Brasil recomendado)
- [ ] Aguardar criação (2-3 minutos)

### 3️⃣ Criar Tabela

- [ ] Ir para SQL Editor
- [ ] Nova Query
- [ ] Colar o SQL (veja SUPABASE_SETUP.md)
- [ ] Executar
- [ ] Verificar se foi criada

### 4️⃣ Copiar Credenciais

- [ ] Ir para Settings → API
- [ ] Copiar "Project URL"
- [ ] Copiar "anon public"
- [ ] Abrir arquivo `.env`
- [ ] Colar valores

---

## 🟡 Teste Local (TODO ⏳)

Depois que configurar Supabase:

- [ ] Rodar `npm run dev`
- [ ] Abrir http://localhost:5173
- [ ] Clicar em um participante
- [ ] Ir ao Mural da Ceia
- [ ] Adicionar um item (ex: "Pudim" → "Samuel")
- [ ] Ver item aparecer na lista
- [ ] Abrir em outro navegador/aba
- [ ] Verificar se sincroniza em tempo real
- [ ] Remover o item
- [ ] Verificar sincronização

---

## 🟣 Deploy Vercel (TODO ⏳)

### Preparação

- [ ] Ter conta no GitHub
- [ ] Seu projeto estar em um repositório Git
- [ ] Fazer `git add .`
- [ ] Fazer `git commit -m "feat: Add Supabase real-time sync"`
- [ ] Fazer `git push origin main`

### Deploy

- [ ] Acessar https://vercel.com
- [ ] Fazer login com GitHub
- [ ] Clicar "Import Project"
- [ ] Selecionar seu repositório `amigo-secreto`
- [ ] Clicar "Import"
- [ ] Aguardar build

### Variáveis de Ambiente no Vercel

- [ ] Ir para Settings
- [ ] Clicar "Environment Variables"
- [ ] Adicionar `VITE_SUPABASE_URL` com seu valor
- [ ] Adicionar `VITE_SUPABASE_ANON_KEY` com seu valor
- [ ] Salvar
- [ ] Voltar para Deployments
- [ ] Clicar nos 3 pontos da build anterior
- [ ] "Redeploy"

### Verificação Final

- [ ] Esperar build terminar (com ✅ verde)
- [ ] Clicar em "Visit"
- [ ] Site abrir com seu domínio `.vercel.app`
- [ ] Testar adicionar item ao Mural
- [ ] Abrir em outro navegador
- [ ] Verificar sincronização em tempo real

---

## 📊 Status Geral

```
Frontend ............ ✅ PRONTO
Backend/Database .... 🔵 AGUARDANDO SETUP
Testes Locais ....... 🔵 AGUARDANDO SETUP
Deploy ............. 🔵 AGUARDANDO TUDO
Produção ........... 🟡 NÃO INICIADO
```

---

## 💡 Tempo Estimado

| Etapa          | Tempo      |
| -------------- | ---------- |
| Supabase Setup | 10 min     |
| Testes Locais  | 5 min      |
| Deploy Vercel  | 5 min      |
| **TOTAL**      | **20 min** |

---

## 🎯 Resultado Final

Após completar tudo, você terá:

✨ Um site de Amigo Secreto online  
✨ Com sincronização em tempo real  
✨ Acessível pelo mundo inteiro  
✨ Que salva dados permanentemente  
✨ 100% gratuito  
✨ Com domínio `.vercel.app`

---

## 📞 Problemas?

Leia os arquivos nesta ordem:

1. `SUPABASE_SETUP.md` - Para setup do banco
2. `DEPLOYMENT.md` - Para deploy
3. `README_PT.md` - Para uso geral

Boa sorte, Samuel! 🚀
