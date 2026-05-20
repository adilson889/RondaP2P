var _paginaAnterior    = '';
var _estrelasAvaliacao = 0;
var _tabAtual          = 'descobrir';
var _telefoneAvaliacaoDireta = '';
var _nomeAvaliacaoDireta = '';

// ============================================
// NAVEGAÇÃO
// ============================================

function mostrarPagina(nome) {
  _paginaAnterior = document.querySelector('.pagina:not([style*="display:none"])')?.id?.replace('pagina','') || '';
  document.querySelectorAll('.pagina').forEach(p => p.style.display = 'none');
  const pagina = document.getElementById('pagina' + nome);
  if (pagina) pagina.style.display = 'flex';
  lucide.createIcons();
  if (nome === 'Dashboard') {
    carregarDashboard();
    carregarFeedDashboard();
  }
  history.pushState({ pagina: nome }, '', '#' + nome);
}

function voltarDashboard() { mostrarPagina('Dashboard'); }

window.addEventListener('popstate', (e) => {
  const pagina = e.state?.pagina;
  if (!pagina || pagina === 'Auth') {
    const sessao = KixikilaManager.getSessao();
    if (sessao) {
      mostrarPagina('Dashboard');
    } else {
      mostrarPagina('Auth');
    }
  } else {
    document.querySelectorAll('.pagina').forEach(p => p.style.display = 'none');
    const el = document.getElementById('pagina' + pagina);
    if (el) el.style.display = 'flex';
    lucide.createIcons();
  }
});

// ============================================
// DASHBOARD TABS
// ============================================

function mostrarTabDashboard(tab) {
  _tabAtual = tab;
  document.getElementById('tabDescobrir').classList.toggle('activo', tab === 'descobrir');
  document.getElementById('tabMeusGrupos').classList.toggle('activo', tab === 'meus');
  document.getElementById('conteudoDescobrir').style.display = tab === 'descobrir' ? 'block' : 'none';
  document.getElementById('conteudoMeusGrupos').style.display = tab === 'meus' ? 'block' : 'none';
  
  if (tab === 'descobrir') carregarFeedDashboard();
  if (tab === 'meus') carregarMeusGruposDashboard();
}

// ============================================
// CARREGAR DASHBOARD
// ============================================

function carregarDashboard() {
  const sessao = KixikilaManager.getSessao();
  if (!sessao) return;
  const perfil = sessao.perfil;
  
  if (perfil.foto_perfil) {
    document.getElementById('navAvatar').src = perfil.foto_perfil;
    document.getElementById('navAvatar').style.display = 'block';
    document.getElementById('navAvatarLetra').style.display = 'none';
  } else {
    document.getElementById('navAvatar').style.display = 'none';
    document.getElementById('navAvatarLetra').textContent = (perfil.nome || 'U')[0].toUpperCase();
    document.getElementById('navAvatarLetra').style.display = 'flex';
  }
}

// ============================================
// FEED — DESCOBRIR GRUPOS
// ============================================

async function carregarFeedDashboard() {
  const container = document.getElementById('feedGrupos');
  if (!container) return;
  
  try {
    const grupos = await KixikilaManager.carregarFeed({ estado: 'aberto', limite: 20 });
    
    if (!grupos.length) {
      container.innerHTML = '<p style="color:var(--muted);text-align:center;padding:20px;">Nenhum grupo aberto no momento.</p>';
      return;
    }
    
    container.innerHTML = '';
    grupos.forEach(grupo => {
      const vagas = grupo.max_membros - grupo.membros.length;
      const card = document.createElement('div');
      card.className = 'feed-grupo-card';
      card.onclick = () => {
        _codigoGrupoAtual = grupo.codigo;
        mostrarPagina('VerGrupo');
        carregarVerGrupo(grupo.codigo);
      };
      card.innerHTML = `
        <div class="feed-info">
          <h4>${grupo.nome}</h4>
          <div class="feed-valor">${KixikilaManager.formatarValor(grupo.valor)} KZ / ${grupo.periodicidade}</div>
          <div class="feed-criador">
            por <span onclick="event.stopPropagation();abrirPerfilMembro('${grupo.criador.telefone}')">${grupo.criador.nome}</span>
          </div>
        </div>
        <div class="feed-meta">
          <div class="feed-vagas">${vagas} vagas</div>
          <div>${grupo.membros.length}/${grupo.max_membros}</div>
        </div>
      `;
      container.appendChild(card);
    });
  } catch (e) {
    container.innerHTML = '<p style="color:var(--muted);text-align:center;padding:20px;">Erro ao carregar grupos.</p>';
  }
}

// ============================================
// OS MEUS GRUPOS
// ============================================

async function carregarMeusGruposDashboard() {
  const container = document.getElementById('listaGrupos');
  const vazio = document.getElementById('dashVazio');
  if (!container) return;
  
  try {
    const grupos = await KixikilaManager.carregarMeusGrupos();
    
    if (!grupos.length) {
      container.innerHTML = '';
      if (vazio) vazio.style.display = 'block';
      return;
    }
    
    if (vazio) vazio.style.display = 'none';
    container.innerHTML = '';
    
    grupos.forEach(grupo => {
      const pagos = grupo.membros.filter(m => m.pago).length;
      const card = document.createElement('div');
      card.className = 'card-grupo';
      card.onclick = () => {
        _codigoGrupoAtual = grupo.codigo;
        mostrarPagina('VerGrupo');
        carregarVerGrupo(grupo.codigo);
      };
      card.innerHTML = `
        <div class="card-grupo-info">
          <h3>${grupo.nome}</h3>
          <div class="valor">${KixikilaManager.formatarValor(grupo.valor)} KZ / ${grupo.periodicidade}</div>
          <div class="info">${grupo.membros.length} membros &bull; ${pagos} pagaram</div>
        </div>
        <div class="card-grupo-seta">
          <i data-lucide="chevron-right"></i>
        </div>
      `;
      container.appendChild(card);
    });
    lucide.createIcons();
  } catch (e) {
    container.innerHTML = '<p style="color:var(--muted);text-align:center;padding:20px;">Erro ao carregar os teus grupos.</p>';
  }
}

// ============================================
// PERFIL DE MEMBRO
// ============================================

async function abrirPerfilMembro(telefone) {
  mostrarPagina('PerfilMembro');
  const container = document.getElementById('perfilMembroConteudo');
  container.innerHTML = '<p style="text-align:center;padding:40px;color:var(--muted);">A carregar perfil...</p>';
  
  try {
    const perfil = await KixikilaManager.carregarReputacao(telefone);
    const estrelas = KixikilaManager.reputacaoEstrelas(perfil.reputacao || 0);
    const texto = KixikilaManager.reputacaoTexto(perfil.reputacao || 0);
    
    container.innerHTML = `
      <div class="membro-perfil-topo">
        ${perfil.foto_perfil 
          ? `<img src="${perfil.foto_perfil}" class="membro-perfil-foto" alt="Foto">`
          : `<div class="membro-perfil-letra">${(perfil.nome || 'U')[0].toUpperCase()}</div>`
        }
        <h3 class="membro-perfil-nome">${perfil.nome || 'Utilizador'}</h3>
        <p class="membro-perfil-tel">${perfil.telefone || telefone}</p>
        <p class="membro-perfil-rep">${estrelas} ${texto}</p>
      </div>
      <div class="membro-perfil-stats">
        <div class="stat-box">
          <span>${perfil.grupos_concluidos || 0}</span>
          <label>Grupos Concluídos</label>
        </div>
        <div class="stat-box">
          <span>${perfil.total_avaliacoes || 0}</span>
          <label>Avaliações</label>
        </div>
      </div>
      <div id="graficoReputacaoMembro" class="grafico-wrap">
        <div class="grafico-titulo">EVOLUÇÃO DA REPUTAÇÃO</div>
        <canvas id="canvasReputacao" width="300" height="150"></canvas>
      </div>
      <div class="membro-perfil-acoes">
        <button class="btn-confiar" onclick="abrirAvaliacaoDireta('${telefone}','${perfil.nome}')">
          <i data-lucide="star"></i> Avaliar este membro
        </button>
      </div>
      <div id="avaliacoesMembro" class="avaliacoes-lista">
        <div class="secao-label-pequena">AVALIAÇÕES RECENTES</div>
        <p style="color:var(--muted);font-size:.85rem;text-align:center;padding:12px;">A carregar avaliações...</p>
      </div>
    `;
    lucide.createIcons();

    // Gráfico de reputação
    setTimeout(() => {
      const canvas = document.getElementById('canvasReputacao');
      if (canvas) {
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;
        const pontos = [3.0, 3.5, 4.0, 3.8, 4.2, perfil.reputacao || 0].filter(v => v > 0);
        
        if (pontos.length === 0) return;
        
        ctx.clearRect(0, 0, w, h);
        
        // Linha
        ctx.beginPath();
        ctx.strokeStyle = '#8B0000';
        ctx.lineWidth = 2.5;
        pontos.forEach((v, i) => {
          const x = 30 + (w - 60) * i / (pontos.length - 1);
          const y = h - 20 - (h - 40) * (v / 5);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
        
        // Pontos
        pontos.forEach((v, i) => {
          const x = 30 + (w - 60) * i / (pontos.length - 1);
          const y = h - 20 - (h - 40) * (v / 5);
          ctx.beginPath();
          ctx.fillStyle = '#8B0000';
          ctx.arc(x, y, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#fff';
          ctx.arc(x, y, 2, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.fillStyle = '#8B0000';
          ctx.font = 'bold 10px DM Sans';
          ctx.textAlign = 'center';
          ctx.fillText(v.toFixed(1), x, y - 10);
        });
      }
    }, 300);

  } catch (e) {
    container.innerHTML = '<p style="text-align:center;padding:40px;color:var(--muted);">Erro ao carregar perfil.</p>';
  }
}

// ============================================
// AVALIAÇÃO DIRECTA
// ============================================

function abrirAvaliacaoDireta(telefone, nome) {
  _telefoneAvaliacaoDireta = telefone;
  _nomeAvaliacaoDireta = nome;
  document.getElementById('avalDiretaNome').textContent = nome;
  
  _estrelasAvaliacao = 0;
  const wrap = document.getElementById('estrelasWrapDireta');
  wrap.innerHTML = '';
  for (let i = 1; i <= 5; i++) {
    const btn = document.createElement('button');
    btn.className = 'estrela-btn';
    btn.textContent = '★';
    btn.onclick = () => {
      _estrelasAvaliacao = i;
      wrap.querySelectorAll('.estrela-btn').forEach((b, j) => {
        b.classList.toggle('on', j < i);
      });
    };
    wrap.appendChild(btn);
  }
  
  document.getElementById('overlayAvaliacaoDireta').style.display = 'flex';
}

function fecharAvaliacaoDireta() {
  document.getElementById('overlayAvaliacaoDireta').style.display = 'none';
  _estrelasAvaliacao = 0;
}

async function confirmarAvaliacaoDireta() {
  if (_estrelasAvaliacao === 0) return;
  const perfil = KixikilaManager.getSessao()?.perfil;
  if (!perfil) return;
  
  const comentario = document.getElementById('comentarioAvaliacao').value.trim();
  
  try {
    await KixikilaManager.avaliar(perfil.telefone, _telefoneAvaliacaoDireta, _estrelasAvaliacao, comentario);
    fecharAvaliacaoDireta();
    mostrarToast('Avaliação enviada!');
    abrirPerfilMembro(_telefoneAvaliacaoDireta);
  } catch (e) {
    mostrarToast(e.message);
  }
}

// ============================================
// MODAL
// ============================================

function mostrarModal(titulo, mensagem, onOk) {
  document.getElementById('modalTitulo').textContent   = titulo;
  document.getElementById('modalMensagem').textContent = mensagem;
  const btns = document.getElementById('modalBtns');
  btns.innerHTML = '';
  const btnOk       = document.createElement('button');
  btnOk.className   = 'btn-primary';
  btnOk.textContent = 'OK';
  btnOk.style.flex  = '1';
  btnOk.onclick     = () => { fecharModal(); if (onOk) onOk(); };
  btns.appendChild(btnOk);
  document.getElementById('modal').style.display = 'flex';
}

function mostrarModalConfirmar(titulo, mensagem, onConfirmar, txtConfirmar) {
  document.getElementById('modalTitulo').textContent   = titulo;
  document.getElementById('modalMensagem').textContent = mensagem;
  const btns = document.getElementById('modalBtns');
  btns.innerHTML = '';

  const btnCancelar       = document.createElement('button');
  btnCancelar.className   = 'btn-outline';
  btnCancelar.textContent = 'Cancelar';
  btnCancelar.onclick     = fecharModal;

  const btnOk       = document.createElement('button');
  btnOk.className   = 'btn-primary';
  btnOk.textContent = txtConfirmar || 'Confirmar';
  btnOk.onclick     = () => { fecharModal(); onConfirmar(); };

  btns.appendChild(btnCancelar);
  btns.appendChild(btnOk);
  document.getElementById('modal').style.display = 'flex';
}

function mostrarModalComInput(titulo, mensagem, tipo, onConfirmar) {
  document.getElementById('modalTitulo').textContent = titulo;
  document.getElementById('modalMensagem').innerHTML = `
    ${mensagem}
    <input type="${tipo}" id="modalInput" placeholder="A tua senha" 
           style="width:100%;padding:12px;border:1.5px solid var(--border);border-radius:10px;font-size:.95rem;margin-top:12px;">
  `;
  
  const btns = document.getElementById('modalBtns');
  btns.innerHTML = '';
  
  const btnCancelar = document.createElement('button');
  btnCancelar.className = 'btn-outline';
  btnCancelar.textContent = 'Cancelar';
  btnCancelar.onclick = fecharModal;
  
  const btnOk = document.createElement('button');
  btnOk.className = 'btn-primary';
  btnOk.textContent = 'Eliminar';
  btnOk.style.background = 'var(--r2)';
  btnOk.onclick = () => {
    const valor = document.getElementById('modalInput').value;
    if (!valor) return;
    fecharModal();
    onConfirmar(valor);
  };
  
  btns.appendChild(btnCancelar);
  btns.appendChild(btnOk);
  document.getElementById('modal').style.display = 'flex';
}

function fecharModal() {
  document.getElementById('modal').style.display = 'none';
}

function mostrarToast(mensagem) {
  const toast       = document.getElementById('toast');
  toast.textContent = mensagem;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2800);
}

// ============================================
// PERFIL (O MEU)
// ============================================

function abrirPerfil() {
  mostrarPagina('Perfil');
  carregarMeuPerfil();
}

function carregarMeuPerfil() {
  const perfil = KixikilaManager.getSessao()?.perfil;
  if (!perfil) return;
  
  document.getElementById('perfilNome').textContent = perfil.nome || 'Utilizador';
  document.getElementById('perfilTelefone').textContent = perfil.telefone || '';
  document.getElementById('perfilReputacao').textContent = KixikilaManager.reputacaoEstrelas(perfil.reputacao || 0);
  document.getElementById('editNome').value = perfil.nome || '';
  
  if (perfil.foto_perfil) {
    document.getElementById('perfilFotoImg').src = perfil.foto_perfil;
    document.getElementById('perfilFotoImg').style.display = 'block';
    document.getElementById('perfilFotoLetra').style.display = 'none';
  }
  
  KixikilaManager.carregarStats(perfil.telefone).then(stats => {
    document.getElementById('statGrupos').textContent = stats.grupos_activos || 0;
    document.getElementById('statAvaliacoes').textContent = stats.total_avaliacoes || 0;
  }).catch(() => {});
}

async function guardarPerfil() {
  const perfil = KixikilaManager.getSessao()?.perfil;
  if (!perfil) return;
  
  const nome = document.getElementById('editNome').value.trim();
  const senha = document.getElementById('editSenha').value.trim();
  
  if (!nome) { mostrarToast('O nome é obrigatório.'); return; }
  
  try {
    const atualizado = await KixikilaManager.atualizarPerfil({
      telefone: perfil.telefone,
      nome: nome,
      senha: senha || undefined
    });
    KixikilaManager.setSessao(atualizado);
    mostrarToast('Perfil atualizado!');
  } catch (e) {
    mostrarToast(e.message);
  }
}

function logout() {
  KixikilaManager.limparSessao();
  mostrarPagina('Auth');
}

// ============================================
// ELIMINAR CONTA
// ============================================

async function confirmarEliminarConta() {
  const perfil = KixikilaManager.getSessao()?.perfil;
  if (!perfil) return;

  try {
    const stats = await KixikilaManager.carregarStats(perfil.telefone);
    if (stats.grupos_activos > 0) {
      mostrarModal('Não é possível eliminar', `Ainda fazes parte de ${stats.grupos_activos} grupo(s). Sai de todos os grupos antes de eliminar a conta.`);
      return;
    }
  } catch (e) {}

  mostrarModalComInput('Eliminar Conta', 'Digita a tua senha para confirmar a eliminação permanente da tua conta.', 'password', async (senha) => {
    try {
      await KixikilaManager.eliminarConta(perfil.telefone, senha);
      KixikilaManager.limparSessao();
      mostrarModal('Conta eliminada', 'A tua conta foi removida com sucesso.', () => {
        mostrarPagina('Auth');
      });
    } catch (e) {
      mostrarModal('Erro', e.message);
    }
  });
}

// ============================================
// AUTH TABS
// ============================================

function mostrarTab(tab) {
  document.getElementById('tabRegisto').style.display = tab === 'registo' ? 'block' : 'none';
  document.getElementById('tabLogin').style.display = tab === 'login' ? 'block' : 'none';
  document.querySelectorAll('.auth-tab').forEach((b, i) => {
    b.classList.toggle('activo', (i === 0 && tab === 'registo') || (i === 1 && tab === 'login'));
  });
}

// ============================================
// INICIALIZAÇÃO
// ============================================

(function init() {
  try {
    const guardado = sessionStorage.getItem('kx_sessao');
    if (guardado) {
      KixikilaManager.setSessao(JSON.parse(guardado));
      mostrarPagina('Dashboard');
      return;
    }
  } catch (_) {}
  mostrarPagina('Auth');
  lucide.createIcons();
})();