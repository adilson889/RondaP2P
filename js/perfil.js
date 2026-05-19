function abrirPerfil() {
    mostrarPagina('Perfil');
    carregarDadosPerfil();
}

function carregarDadosPerfil() {
    const perfil = KixikilaManager.carregarPerfilLocal();
    if (!perfil) return;

    document.getElementById('perfilNome').textContent    = perfil.nome || '';
    document.getElementById('perfilTelefone').textContent = perfil.telefone || '';
    document.getElementById('editNome').value            = perfil.nome || '';
    document.getElementById('statGrupos').textContent    = KixikilaManager.carregarMeusGrupos().length;
    document.getElementById('statAvaliacoes').textContent = perfil.totalAvaliacoes || 0;

    const rep = document.getElementById('perfilReputacao');
    rep.textContent = perfil.reputacao
        ? KixikilaManager.reputacaoEstrelas(perfil.reputacao) + '  ' + KixikilaManager.reputacaoTexto(perfil.reputacao)
        : 'Sem avaliações';

    const img   = document.getElementById('perfilFotoImg');
    const letra = document.getElementById('perfilFotoLetra');
    if (perfil.foto) {
        img.src           = perfil.foto;
        img.style.display = 'block';
        letra.style.display = 'none';
    } else {
        letra.textContent   = (perfil.nome?.[0] || 'K').toUpperCase();
        letra.style.display = 'flex';
        img.style.display   = 'none';
    }
}

async function guardarPerfil() {
    const nome  = document.getElementById('editNome').value.trim();
    const senha = document.getElementById('editSenha').value.trim();

    if (!nome) { mostrarModal('Campo obrigatório', 'O nome não pode estar vazio.'); return; }

    const perfil   = KixikilaManager.carregarPerfilLocal() || {};
    perfil.nome    = nome;
    if (senha) perfil.senha = senha;
    KixikilaManager.salvarPerfilLocal(perfil);

    try {
        await KixikilaManager.sincronizarPerfil(perfil.telefone, nome, perfil.genero || 'M', perfil.cor || '#8B0000');
    } catch (_) {}

    mostrarToast('Perfil actualizado!');
    voltarDashboard();
}