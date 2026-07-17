# Correções feitas nesta sessão

Todas as mudanças foram só em `public/index.html` (front-end). Não precisou
alterar `db/schema.sql` nem as rotas do back-end — a estrutura do banco já
suportava tudo, o problema estava em como o front-end consumia os dados.

## 1. Menu "Vendedor" aparecia antes de criar loja

**Causa:** em `render()`, a linha que decide se o grupo "Vendedor" aparece
no menu era `vendedorGroup.hidden = false` — ou seja, aparecia sempre que
havia alguém logado, loja ou não.

**Correção:** agora é `vendedorGroup.hidden = !(state.minhasLojas.length > 0)`.
Também passei a chamar `render()` de novo ao final de `carregarMinhasLojas()`,
porque é só depois dessa chamada que o app sabe se a pessoa tem loja.

## 2. Pedido feito em uma loja aparecia na tela errada

**Causa raiz:** a tela "Pedidos" (menu Compras — deveria mostrar as
compras do próprio usuário) e o painel financeiro do vendedor (dashboard,
"Contas a receber", "Contas pagas") **dividiam o mesmo cache**
(`state.pedidos`). A função que buscava os pedidos decidia sozinha, com
base em "essa pessoa tem alguma loja?", se buscava as compras do cliente
OU os pedidos recebidos pela loja — nunca os dois. Resultado: assim que
alguém criava uma loja, a tela "Pedidos" parava de mostrar as compras
dela como cliente e passava a mostrar (de forma escondida/confusa) pedidos
recebidos pela própria loja, e o painel do vendedor podia herdar dados
errados do último carregamento.

**Correção:** separei em dois caches independentes:
- `state.pedidos` → sempre as compras do usuário como cliente (usado só
  pela tela "Pedidos").
- `state.pedidosRecebidos` → sempre os pedidos recebidos pela(s) loja(s)
  do usuário (usado pelo painel/dashboard, "Contas a receber" e "Contas
  pagas").

Cada tela agora busca só o que é dela, sempre, sem depender de cache
"se já tiver algo, não busca de novo" (essa era a segunda causa de dados
cruzados aparecerem).

Também tirei os botões de "marcar como pago" da tela "Pedidos" do cliente
— quem confirma o recebimento do pagamento é o vendedor, em "Contas a
receber", não o próprio cliente na tela de compras dele.

## 3. Dar baixa em uma parcela dava baixa em todas

**Causa raiz:** todo pedido, mesmo os "a prazo" com várias parcelas, tinha
DOIS jeitos de "marcar como pago" aparecendo ao mesmo tempo:
1. Um botão por parcela (`Registrar baixa`), que já chamava a rota certa
   (`PATCH /pedidos/:id/parcela/:parcelaId`) e mexia em uma linha só. Esse
   sempre funcionou certo.
2. Um botão geral do pedido ("Marcar como pago"), que chama
   `PATCH /pedidos/:id/status`. Essa rota só cria/atualiza parcelas
   individualmente quando o método de pagamento no formulário está como
   "A prazo" **e** o campo de número de parcelas está preenchido; em
   qualquer outro caso (inclusive o padrão "Dinheiro", ou quando esse
   formulário nem aparecia no card, como em "Contas a receber"), ela
   marcava **todas** as parcelas daquele pedido como pagas de uma vez.

Como as duas opções apareciam juntas no mesmo pedido, era fácil clicar no
botão errado (o geral) pensando que ele ia quitar só uma parcela.

**Correção:** o botão geral de "Marcar como pago" agora só aparece quando
o pedido **não tem parcelas cadastradas ainda** (pedidos antigos, de antes
dessa funcionalidade existir) ou quando tem só 1 parcela — casos em que
"marcar tudo como pago" e "dar baixa na única parcela" são a mesma coisa.
Assim que existem 2 ou mais parcelas, esse botão de baixa em bloco some
completamente, e a única forma de dar baixa passa a ser uma por uma, no
botão "Registrar baixa" de cada parcela.

## 4. Site não funcionava no celular

**Causa raiz:** numa correção anterior, a barra lateral (sidebar) foi
**completamente desativada no celular** (`display: none !important` no
CSS, e o próprio JavaScript apagava do DOM o botão de abrir o menu, a
sobreposição escura e até o ícone de hambúrguer). Foi colocada uma barra
de navegação inferior no lugar, mas ela só cobre 7 das páginas do site —
"Minhas lojas", "Cadastrar produto", "Contas pagas" e "Estoque" não
estavam nela, e como a sidebar estava travada, essas páginas ficavam
**impossíveis de abrir pelo celular**.

**Correção:**
- A sidebar voltou a funcionar como uma gaveta no celular (fica fora da
  tela e desliza pra dentro quando aberta), em vez de ficar bloqueada.
- Troquei o atalho "Financeiro" da barra inferior por um botão **"Mais"**,
  que abre essa gaveta com todas as seções secundárias (Minhas lojas,
  Cadastrar produto, Contas a receber, Contas pagas, Estoque, Tema, Sair).
- O botão "Menu" que já existia no topo da página também voltou a
  funcionar (antes também era removido).
- Adicionei proteção contra rolagem horizontal indesejada
  (`overflow-x: hidden`) e um limite de largura pra gaveta em telas muito
  estreitas (`max-width: 85vw`).

No desktop nada muda — a sidebar sempre funcionou normalmente lá; o
problema era só no celular.

## O que testar

1. Criar uma conta nova (Google) e confirmar que o menu "Vendedor" **não**
   aparece até criar uma loja.
2. Com duas contas diferentes (uma dona de loja, outra só cliente): a
   dona da loja compra em OUTRA loja e confere que essa compra aparece só
   em "Pedidos" dela (como cliente) — não deve aparecer nas "Contas a
   receber"/painel da própria loja dela.
3. Criar um pedido "a prazo" com 3 parcelas, dar baixa em só uma delas em
   "Contas a receber" e confirmar que as outras duas continuam pendentes.
4. Abrir o site pelo celular e conferir que dá pra chegar em todas as
   páginas (inclusive "Minhas lojas", "Cadastrar produto", "Contas pagas"
   e "Estoque") pelo botão "Mais" da barra inferior.
