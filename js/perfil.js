function abrirPerfil() {
  mostrarPagina('Perfil');
  carregarDadosPerfil();
}

function carregarDadosPerfil() {
  const perfil = KixikilaManager.getSessao()?.perfil;
  if (!perfil) return;

  document.getElementById('perfilNome').textContent     = perfil.nome || '';
  document.getElementById('perfilTelefone').textContent = perfil.telefone || '';
  document.getElementById('editNome').value             = perfil.nome || '';

  const rep = document.getElementById('perfilReputacao');
  rep.textContent = perfil.reputacao
    ? KixikilaManager.reputacaoEstrelas(perfil.reputacao) + '  ' + KixikilaManager.reputacaoTexto(perfil.reputacao)
    : 'Sem avaliações';

  document.getElementById('statAvaliacoes').textContent = (perfil.avaliacoes || []).length;

  // Foto de perfil
  const img   = document.getElementById('perfilFotoImg');
  const letra = document.getElementById('perfilFotoLetra');
  if (perfil.foto_perfil) {
    img.src             = perfil.foto_perfil;
    img.style.display   = 'block';
    letra.style.display = 'none';
  } else {
    letra.textContent   = (perfil.nome?.[0] || 'K').toUpperCase();
    letra.style.display = 'flex';
    img.style.display   = 'none';
  }

  // Grupos (contar via API)
  KixikilaManager.carregarMeusGrupos()
    .then(grupos => {
      document.getElementById('statGrupos').textContent = grupos.length;
    })
    .catch(() => {});
}

function previewFotoPerfil(evento) {
  const ficheiro = evento.target.files[0];
  if (!ficheiro) return;
  const leitor = new FileReader();
  leitor.onload = (e) => {
    const src   = e.target.result;
    const img   = document.getElementById('perfilFotoImg');
    const letra = document.getElementById('perfilFotoLetra');
    img.src             = src;
    img.style.display   = 'block';
    letra.style.display = 'none';
    window._fotoPerfilTemp = src;
  };
  leitor.readAsDataURL(ficheiro);
}

async function guardarPerfil() {
  const nome  = document.getElementById('editNome').value.trim();
  const senha = document.getElementById('editSenha').value.trim();

  if (!nome) { mostrarModal('Campo obrigatório', 'O nome não pode estar vazio.'); return; }

  const perfil     = KixikilaManager.getSessao()?.perfil;
  const foto_perfil = window._fotoPerfilTemp || perfil?.foto_perfil || '';

  try {
    await KixikilaManager.atualizarPerfil({
      telefone:    perfil.telefone,
      nome,
      genero:      perfil.genero || 'M',
      cor:         perfil.cor    || '#8B0000',
      foto_perfil,
      senha:       senha || undefined
    });
    window._fotoPerfilTemp = null;
    mostrarToast('Perfil actualizado!');
    voltarDashboard();
  } catch (e) {
    mostrarModal('Erro', e.message);
  }
}