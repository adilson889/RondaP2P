// ════════════════════════════════════════════════════════════
// SEGURANÇA — Rate limiting, validações, sanitização
// ════════════════════════════════════════════════════════════

const Seguranca = (() => {

  // Rate limiting em memória
  const _tentativas = {};

  function chaveLogin(telefone) {
    return 'login_' + telefone.replace(/\D/g, '');
  }

  function registarFalha(chave) {
    const agora = Date.now();
    if (!_tentativas[chave]) _tentativas[chave] = { count: 0, bloqueadoAte: 0 };
    _tentativas[chave].count++;
    const c = _tentativas[chave].count;
    const espera = c >= 10 ? 30 * 60000 : c >= 6 ? 5 * 60000 : c >= 3 ? 60000 : 0;
    if (espera) _tentativas[chave].bloqueadoAte = agora + espera;
  }

  function verificarBloqueio(chave) {
    const entry = _tentativas[chave];
    if (!entry) return null;
    const resto = entry.bloqueadoAte - Date.now();
    if (resto > 0) {
      const mins = Math.ceil(resto / 60000);
      const segs = Math.ceil(resto / 1000);
      return segs < 60 ? 'Aguarda ' + segs + 's' : 'Bloqueado por ' + mins + ' min';
    }
    return null;
  }

  function limparFalhas(chave) {
    delete _tentativas[chave];
  }

  // Validação de telefone angolano
  function validarTelefone(tel) {
    if (!tel) return false;
    const limpo = tel.replace(/[\s\-()]/g, '');
    const comPrefixo = /^(\+244|00244)(9\d{8})$/.test(limpo);
    const local = /^9\d{8}$/.test(limpo);
    return comPrefixo || local;
  }

  // Força da senha
  function analisarSenha(senha) {
    if (!senha) return { nivel: 0, mensagem: '', cor: '' };
    let pontos = 0;
    if (senha.length >= 8) pontos++;
    if (senha.length >= 12) pontos++;
    if (/[A-Z]/.test(senha)) pontos++;
    if (/[0-9]/.test(senha)) pontos++;
    if (/[^A-Za-z0-9]/.test(senha)) pontos++;
    
    const obvias = ['123456', 'password', 'senha', 'kixikila', 'angola', 'luanda', '111111', '000000'];
    if (obvias.some(o => senha.toLowerCase().includes(o))) pontos = Math.min(pontos, 1);

    if (pontos <= 1) return { nivel: 1, mensagem: 'Fraca', cor: '#c0392b' };
    if (pontos === 2) return { nivel: 2, mensagem: 'Razoavel', cor: '#e67e22' };
    if (pontos === 3) return { nivel: 3, mensagem: 'Boa', cor: '#f1c40f' };
    return { nivel: 4, mensagem: 'Forte', cor: '#27ae60' };
  }

  // Validação de idade mínima
  function validarIdade(dataNasc, minAnos = 18) {
    if (!dataNasc) return false;
    const nasc = new Date(dataNasc);
    const hoje = new Date();
    let idade = hoje.getFullYear() - nasc.getFullYear();
    const mesDiff = hoje.getMonth() - nasc.getMonth();
    if (mesDiff < 0 || (mesDiff === 0 && hoje.getDate() < nasc.getDate())) {
      idade--;
    }
    return idade >= minAnos;
  }

  // Detecção de honeypot (anti-bot)
  function verificarHoneypot() {
    const campo = document.getElementById('_hp_website');
    return campo && campo.value !== '';
  }

  // Sanitização básica
  function sanitizar(texto) {
    if (!texto) return '';
    return String(texto).trim().replace(/<[^>]*>/g, '').slice(0, 300);
  }

  // Sessão com expiração
  const SESSAO_TTL = 7 * 24 * 60 * 60 * 1000;

  function guardarSessaoSegura(perfil) {
    const payload = {
      perfil: perfil,
      criado: Date.now(),
      expira: Date.now() + SESSAO_TTL,
      ua: navigator.userAgent.slice(0, 80)
    };
    try { localStorage.setItem('kx_sessao', JSON.stringify(payload)); } catch (_) {}
  }

  function carregarSessaoSegura() {
    try {
      const raw = localStorage.getItem('kx_sessao');
      if (!raw) return null;
      const payload = JSON.parse(raw);
      if (payload.expira && Date.now() > payload.expira) {
        localStorage.removeItem('kx_sessao');
        return null;
      }
      if (payload.ua && payload.ua !== navigator.userAgent.slice(0, 80)) {
        console.warn('[Kixikila] Sessao de outro dispositivo detectada');
      }
      return payload.perfil || payload;
    } catch {
      localStorage.removeItem('kx_sessao');
      return null;
    }
  }

  return {
    chaveLogin,
    registarFalha,
    verificarBloqueio,
    limparFalhas,
    validarTelefone,
    analisarSenha,
    validarIdade,
    verificarHoneypot,
    sanitizar,
    guardarSessaoSegura,
    carregarSessaoSegura
  };
})();

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
  const modalTitulo = document.getElementById('modalTitulo');
  const modalMsg = document.getElementById('modalMsg');
  const modalBtns = document.getElementById('modalBtns');
  if (modalTitulo) modalTitulo.textContent = titulo;
  if (modalMsg) modalMsg.textContent = msg || '';
  if (modalBtns) {
    modalBtns.innerHTML = '';
    (btns || []).forEach(b => {
      const el = document.createElement('button');
      el.className = b.classe || 'btn-outline';
      el.textContent = b.texto;
      el.onclick = () => { fecharModal('modal'); b.acao && b.acao(); };
      modalBtns.appendChild(el);
    });
  }
  const modalEl = document.getElementById('modal');
  if (modalEl) modalEl.style.display = 'flex';
}

function fecharModal(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'none';
}

function fecharModalSeClicarFora(event, modalElement) {
  if (event.target === modalElement) {
    modalElement.style.display = 'none';
  }
}

function pillClass(estado) {
  if (estado === 'aberto') return 'pill-aberto';
  if (estado === 'fechado') return 'pill-fechado';
  return 'pill-encerrado';
}

function pillTexto(estado) {
  if (estado === 'aberto') return 'Aberto';
  if (estado === 'fechado') return 'Completo';
  return 'Encerrado';
}

function renderEstrelas(valor, total) {
  const cheias = Math.round(valor || 0);
  return Array(5).fill(0).map((_, i) =>
    '<span class="star' + (i < cheias ? ' on' : '') + '">★</span>'
  ).join('') + (total ? '<small style="color:var(--muted);margin-left:6px">(' + total + ')</small>' : '');
}

function renderAvatar(element, foto, nome) {
  if (!element) return;
  if (foto && foto !== '') {
    element.style.backgroundImage = 'url(' + foto + ')';
    element.style.backgroundSize = 'cover';
    element.style.backgroundPosition = 'center';
    element.textContent = '';
  } else {
    element.style.backgroundImage = '';
    element.textContent = (nome?.[0] || '?').toUpperCase();
  }
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
          else { w = Math.round(w * maxDim / h); h = maxDim; }
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
    const img = document.getElementById('fotoPickerImg');
    const letra = document.getElementById('fotoPickerLetra');
    if (img) { img.src = src; img.style.display = 'block'; }
    if (letra) letra.style.display = 'none';
    const picker = document.getElementById('fotoPicker');
    if (picker) picker.style.border = '2px solid var(--r)';
  } catch { toast('Erro ao processar imagem'); }
}

async function previewFotoPerfil(evento) {
  const f = evento.target.files[0];
  if (!f) return;
  try {
    const src = await comprimirImagem(f);
    const av = document.getElementById('perfilAvatarModal');
    renderAvatar(av, src, '');
    if (av) av.dataset.novaFoto = src;
  } catch { toast('Erro ao processar imagem'); }
}

async function previewFotoGrupo(evento) {
  const f = evento.target.files[0];
  if (!f) return;
  try {
    const src = await comprimirImagem(f, 400, 0.8);
    _fotoGrupoTemp = src;
    const img = document.getElementById('fotoGrupoImg');
    const letra = document.getElementById('fotoGrupoLetra');
    if (img) { img.src = src; img.style.display = 'block'; }
    if (letra) letra.style.display = 'none';
  } catch { toast('Erro ao processar imagem'); }
}

function atualizarForcaSenha() {
  const senha = document.getElementById('regSenha')?.value || '';
  const barra = document.getElementById('forcaSenhaBarra');
  const texto = document.getElementById('forcaSenhaTexto');
  if (!barra || !texto) return;
  const analise = Seguranca.analisarSenha(senha);
  barra.style.width = (analise.nivel * 25) + '%';
  barra.style.background = analise.cor;
  texto.textContent = analise.mensagem;
  texto.style.color = analise.cor;
}

// ── NAVEGACAO ────────────────────────────────────────────────
function irPara(id) {
  document.querySelectorAll('.pagina').forEach(p => p.style.display = 'none');
  const pagina = document.getElementById(id);
  if (pagina) pagina.style.display = 'flex';
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
  }, 60000);
}

function pararSync() {
  if (_syncInterval) { clearInterval(_syncInterval); _syncInterval = null; }
}

// ── AUTH ─────────────────────────────────────────────────────
function mostrarTab(tab) {
  const tabRegisto = document.getElementById('tabRegisto');
  const tabLogin = document.getElementById('tabLogin');
  if (tabRegisto) tabRegisto.style.display = tab === 'registo' ? 'block' : 'none';
  if (tabLogin) tabLogin.style.display = tab === 'login' ? 'block' : 'none';
  document.querySelectorAll('.auth-tab').forEach((b, i) => {
    b.classList.toggle('activo', (i === 0 && tab === 'registo') || (i === 1 && tab === 'login'));
  });
}

async function registar() {
  // Anti-bot
  if (Seguranca.verificarHoneypot()) {
    toast('Erro ao criar conta. Tenta novamente.');
    return;
  }

  const nome = Seguranca.sanitizar(document.getElementById('regNome')?.value);
  const dataNasc = document.getElementById('regDataNasc')?.value || '';
  const telefone = Seguranca.sanitizar(document.getElementById('regTelefone')?.value);
  const email = Seguranca.sanitizar(document.getElementById('regEmail')?.value);
  const provincia = document.getElementById('regProvincia')?.value || '';
  const municipio = Seguranca.sanitizar(document.getElementById('regMunicipio')?.value);
  const senha = document.getElementById('regSenha')?.value || '';
  const senhaConf = document.getElementById('regSenhaConfirm')?.value || '';

  // Validações
  if (!nome || nome.length < 3) { toast('Nome completo e obrigatorio (min. 3 letras)'); return; }
  if (!dataNasc) { toast('Data de nascimento e obrigatoria'); return; }
  if (!Seguranca.validarIdade(dataNasc)) { toast('Tens de ter pelo menos 18 anos'); return; }
  if (!telefone) { toast('Telefone e obrigatorio'); return; }
  if (!Seguranca.validarTelefone(telefone)) {
    toast('Telefone invalido. Ex: +244 923 456 789');
    document.getElementById('regTelefone')?.focus();
    return;
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    toast('Email invalido');
    return;
  }
  if (!provincia) { toast('Seleciona a provincia'); return; }
  if (!municipio || municipio.length < 2) { toast('Municipio e obrigatorio'); return; }
  if (!senha || senha.length < 6) { toast('Senha: minimo 6 caracteres'); return; }

  const analise = Seguranca.analisarSenha(senha);
  if (analise.nivel < 2) {
    toast('Senha fraca. Usa letras maiusculas, numeros ou simbolos');
    document.getElementById('regSenha')?.focus();
    return;
  }
  if (senha !== senhaConf) { toast('As senhas nao coincidem'); return; }

  // Rate limiting
  const chave = Seguranca.chaveLogin(telefone);
  const bloq = Seguranca.verificarBloqueio(chave);
  if (bloq) { toast(bloq); return; }

  const btn = document.getElementById('btnCriarConta');
  if (btn) { btn.disabled = true; btn.textContent = 'A criar...'; }

  try {
    await KixikilaManager.registar({
      telefone, nome, senha,
      foto_perfil: _fotoRegTemp || undefined,
      data_nasc: dataNasc,
      email: email,
      provincia: provincia,
      municipio: municipio
    });
    Seguranca.limparFalhas(chave);
    _fotoRegTemp = null;
    irParaMain();
  } catch (e) {
    Seguranca.registarFalha(chave);
    toast(e.message);
    if (btn) { btn.disabled = false; btn.textContent = 'Criar conta'; }
  }
}

async function entrar() {
  const telefone = Seguranca.sanitizar(document.getElementById('loginTelefone')?.value);
  const senha = document.getElementById('loginSenha')?.value || '';

  if (!telefone || !senha) { toast('Preenche todos os campos'); return; }

  if (!Seguranca.validarTelefone(telefone)) {
    toast('Telefone invalido. Ex: +244 923 456 789');
    return;
  }

  // Rate limiting
  const chave = Seguranca.chaveLogin(telefone);
  const bloq = Seguranca.verificarBloqueio(chave);
  if (bloq) { toast(bloq + ' — demasiadas tentativas'); return; }

  const btn = document.querySelector('#tabLogin .btn-primary');
  if (btn) { btn.disabled = true; btn.textContent = 'A entrar...'; }

  try {
    await KixikilaManager.entrar({ telefone, senha });
    Seguranca.limparFalhas(chave);
    irParaMain();
  } catch (e) {
    Seguranca.registarFalha(chave);
    const bloqNovo = Seguranca.verificarBloqueio(chave);
    toast(bloqNovo ? bloqNovo + ' — demasiadas tentativas' : e.message);
    if (btn) { btn.disabled = false; btn.textContent = 'Entrar'; }
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
  renderAvatar(av, perfil.foto_perfil, perfil.nome);
}

function mostrarTabMain(tab) {
  const tabFeed = document.getElementById('tabFeed');
  const tabMeus = document.getElementById('tabMeus');
  const conteudoFeed = document.getElementById('conteudoFeed');
  const conteudoMeus = document.getElementById('conteudoMeus');
  
  if (tabFeed) tabFeed.classList.toggle('activo', tab === 'feed');
  if (tabMeus) tabMeus.classList.toggle('activo', tab === 'meus');
  if (conteudoFeed) conteudoFeed.style.display = tab === 'feed' ? 'block' : 'none';
  if (conteudoMeus) conteudoMeus.style.display = tab === 'meus' ? 'block' : 'none';
  
  if (tab === 'feed') carregarFeed();
  if (tab === 'meus') carregarMeus();
}

async function carregarFeed() {
  const lista = document.getElementById('feedLista');
  if (!lista) return;
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
  const pct = Math.round((g.membros.length / g.max_membros) * 100);
  const div = document.createElement('div');
  div.className = 'feed-card';
  div.onclick = () => abrirPreviewGrupo(g);
  div.innerHTML = `
    <div class="feed-card-top">
      <div class="feed-icon">${g.foto_grupo ? '<img src="' + esc(g.foto_grupo) + '" style="width:100%;height:100%;object-fit:cover;border-radius:12px">' : (g.nome||'G')[0].toUpperCase()}</div>
      <div>
        <div class="feed-nome">${esc(g.nome)}</div>
        <div class="feed-sub">${g.membros.length}/${g.max_membros} membros · ${esc(g.periodicidade)}</div>
      </div>
      <span class="pill ${pillClass(g.estado)}">${pillTexto(g.estado)}</span>
    </div>
    <div class="feed-valor">${KixikilaManager.formatarValor(g.valor)} KZ</div>
    <div class="feed-progress"><div class="feed-progress-bar" style="width:${pct}%"></div></div>
    <div class="feed-rodape"><span>${vagas} vaga${vagas!==1?'s':''}</span><span>por ${esc(g.criador?.nome||'')}</span></div>`;
  return div;
}

function abrirPreviewGrupo(grupo) {
  _grupoPreview = grupo;
  const vagas = grupo.max_membros - grupo.membros.length;
  const pct = Math.round((grupo.membros.length / grupo.max_membros) * 100);
  
  const previewTitulo = document.getElementById('previewTitulo');
  const previewFoto = document.getElementById('previewFoto');
  const previewDescricao = document.getElementById('previewDescricao');
  const previewRegras = document.getElementById('previewRegras');
  const previewLocalizacao = document.getElementById('previewLocalizacao');
  const previewValor = document.getElementById('previewValor');
  const previewProgresso = document.getElementById('previewProgresso');
  const previewMembros = document.getElementById('previewMembros');
  const previewVagas = document.getElementById('previewVagas');
  const previewCriador = document.getElementById('previewCriador');
  
  if (previewTitulo) previewTitulo.textContent = grupo.nome;
  if (previewFoto) {
    if (grupo.foto_grupo) {
      previewFoto.innerHTML = '<img src="' + esc(grupo.foto_grupo) + '" style="width:100%;height:180px;object-fit:cover;border-radius:12px">';
    } else {
      previewFoto.innerHTML = '<div style="width:100%;height:180px;background:var(--r-soft);display:flex;align-items:center;justify-content:center;font-size:3rem;color:var(--r);border-radius:12px">' + (grupo.nome||'G')[0].toUpperCase() + '</div>';
    }
  }
  if (previewDescricao) previewDescricao.innerHTML = grupo.descricao ? '<div style="margin:12px 0"><strong>Descricao</strong><br>' + esc(grupo.descricao) + '</div>' : '';
  if (previewRegras) previewRegras.innerHTML = grupo.regras ? '<div style="margin:12px 0"><strong>Regras do grupo</strong><br>' + esc(grupo.regras) + '</div>' : '';
  if (previewLocalizacao) previewLocalizacao.innerHTML = grupo.localizacao ? '<div style="margin:12px 0"><strong>Localizacao</strong><br>' + esc(grupo.localizacao) + '</div>' : '';
  if (previewValor) previewValor.innerHTML = KixikilaManager.formatarValor(grupo.valor) + ' KZ / ' + grupo.periodicidade;
  if (previewProgresso) previewProgresso.style.width = pct + '%';
  if (previewMembros) previewMembros.textContent = grupo.membros.length + '/' + grupo.max_membros + ' membros';
  if (previewVagas) previewVagas.textContent = vagas + ' vaga' + (vagas!==1?'s':'');
  if (previewCriador) previewCriador.textContent = grupo.criador?.nome || '';
  
  const modalPreview = document.getElementById('modalPreviewGrupo');
  if (modalPreview) modalPreview.style.display = 'flex';
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
  if (!lista) return;
  lista.innerHTML = skeleton();
  try {
    const grupos = await KixikilaManager.carregarMeusGrupos();
    lista.innerHTML = '';
    if (!grupos.length) { if (vazio) vazio.style.display = 'flex'; return; }
    if (vazio) vazio.style.display = 'none';
    grupos.forEach(g => lista.appendChild(criarCardMeu(g)));
  } catch { lista.innerHTML = '<div class="vazio"><p>Erro ao carregar.</p></div>'; }
}

function criarCardMeu(g) {
  const pagos = g.membros.filter(m => m.pago).length;
  const pct = Math.round((pagos / g.membros.length) * 100);
  const div = document.createElement('div');
  div.className = 'feed-card';
  div.onclick = () => abrirGrupo(g.codigo);
  div.innerHTML = `
    <div class="feed-card-top">
      <div class="feed-icon">${g.foto_grupo ? '<img src="' + esc(g.foto_grupo) + '" style="width:100%;height:100%;object-fit:cover;border-radius:12px">' : (g.nome||'G')[0].toUpperCase()}</div>
      <div>
        <div class="feed-nome">${esc(g.nome)}</div>
        <div class="feed-sub">${g.membros.length} membros · ${esc(g.periodicidade)}</div>
      </div>
      <span class="pill ${pillClass(g.estado)}">${pillTexto(g.estado)}</span>
    </div>
    <div class="feed-valor">${KixikilaManager.formatarValor(g.valor)} KZ</div>
    <div class="feed-progress"><div class="feed-progress-bar" style="width:${pct}%"></div></div>
    <div class="feed-rodape"><span>${pagos}/${g.membros.length} pagamentos</span><span>Ronda ${g.ordem_atual||1}</span></div>`;
  return div;
}

// ── FAB ──────────────────────────────────────────────────────
function abrirCriar() {
  modal('O que queres fazer?', '', [
    { texto: 'Entrar com codigo', classe: 'btn-outline', acao: () => { const modalEntrar = document.getElementById('modalEntrar'); if (modalEntrar) modalEntrar.style.display = 'flex'; } },
    { texto: 'Criar grupo', classe: 'btn-primary', acao: () => { const modalCriar = document.getElementById('modalCriar'); if (modalCriar) modalCriar.style.display = 'flex'; } }
  ]);
}

async function criarGrupo() {
  const nome = document.getElementById('criarNome')?.value.trim() || '';
  const descricao = document.getElementById('criarDescricao')?.value.trim() || '';
  const regras = document.getElementById('criarRegras')?.value.trim() || '';
  const localizacao = document.getElementById('criarLocalizacao')?.value.trim() || '';
  const valor = parseFloat(document.getElementById('criarValor')?.value || 0);
  const period = document.getElementById('criarPeriod')?.value || 'mensal';
  const max = parseInt(document.getElementById('criarMax')?.value || 6);
  const perfil = KixikilaManager.getSessao()?.perfil;
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
    const grupo = await KixikilaManager.carregarGrupo(_codigoAtual);
    const perfil = KixikilaManager.getSessao()?.perfil;
    renderGrupo(grupo, perfil);
  } catch { if (!silencioso) toast('Erro ao carregar grupo'); }
}

function renderGrupo(grupo, perfil) {
  const pagos = grupo.membros.filter(m => m.pago).length;
  const pct = Math.round((pagos / grupo.membros.length) * 100);
  const eCriador = grupo.criador?.telefone === perfil?.telefone;
  
  const appNome = document.getElementById('appNomeGrupo');
  const appPill = document.getElementById('appPill');
  const appValor = document.getElementById('appValor');
  const appProgresso = document.getElementById('appProgresso');
  const appPagamentos = document.getElementById('appPagamentos');
  const appMeta = document.getElementById('appMeta');
  const appProximaRonda = document.getElementById('appProximaRonda');
  const btnEncerrar = document.getElementById('btnEncerrar');
  
  if (appNome) appNome.textContent = grupo.nome;
  if (appPill) { appPill.className = 'pill ' + pillClass(grupo.estado); appPill.textContent = pillTexto(grupo.estado); }
  if (appValor) appValor.textContent = KixikilaManager.formatarValor(grupo.valor) + ' KZ';
  if (appProgresso) appProgresso.style.width = pct + '%';
  if (appPagamentos) appPagamentos.textContent = pagos + '/' + grupo.membros.length + ' pagamentos';
  
  const memAtual = grupo.membros.find(m => m.ordem === grupo.ordem_atual);
  if (appMeta) appMeta.textContent = memAtual ? 'Ronda ' + grupo.ordem_atual + ' — A receber: ' + memAtual.nome : 'Ronda ' + (grupo.ordem_atual||1);
  if (appProximaRonda) appProximaRonda.textContent = grupo.periodicidade;
  if (btnEncerrar) btnEncerrar.style.display = eCriador ? 'block' : 'none';
  
  renderMembros(grupo, perfil);
  renderRodas(grupo);
}

function renderMembros(grupo, perfil) {
  const lista = document.getElementById('listaMembros');
  if (!lista) return;
  lista.innerHTML = '';
  grupo.membros.slice().sort((a, b) => a.ordem - b.ordem).forEach(m => {
    const eAtual = m.ordem === grupo.ordem_atual;
    const eProprio = m.telefone === perfil?.telefone;
    const div = document.createElement('div');
    div.className = 'membro-item';
    div.onclick = () => abrirPerfilMembro(m);
    
    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'membro-av' + (eAtual ? ' atual' : '');
    renderAvatar(avatarDiv, m.foto_perfil, m.nome);
    
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
    const eAtual = m.ordem === grupo.ordem_atual;
    const concluida = m.ordem < grupo.ordem_atual;
    const div = document.createElement('div');
    div.className = 'roda-item';
    div.innerHTML = `
      <div class="roda-num${eAtual ? ' atual' : concluida ? ' concluida' : ''}">${m.ordem}</div>
      <div class="roda-info"><div class="roda-nome">${esc(m.nome)}</div><div class="roda-label">Ronda ${m.ordem} de ${total}</div></div>
      <span class="roda-estado${eAtual ? ' atual' : concluida ? ' concluida' : ' pendente'}">${eAtual ? 'A RECEBER' : concluida ? 'RECEBEU' : 'AGUARDA'}</span>`;
    lista.appendChild(div);
  });
}

// ── PERFIL MEMBRO ────────────────────────────────────────────
function abrirPerfilMembro(membro) {
  _membroAtual = membro;
  
  const perfilLogado = KixikilaManager.getSessao()?.perfil;
  const isProprio = membro.telefone === perfilLogado?.telefone;
  
  const fotoGrande = document.getElementById('membroFotoGrande');
  renderAvatar(fotoGrande, membro.foto_perfil, membro.nome);
  if (fotoGrande) fotoGrande.style.height = '300px';
  
  const perfilNome = document.getElementById('membroPerfilNome');
  const perfilTel = document.getElementById('membroPerfilTel');
  const membroStars = document.getElementById('membroStars');
  const membroStarsCount = document.getElementById('membroStarsCount');
  
  if (perfilNome) perfilNome.textContent = membro.nome || '';
  if (perfilTel) perfilTel.textContent = membro.telefone || '';
  if (membroStars) membroStars.innerHTML = renderEstrelas(membro.reputacao || 0, membro.total_avaliacoes);
  if (membroStarsCount) membroStarsCount.textContent = membro.total_avaliacoes ? membro.total_avaliacoes + ' avaliacoes' : 'Sem avaliacoes';
  
  let infoExtra = '';
  if (membro.provincia) infoExtra += '<div><span style="color:var(--muted)">Provincia:</span> ' + esc(membro.provincia) + '</div>';
  if (membro.municipio) infoExtra += '<div><span style="color:var(--muted)">Municipio:</span> ' + esc(membro.municipio) + '</div>';
  if (membro.data_nasc) infoExtra += '<div><span style="color:var(--muted)">Data de nascimento:</span> ' + esc(membro.data_nasc) + '</div>';
  if (membro.email) infoExtra += '<div><span style="color:var(--muted)">Email:</span> ' + esc(membro.email) + '</div>';
  
  const infoExtraDiv = document.getElementById('membroInfoExtra');
  if (infoExtraDiv) infoExtraDiv.innerHTML = infoExtra;
  
  const btnAvaliar = document.querySelector('#modalMembroPerfil .btn-primary');
  if (btnAvaliar) btnAvaliar.style.display = isProprio ? 'none' : 'block';
  
  const modalMembro = document.getElementById('modalMembroPerfil');
  if (modalMembro) modalMembro.style.display = 'flex';
}

// ── AVALIAR MEMBRO ───────────────────────────────────────────
function abrirAvaliarMembro() {
  if (!_membroAtual) return;
  fecharModal('modalMembroPerfil');
  _estrelasAvaliacao = 0;
  
  const avaliarNome = document.getElementById('avaliarNome');
  if (avaliarNome) avaliarNome.textContent = _membroAtual.nome || '';
  
  const comentario = document.getElementById('avaliarComentario');
  if (comentario) comentario.value = '';
  
  const wrap = document.getElementById('estrelasInput');
  if (wrap) {
    wrap.innerHTML = '';
    for (let i = 1; i <= 5; i++) {
      const btn = document.createElement('button');
      btn.className = 'star-btn';
      btn.textContent = '★';
      btn.onclick = (function(n) {
        return function() {
          _estrelasAvaliacao = n;
          const btns = wrap.querySelectorAll('.star-btn');
          for (let j = 0; j < btns.length; j++) {
            btns[j].classList.toggle('on', j < n);
          }
        };
      })(i);
      wrap.appendChild(btn);
    }
  }
  
  const modalAvaliar = document.getElementById('modalAvaliar');
  if (modalAvaliar) modalAvaliar.style.display = 'flex';
}

async function confirmarAvaliacao() {
  if (!_estrelasAvaliacao) { toast('Selecciona as estrelas'); return; }
  const perfil = KixikilaManager.getSessao()?.perfil;
  const comentario = document.getElementById('avaliarComentario')?.value.trim() || '';
  if (!perfil || !_membroAtual) return;
  try {
    await KixikilaManager.avaliar(perfil.telefone, _membroAtual.telefone, _estrelasAvaliacao, comentario);
    fecharModal('modalAvaliar');
    toast('Avaliacao enviada!');
  } catch (e) { toast(e.message); }
}

// ── PEDIDOS ───────────────────────────────────────────────────
async function carregarPedidos() {
  if (!_codigoAtual) return;
  const conteudoPedidos = document.getElementById('conteudoPedidos');
  if (!conteudoPedidos) return;
  
  try {
    const grupo = await KixikilaManager.carregarGrupo(_codigoAtual);
    const perfil = KixikilaManager.getSessao()?.perfil;
    const eCriador = grupo.criador?.telefone === perfil?.telefone;
    
    if (!eCriador) {
      conteudoPedidos.innerHTML = '<div class="vazio"><p>Apenas o administrador ve os pedidos.</p></div>';
      return;
    }
    
    const pedidos = grupo.pedidos || [];
    if (!pedidos.length) {
      conteudoPedidos.innerHTML = '<div class="vazio"><p>Nenhum pedido de entrada pendente.</p></div>';
      return;
    }
    
    let html = '';
    for (const p of pedidos) {
      html += '<div class="pedido-item" style="display:flex; align-items:center; gap:12px; padding:12px 16px; border-bottom:1px solid var(--border)">' +
        '<div class="pedido-avatar" style="width:40px;height:40px;border-radius:50%;background:var(--r-soft);display:flex;align-items:center;justify-content:center;font-size:1.2rem;font-weight:800;color:var(--r)">' + (p.nome?.[0]||'?').toUpperCase() + '</div>' +
        '<div style="flex:1"><div style="font-weight:700">' + esc(p.nome) + '</div><div style="font-size:.75rem;color:var(--muted)">' + esc(p.telefone) + '</div></div>' +
        '<div style="display:flex; gap:8px"><button class="btn-outline" style="padding:6px 12px" onclick="responderPedido(\'' + p.id + '\', \'aceitar\')">Aceitar</button><button class="btn-outline" style="padding:6px 12px;color:var(--r2)" onclick="responderPedido(\'' + p.id + '\', \'recusar\')">Recusar</button></div>' +
        '</div>';
    }
    conteudoPedidos.innerHTML = html;
  } catch { 
    conteudoPedidos.innerHTML = '<div class="vazio"><p>Erro ao carregar pedidos.</p></div>';
  }
}

async function responderPedido(pedidoId, acao) {
  try {
    await KixikilaManager.responderPedido(_codigoAtual, pedidoId, acao);
    toast(acao === 'aceitar' ? 'Membro aceite no grupo' : 'Pedido recusado');
    carregarPedidos();
    recarregarGrupo();
  } catch (e) { toast(e.message); }
}

// ── TABS INTERNAS ────────────────────────────────────────────
function mostrarTabApp(tab) {
  _tabAppAtual = tab;
  const tabs = ['membros', 'rodas', 'chat', 'pedidos'];
  tabs.forEach(t => {
    const btn = document.getElementById('tab' + t.charAt(0).toUpperCase() + t.slice(1));
    if (btn) btn.classList.toggle('activo', t === tab);
    const content = document.getElementById('conteudo' + t.charAt(0).toUpperCase() + t.slice(1));
    if (content) content.style.display = t === tab ? 'block' : 'none';
  });
  if (tab === 'pedidos') carregarPedidos();
}

// ── CHAT ─────────────────────────────────────────────────────
function autoResizeChat(el) {
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

function handleChatKey(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    enviarMsg();
  }
}

async function enviarMsg() {
  const input = document.getElementById('chatInput');
  const texto = input?.value.trim();
  const perfil = KixikilaManager.getSessao()?.perfil;
  if (!texto || !perfil) return;
  if (input) input.value = '';
  autoResizeChat(input);
  try {
    await KixikilaManager.enviarMensagem(_codigoAtual, perfil.telefone, perfil.nome, texto);
    const g = await KixikilaManager.carregarGrupo(_codigoAtual);
    const perfilAtual = KixikilaManager.getSessao()?.perfil;
    renderChat(g, perfilAtual);
  } catch { toast('Erro ao enviar mensagem'); }
}

function abrirChat() {
  KixikilaManager.carregarGrupo(_codigoAtual).then(g => {
    const chatNome = document.getElementById('chatNomeGrupo');
    const chatMembros = document.getElementById('chatMembrosCount');
    if (chatNome) chatNome.textContent = g.nome;
    if (chatMembros) chatMembros.textContent = g.membros.length + ' membros';
    const perfil = KixikilaManager.getSessao()?.perfil;
    renderChat(g, perfil);
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
  msgs.forEach(msg => {
    const meu = msg.telefone === perfil?.telefone;
    const wrap = document.createElement('div');
    wrap.className = 'chat-balao-wrap ' + (meu ? 'meu' : 'outro');
    wrap.innerHTML = (!meu ? '<span class="chat-autor">' + esc(msg.nome) + '</span>' : '') +
      '<div class="chat-balao ' + (meu ? 'meu' : 'outro') + '">' + esc(msg.texto) + '</div>' +
      '<span class="chat-data">' + (msg.data || '').replace('T', ' ').slice(0, 16) + '</span>';
    container.appendChild(wrap);
  });
  container.scrollTop = container.scrollHeight;
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
  
  const avatarEl = document.getElementById('perfilAvatarModal');
  renderAvatar(avatarEl, perfil.foto_perfil, perfil.nome);
  if (avatarEl) avatarEl.dataset.novaFoto = '';
  
  const perfilNome = document.getElementById('perfilNomeModal');
  const perfilTel = document.getElementById('perfilTelModal');
  const editNome = document.getElementById('editNome');
  const editSenha = document.getElementById('editSenha');
  const perfilEmail = document.getElementById('perfilEmail');
  const perfilDataNasc = document.getElementById('perfilDataNasc');
  const perfilProvincia = document.getElementById('perfilProvincia');
  const perfilMunicipio = document.getElementById('perfilMunicipio');
  const membroStars = document.getElementById('membroStars');
  const membroStarsCount = document.getElementById('membroStarsCount');
  
  if (perfilNome) perfilNome.textContent = perfil.nome || '';
  if (perfilTel) perfilTel.textContent = perfil.telefone || '';
  if (editNome) editNome.value = perfil.nome || '';
  if (editSenha) editSenha.value = '';
  if (perfilEmail) perfilEmail.textContent = perfil.email || 'Nao definido';
  if (perfilDataNasc) perfilDataNasc.textContent = perfil.data_nasc || 'Nao definido';
  if (perfilProvincia) perfilProvincia.textContent = perfil.provincia || 'Nao definido';
  if (perfilMunicipio) perfilMunicipio.textContent = perfil.municipio || 'Nao definido';
  if (membroStars) membroStars.innerHTML = renderEstrelas(perfil.reputacao || 0, perfil.total_avaliacoes);
  if (membroStarsCount) membroStarsCount.textContent = perfil.total_avaliacoes ? perfil.total_avaliacoes + ' avaliacoes' : 'Sem avaliacoes';
  
  // Mostrar elementos de edicao
  const editNomeField = document.getElementById('editNome');
  const editSenhaField = document.getElementById('editSenha');
  const modalBtns = document.querySelector('#modalPerfil .modal-btns');
  const btnEliminar = document.querySelector('#modalPerfil .btn-outline.w100');
  const avatarEdit = document.querySelector('#modalPerfil .perfil-avatar-edit');
  const inputFoto = document.getElementById('inputFotoPerfil');
  const btnAvaliar = document.getElementById('btnAvaliarMembro');
  
  if (editNomeField) editNomeField.style.display = 'block';
  if (editSenhaField) editSenhaField.style.display = 'block';
  if (modalBtns) modalBtns.style.display = 'flex';
  if (btnEliminar) btnEliminar.style.display = 'block';
  if (avatarEdit) avatarEdit.style.display = 'block';
  if (inputFoto) inputFoto.style.display = 'block';
  if (btnAvaliar) btnAvaliar.style.display = 'none';
  
  const modalPerfil = document.getElementById('modalPerfil');
  if (modalPerfil) modalPerfil.style.display = 'flex';
}

async function guardarPerfil() {
  const perfil = KixikilaManager.getSessao()?.perfil;
  if (!perfil) return;
  const nome = document.getElementById('editNome')?.value.trim() || '';
  const senha = document.getElementById('editSenha')?.value.trim() || '';
  const av = document.getElementById('perfilAvatarModal');
  const novaFoto = av?.dataset?.novaFoto || undefined;
  if (!nome) { toast('O nome e obrigatorio'); return; }
  try {
    await KixikilaManager.atualizarPerfil({ telefone: perfil.telefone, nome, foto_perfil: novaFoto, senha: senha || undefined });
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
      <div style="display:flex;gap:12px;margin-bottom:12px"><div class="skel" style="width:44px;height:44px;border-radius:12px;flex-shrink:0"></div>
      <div style="flex:1;display:flex;flex-direction:column;gap:8px;padding-top:4px"><div class="skel" style="height:12px;width:55%;border-radius:6px"></div><div class="skel" style="height:10px;width:38%;border-radius:6px"></div></div></div>
      <div class="skel" style="height:22px;width:50%;border-radius:6px;margin-bottom:10px"></div><div class="skel" style="height:4px;border-radius:99px"></div>
    </div>`).join('');
}

// ── INIT ─────────────────────────────────────────────────────
(function init() {
  const perfil = Seguranca.carregarSessaoSegura();
  if (perfil) {
    KixikilaManager.setSessao(perfil);
    irParaMain();
    return;
  }
  irPara('paginaAuth');
})();