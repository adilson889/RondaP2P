// ════════════════════════════════════════════════════════════
// app.js — KIXIKILA  (ficheiro único, substitui todos os JS)
// ════════════════════════════════════════════════════════════

// ── GLOBAIS ──────────────────────────────────────────────────
var _paginaAnterior          = '';
var _tabAtual                = 'descobrir';
var _codigoGrupoAtual        = '';
var _estrelasAvaliacao       = 0;
var _telefoneAvaliacaoDireta = '';
var _nomeAvaliacaoDireta     = '';
var grupoLikes               = {};

// ── ESCAPE HTML ───────────────────────────────────────────────
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ════════════════════════════════════════════════════════════
// NAVEGAÇÃO
// ════════════════════════════════════════════════════════════

function mostrarPagina(nome) {
  _paginaAnterior = document.querySelector('.pagina:not([style*="display:none"])')
    ?.id?.replace('pagina','') || '';
  document.querySelectorAll('.pagina').forEach(p => p.style.display = 'none');
  const pagina = document.getElementById('pagina' + nome);
  if (pagina) pagina.style.display = 'flex';
  lucide.createIcons();
  if (nome === 'Dashboard') {
    carregarDashboard();
    carregarFeedDashboard();
    setTimeout(configurarScrollToTop, 300);
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
// BOTTOM NAV
// ════════════════════════════════════════════════════════════

function setNavActivo(id) {
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('activo'));
  const el = document.getElementById(id);
  if (el) el.classList.add('activo');
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
  const p = sessao.perfil;
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
// FEED — DESCOBRIR GRUPOS
// ════════════════════════════════════════════════════════════

async function carregarFeedDashboard() {
  const container = document.getElementById('feedGrupos');
  const stories   = document.getElementById('storiesRow');
  if (!container) return;

  container.innerHTML = `<div style="display:flex;gap:12px;padding:16px;opacity:.4">
    <div style="width:46px;height:46px;border-radius:14px;background:var(--bg3);flex-shrink:0"></div>
    <div style="flex:1;display:flex;flex-direction:column;gap:6px;padding-top:4px">
      <div style="height:12px;border-radius:6px;background:var(--bg3);width:60%"></div>
      <div style="height:10px;border-radius:6px;background:var(--bg3);width:40%"></div>
    </div></div>`;

  try {
    const grupos = await KixikilaManager.carregarFeed({ estado: 'aberto', limite: 20 });

    if (stories) {
      stories.innerHTML = '';
      grupos.slice(0, 8).forEach(g => {
        const vagas = g.max_membros - g.membros.length;
        const item  = document.createElement('div');
        item.className = 'story-item';
        item.onclick = () => { _codigoGrupoAtual = g.codigo; mostrarPagina('VerGrupo'); carregarVerGrupo(g.codigo); };
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
      const vagas  = g.max_membros - g.membros.length;
      const pct    = Math.round((g.membros.length / g.max_membros) * 100);
      const views  = Math.floor(Math.random() * 300) + 50;
      const likes  = Math.floor(Math.random() * 50) + 10;
      const card   = document.createElement('div');
      card.className = 'feed-grupo-card';
      card.setAttribute('data-codigo', g.codigo);
      card.onclick = () => { _codigoGrupoAtual = g.codigo; mostrarPagina('VerGrupo'); carregarVerGrupo(g.codigo); };
      const tempo = (() => { try { const d = new Date(g.criado_em); const diff = Math.floor((Date.now()-d)/60000); if(diff<1)return 'Agora'; if(diff<60)return diff+'m'; if(diff<1440)return Math.floor(diff/60)+'h'; return Math.floor(diff/1440)+'d'; } catch{return '';} })();
      card.innerHTML = `
        <div class="feed-avatar-x">${(g.nome||'G')[0].toUpperCase()}</div>
        <div class="feed-body-x">
          <div class="feed-header-x">
            <span class="feed-nome-x">${escapeHtml(g.nome)}</span>
            <span class="feed-handle-x">@${escapeHtml(g.criador.nome).toLowerCase().replace(/\s+/g,'')}</span>
            <span class="feed-tempo-x">${tempo}</span>
          </div>
          <div class="feed-sub-x">${KixikilaManager.formatarValor(g.valor)} KZ · ${g.periodicidade}</div>
          <div class="feed-criador-x">por <span onclick="event.stopPropagation();abrirPerfilMembro('${escapeHtml(g.criador.telefone)}')">${escapeHtml(g.criador.nome)}</span></div>
          <div class="feed-progress-x"><div class="feed-progress-bar-x" style="width:${pct}%"></div></div>
          <div style="margin-top:2px"><span class="feed-vagas-x">${vagas} vaga${vagas!==1?'s':''} · ${g.membros.length}/${g.max_membros}</span></div>
          <div class="feed-acoes-x">
            <button class="feed-acao-x" onclick="event.stopPropagation()">
              <i data-lucide="eye"></i> ${views}
            </button>
            <button class="feed-acao-x like-metric" data-codigo="${escapeHtml(g.codigo)}" data-liked="false"
                 onclick="event.stopPropagation();toggleLike(this,'${escapeHtml(g.codigo)}',${likes})">
              <i data-lucide="heart"></i> <span class="like-count">${likes}</span>
            </button>
            <button class="feed-acao-x" onclick="event.stopPropagation();abrirChatPorCodigo('${escapeHtml(g.codigo)}')">
              <i data-lucide="message-circle"></i> Chat
            </button>
          </div>
        </div>`;
      container.appendChild(card);
    }
    lucide.createIcons();
  } catch (e) {
    container.innerHTML = '<div style="padding:30px 16px;text-align:center;color:var(--muted);font-size:.88rem">Erro ao carregar grupos.</div>';
  }
}

function toggleLike(el, codigo, initialLikes) {
  if (!grupoLikes[codigo]) grupoLikes[codigo] = { count: initialLikes, liked: false };
  const state = grupoLikes[codigo];
  const span  = el.querySelector('.like-count');
  const svg   = el.querySelector('svg');
  if (state.liked) {
    state.liked = false; state.count--;
    el.setAttribute('data-liked', 'false'); el.classList.remove('liked');
    if (svg) { svg.style.fill = 'none'; svg.style.stroke = ''; }
  } else {
    state.liked = true; state.count++;
    el.setAttribute('data-liked', 'true'); el.classList.add('liked');
    if (svg) { svg.style.fill = 'var(--r)'; svg.style.stroke = 'var(--r)'; }
    mostrarToast('Curtido');
  }
  if (span) span.textContent = state.count;
}

function abrirChatPorCodigo(codigo) {
  _codigoGrupoAtual = codigo;
  mostrarPagina('Chat');
  carregarChatGrupo();
}

// ════════════════════════════════════════════════════════════
// OS MEUS GRUPOS
// ════════════════════════════════════════════════════════════

async function carregarMeusGruposDashboard() {
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
      card.setAttribute('data-codigo', g.codigo);
      card.onclick = () => { _codigoGrupoAtual = g.codigo; mostrarPagina('VerGrupo'); carregarVerGrupo(g.codigo); };
      card.innerHTML = `
        <div class="card-grupo-icon">${(g.nome||'G')[0].toUpperCase()}</div>
        <div class="card-grupo-info">
          <h3>${escapeHtml(g.nome)}</h3>
          <div class="valor">${KixikilaManager.formatarValor(g.valor)} KZ · ${g.periodicidade}</div>
          <div class="info">${g.membros.length} membros · ${pagos} pagaram</div>
          <span class="pill ${cheio?'pill-cheio':'pill-aberto'}">${cheio?'Cheio':'Aberto'}</span>
        </div>
        <div class="card-grupo-seta"><i data-lucide="chevron-right"></i></div>`;
      container.appendChild(card);
    }
    lucide.createIcons();
  } catch {
    container.innerHTML = '<div style="padding:30px 16px;text-align:center;color:var(--muted);font-size:.88rem">Erro ao carregar os teus grupos.</div>';
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

function previewFoto(origem, evento) {
  const ficheiro = evento.target.files[0];
  if (!ficheiro) return;
  if (!ficheiro.type.startsWith('image/')) { mostrarToast('Imagem inválida.'); return; }
  if (ficheiro.size > 5*1024*1024)         { mostrarToast('Imagem > 5MB.');    return; }
  const leitor = new FileReader();
  leitor.onload = (e) => {
    const src = e.target.result;
    const img = document.getElementById('previewFoto' + origem);
    const ph  = document.getElementById('fotoPlaceholder' + origem);
    if (img) { img.src = src; img.style.display = 'block'; }
    if (ph)  ph.style.display = 'none';
    try { sessionStorage.setItem('kx_temp_foto', src); } catch (_) {}
  };
  leitor.readAsDataURL(ficheiro);
}

function getFotoTemp()  { try { return sessionStorage.getItem('kx_temp_foto') || undefined; } catch { return undefined; } }
function limparFotoTemp(){ try { sessionStorage.removeItem('kx_temp_foto'); } catch {} }

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
    if (hint)  { hint.innerHTML = '<i data-lucide="check-circle"></i> Lido — pode aceitar os termos'; hint.classList.add('lido'); lucide.createIcons(); }
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
// MODAL & TOAST
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
  document.getElementById('modalMensagem').innerHTML = `${mensagem}
    <input type="${tipo}" id="modalInput" placeholder="A tua senha"
      style="width:100%;padding:12px;border:1px solid var(--border2);border-radius:10px;font-size:.95rem;margin-top:12px;background:var(--bg3);color:var(--text);">`;
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

function abrirCriarGrupo()   { mostrarPagina('CriarGrupo'); }
function abrirEntrarGrupo()  { mostrarPagina('EntrarGrupo'); }

async function criarGrupo() {
  const nome       = document.getElementById('criarNome')?.value.trim() || '';
  const valor      = parseFloat(document.getElementById('criarValor')?.value || 0);
  const frequencia = document.getElementById('criarFrequencia')?.value || 'mensal';
  const maxMembros = parseInt(document.getElementById('criarMax')?.value || 6);
  const perfil     = KixikilaManager.getSessao()?.perfil;
  if (!nome || !valor || valor < 500) { mostrarModal('Dados inválidos', 'Preenche todos os campos. Valor mínimo 500 KZ.'); return; }
  try {
    const codigo = await KixikilaManager.criarGrupo(nome, perfil.telefone, perfil.nome || 'Admin', valor, frequencia, maxMembros);
    mostrarModalConfirmar('Grupo criado!', 'Código: ' + codigo + '\n\nPartilha com os membros.',
      () => voltarDashboard(), 'OK',
      () => { window.open('https://wa.me/?text=' + encodeURIComponent('Entra no meu grupo Kixikila!\nCódigo: ' + codigo)); voltarDashboard(); });
  } catch (e) { mostrarModal('Erro', e.message); }
}

async function entrarGrupo() {
  const codigo = document.getElementById('entrarCodigo')?.value.trim().toUpperCase() || '';
  const perfil = KixikilaManager.getSessao()?.perfil;
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

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('verGrupoTitulo', grupo.nome);
    set('verGrupoValor',  KixikilaManager.formatarValor(grupo.valor) + ' KZ / ' + grupo.periodicidade);
    set('verGrupoEstado', grupo.estado === 'aberto' ? 'Aberto — a aceitar membros' : 'Grupo completo');
    set('verGrupoCodigo', codigo);

    const membroAtual = grupo.membros.find(m => m.ordem === grupo.ordem_atual);
    set('verGrupoOrdem', membroAtual
      ? '★ Ronda ' + grupo.ordem_atual + '/' + grupo.membros.length + ' — A receber: ' + membroAtual.nome
      : 'Ronda ' + grupo.ordem_atual + '/' + grupo.membros.length);

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
          <div class="membro-avatar">${escapeHtml((m.nome[0] || '?').toUpperCase())}</div>
          <div class="membro-info">
            <h4>${escapeHtml(m.nome)}${eProprio ? ' <small style="color:var(--r)">tu</small>' : ''}</h4>
            <small>${escapeHtml(m.telefone)}${eAtual ? ' · ★ A receber' : ''}</small>
          </div>
          <span class="membro-status ${m.pago ? 'status-pago' : eAtual ? 'status-recebe' : 'status-pendente'}">
            ${m.pago ? 'PAGO' : eAtual ? 'RECEBE' : 'PENDENTE'}
          </span>`;
        lista.appendChild(div);
      });
      lucide.createIcons();
    }
  } catch (e) { mostrarModal('Erro', 'Não foi possível carregar o grupo.'); }
}

async function registarPagamento() {
  const perfil = KixikilaManager.getSessao()?.perfil;
  if (!perfil) return;
  mostrarModalConfirmar('Confirmar pagamento', 'Confirmas que efectuaste o pagamento?', async () => {
    try {
      const res = await KixikilaManager.registarPagamento(_codigoGrupoAtual, perfil.telefone);
      if (res.todos_pagaram) mostrarModal('Ronda concluída!', 'Todos pagaram! Nova ronda iniciada.');
      else mostrarToast('Pagamento registado!');
      carregarVerGrupo(_codigoGrupoAtual);
    } catch (e) { mostrarModal('Erro', e.message); }
  });
}

function copiarCodigo() {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(_codigoGrupoAtual).then(() => mostrarToast('Código copiado!')).catch(() => mostrarToast('Erro ao copiar'));
  } else {
    const input = document.createElement('input');
    input.value = _codigoGrupoAtual;
    document.body.appendChild(input); input.select(); document.execCommand('copy'); document.body.removeChild(input);
    mostrarToast('Código copiado!');
  }
}

function partilharGrupo() {
  const msg = 'Entra no meu grupo Kixikila!\nCódigo: ' + _codigoGrupoAtual;
  window.open('https://wa.me/?text=' + encodeURIComponent(msg));
}

// ════════════════════════════════════════════════════════════
// CHAT
// ════════════════════════════════════════════════════════════

function abrirChat() { mostrarPagina('Chat'); carregarChatGrupo(); }

function abrirMembrosChat() { voltarGrupo(); }

async function carregarChatGrupo() {
  try {
    const grupo  = await KixikilaManager.carregarGrupo(_codigoGrupoAtual);
    const perfil = KixikilaManager.getSessao()?.perfil;

    const chatNome    = document.getElementById('chatNomeGrupo');
    const chatMembros = document.getElementById('chatMembrosCount');
    if (chatNome)    chatNome.textContent    = grupo.nome;
    if (chatMembros) chatMembros.textContent = grupo.membros.length + ' membros';

    const container = document.getElementById('chatMensagens');
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
        ${!meu ? '<span class="chat-autor">' + escapeHtml(msg.nome) + '</span>' : ''}
        <div class="chat-balao ${meu ? 'meu' : 'outro'}">${escapeHtml(msg.texto)}</div>
        <span class="chat-data">${(msg.data||'').replace('T',' ').slice(0,16)}</span>`;
      container.appendChild(wrap);
    }
    container.scrollTop = container.scrollHeight;
  } catch (e) { console.error('Erro chat:', e); }
}

async function enviarMensagem() {
  const input  = document.getElementById('etMensagem');
  const texto  = input?.value.trim() || '';
  const perfil = KixikilaManager.getSessao()?.perfil;
  if (!texto || !perfil) return;
  input.value = '';
  try {
    await KixikilaManager.enviarMensagem(_codigoGrupoAtual, perfil.telefone, perfil.nome, texto);
    carregarChatGrupo();
  } catch (e) { mostrarModal('Erro', 'Não foi possível enviar a mensagem.'); }
}

// ════════════════════════════════════════════════════════════
// AVALIAÇÃO
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
        btn.onclick = ((n) => () => { _estrelasAvaliacao = n; wrap.querySelectorAll('.estrela-btn').forEach((b,j) => b.classList.toggle('on', j < n)); })(i);
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
    letra.textContent = (perfil.nome?.[0] || 'K').toUpperCase();
    letra.style.display = 'flex';
    if (img) img.style.display = 'none';
  }

  KixikilaManager.carregarStats(perfil.telefone).then(s => {
    set('statGrupos',     s.grupos_activos   || 0);
    set('statAvaliacoes', s.total_avaliacoes  || 0);
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
  ['pub','grupos','aval'].forEach(t => {
    document.getElementById('ptab' + t.charAt(0).toUpperCase() + t.slice(1))?.classList.remove('activo');
  });
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
  container.innerHTML = '<p style="text-align:center;padding:40px;color:var(--muted);">A carregar...</p>';
  try {
    const perfil  = await KixikilaManager.carregarReputacao(telefone);
    const estrelas = KixikilaManager.reputacaoEstrelas(perfil.reputacao || 0);
    const texto    = KixikilaManager.reputacaoTexto(perfil.reputacao || 0);
    container.innerHTML = `
      <div class="membro-perfil-topo">
        ${perfil.foto_perfil
          ? `<img src="${escapeHtml(perfil.foto_perfil)}" class="membro-perfil-foto" alt="Foto">`
          : `<div class="membro-perfil-letra">${(perfil.nome||'U')[0].toUpperCase()}</div>`}
        <h3 class="membro-perfil-nome">${escapeHtml(perfil.nome||'Utilizador')}</h3>
        <p class="membro-perfil-tel">${escapeHtml(perfil.telefone||telefone)}</p>
        <p class="membro-perfil-rep">${estrelas} ${texto}</p>
      </div>
      <div class="membro-perfil-stats">
        <div class="stat-box"><span>${perfil.grupos_concluidos||0}</span><label>Grupos</label></div>
        <div class="stat-box"><span>${perfil.total_avaliacoes||0}</span><label>Avaliações</label></div>
      </div>
      <div class="membro-perfil-acoes">
        <button class="btn-confiar" onclick="abrirAvaliacaoDireta('${escapeHtml(telefone)}','${escapeHtml(perfil.nome||'')}')">
          <i data-lucide="star"></i> Avaliar este membro
        </button>
      </div>
      <div class="avaliacoes-lista">
        <div class="secao-label-pequena">AVALIAÇÕES RECENTES</div>
        <p style="color:var(--muted);font-size:.85rem;text-align:center;padding:12px;">Sem avaliações ainda.</p>
      </div>`;
    lucide.createIcons();
  } catch {
    container.innerHTML = '<p style="text-align:center;padding:40px;color:var(--muted);">Erro ao carregar perfil.</p>';
  }
}

// ════════════════════════════════════════════════════════════
// AVALIAÇÃO DIRECTA
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
    btn.onclick = ((n) => () => { _estrelasAvaliacao = n; wrap.querySelectorAll('.estrela-btn').forEach((b,j) => b.classList.toggle('on', j < n)); })(i);
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
  const perfil     = KixikilaManager.getSessao()?.perfil;
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
// NOTIFICAÇÕES
// ════════════════════════════════════════════════════════════

async function carregarNotificacoes() {
  try {
    const dados    = await KixikilaManager.carregarNotificacoes();
    const naoLidas = (dados.notificacoes || []).filter(n => !n.lida).length;
    const dot      = document.querySelector('.notif-dot');
    if (dot) dot.style.display = naoLidas > 0 ? 'block' : 'none';
  } catch {}
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
// INICIALIZAÇÃO
// ════════════════════════════════════════════════════════════

(function init() {
  try {
    const guardado = sessionStorage.getItem('kx_sessao');
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
