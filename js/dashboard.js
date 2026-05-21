// ============================================
// DASHBOARD — Meus Grupos + Feed + Ranking
// ============================================

var _tabActiva = 'descobrir';

async function carregarDashboard() {
  const perfil = KixikilaManager.getSessao()?.perfil;
  if (!perfil) return;

  document.getElementById('dashSaudacao').textContent = 'Olá, ' + (perfil.nome?.split(' ')[0] || '') + '!';
  document.getElementById('dashReputacao').textContent = perfil.reputacao
    ? KixikilaManager.reputacaoEstrelas(perfil.reputacao) + '  ' + KixikilaManager.reputacaoTexto(perfil.reputacao)
    : 'Sem avaliações ainda';

  const navAvatar = document.getElementById('navAvatar');
  const navLetra  = document.getElementById('navAvatarLetra');
  if (perfil.foto_perfil) {
    navAvatar.src           = perfil.foto_perfil;
    navAvatar.style.display = 'block';
    navLetra.style.display  = 'none';
  } else {
    navLetra.textContent    = (perfil.nome?.[0] || 'K').toUpperCase();
    navLetra.style.display  = 'flex';
    navAvatar.style.display = 'none';
  }

  // Notificações
  try {
    const { nao_lidas } = await KixikilaManager.carregarNotificacoes();
    const badge = document.getElementById('notifBadge');
    if (badge) {
      badge.textContent   = nao_lidas > 0 ? nao_lidas : '';
      badge.style.display = nao_lidas > 0 ? 'flex' : 'none';
    }
  } catch (_) {}

  mostrarTabDashboard(_tabActiva);
}

function mostrarTabDashboard(tab) {
  _tabActiva = tab;

  const tabDescobrir   = document.getElementById('tabDescobrir');
  const tabMeus        = document.getElementById('tabMeusGrupos');
  const conteudoDesc   = document.getElementById('conteudoDescobrir');
  const conteudoMeus   = document.getElementById('conteudoMeusGrupos');

  if (tabDescobrir) tabDescobrir.classList.toggle('activo', tab === 'descobrir');
  if (tabMeus)      tabMeus.classList.toggle('activo',      tab === 'meus');
  if (conteudoDesc) conteudoDesc.style.display = tab === 'descobrir' ? 'block' : 'none';
  if (conteudoMeus) conteudoMeus.style.display = tab === 'meus'      ? 'block' : 'none';

  if (tab === 'descobrir') carregarFeed();
  if (tab === 'meus')      carregarMeusGrupos();
}

async function carregarMeusGrupos() {
  const container = document.getElementById('listaGrupos');
  const vazio     = document.getElementById('dashVazio');
  if (!container) return;
  container.innerHTML = '<p class="loading-msg">A carregar...</p>';
  if (vazio) vazio.style.display = 'none';

  try {
    const grupos = await KixikilaManager.carregarMeusGrupos();
    container.innerHTML = '';

    if (!grupos.length) {
      if (vazio) {
        vazio.style.display = 'block';
        vazio.innerHTML = `
          <div style="text-align:center;padding:40px 20px">
            <p style="font-size:1rem;margin-bottom:8px">Ainda não fazes parte de nenhum grupo.</p>
            <p style="font-size:.85rem;color:var(--muted)">Vai a <strong>Descobrir</strong> para entrares num grupo aberto.</p>
          </div>`;
      }
      return;
    }

    grupos.forEach(grupo => renderCardGrupo(grupo, container, true));
    lucide.createIcons();
  } catch (e) {
    container.innerHTML = '<p class="erro-msg">Erro ao carregar grupos.</p>';
  }
}

async function carregarFeed() {
  const container = document.getElementById('feedGrupos');
  if (!container) return;
  container.innerHTML = '<p class="loading-msg">A carregar grupos abertos...</p>';

  try {
    const grupos = await KixikilaManager.carregarFeed({ estado: 'aberto' });
    const perfil = KixikilaManager.getSessao()?.perfil;
    container.innerHTML = '';

    const alheios = grupos.filter(g =>
      !g.membros?.find(m => m.telefone === perfil?.telefone)
    );

    if (!alheios.length) {
      container.innerHTML = `
        <div style="text-align:center;padding:40px 20px;color:var(--muted)">
          <p>Sem grupos abertos de momento.</p>
          <p style="font-size:.85rem;margin-top:8px">Cria o primeiro grupo!</p>
        </div>`;
      return;
    }

    alheios.forEach(grupo => renderCardGrupo(grupo, container, false));
    lucide.createIcons();
  } catch (e) {
    container.innerHTML = '<p class="erro-msg">Erro ao carregar feed.</p>';
  }
}

function renderCardGrupo(grupo, container, eMembro) {
  const pagos = grupo.membros?.filter(m => m.pago).length || 0;
  const vagas = (grupo.max_membros || 6) - (grupo.membros?.length || 0);
  const card  = document.createElement('div');
  card.className = 'card-grupo';
  card.innerHTML = `
    <div class="card-grupo-info">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
        <h3>${grupo.nome}</h3>
        <span class="badge-estado ${grupo.estado === 'aberto' ? 'badge-aberto' : 'badge-fechado'}">
          ${grupo.estado === 'aberto' ? 'Aberto' : 'Fechado'}
        </span>
      </div>
      <p class="valor">${KixikilaManager.formatarValor(grupo.valor)} KZ
        <span style="font-weight:400;font-size:.82rem;color:var(--muted)">/ ${grupo.periodicidade}</span>
      </p>
      <p class="info">
        ${grupo.membros?.length || 0}/${grupo.max_membros || 6} membros
        ${eMembro ? `&bull; ${pagos} pagaram` : vagas > 0 ? `&bull; ${vagas} vaga${vagas !== 1 ? 's' : ''}` : '&bull; Sem vagas'}
      </p>
      ${!eMembro && grupo.criador ? `
        <p class="info" style="margin-top:4px">
          Criado por <strong>${grupo.criador.nome}</strong>
        </p>` : ''}
    </div>
    <div class="card-grupo-seta"><i data-lucide="chevron-right"></i></div>`;

  card.onclick = () => {
    _codigoGrupoAtual = grupo.codigo;
    mostrarPagina('VerGrupo');
    carregarVerGrupo(grupo.codigo);
  };
  container.appendChild(card);
}

function abrirCriarGrupo() {
  const perfil = KixikilaManager.getSessao()?.perfil;
  if (!perfil?.telefone) { mostrarModal('Sessão inválida', 'Faz login novamente.'); return; }
  mostrarPagina('CriarGrupo');
}

function abrirEntrarGrupo() {
  const perfil = KixikilaManager.getSessao()?.perfil;
  if (!perfil?.telefone) { mostrarModal('Sessão inválida', 'Faz login novamente.'); return; }
  if (!perfil.foto_perfil) {
    mostrarModalConfirmar(
      'Sem foto de perfil',
      'Sem foto, a tua reputação começará como crítica. Queres continuar mesmo assim?',
      () => mostrarPagina('EntrarGrupo')
    );
    return;
  }
  mostrarPagina('EntrarGrupo');
}

async function criarGrupo() {
  const nome       = document.getElementById('criarNome').value.trim();
  const valor      = parseFloat(document.getElementById('criarValor').value);
  const frequencia = document.getElementById('criarFrequencia').value;
  const maxMembros = parseInt(document.getElementById('criarMax').value);
  const perfil     = KixikilaManager.getSessao()?.perfil;

  if (!nome || !valor || valor < 500) {
    mostrarModal('Dados inválidos', 'Preenche todos os campos. O valor mínimo é 500 KZ.'); return;
  }

  try {
    const codigo = await KixikilaManager.criarGrupo(
      nome, perfil.telefone, perfil.nome || 'Utilizador', valor, frequencia, maxMembros
    );
    mostrarModalConfirmar(
      'Grupo criado!',
      `Código: ${codigo}\n\nPartilha este código com os membros.`,
      () => voltarDashboard(),
      'Partilhar via WhatsApp',
      () => {
        const msg = `Entra no meu grupo Kixikila!\n\nGrupo: ${nome}\nCódigo: ${codigo}\nValor: ${KixikilaManager.formatarValor(valor)} KZ / ${frequencia}\n\nAcede em: https://plataformakixikila.vercel.app`;
        window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`);
        voltarDashboard();
      }
    );
  } catch (e) { mostrarModal('Erro', e.message); }
}

async function entrarGrupo() {
  const codigo = document.getElementById('entrarCodigo').value.trim().toUpperCase();
  const perfil = KixikilaManager.getSessao()?.perfil;

  if (!codigo || codigo.length < 4) {
    mostrarModal('Código inválido', 'Insere o código correctamente.'); return;
  }

  try {
    await KixikilaManager.entrarGrupo(codigo, perfil.telefone, perfil.nome || 'Utilizador');
    mostrarToast('Entraste no grupo!');
    voltarDashboard();
  } catch (e) { mostrarModal('Erro', e.message); }
}