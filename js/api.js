const KixikilaManager = (() => {
  const BASE_URL = 'https://sire-kixikila-api.vercel.app/';

  // Sessão em memória — limpa ao fechar o browser
  let _sessao = null; // { perfil }

  function getSessao()          { return _sessao; }
  function setSessao(perfil)    { _sessao = { perfil }; }
  function limparSessao()       { _sessao = null; }

  async function post(endpoint, corpo) {
    const r = await fetch(BASE_URL + endpoint, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(corpo)
    });
    const dados = await r.json();
    if (!r.ok) throw new Error(dados.erro || dados.message || `Erro ${r.status}`);
    return dados;
  }

  async function get(endpoint) {
    const r = await fetch(BASE_URL + endpoint);
    const dados = await r.json();
    if (!r.ok) throw new Error(dados.erro || `Erro ${r.status}`);
    return dados;
  }

  // ── AUTH ──────────────────────────────────────────────────
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

  // ── PERFIL ────────────────────────────────────────────────
  async function atualizarPerfil({ telefone, nome, genero, cor, foto_perfil, senha }) {
    const dados = await post('perfil', { telefone, nome, genero, cor, foto_perfil, senha });
    if (_sessao) _sessao.perfil = dados.perfil;
    return dados.perfil;
  }

  async function carregarPerfil(telefone) {
    return get(`perfil/${telefone.replace(/\+/g, '')}`);
  }

  async function carregarMeusGrupos() {
    const telefone = _sessao?.perfil?.telefone;
    if (!telefone) throw new Error('Sessão inválida');
    const dados = await get(`perfil/${telefone.replace(/\+/g, '')}/grupos`);
    return dados.grupos || [];
  }

  // ── GRUPOS ────────────────────────────────────────────────
  async function criarGrupo(nome, telefone, nomeAdmin, valor, frequencia, maxMembros) {
    const dados = await post('grupo/criar', {
      nome, telefone, nomeAdmin, valor, periodicidade: frequencia, maxMembros
    });
    return dados.codigo;
  }

  async function carregarGrupo(codigo) {
    return get(`grupo/${codigo}`);
  }

  async function entrarGrupo(codigo, telefone, nomeUsuario) {
    return post(`grupo/${codigo}/entrar`, { telefone, nome: nomeUsuario });
  }

  async function registarPagamento(codigo, telefone) {
    const dados = await post(`grupo/${codigo}/pagar`, { telefone });
    return { todosPagaram: dados.todos_pagaram || false, proximo: dados.proximo || 1 };
  }

  async function enviarMensagem(codigo, telefone, nome, texto) {
    return post(`grupo/${codigo}/mensagem`, { telefone, nome, texto });
  }

  async function avaliar(avaliador, avaliado, estrelas, comentario) {
    const dados = await post('avaliar', { avaliador, avaliado, estrelas, comentario });
    return dados.reputacao || 0;
  }

  // ── UTILITÁRIOS ───────────────────────────────────────────
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
    return new Intl.NumberFormat('pt-AO').format(v);
  }

  return {
    getSessao, setSessao, limparSessao,
    registar, entrar,
    atualizarPerfil, carregarPerfil, carregarMeusGrupos,
    criarGrupo, carregarGrupo, entrarGrupo,
    registarPagamento, enviarMensagem, avaliar,
    reputacaoTexto, reputacaoEstrelas, formatarValor
  };
})();