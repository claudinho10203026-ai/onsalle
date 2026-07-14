# Backend - Vitrine / Marketplace

Backend em Node.js + Express que fala com o Supabase (Postgres). Cobre:
cadastro de produtos (com estoque oculto do cliente), vitrine pública,
carrinho por loja, checkout com link de WhatsApp pronto, notificação
push para o dono da loja, qualquer usuário pode virar vendedor criando
sua loja, e busca de lojas próximas por geolocalização.

## 1. Configurar o Supabase

1. Crie um projeto em https://supabase.com.
2. Vá em **SQL Editor**, cole o conteúdo de `db/schema.sql` e execute.
3. Vá em **Authentication > Providers**, ative **Google** e informe o
   Client ID / Client Secret (criados no Google Cloud Console, tela de
   consentimento OAuth). Adicione a URL de callback do Supabase nas
   origens autorizadas do Google.
4. Em **Project Settings > API**, copie a `URL`, a `anon key` e a
   `service_role key`.

## 2. Configurar o backend

```bash
cp .env.example .env
# preencha SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

npm install
npm run gerar-vapid   # gera VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY -> cole no .env

npm run dev
```

O servidor sobe em `http://localhost:3333`.

## 3. Como o front-end deve se conectar (resumo)

O front-end (web ou app) fala com o **Supabase Auth** diretamente para
login, e manda o token para o seu backend em `Authorization: Bearer <token>`.

**Login com Google:**
```js
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google'
});
```

**Chamando o backend com o token da sessão:**
```js
const { data: { session } } = await supabase.auth.getSession();

fetch('http://localhost:3333/produtos', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session.access_token}`
  },
  body: JSON.stringify({ loja_id, nome, preco, quantidade_estoque, fotos })
});
```

**Geolocalização (lojas próximas):**
```js
navigator.geolocation.getCurrentPosition(async (pos) => {
  const { latitude, longitude } = pos.coords;
  const resp = await fetch(
    `http://localhost:3333/lojas/proximas?lat=${latitude}&lng=${longitude}&raio_km=15`
  );
  const lojas = await resp.json();
});
```

**Finalizar pedido (abre o WhatsApp com a mensagem pronta):**
```js
const resp = await fetch('http://localhost:3333/pedidos/finalizar', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  body: JSON.stringify({ carrinho_id: carrinhoId })
});
const { linkWhatsapp } = await resp.json();
window.open(linkWhatsapp, '_blank'); // abre o WhatsApp, cliente só aperta enviar
```

**Ativar notificação push no navegador (PWA), para o dono da loja:**
```js
const registro = await navigator.serviceWorker.register('/sw.js');
const inscricao = await registro.pushManager.subscribe({
  userVisibleOnly: true,
  applicationServerKey: VAPID_PUBLIC_KEY // a mesma chave pública gerada no backend
});

fetch('http://localhost:3333/notificacoes/inscrever', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  body: JSON.stringify({ subscription: inscricao })
});
```
`sw.js` (service worker) precisa de um listener `self.addEventListener('push', ...)`
que chama `self.registration.showNotification(...)` com os dados recebidos.

## 4. Decisões de arquitetura (e por quê)

- **Carrinho por loja, não um carrinho único:** como o checkout final
  vira uma mensagem de WhatsApp para o número de UMA loja, cada loja
  tem seu próprio carrinho aberto para o cliente.
- **WhatsApp via `wa.me` (link), não a Business API oficial:** é grátis,
  não exige aprovação/verificação do Meta e funciona hoje. A mensagem
  vai pronta, o cliente só confirma o envio. Se no futuro quiser enviar
  automaticamente sem interação do cliente (ou responder pedidos por
  bot), aí sim vale migrar para a WhatsApp Cloud API - mas isso tem
  custo por conversa e processo de aprovação.
- **Notificação push via Web Push (`web-push`), não Firebase:** funciona
  com o próprio Node.js, sem depender de conta no Firebase. Funciona em
  Android (Chrome) e, a partir do iOS 16.4, em iPhone também - desde que
  o site seja adicionado à tela de início (vira um PWA). Se um dia isso
  virar um app nativo (React Native), aí faz mais sentido trocar para
  Firebase Cloud Messaging.
- **Geolocalização com PostGIS:** é a extensão padrão do Postgres para
  esse tipo de busca, já disponível no Supabase, com índice espacial
  (GiST) para a consulta de "lojas num raio de X km" ser rápida.
- **Estoque oculto do cliente:** a tabela `produtos` tem RLS que só
  libera leitura direta para o dono da loja. A vitrine pública consulta
  a view `vw_vitrine_produtos`, que nunca inclui a coluna
  `quantidade_estoque` - só um booleano `disponivel`.

## 5. Próximos passos possíveis

Este projeto cobre banco de dados + API. Ainda falta o front-end (tela
de login, grade de produtos, carrinho, painel do vendedor para cadastrar
produtos com upload de fotos). Posso montar isso a seguir, como um app
React, se for útil.
