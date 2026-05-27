const KixikilaManager = (() => {
  const BASE     = 'https://sire-kixikila-api.vercel.app/';
  const BASE_P2P = 'https://kixikila-p2p.vercel.app/';
  let _sessao = null;

  function getSessao() { return _sessao; }

  function setSessao(dados) {
    const perfil = dados?.perfil ?? dados;
    _sessao = { perfil };
    try { localStorage.setItem('kx_sessao', JSON.stringify(perfil)); } catch (_) {}
  }

  function limparSessao() {
    _sessao = null;
    try {
      localStorage.removeItem('kx_sessao');
      localStorage.removeItem('kx_auth');
    } catch (_) {}
  }

  function getToken() {
    try {
      const raw = localStorage.getItem('kx_auth');
      if (!raw) return null;
      const dados = JSON.parse(raw);
      if (dados.expira && Date.now() > dados.expira) {
        localStorage.removeItem('kx_auth');
        return null;
      }
      return dados.token;
    } catch { return null; }
  }

  function guardarToken(token) {
    localStorage.setItem('kx_auth', JSON.stringify({
      token,
      expira: Date.now() + 7 * 24 * 60 * 60 * 1000
    }));
  }

  function esperar(ms) { return new Promise(r => setTimeout(r, ms)); }

  async function http(endpoint, corpo) {
    const token = getToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    const opcoes = corpo
      ? { method: 'POST', headers, body: JSON.stringify(corpo) }
      : { method: 'GET', headers };
    for (let i = 0; i < 3; i++) {
      try {
        const r = await fetch(BASE + endpoint, opcoes);
        const d = await r.json();
        if (r.status === 429) { await esperar(2000 * (i + 1)); continue; }
        if (r.status === 401) {
          localStorage.removeItem('kx_auth');
          window.location.href = 'login.html';
          return;
        }
        if (!r.ok) throw new Error(d.erro || d.message || 'Erro ' + r.status);
        return d;
      } catch (e) {
        if (i === 2) throw e;
        await esperar(1000 * (i + 1));
      }
    }
  }

  async function httpP2P(endpoint, corpo) {
    const opcoes = corpo
      ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) }
      : { method: 'GET' };
    const r = await fetch(BASE_P2P + endpoint, opcoes);
    const d = await r.json();
    if (!r.ok) throw new Error(d.erro || 'Erro ' + r.status);
    return d;
  }

  // ── AUTH ─────────────────────────────────────────────────────
  async function registar({ telefone, nome, senha, foto_perfil, data_nasc, email, provincia, municipio }) {
    const r = await fetch(BASE + 'auth/registar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telefone, nome, senha, foto_perfil, data_nasc, email, provincia, municipio })
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.erro || 'Erro ao registar');
    setSessao(d.perfil);
    return d.perfil;
  }

  async function entrar({ telefone, senha }) {
    const r = await fetch(BASE + 'auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telefone, senha })
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.erro || 'Erro ao entrar');
    guardarToken(d.token);
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

  // ── REPUTACAO ─────────────────────────────────────────────────
  async function carregarReputacao(telefone) {
    return http('membro/' + telefone.replace(/\+/g, '') + '/reputacao');
  }

  // ── PEDIDOS ──────────────────────────────────────────────────
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

  // ── P2P POSTS ────────────────────────────────────────────────
  async function criarPostP2P(texto) {
    const perfil = _sessao?.perfil;
    if (!perfil) throw new Error('Sessao invalida');
    return httpP2P('p2p/post', {
      telefone: perfil.telefone,
      nome: perfil.nome,
      foto_perfil: perfil.foto_perfil || '',
      texto
    });
  }

  async function apagarPostP2P(postId) {
    const perfil = _sessao?.perfil;
    if (!perfil) throw new Error('Sessao invalida');
    return httpP2P('p2p/post/apagar', { postId, telefone: perfil.telefone });
  }

  async function carregarPostsP2P(limite = 30) {
    const d = await httpP2P('p2p/feed?limite=' + limite);
    return d.posts || [];
  }

  async function darLikeP2P(postId) {
    const perfil = _sessao?.perfil;
    if (!perfil) throw new Error('Sessao invalida');
    return httpP2P('p2p/like', { postId, telefone: perfil.telefone, nome: perfil.nome });
  }

  async function removerLikeP2P(postId) {
    const perfil = _sessao?.perfil;
    if (!perfil) throw new Error('Sessao invalida');
    return httpP2P('p2p/unlike', { postId, telefone: perfil.telefone });
  }

  async function adicionarComentarioP2P(postId, texto) {
    const perfil = _sessao?.perfil;
    if (!perfil) throw new Error('Sessao invalida');
    return httpP2P('p2p/comentario', {
      postId,
      telefone: perfil.telefone,
      nome: perfil.nome,
      foto_perfil: perfil.foto_perfil || '',
      texto
    });
  }

  async function carregarComentariosP2P(postId) {
    const d = await httpP2P('p2p/comentarios/' + postId);
    return d.comentarios || [];
  }

  // ── CHAT PRIVADO ─────────────────────────────────────────────
  async function enviarMsgPrivada(para, texto) {
    const perfil = _sessao?.perfil;
    if (!perfil) throw new Error('Sessao invalida');
    return httpP2P('p2p/mensagem', {
      de: perfil.telefone,
      deNome: perfil.nome,
      para,
      texto
    });
  }

  async function carregarMensagensPrivadas(comTelefone) {
    const perfil = _sessao?.perfil;
    if (!perfil) return { mensagens: [] };
    return httpP2P('p2p/mensagens/' + perfil.telefone + '/' + comTelefone);
  }

  async function carregarConversas() {
    const perfil = _sessao?.perfil;
    if (!perfil) return { conversas: [] };
    return httpP2P('p2p/conversas/' + perfil.telefone);
  }

  async function carregarUsuariosParaSeguir() {
    const perfil = _sessao?.perfil;
    if (!perfil) return [];
    const d = await http('perfil/' + perfil.telefone + '/recomendacoes');
    return d.usuarios || [];
  }

  // ── UTILS ─────────────────────────────────────────────────────
  function formatarValor(v) {
    return new Intl.NumberFormat('pt-AO').format(v || 0);
  }

  return {
    getSessao, setSessao, limparSessao, getToken,
    registar, entrar, eliminarConta, atualizarPerfil,
    carregarFeed, carregarMeusGrupos,
    criarGrupo, carregarGrupo, entrarGrupo, sairGrupo, encerrarGrupo,
    registarPagamento, enviarMensagem, solicitarEntrada,
    carregarReputacao, responderPedido, avaliar,
    carregarNotificacoes,
    enviarMsgPrivada, carregarMensagensPrivadas, carregarConversas, carregarUsuariosParaSeguir,
    criarPostP2P, apagarPostP2P, carregarPostsP2P, darLikeP2P, removerLikeP2P,
    adicionarComentarioP2P, carregarComentariosP2P,
    formatarValor
  };
})();