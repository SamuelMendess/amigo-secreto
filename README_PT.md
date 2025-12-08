# 🎄 Amigo Secreto - Sistema em Tempo Real

## ✨ O que foi implementado?

Seu site agora tem:

✅ **Contagem regressiva** com visual destacado  
✅ **Mural da Ceia** com itens salvos em banco de dados  
✅ **Sincronização em tempo real** - todos veem quando alguém adiciona um item  
✅ **Responsivo** para mobile, tablet e desktop  
✅ **Deploy pronto** para Vercel

## 🚀 Próximos Passos

### 1. Configurar Supabase (5 minutos)

Siga o guia em `SUPABASE_SETUP.md` para:

- Criar conta no Supabase (gratuito!)
- Criar a tabela do banco
- Copiar as credenciais no arquivo `.env`

### 2. Testar Localmente

```bash
npm run dev
```

Abra em dois navegadores diferentes e veja a sincronização em tempo real!

### 3. Deploy no Vercel

```bash
git add .
git commit -m "Add Supabase integration"
git push origin main
```

Vercel faz deploy automaticamente! 🎉

## 📋 Como Usar

1. **Abrir participante** → Clica no card da pessoa
2. **Ir ao Mural da Ceia** → Scroll até o final
3. **Adicionar item** → Clica em "+ Adicionar" e preenche:
   - Item: ex. "Pudim"
   - Quem vai trazer?: seu nome
4. **Pronto!** → Todos os participantes veem em tempo real

## 💡 Dicas

- O Supabase tem um plano **gratuito** e é perfeito para isso
- Você pode adicionar ou remover itens a qualquer momento
- Os dados ficam salvos permanentemente
- Funciona em qualquer dispositivo com internet

## 🆘 Dúvidas?

Se algo não funcionar:

1. Verifique se adicionou as variáveis de ambiente no `.env`
2. Verifique se a tabela foi criada no Supabase
3. Abra o console do navegador (F12) para ver mensagens de erro
