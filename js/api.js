const KixikilaManager = (() => {
  const BASE_URL = 'https://sire-kixikila-api.vercel.app/';
  let _sessao = null;

  // ── SESSAO (localStorage — sobrevive ao refresh) ─────────────
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

  // ── HTTP COM RETRY E BACKOFF ──────────────────────────────────
  async function fetchComRetry(url, opcoes = {}, tentativas = 3) {
    for (let i = 0; i < tentativas; i++) {
      try {
        const r     = await fetch(url, opcoes);
        const dados = await r.json();
        if (r.status === 429) {
          // rate limit — espera e tenta de novo
          await new Promise(res => setTimeout(res, 2000 * (i + 1)));
          continue;
        }
        if (!r.ok) throw new Error(dados.erro || dados.message || `Erro ${r.status}`);
        return dados;
      } catch (e) {
        if (i === tentativas - 1) throw e;
        await new Promise(res => setTimeout(res, 1000 * (i + 1)));
      }
    }
  }

  async function post(endpoint, corpo) {
    return fetchComRetry(BASE_URL + endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(corpo)
    });
  }

  async function get(endpoint) {
    return fetchComRetry(BASE_URL + endpoint);
  }

  // ── AUTH ─────────────────────────────────────────────────────
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

  async function eliminarConta(telefone, senha) {
    return post('auth/eliminar', { telefone, senha });
  }

  // ── PERFIL ───────────────────────────────────────────────────
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

  async function carregarAvaliacoesRecebidas(telefone) {
    try {
      const dados = await get(`perfil/${telefone.replace(/\+/g, '')}/avaliacoes`);
      return dados.avaliacoes || [];
    } catch { return []; }
  }

  // ── GRUPOS ───────────────────────────────────────────────────
  async function carregarMeusGrupos() {
    const telefone = _sessao?.perfil?.telefone;
    if (!telefone) throw new Error('Sessão inválida');
    const dados = await get(`perfil/${telefone.replace(/\+/g, '')}/grupos`);
    return dados.grupos || [];
  }

  async function carregarFeed({ estado, periodicidade, limite } = {}) {
    const params = new URLSearchParams();
    if (estado)        params.set('estado', estado);
    if (periodicidade) params.set('periodicidade', periodicidade);
    if (limite)        params.set('limite', String(limite));
    const dados = await get('grupos?' + params.toString());
    return dados.grupos || [];
  }

  async function criarGrupo(nome, telefone, nomeAdmin, valor, frequencia, maxMembros, foto) {
    const dados = await post('grupo/criar', {
      nome, telefone, nomeAdmin, valor,
      periodicidade: frequencia, maxMembros, foto_grupo: foto || ''
    });
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

  // ── AVALIACAO ────────────────────────────────────────────────
  async function avaliar(avaliador, avaliado, estrelas, comentario) {
    const dados = await post('avaliar', { avaliador, avaliado, estrelas, comentario });
    return dados.reputacao || 0;
  }

  // ── NOTIFICACOES ─────────────────────────────────────────────
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

  // ── LEADERBOARD ──────────────────────────────────────────────
  async function carregarLeaderboard() {
    const dados = await get('leaderboard');
    return dados.leaderboard || [];
  }

  // ── UTILITARIOS ──────────────────────────────────────────────
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
    carregarHistorico, registarPagamento, enviarMensagem,
    avaliar,
    carregarNotificacoes, marcarNotificacaoLida,
    carregarLeaderboard,
    reputacaoTexto, reputacaoEstrelas, formatarValor
  };
})(); 