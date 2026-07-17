require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');

const lojasRoutes = require('./routes/lojas.routes');
const produtosRoutes = require('./routes/produtos.routes');
const carrinhoRoutes = require('./routes/carrinho.routes');
const pedidosRoutes = require('./routes/pedidos.routes');
const notificacoesRoutes = require('./routes/notificacoes.routes');

const app = express();

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/lojas', lojasRoutes);
app.use('/produtos', produtosRoutes);
app.use('/carrinho', carrinhoRoutes);
app.use('/pedidos', pedidosRoutes);
app.use('/notificacoes', notificacoesRoutes);

app.use((err, req, res, next) => {
  if (err && err.type === 'entity.too.large') {
    return res.status(413).json({ erro: 'Payload muito grande. Reduza o tamanho da imagem e tente novamente.' });
  }
  if (err instanceof SyntaxError) {
    return res.status(400).json({ erro: 'Corpo JSON inválido.' });
  }
  next(err);
});

app.get('/config', (req, res) => {
  res.json({
    supabaseUrl: process.env.SUPABASE_URL || null,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || null,
    vapidPublicKey: process.env.VAPID_PUBLIC_KEY || null
  });
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'index.html')));

const PORTA = process.env.PORT || 3333;
app.listen(PORTA, () => console.log(`Servidor rodando na porta ${PORTA}`));
