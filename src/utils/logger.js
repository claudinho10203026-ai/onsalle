/**
 * Logger Estruturado para OnSalle
 * Uso simples: logger.info(), logger.warn(), logger.error()
 * 
 * Instalação:
 * npm install winston
 * 
 * Implementação rápida sem dependência (apenas console):
 */

const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };

class Logger {
  constructor(module) {
    this.module = module;
  }

  #shouldLog(level) {
    return LEVELS[level] >= LEVELS[LOG_LEVEL];
  }

  #formatTime() {
    return new Date().toISOString();
  }

  #formatMessage(level, message, data = {}) {
    const timestamp = this.#formatTime();
    const levelUpper = level.toUpperCase();
    const metadata = Object.keys(data).length ? ` ${JSON.stringify(data)}` : '';
    return `[${timestamp}] [${levelUpper}] [${this.module}] ${message}${metadata}`;
  }

  debug(message, data) {
    if (this.#shouldLog('debug')) console.debug(this.#formatMessage('debug', message, data));
  }

  info(message, data) {
    if (this.#shouldLog('info')) console.log(this.#formatMessage('info', message, data));
  }

  warn(message, data) {
    if (this.#shouldLog('warn')) console.warn(this.#formatMessage('warn', message, data));
  }

  error(message, data) {
    if (this.#shouldLog('error')) console.error(this.#formatMessage('error', message, data));
  }
}

module.exports = Logger;

// ========================================
// EXEMPLO DE USO EM PEDIDOS.ROUTES.JS
// ========================================

const loggerExample = `
// No topo de pedidos.routes.js:
const Logger = require('../utils/logger');
const logger = new Logger('pedidos.routes');

// Em POST /finalizar:
logger.info('Criando pedido', {
  carrinho_id: req.body.carrinho_id,
  usuario_id: req.usuario.id,
  forma_pagamento: req.body.forma_pagamento
});

try {
  // ... criar pedido ...
  logger.info('✓ Pedido criado', { pedido_id: pedido.id, total: pedido.total });
} catch (err) {
  logger.error('✗ Erro ao criar pedido', { erro: err.message, stack: err.stack });
}

// Em PATCH /:id/status (baixa):
logger.info('Atualizando status do pedido', {
  pedido_id: req.params.id,
  novo_status: req.body.status,
  intervalo_dias: req.body.intervalo_dias
});

if (intervalo_dias && [30, 60, 90, 120, 150].includes(intervalo_dias)) {
  logger.debug('Intervalo válido', { intervalo_dias });
} else {
  logger.warn('Intervalo fora do padrão, usando default 30', { intervalo_dias });
}

// Em GET /:id/pdf-boleto/:parcelaId:
logger.info('Download de boleto solicitado', {
  pedido_id: req.params.id,
  parcela_id: req.params.parcelaId,
  usuario_id: req.usuario.id
});

if (!isCliente && !isDono) {
  logger.warn('✗ Acesso negado ao PDF', {
    pedido_id: req.params.id,
    usuario_id: req.usuario.id,
    cliente_id: pedido.cliente_id
  });
  return res.status(403).json({ erro: 'Não autorizado' });
}

logger.info('✓ PDF boleto enviado', { parcela_id: req.params.parcelaId });
`;

console.log(loggerExample);
