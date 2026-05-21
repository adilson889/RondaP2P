const KixikilaManager = (() => {
  const BASE_URL = 'https://sire-kixikila-api.vercel.app/';
  let _sessao = null;

  function getSessao()        { return _sessao; }
  function setSessao(perfil)  {
    _sessao = { perfil };
    try { sessionStorage.setItem('kx_sessao', JSON.stringify(perfil)); } catch (_) {}
  }
  function limparSessao() {
    _sessao = null;
    try { sessionStorage.removeItem('kx_sessao'); } catch (_) {}
  }

  async function post(endpoint, corpo) {
    const r = await fetch(BASE_URL + endpoint, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(corpo)
    });
    const dados = await r.json();
    if (!r.ok) throw new Error(dados.erro || dados.message || `Erro ${r.status}`);
    return dados;
  }

  async function get(endpoint) {
    const r     = await fetch(BASE_URL + endpoint);
    const dados = await r.json();
    if (!r.ok) throw new Error(dados.erro || `Erro ${r.status}`);
    return dados;
  }

  // ── AUTH ────────────────────────────────────────────────────
  async function registar({ telefone, nome, senha, foto_perfil }) {
    const dados = await post('auth/registar', { telefone, nome, senha, foto_perfil });
    setSessao(dados.perfil);
    return dados.perfil;
  }

  async function entrar({ telefone, senha }) {
    const dados = await post('auth/entrar', { telefone, senha });
    setSessao(dados.perfil);
    return dados.perfil;
  }

  // ── ELIMINAR CONTA ──────────────────────────────────────────
  async function eliminarConta(telefone, senha) {
    const dados = await post('auth/eliminar', { telefone, senha });
    limparSessao();
    return dados;
  }

  // ── PERFIL ──────────────────────────────────────────────────
  async function atualizarPerfil({ telefone, nome, genero, cor, foto_perfil, senha }) {
    const dados = await post('perfil', { telefone, nome, genero, cor, foto_perfil, senha });
    setSessao(dados.perfil);
    return dados.perfil;
  }

  async function carregarPerfil(telefone) {
    return get(`perfil/${telefone.replace(/\+/g, '')}`);
  }

  async function carregarStats(telefone) {
    return get(`perfil/${telefone.replace(/\+/g, '')}/stats`);
  }

  async function carregarReputacao(telefone) {
    return get(`membro/${telefone.replace(/\+/g, '')}/reputacao`);
  }

  // ── AVALIAÇÕES RECEBIDAS ─────────────────────────────────────
  async function carregarAvaliacoesRecebidas(telefone) {
    try {
      const dados = await get(`perfil/${telefone.replace(/\+/g, '')}/avaliacoes`);
      return dados.avaliacoes || [];
    } catch (e) {
      console.error('Erro ao carregar avaliações recebidas:', e);
      return [];
    }
  }

  // ── GRUPOS DO MEMBRO ────────────────────────────────────────
  async function carregarMeusGrupos() {
    const telefone = _sessao?.perfil?.telefone;
    if (!telefone) throw new Error('Sessão inválida');
    const dados = await get(`perfil/${telefone.replace(/\+/g, '')}/grupos`);
    return dados.grupos || [];
  }

  // ── FEED ────────────────────────────────────────────────────
  async function carregarFeed({ estado, periodicidade, limite } = {}) {
    let query = 'grupos?';
    if (estado)        query += `estado=${estado}&`;
    if (periodicidade) query += `periodicidade=${periodicidade}&`;
    if (limite)        query += `limite=${limite}`;
    const dados = await get(query);
    return dados.grupos || [];
  }

  // ── GRUPOS ──────────────────────────────────────────────────
  async function criarGrupo(nome, telefone, nomeAdmin, valor, frequencia, maxMembros) {
    const dados = await post('grupo/criar', { nome, telefone, nomeAdmin, valor, periodicidade: frequencia, maxMembros });
    return dados.codigo;
  }

  async function carregarGrupo(codigo) {
    return get(`grupo/${codigo}`);
  }

  async function entrarGrupo(codigo, telefone, nomeUsuario) {
    return post(`grupo/${codigo}/entrar`, { telefone, nome: nomeUsuario });
  }

  async function sairGrupo(codigo, telefone) {
    return post(`grupo/${codigo}/sair`, { telefone });
  }

  async function removerMembro(codigo, criador_telefone, telefone_remover) {
    return post(`grupo/${codigo}/remover`, { criador_telefone, telefone_remover });
  }

  async function convidarMembro(codigo, criador_telefone, telefone_convidado) {
    return post(`grupo/${codigo}/convidar`, { criador_telefone, telefone_convidado });
  }

  async function encerrarGrupo(codigo, criador_telefone) {
    return post(`grupo/${codigo}/encerrar`, { criador_telefone });
  }

  async function carregarHistorico(codigo) {
    const dados = await get(`grupo/${codigo}/historico`);
    return dados.historico || [];
  }

  async function registarPagamento(codigo, telefone) {
    const dados = await post(`grupo/${codigo}/pagar`, { telefone });
    return { todosPagaram: dados.todos_pagaram || false, proximo: dados.proximo || 1 };
  }

  async function enviarMensagem(codigo, telefone, nome, texto) {
    return post(`grupo/${codigo}/mensagem`, { telefone, nome, texto });
  }

  // ── AVALIAÇÃO ───────────────────────────────────────────────
  async function avaliar(avaliador, avaliado, estrelas, comentario) {
    const dados = await post('avaliar', { avaliador, avaliado, estrelas, comentario });
    return dados.reputacao || 0;
  }

  // ── NOTIFICAÇÕES ────────────────────────────────────────────
  async function carregarNotificacoes() {
    const telefone = _sessao?.perfil?.telefone;
    if (!telefone) return { notificacoes: [], nao_lidas: 0 };
    return get(`notificacoes/${telefone.replace(/\+/g, '')}`);
  }

  async function marcarNotificacaoLida(id) {
    const telefone = _sessao?.perfil?.telefone;
    if (!telefone) return;
    return post(`notificacoes/${telefone.replace(/\+/g, '')}/marcar-lida`, { id });
  }
    // ── AVALIAÇÕES RECEBIDAS ─────────────────────────────────────
  async function carregarAvaliacoesRecebidas(telefone) {
    try {
      const dados = await get(`perfil/${telefone.replace(/\+/g, '')}/avaliacoes`);
      return dados.avaliacoes || [];
    } catch (e) {
      console.error('Erro ao carregar avaliações recebidas:', e);
      return [];
    }
  }

  // ── LEADERBOARD ─────────────────────────────────────────────
  async function carregarLeaderboard() {
    const dados = await get('leaderboard');
    return dados.leaderboard || [];
  }

  // ── UTILITÁRIOS ─────────────────────────────────────────────
  function reputacaoTexto(r) {
    if (r >= 4.5) return 'Excelente';
    if (r >= 3.5) return 'Confiável';
    if (r >= 2.5) return 'Regular';
    if (r >= 1.5) return 'Fraco';
    if (r > 0)    return 'Novo';
    return 'Sem avaliações';
  }

  function reputacaoEstrelas(r) {
    const c = Math.floor(r);
    return '★'.repeat(c) + '☆'.repeat(5 - c);
  }

  function formatarValor(v) {
    return new Intl.NumberFormat('pt-AO').format(v || 0);
  }

  return {
    getSessao, setSessao, limparSessao,
    registar, entrar, eliminarConta,
    atualizarPerfil, carregarPerfil, carregarStats, carregarReputacao,
    carregarAvaliacoesRecebidas,
    carregarMeusGrupos, carregarFeed,
    criarGrupo, carregarGrupo, entrarGrupo,
    sairGrupo, removerMembro, convidarMembro, encerrarGrupo,
    carregarHistorico,
    carregarAvaliacoesRecebidas, registarPagamento, enviarMensagem,
    avaliar,
    carregarNotificacoes, marcarNotificacaoLida,
    carregarLeaderboard,
    reputacaoTexto, reputacaoEstrelas, formatarValor
  };
})();