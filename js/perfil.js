// ============================================
// PERFIL — O Meu Perfil
// ============================================

function abrirPerfil() {
    mostrarPagina('Perfil');
    carregarDadosPerfil();
}

function carregarDadosPerfil() {
    const sessao = KixikilaManager.getSessao();
    if (!sessao) return;
    const perfil = sessao.perfil;

    document.getElementById('perfilNome').textContent    = perfil.nome || '';
    document.getElementById('perfilTelefone').textContent = perfil.telefone || '';
    document.getElementById('editNome').value            = perfil.nome || '';

    const rep = document.getElementById('perfilReputacao');
    const reputacao = perfil.reputacao || 0;
    rep.textContent = reputacao > 0
        ? KixikilaManager.reputacaoEstrelas(reputacao) + '  ' + KixikilaManager.reputacaoTexto(reputacao)
        : 'Sem avaliações';

    const img   = document.getElementById('perfilFotoImg');
    const letra = document.getElementById('perfilFotoLetra');
    if (perfil.foto_perfil) {
        img.src           = perfil.foto_perfil;
        img.style.display = 'block';
        letra.style.display = 'none';
    } else {
        letra.textContent   = (perfil.nome?.[0] || 'K').toUpperCase();
        letra.style.display = 'flex';
        img.style.display   = 'none';
    }

    // Carregar stats da API
    KixikilaManager.carregarStats(perfil.telefone).then(stats => {
        document.getElementById('statGrupos').textContent     = stats.grupos_activos || 0;
        document.getElementById('statAvaliacoes').textContent = stats.total_avaliacoes || 0;
    }).catch(() => {
        document.getElementById('statGrupos').textContent     = '0';
        document.getElementById('statAvaliacoes').textContent = '0';
    });
}

async function guardarPerfil() {
    const sessao = KixikilaManager.getSessao();
    if (!sessao) return;
    const perfil = sessao.perfil;

    const nome  = document.getElementById('editNome').value.trim();
    const senha = document.getElementById('editSenha').value.trim();

    if (!nome) { mostrarModal('Campo obrigatório', 'O nome não pode estar vazio.'); return; }

    try {
        const atualizado = await KixikilaManager.atualizarPerfil({
            telefone: perfil.telefone,
            nome: nome,
            senha: senha || undefined
        });
        mostrarToast('Perfil actualizado!');
        carregarDadosPerfil();
    } catch (e) {
        mostrarModal('Erro', e.message);
    }
}