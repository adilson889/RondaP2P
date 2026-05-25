// ════════════════════════════════════════════════════════════
// app.js — KIXIKILA
// ════════════════════════════════════════════════════════════

var _codigoAtual       = '';
var _tabAppAtual       = 'membros';
var _syncInterval      = null;
var _membroAtual       = null;
var _estrelasAvaliacao = 0;
var _fotoRegTemp       = null;
var _fotoGrupoTemp     = null;
var _grupoPreview      = null;

// ── UTILS ────────────────────────────────────────────────────
function esc(t) {
  if (t === null || t === undefined) return '';
  const d = document.createElement('div');
  d.textContent = String(t);
  return d.innerHTML;
}

function toast(msg) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2600);
}

function modal(titulo, msg, btns) {
  document.getElementById('modalTitulo').textContent = titulo;
  document.getElementById('modalMsg').textContent    = msg || '';
  const wrap = document.getElementById('modalBtns');
  wrap.innerHTML = '';
  (btns || []).forEach(b => {
    const el = document.createElement('button');
    el.className   = b.classe || 'btn-outline';
    el.textContent = b.texto;
    el.onclick     = () => { fecharModal('modal'); b.acao && b.acao(); };
    wrap.appendChild(el);
  });
  document.getElementById('modal').style.display = 'flex';
}

function fecharModal(id) {
  document.getElementById(id).style.display = 'none';
}

function fecharModalSeClicarFora(event, modalElement) {
  if (event.target === modalElement) {
    modalElement.style.display = 'none';
  }
}

function pillClass(estado) {
  if (estado === 'aberto')  return 'pill-aberto';
  if (estado === 'fechado') return 'pill-fechado';
  return 'pill-encerrado';
}

function pillTexto(estado) {
  if (estado === 'aberto')  return 'Aberto';
  if (estado === 'fechado') return 'Completo';
  return 'Encerrado';
}

function renderEstrelas(valor, total) {
  const cheias = Math.round(valor || 0);
  return Array(5).fill(0).map((_, i) =>
    `<span class="star${i < cheias ? ' on' : ''}">★</span>`
  ).join('') + (total ? `<small style="color:var(--muted);margin-left:6px">(${total})</small>` : '');
}

function comprimirImagem(ficheiro, maxDim = 800, q = 0.85) {
  return new Promise((res, rej) => {
    if (!ficheiro?.type.startsWith('image/')) { rej(new Error('Invalido')); return; }
    const r = new FileReader();
    r.onload = e => {
      const img = new Image();
      img.onload = () => {
        let { width: w, height: h } = img;
        if (w > maxDim || h > maxDim) {
          if (w > h) { h = Math.round(h * maxDim / w); w = maxDim; }
          else       { w = Math.round(w * maxDim / h); h = maxDim; }
        }
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        res(c.toDataURL('image/jpeg', q));
      };
      img.onerror = rej;
      img.src = e.target.result;
    };
    r.onerror = rej;
    r.readAsDataURL(ficheiro);
  });
}

// ── FOTO REGISTO ─────────────────────────────────────────────
async function previewFotoReg(evento) {
  const f = evento.target.files[0];
  if (!f) return;
  try {
    const src = await comprimirImagem(f);
    _fotoRegTemp = src;
    const img    = document.getElementById('fotoPickerImg');
    const letra  = document.getElementById('fotoPickerLetra');
    img.src = src; img.style.display = 'block';
    letra.style.display = 'none';
    document.getElementById('fotoPicker').style.border = '2px solid var(--r)';
  } catch { toast('Erro ao processar imagem'); }
}

// ── FOTO PERFIL (modal editar) ────────────────────────────────
async function previewFotoPerfil(evento) {
  const f = evento.target.files[0];
  if (!f) return;
  try {
    const src  = await comprimirImagem(f);
    const av   = document.getElementById('perfilAvatarModal');
    av.style.backgroundImage    = `url(${src})`;
    av.style.backgroundSize     = 'cover';
    av.style.backgroundPosition = 'center';
    av.textContent = '';
    av.dataset.novaFoto = src;
  } catch { toast('Erro ao processar imagem'); }
}

// ── FOTO GRUPO ────────────────────────────────────────────────
async function previewFotoGrupo(evento) {
  const f = evento.target.files[0];
  if (!f) return;
  try {
    const src = await comprimirImagem(f, 400, 0.8);
    _fotoGrupoTemp = src;
    const img    = document.getElementById('fotoGrupoImg');
    const letra  = document.getElementById('fotoGrupoLetra');
    img.src = src; img.style.display = 'block';
    letra.style.display = 'none';
  } catch { toast('Erro ao processar imagem'); }
}

// ── NAVEGACAO ────────────────────────────────────────────────
function irPara(id) {
  document.querySelectorAll('.pagina').forEach(p => p.style.display = 'none');
  document.getElementById(id).style.display = 'flex';
}

function voltarMain() {
  pararSync();
  irPara('paginaMain');
}

function voltarApp() {
  irPara('paginaApp');
}

// ── SYNC ─────────────────────────────────────────────────────
function iniciarSync() {
  pararSync();
  _syncInterval = setInterval(async () => {
    if (document.visibilityState === 'hidden') return;
    if (!_codigoAtual) return;
    try { await recarregarGrupo(true); } catch (_) {}
  }, 60_000);
}

function pararSync() {
  if (_syncInterval) { clearInterval(_syncInterval); _syncInterval = null; }
}

// ── AUTH ─────────────────────────────────────────────────────
function mostrarTab(tab) {
  document.getElementById('tabRegisto').style.display = tab === 'registo' ? 'block' : 'none';
  document.getElementById('tabLogin').style.display   = tab === 'login'   ? 'block' : 'none';
  document.querySelectorAll('.auth-tab').forEach((b, i) => {
    b.classList.toggle('activo', (i === 0 && tab === 'registo') || (i === 1 && tab === 'login'));
  });
}

async function registar() {
  const nome      = document.getElementById('regNome')?.value.trim()        || '';
  const dataNasc  = document.getElementById('regDataNasc')?.value           || '';
  const telefone  = document.getElementById('regTelefone')?.value.trim()    || '';
  const email     = document.getElementById('regEmail')?.value.trim()       || '';
  const provincia = document.getElementById('regProvincia')?.value          || '';
  const municipio = document.getElementById('regMunicipio')?.value.trim()   || '';
  const senha     = document.getElementById('regSenha')?.value              || '';
  const senhaConf = document.getElementById('regSenhaConfirm')?.value       || '';

  if (!nome)      { toast('Nome completo e obrigatorio'); return; }
  if (!dataNasc)  { toast('Data de nascimento e obrigatoria'); return; }
  if (!telefone)  { toast('Telefone e obrigatorio'); return; }
  if (!/^\+?[0-9]{9,15}$/.test(telefone.replace(/\s/g, ''))) { toast('Formato de telefone inválido'); return; }
  if (!email)     { toast('Email e obrigatorio'); return; }
  if (!provincia) { toast('Seleciona a provincia'); return; }
  if (!municipio) { toast('Municipio e obrigatorio'); return; }

  const erroSenha = validarSenhaFrontend(senha);
  if (erroSenha)  { toast(erroSenha); return; }
  if (senha !== senhaConf) { toast('As senhas nao coincidem'); return; }

  try {
    const perfil = await KixikilaManager.registar({
      telefone, nome, senha,
      foto_perfil: _fotoRegTemp || undefined,
      data_nasc: dataNasc, email, provincia, municipio
    });
    guardarSessao(perfil);
    _fotoRegTemp = null;
    irParaMain();
  } catch (e) { toast(e.message); }
}

async function entrar() {
  if (!verificarRlFrontend()) return;

  const telefone = document.getElementById('loginTelefone')?.value.trim() || '';
  const senha    = document.getElementById('loginSenha')?.value           || '';
  if (!telefone || !senha) { toast('Preenche todos os campos'); return; }

  try {
    const perfil = await KixikilaManager.entrar({ telefone, senha });
    _rl.count = 0;
    guardarSessao(perfil);
    irParaMain();
  } catch (e) {
    registarFalhaFrontend();
    toast(e.message);
  }
}

function logout() {
  modal('Sair', 'Tens a certeza?', [
    { texto: 'Cancelar', classe: 'btn-outline' },
    { texto: 'Sair', classe: 'btn-primary', acao: () => {
      pararSync();
      KixikilaManager.limparSessao();
      fecharModal('modalPerfil');
      irPara('paginaAuth');
    }}
  ]);
}

function guardarSessao(perfil) {
  const dados = { perfil, expira: Date.now() + 24 * 60 * 60 * 1000 };
  localStorage.setItem('kx_sessao', JSON.stringify(dados));
}

function carregarSessao() {
  try {
    const raw = localStorage.getItem('kx_sessao');
    if (!raw) return null;
    const dados = JSON.parse(raw);
    if (dados.expira && Date.now() > dados.expira) {
      localStorage.removeItem('kx_sessao');
      return null;
    }
    return dados.perfil || dados;
  } catch { return null; }
}

// ── RATE LIMIT FRONTEND ───────────────────────────────────────
const _rl = { count: 0, bloqueadoAte: 0 };

function verificarRlFrontend() {
  if (Date.now() < _rl.bloqueadoAte) {
    const seg = Math.ceil((_rl.bloqueadoAte - Date.now()) / 1000);
    toast(`Muitas tentativas. Aguarda ${seg}s`);
    return false;
  }
  return true;
}

function registarFalhaFrontend() {
  _rl.count++;
  if (_rl.count >= 5) {
    _rl.bloqueadoAte = Date.now() + 30_000;
    _rl.count = 0;
    toast('5 tentativas falhadas. Bloqueado por 30 segundos');
  }
}

// ── VALIDACAO DE SENHA ────────────────────────────────────────
function validarSenhaFrontend(senha) {
  if (!senha || senha.length < 6) return 'Senha deve ter mínimo 6 caracteres';
  if (!/[A-Za-z]/.test(senha))    return 'Senha deve conter letras';
  if (!/[0-9]/.test(senha))       return 'Senha deve conter números';
  return null;
}


// ── MAIN ─────────────────────────────────────────────────────
function irParaMain() {
  irPara('paginaMain');
  atualizarAvatar();
  mostrarTabMain('feed');
}

function atualizarAvatar() {
  const perfil = KixikilaManager.getSessao()?.perfil;
  if (!perfil) return;
  const av = document.getElementById('topAvatar');
  if (!av) return;
  if (perfil.foto_perfil) {
    av.style.backgroundImage    = `url(${perfil.foto_perfil})`;
    av.style.backgroundSize     = 'cover';
    av.style.backgroundPosition = 'center';
    av.textContent = '';
  } else {
    av.style.backgroundImage = '';
    av.textContent = (perfil.nome?.[0] || 'K').toUpperCase();
  }
}

function mostrarTabMain(tab) {
  document.getElementById('tabFeed').classList.toggle('activo', tab === 'feed');
  document.getElementById('tabMeus').classList.toggle('activo', tab === 'meus');
  document.getElementById('conteudoFeed').style.display = tab === 'feed' ? 'block' : 'none';
  document.getElementById('conteudoMeus').style.display = tab === 'meus' ? 'block' : 'none';
  if (tab === 'feed') carregarFeed();
  if (tab === 'meus') carregarMeus();
}



async function carregarFeed() {
  const lista = document.getElementById('feedLista');
  lista.innerHTML = skeleton();
  try {
    // Carrega grupos e posts em paralelo
    const [grupos, posts] = await Promise.all([
      KixikilaManager.carregarFeed({ estado: 'aberto', limite: 20 }),
      KixikilaManager.carregarPostsP2P(20).catch(() => [])
    ]);

    lista.innerHTML = '';

    if (!grupos.length && !posts.length) {
      lista.innerHTML = '<div class="vazio"><p>Nada por aqui ainda.</p></div>';
      return;
    }

    // Mistura e ordena por data
    const itens = [
      ...grupos.map(g => ({ tipo: 'grupo', data: g.criado_em || '', dado: g })),
      ...posts.map(p  => ({ tipo: 'post',  data: p.data      || '', dado: p }))
    ].sort((a, b) => new Date(b.data) - new Date(a.data));

    itens.forEach(item => {
      if (item.tipo === 'grupo') lista.appendChild(criarCardFeed(item.dado));
      else                       lista.appendChild(criarCardPost(item.dado));
    });
  } catch {
    lista.innerHTML = '<div class="vazio"><p>Erro ao carregar.</p></div>';
  }
}

function criarCardPost(post) {
  const perfil = KixikilaManager.getSessao()?.perfil;
  const liked  = post.likes?.some(l => l.telefone === perfil?.telefone) || false;
  const diff   = Math.floor((Date.now() - new Date(post.data)) / 60000);
  const tempo  = diff < 1 ? 'agora' : diff < 60 ? diff+'m' : diff < 1440 ? Math.floor(diff/60)+'h' : Math.floor(diff/1440)+'d';

  const div = document.createElement('div');
  div.className = 'feed-card post-card';
  div.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
      <div class="feed-icon" style="flex-shrink:0;${post.autor.foto_perfil?`background-image:url('${esc(post.autor.foto_perfil)}');background-size:cover;background-position:center`:''}">${!post.autor.foto_perfil?(post.autor.nome?.[0]||'U').toUpperCase():''}</div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:700;font-size:.9rem">${esc(post.autor.nome)}</div>
        <div style="font-size:.75rem;color:var(--muted)">${tempo}</div>
      </div>
      <span class="pill" style="background:var(--bg3);color:var(--muted);font-size:.65rem">Post</span>
    </div>
    <div style="font-size:.92rem;line-height:1.55;margin-bottom:12px;color:var(--text)">${esc(post.texto)}</div>
    <div style="display:flex;gap:16px;border-top:1px solid var(--border);padding-top:10px">
      <button class="post-acao-btn${liked?' liked':''}" data-postid="${esc(post.id)}" onclick="toggleLikePost(this,'${esc(post.id)}')">
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="${liked?'var(--r)':'none'}" stroke="${liked?'var(--r)':'currentColor'}" stroke-width="2"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
        <span class="like-count">${post.likes_count||0}</span>
      </button>
      <button class="post-acao-btn" onclick="abrirComentariosPost('${esc(post.id)}','${esc(post.autor.nome)}')">
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        <span>${post.comentarios_count||0}</span>
      </button>
    </div>`;
  return div;
}

async function toggleLikePost(btn, postId) {
  const perfil = KixikilaManager.getSessao()?.perfil;
  if (!perfil) { toast('Faz login'); return; }
  const liked    = btn.classList.contains('liked');
  const span     = btn.querySelector('.like-count');
  const svg      = btn.querySelector('svg');
  const count    = parseInt(span?.textContent || '0');
  // Optimistic
  if (liked) {
    btn.classList.remove('liked');
    svg.setAttribute('fill','none'); svg.setAttribute('stroke','currentColor');
    if (span) span.textContent = count - 1;
    await KixikilaManager.removerLikeP2P(postId).catch(() => {});
  } else {
    btn.classList.add('liked');
    svg.setAttribute('fill','var(--r)'); svg.setAttribute('stroke','var(--r)');
    if (span) span.textContent = count + 1;
    toast('Gostei ❤️');
    await KixikilaManager.darLikeP2P(postId).catch(() => {});
  }
}

var _postComentariosAtual = '';
async function abrirComentariosPost(postId, autorNome) {
  _postComentariosAtual = postId;
  document.getElementById('comentariosTituloPost').textContent = 'Comentários · ' + autorNome;
  document.getElementById('comentariosListaPost').innerHTML = '<div style="padding:20px;text-align:center;color:var(--muted)">A carregar...</div>';
  document.getElementById('modalComentariosPost').style.display = 'flex';
  await carregarComentariosPost(postId);
}

async function carregarComentariosPost(postId) {
  const container = document.getElementById('comentariosListaPost');
  try {
    const lista = await KixikilaManager.carregarComentariosP2P(postId);
    if (!lista.length) { container.innerHTML = '<div style="padding:20px;text-align:center;color:var(--muted)">Sem comentários ainda.</div>'; return; }
    container.innerHTML = lista.map(c => `
      <div style="display:flex;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)">
        <div class="feed-icon" style="width:32px;height:32px;font-size:.8rem;flex-shrink:0;${c.autor.foto_perfil?`background-image:url('${esc(c.autor.foto_perfil)}');background-size:cover`:''}">${!c.autor.foto_perfil?(c.autor.nome?.[0]||'U').toUpperCase():''}</div>
        <div><div style="font-weight:700;font-size:.85rem">${esc(c.autor.nome)}</div><div style="font-size:.88rem;margin-top:2px">${esc(c.texto)}</div></div>
      </div>`).join('');
  } catch { container.innerHTML = '<div style="padding:20px;text-align:center">Erro ao carregar.</div>'; }
}

async function enviarComentarioPost() {
  const input  = document.getElementById('comentarioTextoPost');
  const texto  = input?.value.trim();
  const perfil = KixikilaManager.getSessao()?.perfil;
  if (!texto || !perfil) return;
  input.value = '';
  try {
    await KixikilaManager.adicionarComentarioP2P(_postComentariosAtual, texto);
    await carregarComentariosPost(_postComentariosAtual);
  } catch (e) { toast(e.message); }
}

function criarCardFeed(g) {
  const vagas = g.max_membros - g.membros.length;
  const pct   = Math.round((g.membros.length / g.max_membros) * 100);
  const div   = document.createElement('div');
  div.className = 'feed-card';
  div.onclick   = () => abrirPreviewGrupo(g);
  div.innerHTML = `
    <div class="feed-card-top">
      <div class="feed-icon">${g.foto_grupo ? `<img src="${esc(g.foto_grupo)}" style="width:100%;height:100%;object-fit:cover;border-radius:12px">` : (g.nome||'G')[0].toUpperCase()}</div>
      <div>
        <div class="feed-nome">${esc(g.nome)}</div>
        <div class="feed-sub">${g.membros.length}/${g.max_membros} membros · ${esc(g.periodicidade)}</div>
      </div>
      <span class="pill ${pillClass(g.estado)}">${pillTexto(g.estado)}</span>
    </div>
    <div class="feed-valor">${KixikilaManager.formatarValor(g.valor)} KZ</div>
    <div class="feed-progress"><div class="feed-progress-bar" style="width:${pct}%"></div></div>
    <div class="feed-rodape">
      <span>${vagas} vaga${vagas!==1?'s':''}</span>
      <span>por ${esc(g.criador?.nome||'')}</span>
    </div>`;
  return div;
}

function abrirPreviewGrupo(grupo) {
  _grupoPreview = grupo;
  
  const vagas = grupo.max_membros - grupo.membros.length;
  const pct = Math.round((grupo.membros.length / grupo.max_membros) * 100);
  
  document.getElementById('previewTitulo').textContent = grupo.nome;
  
  if (grupo.foto_grupo) {
    document.getElementById('previewFoto').innerHTML = `<img src="${esc(grupo.foto_grupo)}" style="width:100%;height:180px;object-fit:cover;border-radius:12px">`;
  } else {
    document.getElementById('previewFoto').innerHTML = `<div style="width:100%;height:180px;background:var(--r-soft);display:flex;align-items:center;justify-content:center;font-size:3rem;color:var(--r);border-radius:12px">${(grupo.nome||'G')[0].toUpperCase()}</div>`;
  }
  
  let descricaoHtml = '';
  if (grupo.descricao) {
    descricaoHtml = `<div style="margin:12px 0"><strong>Descricao</strong><br>${esc(grupo.descricao)}</div>`;
  }
  
  let regrasHtml = '';
  if (grupo.regras) {
    regrasHtml = `<div style="margin:12px 0"><strong>Regras do grupo</strong><br>${esc(grupo.regras)}</div>`;
  }
  
  let localizacaoHtml = '';
  if (grupo.localizacao) {
    localizacaoHtml = `<div style="margin:12px 0"><strong>Localizacao</strong><br>${esc(grupo.localizacao)}</div>`;
  }
  
  document.getElementById('previewDescricao').innerHTML = descricaoHtml;
  document.getElementById('previewRegras').innerHTML = regrasHtml;
  document.getElementById('previewLocalizacao').innerHTML = localizacaoHtml;
  document.getElementById('previewValor').innerHTML = `${KixikilaManager.formatarValor(grupo.valor)} KZ / ${grupo.periodicidade}`;
  document.getElementById('previewProgresso').style.width = pct + '%';
  document.getElementById('previewMembros').textContent = `${grupo.membros.length}/${grupo.max_membros} membros`;
  document.getElementById('previewVagas').textContent = `${vagas} vaga${vagas!==1?'s':''}`;
  document.getElementById('previewCriador').textContent = grupo.criador?.nome || '';
  
  document.getElementById('modalPreviewGrupo').style.display = 'flex';
}

async function solicitarEntrada() {
  if (!_grupoPreview) return;
  const perfil = KixikilaManager.getSessao()?.perfil;
  if (!perfil) { toast('Faca login primeiro'); return; }
  
  try {
    await KixikilaManager.solicitarEntrada(_grupoPreview.codigo, perfil.telefone, perfil.nome);
    toast('Pedido enviado ao administrador do grupo');
    fecharModal('modalPreviewGrupo');
  } catch (e) { toast(e.message); }
}

async function carregarMeus() {
  const lista = document.getElementById('meusLista');
  const vazio = document.getElementById('meusVazio');
  lista.innerHTML = skeleton();
  try {
    const grupos = await KixikilaManager.carregarMeusGrupos();
    lista.innerHTML = '';
    if (!grupos.length) { vazio.style.display = 'flex'; return; }
    vazio.style.display = 'none';
    grupos.forEach(g => lista.appendChild(criarCardMeu(g)));
  } catch { lista.innerHTML = '<div class="vazio"><p>Erro ao carregar.</p></div>'; }
}

function criarCardMeu(g) {
  const pagos = g.membros.filter(m => m.pago).length;
  const pct   = Math.round((pagos / g.membros.length) * 100);
  const div   = document.createElement('div');
  div.className = 'feed-card';
  div.onclick   = () => abrirGrupo(g.codigo);
  div.innerHTML = `
    <div class="feed-card-top">
      <div class="feed-icon">${g.foto_grupo ? `<img src="${esc(g.foto_grupo)}" style="width:100%;height:100%;object-fit:cover;border-radius:12px">` : (g.nome||'G')[0].toUpperCase()}</div>
      <div>
        <div class="feed-nome">${esc(g.nome)}</div>
        <div class="feed-sub">${g.membros.length} membros · ${esc(g.periodicidade)}</div>
      </div>
      <span class="pill ${pillClass(g.estado)}">${pillTexto(g.estado)}</span>
    </div>
    <div class="feed-valor">${KixikilaManager.formatarValor(g.valor)} KZ</div>
    <div class="feed-progress"><div class="feed-progress-bar" style="width:${pct}%"></div></div>
    <div class="feed-rodape">
      <span>${pagos}/${g.membros.length} pagamentos</span>
      <span>Ronda ${g.ordem_atual||1}</span>
    </div>`;
  return div;
}

// ── FAB ──────────────────────────────────────────────────────
function abrirCriar() {
  modal('O que queres fazer?', '', [
    { texto: 'Entrar com código', classe: 'btn-outline', acao: () => document.getElementById('modalEntrar').style.display = 'flex' },
    { texto: 'Criar grupo',       classe: 'btn-primary', acao: () => document.getElementById('modalCriar').style.display  = 'flex' },
    { texto: 'Publicar post',     classe: 'btn-primary', acao: () => abrirModalPost() }
  ]);
}

function abrirModalPost() {
  const el = document.getElementById('postTexto');
  if (el) el.value = '';
  document.getElementById('modalPost').style.display = 'flex';
}

async function criarPost() {
  const texto  = document.getElementById('postTexto')?.value.trim();
  const perfil = KixikilaManager.getSessao()?.perfil;
  if (!texto)  { toast('Escreve algo'); return; }
  if (!perfil) { toast('Faz login'); return; }
  const btn = document.querySelector('#modalPost .btn-primary');
  if (btn) { btn.disabled = true; btn.textContent = 'A publicar...'; }
  try {
    await KixikilaManager.criarPostP2P(texto);
    document.getElementById('modalPost').style.display = 'none';
    toast('Post publicado!');
    carregarFeed(); // recarrega o feed misto
  } catch (e) {
    toast(e.message);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Publicar'; }
  }
}

async function criarGrupo() {
  const nome        = document.getElementById('criarNome')?.value.trim() || '';
  const descricao   = document.getElementById('criarDescricao')?.value.trim() || '';
  const regras      = document.getElementById('criarRegras')?.value.trim() || '';
  const localizacao = document.getElementById('criarLocalizacao')?.value.trim() || '';
  const valor       = parseFloat(document.getElementById('criarValor')?.value || 0);
  const period      = document.getElementById('criarPeriod')?.value || 'mensal';
  const max         = parseInt(document.getElementById('criarMax')?.value || 6);
  const perfil      = KixikilaManager.getSessao()?.perfil;
  
  if (!perfil) { toast('Sessao expirada'); return; }
  if (!nome || !valor || valor < 500) { toast('Preenche todos os campos. Minimo 500 KZ'); return; }
  
  try {
    const codigo = await KixikilaManager.criarGrupo({
      nome, telefone: perfil.telefone, nomeAdmin: perfil.nome,
      valor, periodicidade: period, maxMembros: max,
      descricao, regras, localizacao,
      foto_grupo: _fotoGrupoTemp || undefined
    });
    _fotoGrupoTemp = null;
    fecharModal('modalCriar');
    modal('Grupo criado!', 'Codigo: ' + codigo, [
      { texto: 'Partilhar', classe: 'btn-outline', acao: () => window.open('https://wa.me/?text=' + encodeURIComponent('Entra no meu grupo Kixikila!\nCodigo: ' + codigo)) },
      { texto: 'Ver grupo', classe: 'btn-primary', acao: () => abrirGrupo(codigo) }
    ]);
  } catch (e) { toast(e.message); }
}

async function entrarGrupo() {
  const codigo = document.getElementById('entrarCodigo')?.value.trim().toUpperCase() || '';
  const perfil = KixikilaManager.getSessao()?.perfil;
  if (!perfil) { toast('Sessao expirada'); return; }
  if (!codigo || codigo.length < 4) { toast('Codigo invalido'); return; }
  try {
    await KixikilaManager.entrarGrupo(codigo, perfil.telefone, perfil.nome);
    fecharModal('modalEntrar');
    toast('Entraste no grupo!');
    abrirGrupo(codigo);
  } catch (e) { toast(e.message); }
}

// ── APP (ver grupo) ──────────────────────────────────────────


// ── APP (ver grupo) ──────────────────────────────────────────
async function abrirGrupo(codigo) {
  _codigoAtual = codigo;
  irPara('paginaApp');
  mostrarTabApp('membros');
  await recarregarGrupo();
  iniciarSync();
}

async function recarregarGrupo(silencioso = false) {
  try {
    const grupo = await KixikilaManager.carregarGrupo(_codigoAtual);
    const perfil = KixikilaManager.getSessao()?.perfil;
    
    // Buscar foto de cada membro individualmente
    for (let i = 0; i < grupo.membros.length; i++) {
      const m = grupo.membros[i];
      if (m.telefone) {
        try {
          const dados = await KixikilaManager.carregarReputacao(m.telefone);
          m.foto_perfil = dados.foto_perfil || null;
        } catch (e) {
          m.foto_perfil = null;
        }
      }
    }
    
    renderGrupo(grupo, perfil);
  } catch { 
    if (!silencioso) toast('Erro ao carregar grupo'); 
  }
}

function renderGrupo(grupo, perfil) {
  const pagos    = grupo.membros.filter(m => m.pago).length;
  const pct      = Math.round((pagos / grupo.membros.length) * 100);
  const eCriador = grupo.criador?.telefone === perfil?.telefone;

  document.getElementById('appNomeGrupo').textContent  = grupo.nome;
  const pill = document.getElementById('appPill');
  pill.className   = 'pill ' + pillClass(grupo.estado);
  pill.textContent = pillTexto(grupo.estado);

  document.getElementById('appValor').textContent      = KixikilaManager.formatarValor(grupo.valor) + ' KZ';
  document.getElementById('appProgresso').style.width  = pct + '%';
  document.getElementById('appPagamentos').textContent = pagos + '/' + grupo.membros.length + ' pagamentos';

  const memAtual = grupo.membros.find(m => m.ordem === grupo.ordem_atual);
  document.getElementById('appMeta').textContent =
    memAtual ? 'Ronda ' + grupo.ordem_atual + ' — A receber: ' + memAtual.nome : 'Ronda ' + (grupo.ordem_atual||1);

  document.getElementById('appProximaRonda').textContent = grupo.periodicidade;
  document.getElementById('btnEncerrar').style.display   = eCriador ? 'block' : 'none';

  renderMembros(grupo, perfil);
  renderRodas(grupo);
}

function renderMembros(grupo, perfil) {
  const lista = document.getElementById('listaMembros');
  if (!lista) return;
  lista.innerHTML = '';
  
  grupo.membros.slice().sort((a, b) => a.ordem - b.ordem).forEach(m => {
    const eAtual   = m.ordem === grupo.ordem_atual;
    const eProprio = m.telefone === perfil?.telefone;
    const div = document.createElement('div');
    div.className = 'membro-item';
    div.onclick   = () => abrirPerfilMembro(m);
    
    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'membro-av' + (eAtual ? ' atual' : '');
    
    if (m.foto_perfil && m.foto_perfil.trim() !== '') {
      avatarDiv.style.backgroundImage = `url(${m.foto_perfil})`;
      avatarDiv.style.backgroundSize = 'cover';
      avatarDiv.style.backgroundPosition = 'center';
      avatarDiv.textContent = '';
    } else {
      avatarDiv.style.backgroundImage = '';
      avatarDiv.style.backgroundColor = 'var(--bg3)';
      avatarDiv.style.display = 'flex';
      avatarDiv.style.alignItems = 'center';
      avatarDiv.style.justifyContent = 'center';
      avatarDiv.textContent = (m.nome?.[0] || '?').toUpperCase();
    }
    
    const infoDiv = document.createElement('div');
    infoDiv.className = 'membro-info';
    infoDiv.innerHTML = '<div class="membro-nome">' + esc(m.nome) + (eProprio ? ' <small style="color:var(--r)">(tu)</small>' : '') + '</div><div class="membro-tel">' + esc(m.telefone) + '</div>';
    
    const statusSpan = document.createElement('span');
    statusSpan.className = 'status ' + (m.pago ? 'status-pago' : eAtual ? 'status-recebe' : 'status-pendente');
    statusSpan.textContent = m.pago ? 'PAGO' : eAtual ? 'RECEBE' : 'PENDENTE';
    
    div.appendChild(avatarDiv);
    div.appendChild(infoDiv);
    div.appendChild(statusSpan);
    lista.appendChild(div);
  });
}

function renderRodas(grupo) {
  const lista = document.getElementById('listaRodas');
  if (!lista) return;
  lista.innerHTML = '';
  const total = grupo.membros.length;
  grupo.membros.slice().sort((a, b) => a.ordem - b.ordem).forEach(m => {
    const eAtual    = m.ordem === grupo.ordem_atual;
    const concluida = m.ordem < grupo.ordem_atual;
    const div = document.createElement('div');
    div.className = 'roda-item';
    div.innerHTML = `
      <div class="roda-num${eAtual ? ' atual' : concluida ? ' concluida' : ''}">${m.ordem}</div>
      <div class="roda-info">
        <div class="roda-nome">${esc(m.nome)}</div>
        <div class="roda-label">Ronda ${m.ordem} de ${total}</div>
      </div>
      <span class="roda-estado${eAtual ? ' atual' : concluida ? ' concluida' : ' pendente'}">
        ${eAtual ? 'A RECEBER' : concluida ? 'RECEBEU' : 'AGUARDA'}
      </span>`;
    lista.appendChild(div);
  });
}


// ── PERFIL MEMBRO ────────────────────────────────────────────
 
function abrirPerfilMembro(membro) {
  _membroAtual = membro;
  
  // Buscar dados completos do backend (inclui foto_perfil)
  KixikilaManager.carregarReputacao(membro.telefone).then(dados => {
    const m = { ...membro, ...dados };
    
    const perfilLogado = KixikilaManager.getSessao()?.perfil;
    const isProprio = m.telefone === perfilLogado?.telefone;
    
    // ----- FOTO GRANDE (CORRIGIDO) -----
    const fotoEl = document.getElementById('membroFotoGrande');
    if (m.foto_perfil && m.foto_perfil.trim() !== '') {
      // Aplica a foto como background
      fotoEl.style.backgroundImage = `url(${m.foto_perfil})`;
      fotoEl.style.backgroundSize = 'cover';
      fotoEl.style.backgroundPosition = 'center';
      fotoEl.innerHTML = ''; // Remove qualquer letra/ícone
    } else {
      fotoEl.style.backgroundImage = '';
      fotoEl.innerHTML = `<span class="membro-foto-letra">${(m.nome?.[0] || '?').toUpperCase()}</span>`;
    }
    
    // Nome e telefone
    document.getElementById('membroPerfilNome').textContent = m.nome || '';
    document.getElementById('membroPerfilTel').textContent = m.telefone || '';
    
    // Informações extra
    let infoExtra = '';
    if (m.email) infoExtra += `<div><span style="color:var(--muted)">Email:</span> ${esc(m.email)}</div>`;
    if (m.provincia) infoExtra += `<div><span style="color:var(--muted)">Província:</span> ${esc(m.provincia)}</div>`;
    if (m.municipio) infoExtra += `<div><span style="color:var(--muted)">Município:</span> ${esc(m.municipio)}</div>`;
    if (m.data_nasc) infoExtra += `<div><span style="color:var(--muted)">Data de nascimento:</span> ${esc(m.data_nasc)}</div>`;
    document.getElementById('membroInfoExtra').innerHTML = infoExtra;
    
    // Estrelas
    const estrelasHtml = renderEstrelas(m.reputacao || 0, m.total_avaliacoes);
    document.getElementById('membroStars').innerHTML = estrelasHtml;
    document.getElementById('membroStarsCount').textContent = m.total_avaliacoes ? `${m.total_avaliacoes} ` : 'Sem avaliações';
    
    // Botão avaliar
    const btnAvaliar = document.querySelector('#modalMembroPerfil .btn-primary');
    if (btnAvaliar) btnAvaliar.style.display = isProprio ? 'none' : 'block';
    
    // Abrir modal
    document.getElementById('modalMembroPerfil').style.display = 'flex';
  }).catch(e => {
    console.error('Erro ao carregar dados do membro:', e);
    toast('Erro ao carregar dados do membro');
    document.getElementById('modalMembroPerfil').style.display = 'flex';
  });
}

// ── AVALIAR MEMBRO ───────────────────────────────────────────
function abrirAvaliarMembro() {
  if (!_membroAtual) return;
  fecharModal('modalMembroPerfil');
  _estrelasAvaliacao = 0;
  document.getElementById('avaliarNome').textContent    = _membroAtual.nome || '';
  document.getElementById('avaliarComentario').value    = '';

  const wrap = document.getElementById('estrelasInput');
  wrap.innerHTML = '';
  for (let i = 1; i <= 5; i++) {
    const btn = document.createElement('button');
    btn.className   = 'star-btn';
    btn.textContent = '★';
    btn.dataset.val = i;
    btn.onclick     = () => {
      _estrelasAvaliacao = i;
      wrap.querySelectorAll('.star-btn').forEach((b, j) => b.classList.toggle('on', j < i));
    };
    wrap.appendChild(btn);
  }
  document.getElementById('modalAvaliar').style.display = 'flex';
}

async function confirmarAvaliacao() {
  if (!_estrelasAvaliacao) { toast('Selecciona as estrelas'); return; }
  const perfil     = KixikilaManager.getSessao()?.perfil;
  const comentario = document.getElementById('avaliarComentario')?.value.trim() || '';
  if (!perfil || !_membroAtual) return;
  try {
    await KixikilaManager.avaliar(perfil.telefone, _membroAtual.telefone, _estrelasAvaliacao, comentario);
    fecharModal('modalAvaliar');
    toast('Avaliacao enviada!');
  } catch (e) { toast(e.message); }
}

// ── TABS INTERNAS ────────────────────────────────────────────
function mostrarTabApp(tab) {
  _tabAppAtual = tab;
  ['membros','rodas'].forEach(t => {
    document.getElementById('tab' + t.charAt(0).toUpperCase() + t.slice(1))
      ?.classList.toggle('activo', t === tab);
    document.getElementById('conteudo' + t.charAt(0).toUpperCase() + t.slice(1))
      .style.display = t === tab ? 'block' : 'none';
  });
  document.getElementById('tabChat')?.classList.remove('activo');
}



// ── CHAT ─────────────────────────────────────────────────────


   // ── CHAT ─────────────────────────────────────────────────────
function abrirChat() {
  KixikilaManager.carregarGrupo(_codigoAtual).then(async g => {
    // Buscar fotos dos membros para o chat
    for (let i = 0; i < g.membros.length; i++) {
      const m = g.membros[i];
      if (m.telefone && !m.foto_perfil) {
        try {
          const dados = await KixikilaManager.carregarReputacao(m.telefone);
          m.foto_perfil = dados.foto_perfil || null;
        } catch (e) {
          m.foto_perfil = null;
        }
      }
    }
    document.getElementById('chatNomeGrupo').textContent = g.nome;
    document.getElementById('chatMembrosCount').textContent = g.membros.length + ' membros';
    renderChat(g, KixikilaManager.getSessao()?.perfil);
    irPara('paginaChat');
  }).catch(() => toast('Erro ao abrir chat'));
}

function renderChat(grupo, perfil) {
  const container = document.getElementById('chatMensagens');
  if (!container) return;
  const msgs = grupo.mensagens || [];
  container.innerHTML = '';
  
  if (!msgs.length) {
    container.innerHTML = '<p style="text-align:center;color:var(--muted);padding:32px;font-size:.88rem">Sem mensagens ainda.</p>';
    return;
  }
  
  // Mapa de membros para buscar foto rapidamente
  const membrosMap = {};
  grupo.membros.forEach(m => {
    membrosMap[m.telefone] = m;
  });
  
  msgs.forEach(msg => {
    const meu = msg.telefone === perfil?.telefone;
    const autor = membrosMap[msg.telefone];
    const fotoAutor = autor?.foto_perfil;
    
    const wrap = document.createElement('div');
    wrap.className = 'chat-balao-wrap ' + (meu ? 'meu' : 'outro');
    
    // Container flex horizontal
    const linha = document.createElement('div');
    linha.style.display = 'flex';
    linha.style.flexDirection = 'row';
    linha.style.alignItems = 'flex-start';
    linha.style.gap = '10px';
    
    // Avatar do autor (só para mensagens de outros) - CLICÁVEL
    if (!meu && autor) {
      const avatarDiv = document.createElement('div');
      avatarDiv.style.width = '36px';
      avatarDiv.style.height = '36px';
      avatarDiv.style.borderRadius = '50%';
      avatarDiv.style.flexShrink = '0';
      avatarDiv.style.overflow = 'hidden';
      avatarDiv.style.cursor = 'pointer';
      avatarDiv.title = 'Ver perfil de ' + (autor.nome || '');
      avatarDiv.onclick = (e) => {
        e.stopPropagation();
        abrirPerfilMembro(autor);
      };
      
      if (fotoAutor && fotoAutor.trim() !== '') {
        avatarDiv.style.backgroundImage = `url(${fotoAutor})`;
        avatarDiv.style.backgroundSize = 'cover';
        avatarDiv.style.backgroundPosition = 'center';
        avatarDiv.textContent = '';
      } else {
        avatarDiv.style.background = 'var(--r-soft)';
        avatarDiv.style.display = 'flex';
        avatarDiv.style.alignItems = 'center';
        avatarDiv.style.justifyContent = 'center';
        avatarDiv.style.fontSize = '.9rem';
        avatarDiv.style.fontWeight = '800';
        avatarDiv.style.color = 'var(--r)';
        avatarDiv.textContent = (autor.nome?.[0] || '?').toUpperCase();
      }
      linha.appendChild(avatarDiv);
    }
    
    // Container do conteúdo (nome + balão + data)
    const conteudo = document.createElement('div');
    conteudo.style.flex = '1';
    conteudo.style.minWidth = '0';
    
    if (!meu && autor) {
      const nomeSpan = document.createElement('span');
      nomeSpan.className = 'chat-autor';
      nomeSpan.textContent = autor.nome || '';
      nomeSpan.style.display = 'block';
      nomeSpan.style.marginBottom = '4px';
      nomeSpan.style.cursor = 'pointer';
      nomeSpan.style.color = 'var(--r)';
      nomeSpan.style.fontWeight = '600';
      nomeSpan.onclick = (e) => {
        e.stopPropagation();
        abrirPerfilMembro(autor);
      };
      conteudo.appendChild(nomeSpan);
    }
    
    const balao = document.createElement('div');
    balao.className = 'chat-balao ' + (meu ? 'meu' : 'outro');
    balao.textContent = msg.texto;
    conteudo.appendChild(balao);
    
    const dataSpan = document.createElement('span');
    dataSpan.className = 'chat-data';
    dataSpan.textContent = (msg.data || '').replace('T', ' ').slice(0, 16);
    dataSpan.style.display = 'block';
    dataSpan.style.marginTop = '4px';
    conteudo.appendChild(dataSpan);
    
    linha.appendChild(conteudo);
    wrap.appendChild(linha);
    container.appendChild(wrap);
  });
  
  container.scrollTop = container.scrollHeight;
}

async function enviarMsg() {
  const input = document.getElementById('chatInput');
  const texto = input?.value.trim() || '';
  const perfil = KixikilaManager.getSessao()?.perfil;
  if (!texto || !perfil) return;
  input.value = '';
  crescerTextarea(input);
  try {
    await KixikilaManager.enviarMensagem(_codigoAtual, perfil.telefone, perfil.nome, texto);
    const g = await KixikilaManager.carregarGrupo(_codigoAtual);
    renderChat(g, perfil);
  } catch { 
    toast('Erro ao enviar mensagem'); 
  }
}

function crescerTextarea(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 140) + 'px';
}
    



// ── ACOES GRUPO ──────────────────────────────────────────────
async function registarPagamento() {
  const perfil = KixikilaManager.getSessao()?.perfil;
  if (!perfil) return;
  modal('Confirmar pagamento', 'Confirmas que efectuaste o pagamento desta ronda?', [
    { texto: 'Cancelar', classe: 'btn-outline' },
    { texto: 'Confirmar', classe: 'btn-primary', acao: async () => {
      try {
        const res = await KixikilaManager.registarPagamento(_codigoAtual, perfil.telefone);
        if (res.todosPagaram) toast('Todos pagaram! Nova ronda iniciada.');
        else toast('Pagamento registado!');
        await recarregarGrupo();
      } catch (e) { toast(e.message); }
    }}
  ]);
}

async function sairDoGrupo() {
  const perfil = KixikilaManager.getSessao()?.perfil;
  if (!perfil) return;
  modal('Sair do grupo', 'Tens a certeza que queres sair?', [
    { texto: 'Cancelar', classe: 'btn-outline' },
    { texto: 'Sair', classe: 'btn-primary', acao: async () => {
      try {
        await KixikilaManager.sairGrupo(_codigoAtual, perfil.telefone);
        toast('Saiste do grupo.');
        voltarMain();
      } catch (e) { toast(e.message); }
    }}
  ]);
}

async function encerrarGrupo() {
  const perfil = KixikilaManager.getSessao()?.perfil;
  if (!perfil) return;
  modal('Encerrar grupo', 'Isto encerrara o grupo para todos os membros.', [
    { texto: 'Cancelar', classe: 'btn-outline' },
    { texto: 'Encerrar', classe: 'btn-primary', acao: async () => {
      try {
        await KixikilaManager.encerrarGrupo(_codigoAtual, perfil.telefone);
        toast('Grupo encerrado.');
        voltarMain();
      } catch (e) { toast(e.message); }
    }}
  ]);
}

// ── PERFIL (O MEU) ───────────────────────────────────────────
function abrirPerfil() {
  const perfil = KixikilaManager.getSessao()?.perfil;
  if (!perfil) return;
  const av = document.getElementById('perfilAvatarModal');
  av.dataset.novaFoto = '';
  if (perfil.foto_perfil) {
    av.style.backgroundImage    = `url(${perfil.foto_perfil})`;
    av.style.backgroundSize     = 'cover';
    av.style.backgroundPosition = 'center';
    av.textContent = '';
  } else {
    av.style.backgroundImage = '';
    av.textContent = (perfil.nome?.[0]||'K').toUpperCase();
  }
  document.getElementById('perfilNomeModal').textContent = perfil.nome || '';
  document.getElementById('perfilTelModal').textContent  = perfil.telefone || '';
  document.getElementById('editNome').value  = perfil.nome || '';
  document.getElementById('editSenha').value = '';
  document.getElementById('modalPerfil').style.display = 'flex';
}

async function guardarPerfil() {
  const perfil = KixikilaManager.getSessao()?.perfil;
  if (!perfil) return;
  const nome     = document.getElementById('editNome')?.value.trim()  || '';
  const senha    = document.getElementById('editSenha')?.value.trim() || '';
  const av       = document.getElementById('perfilAvatarModal');
  const novaFoto = av.dataset.novaFoto || undefined;
  if (!nome) { toast('O nome e obrigatorio'); return; }
  try {
    await KixikilaManager.atualizarPerfil({
      telefone: perfil.telefone, nome,
      foto_perfil: novaFoto,
      senha: senha || undefined
    });
    fecharModal('modalPerfil');
    atualizarAvatar();
    toast('Perfil actualizado!');
  } catch (e) { toast(e.message); }
}

async function confirmarEliminarConta() {
  fecharModal('modalPerfil');
  modal('Eliminar conta', 'Esta accao e irreversivel. Tens a certeza?', [
    { texto: 'Cancelar', classe: 'btn-outline' },
    { texto: 'Eliminar', classe: 'btn-primary', acao: async () => {
      const perfil = KixikilaManager.getSessao()?.perfil;
      if (!perfil) return;
      const senha = prompt('Insere a tua senha para confirmar:');
      if (!senha) return;
      try {
        await KixikilaManager.eliminarConta(perfil.telefone, senha);
        KixikilaManager.limparSessao();
        irPara('paginaAuth');
        toast('Conta eliminada.');
      } catch (e) { toast(e.message); }
    }}
  ]);
}

// ── SKELETON ─────────────────────────────────────────────────
function skeleton() {
  return Array(3).fill(0).map(() => `
    <div style="margin:12px 16px 0;padding:16px;background:var(--bg2);border-radius:14px;border:1px solid var(--border)">
      <div style="display:flex;gap:12px;margin-bottom:12px">
        <div class="skel" style="width:44px;height:44px;border-radius:12px;flex-shrink:0"></div>
        <div style="flex:1;display:flex;flex-direction:column;gap:8px;padding-top:4px">
          <div class="skel" style="height:12px;width:55%;border-radius:6px"></div>
          <div class="skel" style="height:10px;width:38%;border-radius:6px"></div>
        </div>
      </div>
      <div class="skel" style="height:22px;width:50%;border-radius:6px;margin-bottom:10px"></div>
      <div class="skel" style="height:4px;border-radius:99px"></div>
    </div>`).join('');
}
function abrirListaConversas() {
  window.location.href = 'p2p.html';
}

// ── INIT ─────────────────────────────────────────────────────
(function init() {
  if (window.__P2P_PAGE__) return;
  const perfil = carregarSessao();
  if (perfil) {
    KixikilaManager.setSessao(perfil);
    irParaMain();
    return;
  }
  irPara('paginaAuth');
})();