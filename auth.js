const API_URL = 'https://sire-kixikila-api.vercel.app';

let _fotoRegTemp  = null;
let _stepAtual    = 1;
let _tokenRec     = null; // token temporário de recuperação

// ── TOAST ─────────────────────────────────────────────────────
function mostrarToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}

// ── SESSÃO ────────────────────────────────────────────────────
function guardarSessao(perfil) {
  localStorage.setItem('kx_sessao', JSON.stringify({ perfil, expira: Date.now() + 7 * 24 * 60 * 60 * 1000 }));
}

function guardarToken(token) {
  localStorage.setItem('kx_auth', JSON.stringify({ token, expira: Date.now() + 7 * 24 * 60 * 60 * 1000 }));
}

// ── REDIRECIONAR SE JÁ AUTENTICADO ───────────────────────────
(function () {
  try {
    const raw = localStorage.getItem('kx_sessao');
    if (!raw) return;
    const dados = JSON.parse(raw);
    if (!dados.expira || Date.now() < dados.expira) window.location.href = 'index.html';
  } catch (_) {}
})();

// ── RATE LIMIT FRONTEND ───────────────────────────────────────
const _rl = { count: 0, bloqueadoAte: 0 };

function verificarRlFrontend() {
  if (Date.now() < _rl.bloqueadoAte) {
    mostrarToast('Muitas tentativas. Aguarda ' + Math.ceil((_rl.bloqueadoAte - Date.now()) / 1000) + 's');
    return false;
  }
  return true;
}

function registarFalhaFrontend() {
  _rl.count++;
  if (_rl.count >= 5) {
    _rl.bloqueadoAte = Date.now() + 30000;
    _rl.count = 0;
  }
}

// ── IMAGEM ────────────────────────────────────────────────────
async function comprimirImagem(ficheiro, maxDim = 800, q = 0.85) {
  return new Promise((res, rej) => {
    if (!ficheiro?.type.startsWith('image/')) { rej(new Error('Inválido')); return; }
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

async function previewFotoReg(evento) {
  const f = evento.target.files[0];
  if (!f) return;
  try {
    const src = await comprimirImagem(f);
    _fotoRegTemp = src;
    const img = document.getElementById('fotoPickerImg');
    img.src = src;
    img.style.display = 'block';
  } catch { mostrarToast('Erro ao processar imagem'); }
}

// ── MULTI-STEP REGISTO ────────────────────────────────────────
const STEP_TITULOS = ['', 'O teu perfil', 'Contacto', 'Localização', 'Segurança'];

function iniciarRegisto() {
  _stepAtual = 1;
  document.getElementById('cardLogin').style.display    = 'none';
  document.getElementById('cardRegisto').style.display  = 'block';
  renderStep(1);
}

function mostrarLogin() {
  document.getElementById('cardLogin').style.display    = 'block';
  document.getElementById('cardRegisto').style.display  = 'none';
}

function renderStep(n) {
  [1, 2, 3, 4].forEach(i => {
    document.getElementById('step' + i).style.display = i === n ? 'block' : 'none';

    const dot  = document.getElementById('sdot' + i);
    const line = document.getElementById('sline' + i);

    dot.className = 'step-dot' + (i === n ? ' activo' : i < n ? ' feito' : '');
    dot.textContent = i < n ? '✓' : String(i);

    if (line) line.className = 'step-line' + (i < n ? ' feito' : '');
  });

  document.getElementById('stepTitulo').textContent = STEP_TITULOS[n];
}

function voltarStep() {
  if (_stepAtual === 1) {
    mostrarLogin();
  } else {
    _stepAtual--;
    renderStep(_stepAtual);
  }
}

function avancarStep(atual) {
  if (!validarStep(atual)) return;
  _stepAtual = atual + 1;
  renderStep(_stepAtual);
}

function validarStep(n) {
  if (n === 1) {
    const nome     = document.getElementById('regNome')?.value.trim()    || '';
    const dataNasc = document.getElementById('regDataNasc')?.value       || '';
    if (!nome)     { mostrarToast('Nome completo é obrigatório'); return false; }
    if (!dataNasc) { mostrarToast('Data de nascimento é obrigatória'); return false; }
    // Verificar idade mínima (16 anos)
    const nasc = new Date(dataNasc);
    const idade = (Date.now() - nasc.getTime()) / (365.25 * 24 * 3600 * 1000);
    if (idade < 16) { mostrarToast('Deves ter pelo menos 16 anos'); return false; }
    return true;
  }
  if (n === 2) {
    const telefone = document.getElementById('regTelefone')?.value.trim() || '';
    const email    = document.getElementById('regEmail')?.value.trim()    || '';
    if (!telefone) { mostrarToast('Telefone é obrigatório'); return false; }
    if (!/^\+?[0-9]{9,15}$/.test(telefone.replace(/\s/g, ''))) { mostrarToast('Telefone inválido'); return false; }
    if (!email)    { mostrarToast('Email é obrigatório'); return false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { mostrarToast('Email inválido'); return false; }
    return true;
  }
  if (n === 3) {
    const provincia = document.getElementById('regProvincia')?.value || '';
    const municipio = document.getElementById('regMunicipio')?.value.trim() || '';
    if (!provincia) { mostrarToast('Seleciona a província'); return false; }
    if (!municipio) { mostrarToast('Município é obrigatório'); return false; }
    return true;
  }
  return true;
}

// ── FORCA SENHA ───────────────────────────────────────────────
function calcularForca(senha) {
  let p = 0;
  if (senha.length >= 8)       p++;
  if (/[A-Z]/.test(senha))     p++;
  if (/[0-9]/.test(senha))     p++;
  if (/[^A-Za-z0-9]/.test(senha)) p++;
  return p;
}

function renderForca(barraId, textoId, senha) {
  const barra = document.getElementById(barraId);
  const texto = document.getElementById(textoId);
  if (!barra || !texto) return;
  const p = calcularForca(senha);
  const cores = ['', '#c0392b', '#e67e22', '#f1c40f', '#27ae60'];
  const msgs  = ['', 'Fraca', 'Razoável', 'Boa', 'Forte'];
  barra.style.width      = (p * 25) + '%';
  barra.style.background = cores[p] || '#c0392b';
  texto.textContent      = senha ? (msgs[p] || 'Fraca') : '';
  texto.style.color      = cores[p] || '#c0392b';
}

function atualizarForcaSenha() {
  renderForca('forcaSenhaBarra', 'forcaSenhaTexto', document.getElementById('regSenha')?.value || '');
}

function atualizarForcaSenhaRec() {
  renderForca('forcaSenhaBarraRec', 'forcaSenhaTextoRec', document.getElementById('recNovaSenha')?.value || '');
}

function validarSenhaFrontend(senha) {
  if (!senha || senha.length < 8) return 'Senha deve ter mínimo 8 caracteres';
  if (!/[A-Za-z]/.test(senha))    return 'Senha deve conter letras';
  if (!/[0-9]/.test(senha))       return 'Senha deve conter números';
  return null;
}

// ── TERMOS ────────────────────────────────────────────────────
function verificarScrollTermos() {
  const el        = document.getElementById('termosScroll');
  const hint      = document.getElementById('termosHint');
  const checkWrap = document.getElementById('termosCheckWrap');
  const check     = document.getElementById('termosCheck');
  if (!el) return;
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 10) {
    hint.innerHTML  = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Lido — pode aceitar os termos';
    hint.classList.add('lido');
    checkWrap.style.opacity       = '1';
    checkWrap.style.pointerEvents = 'auto';
    check.disabled = false;
  }
}

function atualizarBotaoCriar() {
  const btn = document.getElementById('btnCriarConta');
  const chk = document.getElementById('termosCheck');
  if (btn && chk) btn.disabled = !chk.checked;
}

// ── REGISTO ───────────────────────────────────────────────────
async function registar() {
  const hp = document.getElementById('_hp_website');
  if (hp && hp.value !== '') { mostrarToast('Erro ao criar conta'); return; }

  const nome      = document.getElementById('regNome')?.value.trim()      || '';
  const dataNasc  = document.getElementById('regDataNasc')?.value         || '';
  const telefone  = document.getElementById('regTelefone')?.value.trim()  || '';
  const email     = document.getElementById('regEmail')?.value.trim()     || '';
  const provincia = document.getElementById('regProvincia')?.value        || '';
  const municipio = document.getElementById('regMunicipio')?.value.trim() || '';
  const senha     = document.getElementById('regSenha')?.value            || '';
  const senhaConf = document.getElementById('regSenhaConfirm')?.value     || '';

  const erroSenha = validarSenhaFrontend(senha);
  if (erroSenha)           { mostrarToast(erroSenha); return; }
  if (senha !== senhaConf) { mostrarToast('As senhas não coincidem'); return; }

  const btn = document.getElementById('btnCriarConta');
  btn.disabled     = true;
  btn.textContent  = 'A criar conta...';

  try {
    const res = await fetch(API_URL + '/auth/registar', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telefone, nome, senha, foto_perfil: _fotoRegTemp || undefined, data_nasc: dataNasc, email, provincia, municipio })
    });
    const dados = await res.json();
    if (!res.ok) throw new Error(dados.erro);
    guardarSessao(dados.perfil);
    mostrarToast('Conta criada com sucesso!');
    window.location.href = 'index.html';
  } catch (e) {
    mostrarToast(e.message);
    btn.disabled    = false;
    btn.textContent = 'Criar conta';
  }
}

// ── LOGIN ─────────────────────────────────────────────────────
async function entrar() {
  if (!verificarRlFrontend()) return;

  const telefone = document.getElementById('loginTelefone')?.value.trim() || '';
  const senha    = document.getElementById('loginSenha')?.value           || '';
  if (!telefone || !senha) { mostrarToast('Preenche todos os campos'); return; }

  const btn = document.querySelector('#cardLogin .btn-primary');
  if (btn) { btn.disabled = true; btn.textContent = 'A entrar...'; }

  try {
    const res = await fetch(API_URL + '/auth/login', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telefone, senha })
    });
    const dados = await res.json();
    if (!res.ok) throw new Error(dados.erro);
    _rl.count = 0;
    guardarToken(dados.token);
    guardarSessao(dados.perfil);
    mostrarToast('Bem-vindo, ' + dados.perfil.nome + '!');
    window.location.href = 'index.html';
  } catch (e) {
    registarFalhaFrontend();
    mostrarToast(e.message);
    if (btn) { btn.disabled = false; btn.textContent = 'Entrar'; }
  }
}

// ── RECUPERAR SENHA ───────────────────────────────────────────
function abrirRecuperar() {
  _tokenRec = null;
  document.getElementById('recStep1').className = 'rec-step activo';
  document.getElementById('recStep2').className = 'rec-step';
  document.getElementById('recTelefone').value   = '';
  document.getElementById('recDataNasc').value   = '';
  document.getElementById('modalRecuperar').style.display = 'flex';
}

function fecharRecuperar() {
  document.getElementById('modalRecuperar').style.display = 'none';
  _tokenRec = null;
}

async function verificarIdentidade() {
  const telefone = document.getElementById('recTelefone')?.value.trim() || '';
  const dataNasc = document.getElementById('recDataNasc')?.value        || '';

  if (!telefone || !dataNasc) { mostrarToast('Preenche todos os campos'); return; }

  const btn = document.querySelector('#recStep1 .btn-primary');
  if (btn) { btn.disabled = true; btn.textContent = 'A verificar...'; }

  try {
    const res = await fetch(API_URL + '/auth/recuperar/verificar', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telefone, data_nasc: dataNasc })
    });
    const dados = await res.json();
    if (!res.ok) throw new Error(dados.erro);

    _tokenRec = dados.token_recuperacao;
    document.getElementById('recStep1').className = 'rec-step';
    document.getElementById('recStep2').className = 'rec-step activo';
    document.getElementById('recNovaSenha').value     = '';
    document.getElementById('recConfirmarSenha').value = '';
  } catch (e) {
    mostrarToast(e.message);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Verificar'; }
  }
}

async function redefinirSenha() {
  if (!_tokenRec) { mostrarToast('Sessão expirada. Recomeça o processo.'); fecharRecuperar(); return; }

  const novaSenha     = document.getElementById('recNovaSenha')?.value     || '';
  const confirmarSenha = document.getElementById('recConfirmarSenha')?.value || '';

  const erro = validarSenhaFrontend(novaSenha);
  if (erro)                       { mostrarToast(erro); return; }
  if (novaSenha !== confirmarSenha) { mostrarToast('As senhas não coincidem'); return; }

  const btn = document.querySelector('#recStep2 .btn-primary');
  if (btn) { btn.disabled = true; btn.textContent = 'A guardar...'; }

  try {
    const res = await fetch(API_URL + '/auth/recuperar/redefinir', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token_recuperacao: _tokenRec, nova_senha: novaSenha })
    });
    const dados = await res.json();
    if (!res.ok) throw new Error(dados.erro);

    mostrarToast('Senha alterada com sucesso!');
    fecharRecuperar();
  } catch (e) {
    mostrarToast(e.message);
    if (btn) { btn.disabled = false; btn.textContent = 'Guardar senha'; }
  }
}
