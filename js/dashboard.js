async function carregarDashboard() {
    const perfil = KixikilaManager.carregarPerfilLocal();
    if (!perfil) return;

    document.getElementById('dashSaudacao').textContent = 'Olá, ' + (perfil.nome?.split(' ')[0] || '') + '!';
    document.getElementById('dashReputacao').textContent = perfil.reputacao
        ? KixikilaManager.reputacaoEstrelas(perfil.reputacao) + '  ' + KixikilaManager.reputacaoTexto(perfil.reputacao)
        : 'Sem avaliações ainda';

    const navAvatar = document.getElementById('navAvatar');
    const navLetra  = document.getElementById('navAvatarLetra');
    if (perfil.foto) {
        navAvatar.src           = perfil.foto;
        navAvatar.style.display = 'block';
        navLetra.style.display  = 'none';
    } else {
        navLetra.textContent    = (perfil.nome?.[0] || 'K').toUpperCase();
        navLetra.style.display  = 'flex';
        navAvatar.style.display = 'none';
    }

    const codigos   = KixikilaManager.carregarMeusGrupos();
    const container = document.getElementById('listaGrupos');
    const vazio     = document.getElementById('dashVazio');
    container.innerHTML = '';

    if (!codigos.length) {
        vazio.style.display = 'block'; return;
    }
    vazio.style.display = 'none';

    for (const codigo of codigos) {
        try {
            const grupo = await KixikilaManager.carregarGrupo(codigo);
            const pagos = grupo.membros.filter(m => m.pago).length;
            const card  = document.createElement('div');
            card.className = 'card-grupo';
            card.innerHTML = `
                <div class="card-grupo-info">
                    <h3>${grupo.nome}</h3>
                    <p class="valor">${KixikilaManager.formatarValor(grupo.valor)} KZ <span style="font-weight:400;font-size:.85rem;color:var(--muted)">/ ${grupo.periodicidade}</span></p>
                    <p class="info">${grupo.membros.length} membros &bull; ${pagos} pagaram</p>
                </div>
                <div class="card-grupo-seta"><i data-lucide="chevron-right"></i></div>`;
            card.onclick = () => abrirGrupo(codigo);
            container.appendChild(card);
            lucide.createIcons();
        } catch (_) {}
    }
}

function abrirCriarGrupo() {
    const perfil = KixikilaManager.carregarPerfilLocal();
    if (!perfil?.telefone) {
        mostrarModal('Perfil incompleto', 'Configura o telefone no perfil antes de criar um grupo.');
        return;
    }
    mostrarPagina('CriarGrupo');
}

function abrirEntrarGrupo() {
    const perfil = KixikilaManager.carregarPerfilLocal();
    if (!perfil?.telefone) {
        mostrarModal('Perfil incompleto', 'Configura o telefone no perfil antes de entrar num grupo.');
        return;
    }
    if (!perfil.foto) {
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
    const perfil     = KixikilaManager.carregarPerfilLocal();

    if (!nome || !valor || valor < 500) {
        mostrarModal('Dados inválidos', 'Preenche todos os campos. O valor mínimo é 500 KZ.'); return;
    }

    try {
        const codigo = await KixikilaManager.criarGrupo(
            nome, perfil.telefone, perfil.nome || 'Utilizador', valor, frequencia, maxMembros
        );
        mostrarModalConfirmar(
            'Grupo criado!',
            `Código do grupo: ${codigo}\n\nPartilha este código com os membros.`,
            () => { voltarDashboard(); },
            'Partilhar via WhatsApp',
            () => {
                const msg = `Entra no meu grupo Kixikila!\n\nGrupo: ${nome}\nCódigo: ${codigo}\nValor: ${KixikilaManager.formatarValor(valor)} KZ\nPeriodicidade: ${frequencia}`;
                window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`);
                voltarDashboard();
            }
        );
    } catch (e) {
        mostrarModal('Erro', e.message);
    }
}

async function entrarGrupo() {
    const codigo  = document.getElementById('entrarCodigo').value.trim().toUpperCase();
    const perfil  = KixikilaManager.carregarPerfilLocal();

    if (!codigo || codigo.length < 4) {
        mostrarModal('Código inválido', 'Insere o código do grupo correctamente.'); return;
    }

    try {
        await KixikilaManager.entrarGrupo(codigo, perfil.telefone, perfil.nome || 'Utilizador');
        mostrarToast('Entraste no grupo!');
        voltarDashboard();
    } catch (e) {
        mostrarModal('Erro', e.message);
    }
}