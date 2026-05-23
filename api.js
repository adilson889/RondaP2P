const KixikilaManager = (() => {
  const BASE = 'https://sire-kixikila-api.vercel.app/';
  let _sessao = null;

  function getSessao() { return _sessao; }

  function setSessao(dados) {
    const perfil = dados?.perfil ?? dados;
    _sessao = { perfil };
    try { localStorage.setItem('kx_sessao', JSON.stringify(perfil)); } catch (_) {}
  }

  function limparSessao() {
    _sessao = null;
    try { localStorage.removeItem('kx_sessao'); } catch (_) {}
  }

  async function http(endpoint, corpo) {
    const opcoes = corpo
      ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) }
      : { method: 'GET' };
    for (let i = 0; i < 3; i++) {
      try {
        const r = await fetch(BASE + endpoint, opcoes);
        const d = await r.json();
        if (r.status === 429) { await esperar(2000 * (i + 1)); continue; }
        if (!r.ok) throw new Error(d.erro || d.message || 'Erro ' + r.status);
        return d;
      } catch (e) {
        if (i === 2) throw e;
        await esperar(1000 * (i + 1));
      }
    }
  }

  function esperar(ms) { return new Promise(r => setTimeout(r, ms)); }

  // ── AUTH ─────────────────────────────────────────────────────
  async function registar({ telefone, nome, senha, foto_perfil, data_nasc, email, provincia, municipio }) {
    const d = await http('auth/registar', { telefone, nome, senha, foto_perfil, data_nasc, email, provincia, municipio });
    setSessao(d.perfil);
    return d.perfil;
  }

  async function entrar({ telefone, senha }) {
    const d = await http('auth/entrar', { telefone, senha });
    setSessao(d.perfil);
    return d.perfil;
  }

  async function eliminarConta(telefone, senha) {
    return http('auth/eliminar', { telefone, senha });
  }

  // ── PERFIL ───────────────────────────────────────────────────
  async function atualizarPerfil({ telefone, nome, foto_perfil, senha }) {
    const d = await http('perfil', { telefone, nome, foto_perfil, senha });
    setSessao(d.perfil);
    return d.perfil;
  }

  // ── FEED E GRUPOS ────────────────────────────────────────────
  async function carregarFeed({ estado, limite } = {}) {
    const p = new URLSearchParams();
    if (estado) p.set('estado', estado);
    if (limite) p.set('limite', String(limite));
    const d = await http('grupos?' + p.toString());
    return d.grupos || [];
  }

  async function carregarMeusGrupos() {
    const tel = _sessao?.perfil?.telefone;
    if (!tel) throw new Error('Sessao invalida');
    const d = await http('perfil/' + tel.replace(/\+/g, '') + '/grupos');
    return d.grupos || [];
  }

  async function criarGrupo({ nome, telefone, nomeAdmin, valor, periodicidade, maxMembros, descricao, regras, localizacao, foto_grupo }) {
    const d = await http('grupo/criar', { nome, telefone, nomeAdmin, valor, periodicidade, maxMembros, descricao, regras, localizacao, foto_grupo });
    return d.codigo;
  }

  async function carregarGrupo(codigo) {
    return http('grupo/' + codigo);
  }

  async function entrarGrupo(codigo, telefone, nome) {
    return http('grupo/' + codigo + '/entrar', { telefone, nome });
  }

  async function sairGrupo(codigo, telefone) {
    return http('grupo/' + codigo + '/sair', { telefone });
  }

  async function encerrarGrupo(codigo, criador_telefone) {
    return http('grupo/' + codigo + '/encerrar', { criador_telefone });
  }

  async function registarPagamento(codigo, telefone) {
    const d = await http('grupo/' + codigo + '/pagar', { telefone });
    return { todosPagaram: d.todos_pagaram || false, proximo: d.proximo || 1 };
  }

  async function enviarMensagem(codigo, telefone, nome, texto) {
    return http('grupo/' + codigo + '/mensagem', { telefone, nome, texto });
  }

  async function solicitarEntrada(codigo, telefone, nome) {
    return http('grupo/' + codigo + '/solicitar', { telefone, nome });
  }

  async function responderPedido(codigo, pedidoId, acao) {
    const perfil = _sessao?.perfil;
    if (!perfil) throw new Error('Sessao invalida');
    return http('grupo/' + codigo + '/pedido/' + pedidoId + '/' + acao, { criador_telefone: perfil.telefone });
  }

  // ── AVALIACOES ───────────────────────────────────────────────
  async function avaliar(avaliador, avaliado, estrelas, comentario) {
    return http('avaliar', { avaliador, avaliado, estrelas, comentario });
  }

  // ── NOTIFICACOES ─────────────────────────────────────────────
  async function carregarNotificacoes() {
    const tel = _sessao?.perfil?.telefone;
    if (!tel) return { notificacoes: [], nao_lidas: 0 };
    return http('notificacoes/' + tel.replace(/\+/g, ''));
  }

  // ── UTILITARIOS ──────────────────────────────────────────────
  function formatarValor(v) {
    return new Intl.NumberFormat('pt-AO').format(v || 0);
  }

  return {
    getSessao, setSessao, limparSessao,
    registar, entrar, eliminarConta, atualizarPerfil,
    carregarFeed, carregarMeusGrupos,
    criarGrupo, carregarGrupo, entrarGrupo, sairGrupo, encerrarGrupo,
    registarPagamento, enviarMensagem, solicitarEntrada, responderPedido,
    avaliar,
    carregarNotificacoes,
    formatarValor
  };
})();