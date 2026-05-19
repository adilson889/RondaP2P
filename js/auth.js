var _estrelasAvaliacao = 0;

function mostrarTab(tab) {
    document.getElementById('tabRegisto').style.display = tab === 'registo' ? 'block' : 'none';
    document.getElementById('tabLogin').style.display   = tab === 'login'   ? 'block' : 'none';
    document.querySelectorAll('.auth-tab').forEach((b, i) => {
        b.classList.toggle('activo', (i === 0 && tab === 'registo') || (i === 1 && tab === 'login'));
    });
}

function previewFoto(origem, evento) {
    const ficheiro = evento.target.files[0];
    if (!ficheiro) return;
    const leitor = new FileReader();
    leitor.onload = (e) => {
        const src         = e.target.result;
        const img         = document.getElementById('previewFoto' + origem);
        const placeholder = document.getElementById('fotoPlaceholder' + origem);
        img.src           = src;
        img.style.display = 'block';
        if (placeholder) placeholder.style.display = 'none';

        const perfil  = KixikilaManager.carregarPerfilLocal() || {};
        perfil.foto   = src;
        KixikilaManager.salvarPerfilLocal(perfil);
    };
    leitor.readAsDataURL(ficheiro);
}

async function registar() {
    const nome     = document.getElementById('regNome').value.trim();
    const telefone = document.getElementById('regTelefone').value.trim();
    const senha    = document.getElementById('regSenha').value.trim();
    const perfil   = KixikilaManager.carregarPerfilLocal() || {};
    const foto     = perfil.foto || '';

    if (!nome || !telefone || !senha) {
        mostrarModal('Campos obrigatórios', 'Preenche o nome, telefone e senha para continuar.'); return;
    }
    if (senha.length < 6) {
        mostrarModal('Senha curta', 'A senha deve ter pelo menos 6 caracteres.'); return;
    }

    const dadosPerfil = { nome, telefone, senha, foto, genero: 'M', cor: '#8B0000' };
    KixikilaManager.salvarPerfilLocal(dadosPerfil);

    try {
        await KixikilaManager.sincronizarPerfil(telefone, nome, 'M', '#8B0000');
    } catch (_) {}

    mostrarToast('Conta criada com sucesso!');
    mostrarPagina('Dashboard');
}

async function entrar() {
    const telefone = document.getElementById('loginTelefone').value.trim();
    const senha    = document.getElementById('loginSenha').value.trim();

    if (!telefone || !senha) {
        mostrarModal('Campos obrigatórios', 'Preenche o telefone e a senha.'); return;
    }

    const perfil = KixikilaManager.carregarPerfilLocal();
    if (!perfil || perfil.telefone !== telefone || perfil.senha !== senha) {
        mostrarModal('Credenciais incorrectas', 'Telefone ou senha incorrectos.'); return;
    }

    mostrarToast('Bem-vindo de volta, ' + perfil.nome + '!');
    mostrarPagina('Dashboard');
}

function logout() {
    mostrarModalConfirmar('Sair', 'Tens a certeza que queres sair?', () => {
        mostrarPagina('Auth');
    });
}