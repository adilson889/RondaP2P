// ════════════════════════════════════════════════════════════
// app.js — KIXIKILA
// ════════════════════════════════════════════════════════════

var _paginaAnterior          = '';
var _tabAtual                = 'descobrir';
var _codigoGrupoAtual        = '';
var _estrelasAvaliacao       = 0;
var _telefoneAvaliacaoDireta = '';
var _nomeAvaliacaoDireta     = '';
var grupoLikes               = {};
var _viewsCache              = {};
var _syncInterval            = null;
var _comentariosCache        = {};
var _comentarioGrupoAtual    = '';

const SVG = {
  eye:     `<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`,
  heart:   `<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`,
  heartOn: `<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="var(--r)" stroke="var(--r)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`,
  comment: `<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
  send:    `<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`,
  chevron: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`,
  star:    `<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
};

function escapeHtml(text) {
  if (text === null || text === undefined) return '';
  const div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML;
}

function pseudoRandom(seed, max, min = 0) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  return min + (Math.abs(h) % (max - min + 1));
}
function getViews(codigo) {
  if (!_viewsCache[codigo]) _viewsCache[codigo] = pseudoRandom(codigo + 'v', 350, 50);
  return _viewsCache[codigo];
}
function getLikes(codigo) {
  if (!grupoLikes[codigo]) grupoLikes[codigo] = { count: pseudoRandom(codigo + 'l', 60, 10), liked: false };
  return grupoLikes[codigo];
}

function comprimirImagem(ficheiro, maxDim = 600, qualidade = 0.72) {
  return new Promise((resolve, reject) => {
    if (!ficheiro?.type.startsWith('image/')) { reject(new Error('Ficheiro inválido')); return; }
    const leitor = new FileReader();
    leitor.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) { height = Math.round(height * maxDim / width); width = maxDim; }
          else { width = Math.round(width * maxDim / height); height = maxDim; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', qualidade));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    leitor.onerror = reject;
    leitor.readAsDataURL(ficheiro);
  });
}

// ════════════════════════════════════════════════════════════
// NAVEGACAO
// ════════════════════════════════════════════════════════════

function mostrarPagina(nome) {
  const atual = document.querySelector('.pagina[style*="flex"]');
  _paginaAnterior = atual?.id?.replace('pagina', '') || '';
  document.querySelectorAll('.pagina').forEach(p => p.style.display = 'none');
  const pagina = document.getElementById('pagina' + nome);
  if (pagina) pagina.style.display = 'flex';
  lucide.createIcons();
  if (nome === 'Dashboard') {
    carregarDashboard();
    carregarFeedDashboard();
    iniciarSync();
    setTimeout(() => { configurarScrollToTop(); configurarPullToRefresh(); }, 300);
  } else {
    pararSync();
  }
  history.pushState({ pagina: nome }, '', '#' + nome);
}

function voltarDashboard() { mostrarPagina('Dashboard'); }
function voltarGrupo()     { mostrarPagina('VerGrupo'); carregarVerGrupo(_codigoGrupoAtual); }

window.addEventListener('popstate', (e) => {
  const pagina = e.state?.pagina;
  if (!pagina || pagina === 'Auth') {
    KixikilaManager.getSessao() ? mostrarPagina('Dashboard') : mostrarPagina('Auth');
  } else {
    document.querySelectorAll('.pagina').forEach(p => p.style.display = 'none');
    const el = document.getElementById('pagina' + pagina);
    if (el) el.style.display = 'flex';
    lucide.createIcons();
  }
});

// ════════════════════════════════════════════════════════════
// SYNC — 60s, para em background, seguro para Vercel + GitHub
// ════════════════════════════════════════════════════════════

function iniciarSync() {
  pararSync();
  _syncInterval = setInterval(async () => {
    if (document.visibilityState === 'hidden') return;
    try {
      if (_tabAtual === 'descobrir') await carregarFeedDashboard(true);
      else if (_tabAtual === 'meus') await carregarMeusGruposDashboard(true);
      await carregarNotificacoes();
    } catch (_) {}
  }, 60_000);
}

function pararSync() {
  if (_syncInterval) { clearInterval(_syncInterval); _syncInterval = null; }
}

// ════════════════════════════════════════════════════════════
// BOTTOM NAV
// ════════════════════════════════════════════════════════════

function setNavActivo(id) {
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('activo'));
  document.getElementById(id)?.classList.add('activo');
}

// ════════════════════════════════════════════════════════════
// DASHBOARD TABS
// ════════════════════════════════════════════════════════════

function mostrarTabDashboard(tab) {
  _tabAtual = tab;
  document.getElementById('tabDescobrir')?.classList.toggle('activo', tab === 'descobrir');
  document.getElementById('tabMeusGrupos')?.classList.toggle('activo', tab === 'meus');
  const cDesc = document.getElementById('conteudoDescobrir');
  const cMeus = document.getElementById('conteudoMeusGrupos');
  if (cDesc) cDesc.style.display = tab === 'descobrir' ? 'block' : 'none';
  if (cMeus) cMeus.style.display = tab === 'meus'      ? 'block' : 'none';
  if (tab === 'descobrir') carregarFeedDashboard();
  if (tab === 'meus')      carregarMeusGruposDashboard();
}

// ════════════════════════════════════════════════════════════
// CARREGAR DASHBOARD
// ════════════════════════════════════════════════════════════

function carregarDashboard() {
  const sessao = KixikilaManager.getSessao();
  if (!sessao) return;
  const p      = sessao.perfil;
  const cImg   = document.getElementById('composeAvatarImg');
  const cLetra = document.getElementById('composeAvatarLetra');
  if (p.foto_perfil && cImg) {
    cImg.src = p.foto_perfil; cImg.style.display = 'block';
    if (cLetra) cLetra.style.display = 'none';
  } else if (cLetra) {
    if (cImg) cImg.style.display = 'none';
    cLetra.textContent = (p.nome?.[0] || 'K').toUpperCase();
    cLetra.style.display = 'flex';
  }
  setTimeout(carregarNotificacoes, 800);
}

// ════════════════════════════════════════════════════════════
// FEED
// ════════════════════════════════════════════════════════════

async function carregarFeedDashboard(silencioso = false) {
  const container = document.getElementById('feedGrupos');
  const stories   = document.getElementById('storiesRow');
  if (!container) return;

  if (!silencioso) {
    container.innerHTML = `
      <div style="display:flex;gap:12px;padding:16px;opacity:.4">
        <div style="width:46px;height:46px;border-radius:50%;background:var(--bg3);flex-shrink:0"></div>
        <div style="flex:1;display:flex;flex-direction:column;gap:8px;padding-top:4px">
          <div style="height:12px;border-radius:6px;background:var(--bg3);width:60%"></div>
          <div style="height:10px;border-radius:6px;background:var(--bg3);width:40%"></div>
          <div style="height:10px;border-radius:6px;background:var(--bg3);width:80%"></div>
        </div>
      </div>`.repeat(3);
  }

  try {
    const grupos = await KixikilaManager.carregarFeed({ estado: 'aberto', limite: 20 });

    if (stories) {
      stories.innerHTML = '';
      grupos.slice(0, 8).forEach(g => {
        const vagas = g.max_membros - g.membros.length;
        const item  = document.createElement('div');
        item.className = 'story-item';
        item.onclick = () => abrirPreviewGrupo(g);
        item.innerHTML = `
          <div class="story-ring"><div class="story-inner">
            <span class="story-inner-text">${(g.nome||'G')[0].toUpperCase()}</span>
          </div></div>
          <span class="story-label">${escapeHtml(g.nome)}</span>
          <span class="story-valor">${vagas} vaga${vagas!==1?'s':''}</span>`;
        stories.appendChild(item);
      });
    }

    container.innerHTML = '';
    if (!grupos.length) {
      container.innerHTML = '<div style="padding:30px 16px;text-align:center;color:var(--muted);font-size:.88rem">Nenhum grupo aberto no momento.</div>';
      return;
    }

    for (const g of grupos) {
      const vagas     = g.max_membros - g.membros.length;
      const pct       = Math.round((g.membros.length / g.max_membros) * 100);
      const views     = getViews(g.codigo);
      const likeState = getLikes(g.codigo);
      const tempo     = (() => {
        try {
          const diff = Math.floor((Date.now() - new Date(g.criado_em)) / 60000);
          if (diff < 1) return 'Agora';
          if (diff < 60) return diff + 'm';
          if (diff < 1440) return Math.floor(diff / 60) + 'h';
          return Math.floor(diff / 1440) + 'd';
        } catch { return ''; }
      })();

      const card = document.createElement('div');
      card.className = 'feed-grupo-card';
      card.setAttribute('data-codigo', g.codigo);
      card.onclick = () => abrirPreviewGrupo(g);
      card.innerHTML = `
        ${g.foto_grupo
          ? `<div class="feed-avatar-x" style="padding:0;overflow:hidden"><img src="${escapeHtml(g.foto_grupo)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%"></div>`
          : `<div class="feed-avatar-x">${(g.nome||'G')[0].toUpperCase()}</div>`}
        <div class="feed-body-x">
          <div class="feed-header-x">
            <span class="feed-nome-x">${escapeHtml(g.nome)}</span>
            <span class="feed-handle-x">@${escapeHtml(g.criador?.nome||'').toLowerCase().replace(/\s+/g,'')}</span>
            <span class="feed-tempo-x">${tempo}</span>
          </div>
          <div class="feed-sub-x">${KixikilaManager.formatarValor(g.valor)} KZ · ${escapeHtml(g.periodicidade)}</div>
          <div class="feed-criador-x">por <span onclick="event.stopPropagation();abrirPerfilMembro('${escapeHtml(g.criador?.telefone||'')}')">${escapeHtml(g.criador?.nome||'')}</span></div>
          <div class="feed-progress-x"><div class="feed-progress-bar-x" style="width:${pct}%"></div></div>
          <div style="margin-top:4px"><span class="feed-vagas-x">${vagas} vaga${vagas!==1?'s':''} · ${g.membros.length}/${g.max_membros}</span></div>
          <div class="feed-acoes-x">
            <button class="feed-acao-x" onclick="event.stopPropagation()" title="Visualizações">
              ${SVG.eye} <span>${views}</span>
            </button>
            <button class="feed-acao-x${likeState.liked?' liked':''}" onclick="event.stopPropagation();toggleLike(this,'${escapeHtml(g.codigo)}')" title="Curtir">
              ${likeState.liked ? SVG.heartOn : SVG.heart}
              <span class="like-count">${likeState.count}</span>
            </button>
            <button class="feed-acao-x" onclick="event.stopPropagation();abrirComentarios('${escapeHtml(g.codigo)}','${escapeHtml(g.nome)}')" title="Comentar">
              ${SVG.comment} <span>Comentar</span>
            </button>
          </div>
        </div>`;
      container.appendChild(card);
    }
    lucide.createIcons();
  } catch (e) {
    if (!silencioso) container.innerHTML = '<div style="padding:30px 16px;text-align:center;color:var(--muted);font-size:.88rem">Erro ao carregar grupos.</div>';
  }
}

// ════════════════════════════════════════════════════════════
// PREVIEW PUBLICO DO GRUPO
// ════════════════════════════════════════════════════════════

function abrirPreviewGrupo(g) {
  const perfil   = KixikilaManager.getSessao()?.perfil;
  const eMembro  = g.membros?.some(m => m.telefone === perfil?.telefone);
  const eCriador = g.criador?.telefone === perfil?.telefone;

  if (eMembro || eCriador) {
    _codigoGrupoAtual = g.codigo;
    mostrarPagina('VerGrupo');
    carregarVerGrupo(g.codigo);
    return;
  }

  const vagas       = g.max_membros - g.membros.length;
  const pct         = Math.round((g.membros.length / g.max_membros) * 100);
  const criadorNome = escapeHtml(g.criador?.nome || 'Desconhecido');

  document.getElementById('modalTitulo').textContent = g.nome;
  document.getElementById('modalMensagem').innerHTML = `
    <div style="font-size:.88rem;color:var(--muted);line-height:1.9">
      <div>💰 <strong style="color:var(--text)">${KixikilaManager.formatarValor(g.valor)} KZ</strong> · ${escapeHtml(g.periodicidade)}</div>
      <div>👤 Criador: <strong style="color:var(--text)">${criadorNome}</strong></div>
      <div>👥 ${g.membros.length}/${g.max_membros} membros · <strong style="color:var(--r)">${vagas} vaga${vagas!==1?'s':''}</strong></div>
      <div style="margin:10px 0 4px;background:var(--bg3);border-radius:8px;overflow:hidden;height:5px">
        <div style="width:${pct}%;height:100%;background:var(--r);border-radius:8px"></div>
      </div>
      <div style="margin-top:12px;padding:10px;background:var(--bg3);border-radius:10px;font-size:.82rem">
        Entra no grupo para ver membros e detalhes completos.
      </div>
    </div>`;

  const btns = document.getElementById('modalBtns');
  btns.innerHTML = '';
  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn-outline'; cancelBtn.textContent = 'Fechar';
  cancelBtn.onclick = fecharModal;
  const entrarBtn = document.createElement('button');
  entrarBtn.className = 'btn-primary';
  entrarBtn.textContent = vagas <= 0 ? 'Grupo cheio' : 'Entrar no grupo';
  entrarBtn.disabled = vagas <= 0;
  if (vagas <= 0) entrarBtn.style.opacity = '0.5';
  entrarBtn.onclick = () => {
    fecharModal();
    _codigoGrupoAtual = g.codigo;
    mostrarPagina('EntrarGrupo');
    const input = document.getElementById('entrarCodigo');
    if (input) input.value = g.codigo;
  };
  btns.appendChild(cancelBtn);
  btns.appendChild(entrarBtn);
  document.getElementById('modal').style.display = 'flex';
}

// ════════════════════════════════════════════════════════════
// LIKES
// ════════════════════════════════════════════════════════════

function toggleLike(el, codigo) {
  const state = getLikes(codigo);
  if (state.liked) {
    state.liked = false; state.count--;
    el.classList.remove('liked');
    el.innerHTML = SVG.heart + ` <span class="like-count">${state.count}</span>`;
  } else {
    state.liked = true; state.count++;
    el.classList.add('liked');
    el.innerHTML = SVG.heartOn + ` <span class="like-count">${state.count}</span>`;
    mostrarToast('Curtido');
  }
  el.onclick = (e) => { e.stopPropagation(); toggleLike(el, codigo); };
}

// ════════════════════════════════════════════════════════════
// COMENTARIOS
// ════════════════════════════════════════════════════════════

async function abrirComentarios(codigo, nomeGrupo) {
  _comentarioGrupoAtual = codigo;
  const titulo = document.getElementById('comentariosTitulo');
  if (titulo) titulo.textContent = 'Comentários · ' + nomeGrupo;
  const lista = document.getElementById('comentariosLista');
  if (lista) lista.innerHTML = '<p style="text-align:center;color:var(--muted);padding:24px;font-size:.85rem">A carregar...</p>';
  document.getElementById('modalComentarios').style.display = 'flex';
  lucide.createIcons();
  try {
    const grupo = await KixikilaManager.carregarGrupo(codigo);
    const msgs  = (grupo.mensagens || []).slice(-50).reverse();
    _comentariosCache[codigo] = msgs.map(m => ({
      nome:  m.nome  || 'Utilizador',
      texto: m.texto || '',
      tempo: (m.data || '').replace('T', ' ').slice(0, 16)
    }));
  } catch { _comentariosCache[codigo] = []; }
  renderizarComentarios(codigo);
}

function fecharComentarios() {
  document.getElementById('modalComentarios').style.display = 'none';
  const inp = document.getElementById('comentarioInput');
  if (inp) inp.value = '';
}

function renderizarComentarios(codigo) {
  const lista   = document.getElementById('comentariosLista');
  if (!lista) return;
  const coments = _comentariosCache[codigo] || [];
  if (!coments.length) {
    lista.innerHTML = '<p style="text-align:center;color:var(--muted);padding:24px;font-size:.85rem">Sem comentários ainda. Sê o primeiro!</p>';
    return;
  }
  lista.innerHTML = coments.map(c => `
    <div style="display:flex;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)">
      <div style="width:32px;height:32px;border-radius:50%;background:var(--r-soft);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:.8rem;color:var(--r);flex-shrink:0">
        ${escapeHtml((c.nome||'?')[0].toUpperCase())}
      </div>
      <div style="flex:1;min-width:0">
        <div style="font-size:.82rem;font-weight:600;color:var(--text)">${escapeHtml(c.nome)}</div>
        <div style="font-size:.88rem;color:var(--text);margin-top:2px;word-break:break-word">${escapeHtml(c.texto)}</div>
        <div style="font-size:.72rem;color:var(--muted);margin-top:4px">${c.tempo}</div>
      </div>
    </div>`).join('');
}

async function enviarComentario() {
  const input  = document.getElementById('comentarioInput');
  const texto  = input?.value.trim() || '';
  const perfil = KixikilaManager.getSessao()?.perfil;
  if (!texto || !perfil || !_comentarioGrupoAtual) return;
  if (input) input.value = '';
  if (!_comentariosCache[_comentarioGrupoAtual]) _comentariosCache[_comentarioGrupoAtual] = [];
  _comentariosCache[_comentarioGrupoAtual].unshift({ nome: perfil.nome || 'Eu', texto, tempo: 'Agora' });
  renderizarComentarios(_comentarioGrupoAtual);
  try {
    await KixikilaManager.enviarMensagem(_comentarioGrupoAtual, perfil.telefone, perfil.nome, texto);
  } catch { mostrarToast('Erro ao guardar comentário'); }
}

// ════════════════════════════════════════════════════════════
// NOTIFICACOES
// ════════════════════════════════════════════════════════════

async function carregarNotificacoes() {
  try {
    const dados    = await KixikilaManager.carregarNotificacoes();
    const lista    = dados.notificacoes || [];
    const naoLidas = lista.filter(n => !n.lida).length;
    const dot      = document.querySelector('.notif-dot');
    if (dot) dot.style.display = naoLidas > 0 ? 'block' : 'none';
    window._notificacoesCache = lista;
  } catch {}
}

function abrirNotificacoes() {
  const lista = window._notificacoesCache || [];
  document.getElementById('modalTitulo').textContent = 'Notificações';
  document.getElementById('modalMensagem').innerHTML = !lista.length
    ? '<p style="text-align:center;color:var(--muted);padding:16px;font-size:.88rem">Sem notificações.</p>'
    : lista.map(n => `
        <div style="display:flex;gap:10px;padding:10px 0;border-bottom:1px solid var(--border);opacity:${n.lida?'0.5':'1'}">
          <div style="width:8px;height:8px;border-radius:50%;background:${n.lida?'var(--border)':'var(--r)'};margin-top:6px;flex-shrink:0"></div>
          <div style="flex:1;font-size:.87rem;color:var(--text)">${escapeHtml(n.mensagem||n.texto||'')}</div>
        </div>`).join('');
  const btns = document.getElementById('modalBtns');
  btns.innerHTML = '';
  const ok = document.createElement('button');
  ok.className = 'btn-primary'; ok.textContent = 'Fechar'; ok.style.flex = '1';
  ok.onclick = fecharModal;
  btns.appendChild(ok);
  document.getElementById('modal').style.display = 'flex';
}

function abrirMensagens() {
  if (!KixikilaManager.getSessao()) return;
  document.getElementById('modalTitulo').textContent = 'Mensagens';
  document.getElementById('modalMensagem').innerHTML =
    '<p style="text-align:center;color:var(--muted);padding:16px;font-size:.88rem">Abre o Chat dentro de cada grupo em "Os Meus Grupos".</p>';
  const btns = document.getElementById('modalBtns');
  btns.innerHTML = '';
  const fecharBtn = document.createElement('button');
  fecharBtn.className = 'btn-outline'; fecharBtn.textContent = 'Fechar';
  fecharBtn.onclick = fecharModal;
  const irBtn = document.createElement('button');
  irBtn.className = 'btn-primary'; irBtn.textContent = 'Ver grupos'; irBtn.style.flex = '1';
  irBtn.onclick = () => { fecharModal(); mostrarTabDashboard('meus'); setNavActivo('navGrupos'); };
  btns.appendChild(fecharBtn);
  btns.appendChild(irBtn);
  document.getElementById('modal').style.display = 'flex';
}

function abrirChatPorCodigo(codigo) {
  _codigoGrupoAtual = codigo;
  mostrarPagina('Chat');
  carregarChatGrupo();
}

// ════════════════════════════════════════════════════════════
// OS MEUS GRUPOS
// ════════════════════════════════════════════════════════════

async function carregarMeusGruposDashboard(silencioso = false) {
  const container = document.getElementById('listaGrupos');
  const vazio     = document.getElementById('dashVazio');
  if (!container) return;
  try {
    const grupos = await KixikilaManager.carregarMeusGrupos();
    if (!grupos.length) {
      container.innerHTML = '';
      if (vazio) vazio.style.display = 'block';
      return;
    }
    if (vazio) vazio.style.display = 'none';
    container.innerHTML = '';
    for (const g of grupos) {
      const pagos = g.membros.filter(m => m.pago).length;
      const cheio = g.membros.length >= g.max_membros;
      const card  = document.createElement('div');
      card.className = 'card-grupo';
      card.onclick = () => { _codigoGrupoAtual = g.codigo; mostrarPagina('VerGrupo'); carregarVerGrupo(g.codigo); };
      card.innerHTML = `
        <div class="card-grupo-icon">${(g.nome||'G')[0].toUpperCase()}</div>
        <div class="card-grupo-info">
          <h3>${escapeHtml(g.nome)}</h3>
          <div class="valor">${KixikilaManager.formatarValor(g.valor)} KZ · ${escapeHtml(g.periodicidade)}</div>
          <div class="info">${g.membros.length} membros · ${pagos} pagaram</div>
          <span class="pill ${cheio?'pill-cheio':'pill-aberto'}">${cheio?'Cheio':'Aberto'}</span>
        </div>
        <div class="card-grupo-seta">${SVG.chevron}</div>`;
      container.appendChild(card);
    }
  } catch {
    if (!silencioso) container.innerHTML = '<div style="padding:30px 16px;text-align:center;color:var(--muted);font-size:.88rem">Erro ao carregar os teus grupos.</div>';
  }
}

// ════════════════════════════════════════════════════════════
// AUTH
// ════════════════════════════════════════════════════════════

function mostrarTab(tab) {
  document.getElementById('tabRegisto').style.display = tab === 'registo' ? 'block' : 'none';
  document.getElementById('tabLogin').style.display   = tab === 'login'   ? 'block' : 'none';
  document.querySelectorAll('.auth-tab').forEach((b, i) => {
    b.classList.toggle('activo', (i===0&&tab==='registo')||(i===1&&tab==='login'));
  });
}

async function previewFoto(origem, evento) {
  const ficheiro = evento.target.files[0];
  if (!ficheiro) return;
  if (!ficheiro.type.startsWith('image/')) { mostrarToast('Imagem inválida.'); return; }
  if (ficheiro.size > 10*1024*1024) { mostrarToast('Imagem muito grande (máx. 10MB).'); return; }
  try {
    mostrarToast('A comprimir imagem...');
    const src = await comprimirImagem(ficheiro, 600, 0.72);
    const img = document.getElementById('previewFoto' + origem);
    const ph  = document.getElementById('fotoPlaceholder' + origem);
    if (img) { img.src = src; img.style.display = 'block'; }
    if (ph)  ph.style.display = 'none';
    try { sessionStorage.setItem('kx_temp_foto', src); } catch (_) {}
    mostrarToast('Foto pronta');
  } catch { mostrarToast('Erro ao processar imagem.'); }
}

async function previewFotoGrupo(evento) {
  const ficheiro = evento.target.files[0];
  if (!ficheiro?.type.startsWith('image/')) { mostrarToast('Imagem inválida.'); return; }
  try {
    const src = await comprimirImagem(ficheiro, 400, 0.75);
    const img = document.getElementById('previewFotoGrupo');
    const ph  = document.getElementById('fotoGrupoPlaceholder');
    if (img) { img.src = src; img.style.display = 'block'; }
    if (ph)  ph.style.display = 'none';
    try { sessionStorage.setItem('kx_temp_foto_grupo', src); } catch (_) {}
  } catch { mostrarToast('Erro ao processar imagem.'); }
}

function getFotoTemp()         { try { return sessionStorage.getItem('kx_temp_foto') || undefined; } catch { return undefined; } }
function limparFotoTemp()      { try { sessionStorage.removeItem('kx_temp_foto'); } catch {} }
function getFotoGrupoTemp()    { try { return sessionStorage.getItem('kx_temp_foto_grupo') || undefined; } catch { return undefined; } }
function limparFotoGrupoTemp() { try { sessionStorage.removeItem('kx_temp_foto_grupo'); } catch {} }

async function registar() {
  const nome     = document.getElementById('regNome')?.value.trim()     || '';
  const telefone = document.getElementById('regTelefone')?.value.trim() || '';
  const senha    = document.getElementById('regSenha')?.value.trim()    || '';
  if (!nome || !telefone || !senha)          { mostrarModal('Campos obrigatórios', 'Preenche o nome, telefone e senha.'); return; }
  if (senha.length < 6)                      { mostrarModal('Senha curta', 'Mínimo 6 caracteres.'); return; }
  if (telefone.replace(/\D/g,'').length < 9) { mostrarModal('Telefone inválido', 'Número inválido.'); return; }
  try {
    const perfil = await KixikilaManager.registar({ telefone, nome, senha, foto_perfil: getFotoTemp() });
    limparFotoTemp();
    mostrarToast('Bem-vindo, ' + perfil.nome + '!');
    mostrarPagina('Dashboard');
  } catch (e) { mostrarModal('Erro ao registar', e.message); }
}

async function entrar() {
  const telefone = document.getElementById('loginTelefone')?.value.trim() || '';
  const senha    = document.getElementById('loginSenha')?.value.trim()    || '';
  if (!telefone || !senha) { mostrarModal('Campos obrigatórios', 'Preenche o telefone e a senha.'); return; }
  try {
    const perfil = await KixikilaManager.entrar({ telefone, senha });
    mostrarToast('Bem-vindo, ' + perfil.nome + '!');
    mostrarPagina('Dashboard');
  } catch (e) { mostrarModal('Credenciais incorrectas', e.message); }
}

function logout() {
  mostrarModalConfirmar('Sair', 'Tens a certeza?', () => {
    pararSync();
    KixikilaManager.limparSessao();
    mostrarPagina('Auth');
  });
}

// ════════════════════════════════════════════════════════════
// TERMOS
// ════════════════════════════════════════════════════════════

function verificarScrollTermos() {
  const el    = document.getElementById('termosScroll');
  const hint  = document.getElementById('termosHint');
  const check = document.getElementById('termosCheckWrap');
  const input = document.getElementById('termosCheck');
  if (!el) return;
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 10) {
    if (hint)  { hint.innerHTML = 'Lido — pode aceitar os termos'; hint.classList.add('lido'); }
    if (check) { check.style.opacity = '1'; check.style.pointerEvents = 'auto'; }
    if (input) input.disabled = false;
  }
}

function atualizarBotaoCriar() {
  const btn = document.getElementById('btnCriarConta');
  const chk = document.getElementById('termosCheck');
  if (btn && chk) btn.disabled = !chk.checked;
}

// ════════════════════════════════════════════════════════════
// MODAL E TOAST
// ════════════════════════════════════════════════════════════

function mostrarModal(titulo, mensagem, onOk) {
  document.getElementById('modalTitulo').textContent   = titulo;
  document.getElementById('modalMensagem').textContent = mensagem;
  const btns = document.getElementById('modalBtns');
  btns.innerHTML = '';
  const ok = document.createElement('button');
  ok.className = 'btn-primary'; ok.textContent = 'OK'; ok.style.flex = '1';
  ok.onclick = () => { fecharModal(); if (onOk) onOk(); };
  btns.appendChild(ok);
  document.getElementById('modal').style.display = 'flex';
}

function mostrarModalConfirmar(titulo, mensagem, onConfirmar, txtOk, onAlt) {
  document.getElementById('modalTitulo').textContent   = titulo;
  document.getElementById('modalMensagem').textContent = mensagem;
  const btns = document.getElementById('modalBtns');
  btns.innerHTML = '';
  const cancel = document.createElement('button');
  cancel.className = 'btn-outline'; cancel.textContent = 'Cancelar'; cancel.onclick = fecharModal;
  const ok = document.createElement('button');
  ok.className = 'btn-primary'; ok.textContent = txtOk || 'Confirmar';
  ok.onclick = () => { fecharModal(); if (onConfirmar) onConfirmar(); };
  btns.appendChild(cancel); btns.appendChild(ok);
  if (onAlt) {
    const alt = document.createElement('button');
    alt.className = 'btn-outline'; alt.textContent = 'WhatsApp';
    alt.onclick = () => { fecharModal(); onAlt(); };
    btns.appendChild(alt);
  }
  document.getElementById('modal').style.display = 'flex';
}

function mostrarModalComInput(titulo, mensagem, tipo, onConfirmar) {
  document.getElementById('modalTitulo').textContent = titulo;
  document.getElementById('modalMensagem').innerHTML = `${escapeHtml(mensagem)}
    <input type="${tipo}" id="modalInput" placeholder="A tua senha"
      style="width:100%;padding:12px;border:1px solid var(--border2);border-radius:10px;
      font-size:.95rem;margin-top:12px;background:var(--bg3);color:var(--text);box-sizing:border-box">`;
  const btns = document.getElementById('modalBtns');
  btns.innerHTML = '';
  const cancel = document.createElement('button');
  cancel.className = 'btn-outline'; cancel.textContent = 'Cancelar'; cancel.onclick = fecharModal;
  const ok = document.createElement('button');
  ok.className = 'btn-primary'; ok.textContent = 'Eliminar'; ok.style.background = 'var(--r2)';
  ok.onclick = () => { const v = document.getElementById('modalInput')?.value; if (!v) return; fecharModal(); if (onConfirmar) onConfirmar(v); };
  btns.appendChild(cancel); btns.appendChild(ok);
  document.getElementById('modal').style.display = 'flex';
}

function fecharModal() { document.getElementById('modal').style.display = 'none'; }

function mostrarToast(mensagem) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = mensagem;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2800);
}

// ════════════════════════════════════════════════════════════
// CRIAR / ENTRAR GRUPO
// ════════════════════════════════════════════════════════════

function abrirCriarGrupo()  { mostrarPagina('CriarGrupo'); }
function abrirEntrarGrupo() { mostrarPagina('EntrarGrupo'); }

async function criarGrupo() {
  const nome       = document.getElementById('criarNome')?.value.trim() || '';
  const valor      = parseFloat(document.getElementById('criarValor')?.value || 0);
  const frequencia = document.getElementById('criarFrequencia')?.value || 'mensal';
  const maxMembros = parseInt(document.getElementById('criarMax')?.value || 6);
  const perfil     = KixikilaManager.getSessao()?.perfil;
  if (!perfil) { mostrarModal('Sessão expirada', 'Faz login novamente.'); return; }
  if (!nome || !valor || valor < 500) { mostrarModal('Dados inválidos', 'Preenche todos os campos. Valor mínimo 500 KZ.'); return; }
  try {
    const foto   = getFotoGrupoTemp();
    const codigo = await KixikilaManager.criarGrupo(nome, perfil.telefone, perfil.nome || 'Admin', valor, frequencia, maxMembros, foto);
    limparFotoGrupoTemp();
    mostrarModalConfirmar('Grupo criado!', 'Código: ' + codigo + '\n\nPartilha com os membros.',
      () => voltarDashboard(), 'OK',
      () => { window.open('https://wa.me/?text=' + encodeURIComponent('Entra no meu grupo Kixikila!\nCódigo: ' + codigo)); voltarDashboard(); });
  } catch (e) { mostrarModal('Erro', e.message); }
}

async function entrarGrupo() {
  const codigo = document.getElementById('entrarCodigo')?.value.trim().toUpperCase() || '';
  const perfil = KixikilaManager.getSessao()?.perfil;
  if (!perfil) { mostrarModal('Sessão expirada', 'Faz login novamente.'); return; }
  if (!codigo || codigo.length < 4) { mostrarModal('Código inválido', 'Insere o código correctamente.'); return; }
  try {
    await KixikilaManager.entrarGrupo(codigo, perfil.telefone, perfil.nome || 'Utilizador');
    mostrarToast('Entraste no grupo!');
    voltarDashboard();
  } catch (e) { mostrarModal('Erro', e.message); }
}

// ════════════════════════════════════════════════════════════
// VER GRUPO
// ════════════════════════════════════════════════════════════

function abrirGrupo(codigo) {
  _codigoGrupoAtual = codigo;
  mostrarPagina('VerGrupo');
  carregarVerGrupo(codigo);
}

async function carregarVerGrupo(codigo) {
  try {
    const grupo  = await KixikilaManager.carregarGrupo(codigo);
    const perfil = KixikilaManager.getSessao()?.perfil;
    const eMembro  = grupo.membros?.some(m => m.telefone === perfil?.telefone);
    const eCriador = grupo.criador?.telefone === perfil?.telefone;
    if (!eMembro && !eCriador) {
      mostrarPagina('Dashboard');
      abrirPreviewGrupo(grupo);
      return;
    }
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('verGrupoTitulo', grupo.nome);
    set('verGrupoValor',  KixikilaManager.formatarValor(grupo.valor) + ' KZ / ' + grupo.periodicidade);
    set('verGrupoEstado', grupo.estado === 'aberto' ? 'Aberto — a aceitar membros' : 'Grupo completo');
    set('verGrupoCodigo', codigo);
    const membroAtual = grupo.membros.find(m => m.ordem === grupo.ordem_atual);
    set('verGrupoOrdem', membroAtual
      ? 'Ronda ' + grupo.ordem_atual + '/' + grupo.membros.length + ' — A receber: ' + membroAtual.nome
      : 'Ronda ' + (grupo.ordem_atual||1) + '/' + grupo.membros.length);
    const lista = document.getElementById('listaMembros');
    if (lista) {
      lista.innerHTML = '';
      grupo.membros.sort((a, b) => a.ordem - b.ordem).forEach(m => {
        const eAtual   = m.ordem === grupo.ordem_atual;
        const eProprio = m.telefone === perfil?.telefone;
        const div = document.createElement('div');
        div.className = 'membro-card' + (eAtual ? ' atual' : '') + (eProprio ? ' proprio' : '');
        div.style.cursor = 'pointer';
        div.onclick = () => abrirPerfilMembro(m.telefone);
        div.innerHTML = `
          <div class="membro-avatar">${(m.nome?.[0]||'?').toUpperCase()}</div>
          <div class="membro-info">
            <h4>${escapeHtml(m.nome)}${eProprio ? ' <small style="color:var(--r)">tu</small>' : ''}</h4>
            <small>${escapeHtml(m.telefone)}${eAtual ? ' · A receber' : ''}</small>
          </div>
          <span class="membro-status ${m.pago?'status-pago':eAtual?'status-recebe':'status-pendente'}">
            ${m.pago?'PAGO':eAtual?'RECEBE':'PENDENTE'}
          </span>`;
        lista.appendChild(div);
      });
    }
  } catch { mostrarModal('Erro', 'Não foi possível carregar o grupo.'); }
}

async function registarPagamento() {
  const perfil = KixikilaManager.getSessao()?.perfil;
  if (!perfil) return;
  mostrarModalConfirmar('Confirmar pagamento', 'Confirmas que efectuaste o pagamento?', async () => {
    try {
      const res = await KixikilaManager.registarPagamento(_codigoGrupoAtual, perfil.telefone);
      if (res.todosPagaram) mostrarModal('Ronda concluída!', 'Todos pagaram! Nova ronda iniciada.');
      else mostrarToast('Pagamento registado!');
      carregarVerGrupo(_codigoGrupoAtual);
    } catch (e) { mostrarModal('Erro', e.message); }
  });
}

function copiarCodigo() {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(_codigoGrupoAtual)
      .then(() => mostrarToast('Código copiado!'))
      .catch(() => mostrarToast('Erro ao copiar'));
  } else {
    const input = document.createElement('input');
    input.value = _codigoGrupoAtual;
    document.body.appendChild(input); input.select(); document.execCommand('copy'); document.body.removeChild(input);
    mostrarToast('Código copiado!');
  }
}

function partilharGrupo() {
  window.open('https://wa.me/?text=' + encodeURIComponent('Entra no meu grupo Kixikila!\nCódigo: ' + _codigoGrupoAtual));
}

// ════════════════════════════════════════════════════════════
// CHAT
// ════════════════════════════════════════════════════════════

function abrirChat()        { mostrarPagina('Chat'); carregarChatGrupo(); }
function abrirMembrosChat() { voltarGrupo(); }

async function carregarChatGrupo() {
  try {
    const grupo  = await KixikilaManager.carregarGrupo(_codigoGrupoAtual);
    const perfil = KixikilaManager.getSessao()?.perfil;
    const el     = (id) => document.getElementById(id);
    if (el('chatNomeGrupo'))    el('chatNomeGrupo').textContent    = grupo.nome;
    if (el('chatMembrosCount')) el('chatMembrosCount').textContent = grupo.membros.length + ' membros';
    const container = el('chatMensagens');
    const mensagens = grupo.mensagens || [];
    if (!container) return;
    if (!mensagens.length) {
      container.innerHTML = '<p style="text-align:center;color:var(--muted);padding:40px">Sem mensagens ainda.</p>';
      return;
    }
    container.innerHTML = '';
    for (const msg of mensagens) {
      const meu  = msg.telefone === perfil?.telefone;
      const wrap = document.createElement('div');
      wrap.className = 'chat-balao-wrap ' + (meu ? 'meu' : 'outro');
      wrap.innerHTML = `
        ${!meu ? `<span class="chat-autor">${escapeHtml(msg.nome)}</span>` : ''}
        <div class="chat-balao ${meu?'meu':'outro'}">${escapeHtml(msg.texto)}</div>
        <span class="chat-data">${(msg.data||'').replace('T',' ').slice(0,16)}</span>`;
      container.appendChild(wrap);
    }
    container.scrollTop = container.scrollHeight;
  } catch (e) { console.error('Erro chat:', e); }
}

async function enviarMensagem() {
  const input  = document.getElementById('etMensagem');
  const btn    = document.querySelector('.btn-enviar');
  const texto  = input?.value.trim() || '';
  const perfil = KixikilaManager.getSessao()?.perfil;
  if (!texto || !perfil) return;
  input.value = '';
  if (btn) btn.disabled = true;
  try {
    await KixikilaManager.enviarMensagem(_codigoGrupoAtual, perfil.telefone, perfil.nome, texto);
    carregarChatGrupo();
  } catch { mostrarModal('Erro', 'Não foi possível enviar a mensagem.'); }
  finally { if (btn) btn.disabled = false; }
}

// ════════════════════════════════════════════════════════════
// AVALIACAO
// ════════════════════════════════════════════════════════════

function abrirAvaliacao() {
  KixikilaManager.carregarGrupo(_codigoGrupoAtual).then(grupo => {
    const perfil = KixikilaManager.getSessao()?.perfil;
    const outros = grupo.membros.filter(m => m.telefone !== perfil?.telefone);
    if (!outros.length) { mostrarModal('Sem membros', 'Não há outros membros para avaliar.'); return; }
    const sel = document.getElementById('selMembro');
    if (sel) sel.innerHTML = outros.map(m => `<option value="${escapeHtml(m.telefone)}">${escapeHtml(m.nome)}</option>`).join('');
    _estrelasAvaliacao = 0;
    const wrap = document.getElementById('estrelasWrap');
    if (wrap) {
      wrap.innerHTML = '';
      for (let i = 1; i <= 5; i++) {
        const btn = document.createElement('button');
        btn.className = 'estrela-btn'; btn.textContent = '★';
        btn.onclick = ((n) => () => { _estrelasAvaliacao = n; wrap.querySelectorAll('.estrela-btn').forEach((b,j) => b.classList.toggle('on', j<n)); })(i);
        wrap.appendChild(btn);
      }
    }
    document.getElementById('modalAvaliacao').style.display = 'flex';
  }).catch(() => mostrarModal('Erro', 'Não foi possível carregar os membros.'));
}

function fecharModalAvaliacao() { document.getElementById('modalAvaliacao').style.display = 'none'; }

async function confirmarAvaliacao() {
  if (!_estrelasAvaliacao) { mostrarToast('Selecciona as estrelas'); return; }
  const perfil   = KixikilaManager.getSessao()?.perfil;
  const avaliado = document.getElementById('selMembro')?.value;
  fecharModalAvaliacao();
  try {
    const rep = await KixikilaManager.avaliar(perfil.telefone, avaliado, _estrelasAvaliacao, '');
    mostrarModal('Avaliação guardada!', KixikilaManager.reputacaoEstrelas(rep) + ' — ' + KixikilaManager.reputacaoTexto(rep));
  } catch (e) { mostrarModal('Erro', e.message); }
}

// ════════════════════════════════════════════════════════════
// PERFIL (O MEU)
// ════════════════════════════════════════════════════════════

function abrirPerfil() { mostrarPagina('Perfil'); carregarDadosPerfil(); }

function carregarDadosPerfil() {
  const perfil = KixikilaManager.getSessao()?.perfil;
  if (!perfil) return;
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('perfilNomeTexto', perfil.nome || 'Utilizador');
  set('perfilTopTitulo', perfil.nome || 'Perfil');
  set('perfilHandle',    '@' + (perfil.nome||'u').toLowerCase().replace(/\s+/g,''));
  set('perfilTelefone',  perfil.telefone || '');
  set('perfilReputacao', perfil.reputacao > 0
    ? KixikilaManager.reputacaoEstrelas(perfil.reputacao) + '  ' + KixikilaManager.reputacaoTexto(perfil.reputacao)
    : 'Sem avaliações');
  const editNome = document.getElementById('editNome');
  if (editNome) editNome.value = perfil.nome || '';
  const img   = document.getElementById('perfilFotoImg');
  const letra = document.getElementById('perfilFotoLetra');
  if (perfil.foto_perfil && img) {
    img.src = perfil.foto_perfil; img.style.display = 'block';
    if (letra) letra.style.display = 'none';
  } else if (letra) {
    letra.textContent = (perfil.nome?.[0]||'K').toUpperCase();
    letra.style.display = 'flex';
    if (img) img.style.display = 'none';
  }
  KixikilaManager.carregarStats(perfil.telefone).then(s => {
    set('statGrupos',     s.grupos_activos  || 0);
    set('statAvaliacoes', s.total_avaliacoes || 0);
  }).catch(() => {});
  lucide.createIcons();
}

async function guardarPerfil() {
  const perfil = KixikilaManager.getSessao()?.perfil;
  if (!perfil) return;
  const nome  = document.getElementById('editNome')?.value.trim()  || '';
  const senha = document.getElementById('editSenha')?.value.trim() || '';
  if (!nome) { mostrarToast('O nome é obrigatório.'); return; }
  try {
    await KixikilaManager.atualizarPerfil({ telefone: perfil.telefone, nome, senha: senha || undefined });
    mostrarToast('Perfil actualizado!');
    carregarDadosPerfil();
    carregarDashboard();
  } catch (e) { mostrarModal('Erro', e.message); }
}

function toggleEditarPerfil() {
  const card = document.getElementById('perfEditarCard');
  if (card) card.style.display = card.style.display === 'none' ? 'block' : 'none';
}

function setPerfTab(tab) {
  ['pub','grupos','aval'].forEach(t =>
    document.getElementById('ptab' + t.charAt(0).toUpperCase() + t.slice(1))?.classList.remove('activo'));
  document.getElementById('ptab' + tab.charAt(0).toUpperCase() + tab.slice(1))?.classList.add('activo');
}

async function confirmarEliminarConta() {
  const perfil = KixikilaManager.getSessao()?.perfil;
  if (!perfil) return;
  try {
    const stats = await KixikilaManager.carregarStats(perfil.telefone);
    if (stats.grupos_activos > 0) {
      mostrarModal('Não é possível eliminar', 'Ainda fazes parte de ' + stats.grupos_activos + ' grupo(s). Sai primeiro.');
      return;
    }
  } catch {}
  mostrarModalComInput('Eliminar Conta', 'Digita a tua senha para confirmar.', 'password', async (senha) => {
    try {
      await KixikilaManager.eliminarConta(perfil.telefone, senha);
      KixikilaManager.limparSessao();
      pararSync();
      mostrarModal('Conta eliminada', 'A tua conta foi removida.', () => mostrarPagina('Auth'));
    } catch (e) { mostrarModal('Erro', e.message); }
  });
}

// ════════════════════════════════════════════════════════════
// PERFIL MEMBRO
// ════════════════════════════════════════════════════════════

async function abrirPerfilMembro(telefone) {
  mostrarPagina('PerfilMembro');
  const container = document.getElementById('perfilMembroConteudo');
  if (!container) return;
  container.innerHTML = '<p style="text-align:center;padding:40px;color:var(--muted)">A carregar...</p>';
  try {
    const [perfil, avaliacoes] = await Promise.all([
      KixikilaManager.carregarReputacao(telefone),
      KixikilaManager.carregarAvaliacoesRecebidas(telefone)
    ]);
    const estrelas = KixikilaManager.reputacaoEstrelas(perfil.reputacao || 0);
    const texto    = KixikilaManager.reputacaoTexto(perfil.reputacao || 0);

    function gerarGrafico(avals) {
      if (!avals || avals.length < 2) return '';
      const pontos = avals.slice(-8).map(a => Math.min(5, Math.max(0, Number(a.estrelas) || 0)));
      const w = 300, h = 60, pad = 8;
      const stepX = (w - pad*2) / Math.max(pontos.length - 1, 1);
      const toY   = v => h - pad - (v/5) * (h - pad*2);
      const pts   = pontos.map((v,i) => `${pad+i*stepX},${toY(v)}`).join(' ');
      const area  = `M${pad},${h} L${pad},${toY(pontos[0])} ${pontos.map((v,i)=>`L${pad+i*stepX},${toY(v)}`).join(' ')} L${pad+(pontos.length-1)*stepX},${h} Z`;
      return `
        <div style="padding:14px 16px;border-bottom:1px solid var(--border)">
          <div style="font-size:.65rem;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:var(--muted);margin-bottom:10px">Evolução da reputação</div>
          <svg width="100%" height="${h}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
            <defs><linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="var(--r)" stop-opacity=".2"/>
              <stop offset="100%" stop-color="var(--r)" stop-opacity="0"/>
            </linearGradient></defs>
            <path d="${area}" fill="url(#rg)"/>
            <polyline points="${pts}" fill="none" stroke="var(--r)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
            ${pontos.map((v,i)=>`<circle cx="${pad+i*stepX}" cy="${toY(v)}" r="4" fill="var(--r)" stroke="var(--bg)" stroke-width="2"/>`).join('')}
          </svg>
        </div>`;
    }

    function renderAvaliacoes(avals) {
      if (!avals?.length) return '<p style="color:var(--muted);font-size:.85rem;text-align:center;padding:20px">Sem avaliações ainda.</p>';
      return avals.slice(0,10).map(a => {
        const n = Math.min(5, Math.max(0, Number(a.estrelas)||0));
        return `
          <div style="display:flex;gap:12px;padding:12px 16px;border-bottom:1px solid var(--border)">
            <div style="width:36px;height:36px;border-radius:50%;background:var(--r-soft);color:var(--r);font-weight:800;font-size:.9rem;display:flex;align-items:center;justify-content:center;flex-shrink:0">
              ${escapeHtml((a.avaliador_nome||a.nome||'?')[0].toUpperCase())}
            </div>
            <div style="flex:1;min-width:0">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:3px">
                <span style="font-size:.88rem;font-weight:700;color:var(--text)">${escapeHtml(a.avaliador_nome||a.nome||'Utilizador')}</span>
                <span style="color:#FBBF24;font-size:.85rem">${'★'.repeat(n)}${'☆'.repeat(5-n)}</span>
              </div>
              ${a.comentario?`<div style="font-size:.84rem;color:var(--muted);line-height:1.5">${escapeHtml(a.comentario)}</div>`:''}
            </div>
          </div>`;
      }).join('');
    }

    container.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;text-align:center;padding:28px 20px 20px;border-bottom:1px solid var(--border);gap:6px">
        ${perfil.foto_perfil
          ? `<img src="${escapeHtml(perfil.foto_perfil)}" style="width:80px;height:80px;border-radius:50%;object-fit:cover;border:3px solid var(--r);margin-bottom:8px" alt="Foto">`
          : `<div style="width:80px;height:80px;border-radius:50%;background:var(--r-soft);color:var(--r);font-family:var(--serif);font-size:2rem;font-weight:800;display:flex;align-items:center;justify-content:center;border:3px solid var(--r);margin-bottom:8px">${(perfil.nome||'U')[0].toUpperCase()}</div>`}
        <h3 style="font-family:var(--serif);font-size:1.35rem;font-weight:800;color:var(--text)">${escapeHtml(perfil.nome||'Utilizador')}</h3>
        <p style="font-size:.85rem;color:var(--muted)">${escapeHtml(perfil.telefone||telefone)}</p>
        <p style="font-size:1rem;color:var(--r);font-weight:700">${estrelas} ${texto}</p>
      </div>
      <div style="display:flex;border-bottom:1px solid var(--border)">
        <div style="flex:1;text-align:center;padding:16px;border-right:1px solid var(--border)">
          <span style="display:block;font-family:var(--serif);font-size:1.5rem;font-weight:800;color:var(--r)">${perfil.grupos_concluidos||0}</span>
          <label style="font-size:.73rem;color:var(--muted);font-weight:600">Grupos</label>
        </div>
        <div style="flex:1;text-align:center;padding:16px">
          <span style="display:block;font-family:var(--serif);font-size:1.5rem;font-weight:800;color:var(--r)">${avaliacoes.length||perfil.total_avaliacoes||0}</span>
          <label style="font-size:.73rem;color:var(--muted);font-weight:600">Avaliações</label>
        </div>
      </div>
      ${gerarGrafico(avaliacoes)}
      <div style="padding:16px;border-bottom:1px solid var(--border)">
        <button onclick="abrirAvaliacaoDireta('${escapeHtml(telefone)}','${escapeHtml(perfil.nome||'')}')"
          style="width:100%;padding:13px;background:var(--r);color:white;border:none;border-radius:99px;font-size:.95rem;font-weight:700;font-family:var(--sans);cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px">
          Avaliar este membro
        </button>
      </div>
      <div>
        <div style="font-size:.65rem;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:var(--muted);padding:14px 16px 8px">Avaliações recentes</div>
        ${renderAvaliacoes(avaliacoes)}
      </div>`;
  } catch {
    container.innerHTML = '<p style="text-align:center;padding:40px;color:var(--muted)">Erro ao carregar perfil.</p>';
  }
}

// ════════════════════════════════════════════════════════════
// AVALIACAO DIRECTA
// ════════════════════════════════════════════════════════════

function abrirAvaliacaoDireta(telefone, nome) {
  _telefoneAvaliacaoDireta = telefone;
  _nomeAvaliacaoDireta     = nome;
  const avalNome = document.getElementById('avalDiretaNome');
  if (avalNome) avalNome.textContent = nome;
  _estrelasAvaliacao = 0;
  const wrap = document.getElementById('estrelasWrapDireta');
  if (!wrap) return;
  wrap.innerHTML = '';
  for (let i = 1; i <= 5; i++) {
    const btn = document.createElement('button');
    btn.className = 'estrela-btn'; btn.textContent = '★';
    btn.onclick = ((n) => () => { _estrelasAvaliacao = n; wrap.querySelectorAll('.estrela-btn').forEach((b,j) => b.classList.toggle('on', j<n)); })(i);
    wrap.appendChild(btn);
  }
  document.getElementById('overlayAvaliacaoDireta').style.display = 'flex';
}

function fecharAvaliacaoDireta() {
  document.getElementById('overlayAvaliacaoDireta').style.display = 'none';
  _estrelasAvaliacao = 0;
  const c = document.getElementById('comentarioAvaliacao');
  if (c) c.value = '';
}

async function confirmarAvaliacaoDireta() {
  if (!_estrelasAvaliacao) { mostrarToast('Selecciona as estrelas'); return; }
  const perfil = KixikilaManager.getSessao()?.perfil;
  if (!perfil) return;
  const comentario = document.getElementById('comentarioAvaliacao')?.value.trim() || '';
  try {
    await KixikilaManager.avaliar(perfil.telefone, _telefoneAvaliacaoDireta, _estrelasAvaliacao, comentario);
    fecharAvaliacaoDireta();
    mostrarToast('Avaliação enviada!');
    abrirPerfilMembro(_telefoneAvaliacaoDireta);
  } catch (e) { mostrarToast(e.message); }
}

// ════════════════════════════════════════════════════════════
// SCROLL TO TOP
// ════════════════════════════════════════════════════════════

function configurarScrollToTop() {
  const btn       = document.getElementById('scrollTopBtn');
  const container = document.querySelector('.dashboard-content');
  if (!btn || !container) return;
  container.addEventListener('scroll', () => btn.classList.toggle('show', container.scrollTop > 300));
  btn.onclick = () => container.scrollTo({ top: 0, behavior: 'smooth' });
}

// ════════════════════════════════════════════════════════════
// INICIALIZACAO
// ════════════════════════════════════════════════════════════

(function init() {
  try {
    const guardado = localStorage.getItem('kx_sessao');
    if (guardado) {
      KixikilaManager.setSessao(JSON.parse(guardado));
      mostrarPagina('Dashboard');
      setTimeout(carregarNotificacoes, 1000);
      return;
    }
  } catch {}
  mostrarPagina('Auth');
  lucide.createIcons();
})();