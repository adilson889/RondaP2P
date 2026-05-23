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
  const nome       = document.getElementById('regNome')?.value.trim() || '';
  const dataNasc   = document.getElementById('regDataNasc')?.value || '';
  const telefone   = document.getElementById('regTelefone')?.value.trim() || '';
  const email      = document.getElementById('regEmail')?.value.trim() || '';
  const provincia  = document.getElementById('regProvincia')?.value || '';
  const municipio  = document.getElementById('regMunicipio')?.value.trim() || '';
  const senha      = document.getElementById('regSenha')?.value.trim() || '';
  const senhaConf  = document.getElementById('regSenhaConfirm')?.value.trim() || '';

  if (!nome) { toast('Nome completo e obrigatorio'); return; }
  if (!dataNasc) { toast('Data de nascimento e obrigatoria'); return; }
  if (!telefone) { toast('Telefone e obrigatorio'); return; }
  if (!email) { toast('Email e obrigatorio'); return; }
  if (!provincia) { toast('Seleciona a provincia'); return; }
  if (!municipio) { toast('Municipio e obrigatorio'); return; }
  if (!senha) { toast('Senha e obrigatoria'); return; }
  if (senha.length < 6) { toast('Senha: minimo 6 caracteres'); return; }
  if (senha !== senhaConf) { toast('As senhas nao coincidem'); return; }

  try {
    await KixikilaManager.registar({ 
      telefone, nome, senha, 
      foto_perfil: _fotoRegTemp || undefined,
      data_nasc: dataNasc,
      email: email,
      provincia: provincia,
      municipio: municipio
    });
    _fotoRegTemp = null;
    irParaMain();
  } catch (e) { toast(e.message); }
}

async function entrar() {
  const telefone = document.getElementById('loginTelefone')?.value.trim() || '';
  const senha    = document.getElementById('loginSenha')?.value.trim()    || '';
  if (!telefone || !senha) { toast('Preenche todos os campos'); return; }
  try {
    await KixikilaManager.entrar({ telefone, senha });
    irParaMain();
  } catch (e) { toast(e.message); }
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
    const grupos = await KixikilaManager.carregarFeed({ estado: 'aberto', limite: 30 });
    lista.innerHTML = '';
    if (!grupos.length) {
      lista.innerHTML = '<div class="vazio"><p>Sem grupos abertos de momento.</p></div>';
      return;
    }
    grupos.forEach(g => lista.appendChild(criarCardFeed(g)));
  } catch { lista.innerHTML = '<div class="vazio"><p>Erro ao carregar.</p></div>'; }
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
    { texto: 'Entrar com codigo', classe: 'btn-outline', acao: () => document.getElementById('modalEntrar').style.display = 'flex' },
    { texto: 'Criar grupo',       classe: 'btn-primary', acao: () => document.getElementById('modalCriar').style.display  = 'flex' }
  ]);
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
async function abrirGrupo(codigo) {
  _codigoAtual = codigo;
  irPara('paginaApp');
  mostrarTabApp('membros');
  await recarregarGrupo();
  iniciarSync();
}

async function recarregarGrupo(silencioso = false) {
  try {
    const grupo  = await KixikilaManager.carregarGrupo(_codigoAtual);
    const perfil = KixikilaManager.getSessao()?.perfil;
    renderGrupo(grupo, perfil);
  } catch { if (!silencioso) toast('Erro ao carregar grupo'); }
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
  lista.innerHTML = '';
  grupo.membros.slice().sort((a, b) => a.ordem - b.ordem).forEach(m => {
    const eAtual   = m.ordem === grupo.ordem_atual;
    const eProprio = m.telefone === perfil?.telefone;
    const div = document.createElement('div');
    div.className = 'membro-item';
    div.onclick   = () => abrirPerfilMembro(m);
    div.innerHTML = `
      <div class="membro-av${eAtual?' atual':''}" style="background-image:${m.foto_perfil ? `url('${esc(m.foto_perfil)}')` : 'none'};background-size:cover;background-position:center">
        ${!m.foto_perfil ? (m.nome?.[0]||'?').toUpperCase() : ''}
      </div>
      <div class="membro-info">
        <div class="membro-nome">${esc(m.nome)}${eProprio ? ' <small style="color:var(--r)">(tu)</small>' : ''}</div>
        <div class="membro-tel">${esc(m.telefone)}</div>
      </div>
      <span class="status ${m.pago?'status-pago':eAtual?'status-recebe':'status-pendente'}">
        ${m.pago ? 'PAGO' : eAtual ? 'RECEBE' : 'PENDENTE'}
      </span>`;
    lista.appendChild(div);
  });
}

function renderRodas(grupo) {
  const lista = document.getElementById('listaRodas');
  lista.innerHTML = '';
  const total = grupo.membros.length;
  grupo.membros.slice().sort((a, b) => a.ordem - b.ordem).forEach(m => {
    const eAtual    = m.ordem === grupo.ordem_atual;
    const concluida = m.ordem < grupo.ordem_atual;
    const div = document.createElement('div');
    div.className = 'roda-item';
    div.innerHTML = `
      <div class="roda-num${eAtual?' atual':concluida?' concluida':''}">${m.ordem}</div>
      <div class="roda-info">
        <div class="roda-nome">${esc(m.nome)}</div>
        <div class="roda-label">Ronda ${m.ordem} de ${total}</div>
      </div>
      <span class="roda-estado${eAtual?' atual':concluida?' concluida':' pendente'}">
        ${eAtual ? 'A RECEBER' : concluida ? 'RECEBEU' : 'AGUARDA'}
      </span>`;
    lista.appendChild(div);
  });
}

// ── PERFIL MEMBRO ────────────────────────────────────────────
function abrirPerfilMembro(m) {
  _membroAtual = m;

  const fotoEl = document.getElementById('membroFotoGrande');
  if (m.foto_perfil) {
    fotoEl.style.backgroundImage    = `url(${m.foto_perfil})`;
    fotoEl.style.backgroundSize     = 'cover';
    fotoEl.style.backgroundPosition = 'top center';
    fotoEl.innerHTML = '';
  } else {
    fotoEl.style.backgroundImage = '';
    fotoEl.innerHTML = `<span class="membro-foto-letra">${(m.nome?.[0]||'?').toUpperCase()}</span>`;
  }

  document.getElementById('membroPerfilNome').textContent = m.nome || '';
  document.getElementById('membroPerfilTel').textContent  = m.telefone || '';
  document.getElementById('membroStars').innerHTML        = renderEstrelas(m.reputacao || 0);
  document.getElementById('membroStarsCount').textContent =
    m.total_avaliacoes ? m.total_avaliacoes + ' avaliacoes' : 'Sem avaliacoes';

  const perfil   = KixikilaManager.getSessao()?.perfil;
  const eProprio = m.telefone === perfil?.telefone;
  const btnAvaliar = document.querySelector('#modalMembroPerfil .btn-primary');
  if (btnAvaliar) btnAvaliar.style.display = eProprio ? 'none' : 'block';

  document.getElementById('modalMembroPerfil').style.display = 'flex';
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
function abrirChat() {
  KixikilaManager.carregarGrupo(_codigoAtual).then(g => {
    document.getElementById('chatNomeGrupo').textContent    = g.nome;
    document.getElementById('chatMembrosCount').textContent = g.membros.length + ' membros';
    renderChat(g, KixikilaManager.getSessao()?.perfil);
    irPara('paginaChat');
  }).catch(() => toast('Erro ao abrir chat'));
}

function renderChat(grupo, perfil) {
  const container = document.getElementById('chatMensagens');
  const msgs      = grupo.mensagens || [];
  container.innerHTML = '';
  if (!msgs.length) {
    container.innerHTML = '<p style="text-align:center;color:var(--muted);padding:32px;font-size:.88rem">Sem mensagens ainda.</p>';
    return;
  }
  msgs.forEach(msg => {
    const meu  = msg.telefone === perfil?.telefone;
    const wrap = document.createElement('div');
    wrap.className = 'chat-balao-wrap ' + (meu ? 'meu' : 'outro');
    wrap.innerHTML = `
      ${!meu ? `<span class="chat-autor">${esc(msg.nome)}</span>` : ''}
      <div class="chat-balao ${meu?'meu':'outro'}">${esc(msg.texto)}</div>
      <span class="chat-data">${(msg.data||'').replace('T',' ').slice(0,16)}</span>`;
    container.appendChild(wrap);
  });
  container.scrollTop = container.scrollHeight;
}

async function enviarMsg() {
  const input  = document.getElementById('chatInput');
  const texto  = input?.value.trim() || '';
  const perfil = KixikilaManager.getSessao()?.perfil;
  if (!texto || !perfil) return;
  input.value = '';
  crescerTextarea(input);
  try {
    await KixikilaManager.enviarMensagem(_codigoAtual, perfil.telefone, perfil.nome, texto);
    const g = await KixikilaManager.carregarGrupo(_codigoAtual);
    renderChat(g, perfil);
  } catch { toast('Erro ao enviar mensagem'); }
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

// ── INIT ─────────────────────────────────────────────────────
(function init() {
  try {
    const guardado = localStorage.getItem('kx_sessao');
    if (guardado) {
      KixikilaManager.setSessao(JSON.parse(guardado));
      irParaMain();
      return;
    }
  } catch (_) {}
  irPara('paginaAuth');
})();