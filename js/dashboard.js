// ============================================
// DASHBOARD - Kixikila
// Com integração social (Stories, Trending, Likes)
// ============================================

async function carregarDashboard() {
  const sessao = KixikilaManager.getSessao();
  const perfil = sessao?.perfil;
  if (!perfil) return;

  const saudacao = document.getElementById('dashSaudacao');
  const dashReputacao = document.getElementById('dashReputacao');
  
  if (saudacao) {
    saudacao.textContent = 'Olá, ' + (perfil.nome?.split(' ')[0] || '') + '!';
  }
  if (dashReputacao) {
    dashReputacao.textContent = perfil.reputacao
      ? KixikilaManager.reputacaoEstrelas(perfil.reputacao) + '  ' + KixikilaManager.reputacaoTexto(perfil.reputacao)
      : 'Sem avaliações ainda';
  }

  // Avatar no topnav
  const navAvatar = document.getElementById('navAvatar');
  const navLetra = document.getElementById('navAvatarLetra');
  if (perfil.foto_perfil) {
    if (navAvatar) {
      navAvatar.src = perfil.foto_perfil;
      navAvatar.style.display = 'block';
    }
    if (navLetra) navLetra.style.display = 'none';
  } else {
    if (navAvatar) navAvatar.style.display = 'none';
    if (navLetra) {
      navLetra.textContent = (perfil.nome?.[0] || 'K').toUpperCase();
      navLetra.style.display = 'flex';
    }
  }

  const container = document.getElementById('listaGrupos');
  const vazio = document.getElementById('dashVazio');
  
  if (container) {
    container.innerHTML = '<p style="text-align:center;color:var(--muted);padding:40px">A carregar...</p>';
  }

  try {
    const grupos = await KixikilaManager.carregarMeusGrupos();
    if (container) container.innerHTML = '';

    if (!grupos.length) {
      if (vazio) vazio.style.display = 'block';
      return;
    }
    if (vazio) vazio.style.display = 'none';

    for (const grupo of grupos) {
      const pagos = grupo.membros.filter(m => m.pago).length;
      const card = document.createElement('div');
      card.className = 'card-grupo';
      card.setAttribute('data-codigo', grupo.codigo);
      card.innerHTML = `
        <div class="card-grupo-info">
          <h3>${escapeHtml(grupo.nome)}</h3>
          <p class="valor">${KixikilaManager.formatarValor(grupo.valor)} KZ <span style="font-weight:400;font-size:.85rem;color:var(--muted)">/ ${grupo.periodicidade}</span></p>
          <p class="info">${grupo.membros.length} membros • ${pagos} pagaram</p>
        </div>
        <div class="card-grupo-seta"><i data-lucide="chevron-right"></i></div>`;
      card.onclick = () => abrirGrupo(grupo.codigo);
      if (container) container.appendChild(card);
    }
    
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
      lucide.createIcons();
    }
    
    // Aplicar melhorias sociais nos cards
    setTimeout(function() {
      if (typeof melhorarCardsGrupos === 'function') {
        melhorarCardsGrupos();
      }
      if (typeof configurarDoubleTapLike === 'function') {
        configurarDoubleTapLike();
      }
    }, 100);
    
  } catch (e) {
    console.error('Erro ao carregar grupos:', e);
    if (container) {
      container.innerHTML = '<p style="text-align:center;color:var(--muted);padding:40px">Erro ao carregar grupos.</p>';
    }
  }
  
  // Carregar stories e trending
  setTimeout(function() {
    if (typeof carregarStories === 'function') {
      carregarStories();
    }
    if (typeof carregarTrending === 'function') {
      carregarTrending();
    }
  }, 200);
}

function abrirCriarGrupo() {
  const sessao = KixikilaManager.getSessao();
  const perfil = sessao?.perfil;
  if (!perfil?.telefone) {
    mostrarModal('Sessão inválida', 'Faz login novamente.');
    return;
  }
  if (typeof mostrarPagina === 'function') {
    mostrarPagina('CriarGrupo');
  }
}

function abrirEntrarGrupo() {
  const sessao = KixikilaManager.getSessao();
  const perfil = sessao?.perfil;
  if (!perfil?.telefone) {
    mostrarModal('Sessão inválida', 'Faz login novamente.');
    return;
  }
  if (!perfil.foto_perfil) {
    mostrarModalConfirmar(
      'Sem foto de perfil',
      'Sem foto, a tua reputação começará como crítica. Queres continuar mesmo assim?',
      function() {
        if (typeof mostrarPagina === 'function') {
          mostrarPagina('EntrarGrupo');
        }
      }
    );
    return;
  }
  if (typeof mostrarPagina === 'function') {
    mostrarPagina('EntrarGrupo');
  }
}

async function criarGrupo() {
  const nomeInput = document.getElementById('criarNome');
  const valorInput = document.getElementById('criarValor');
  const frequenciaSelect = document.getElementById('criarFrequencia');
  const maxMembrosSelect = document.getElementById('criarMax');
  const sessao = KixikilaManager.getSessao();
  const perfil = sessao?.perfil;

  const nome = nomeInput ? nomeInput.value.trim() : '';
  const valor = valorInput ? parseFloat(valorInput.value) : 0;
  const frequencia = frequenciaSelect ? frequenciaSelect.value : 'mensal';
  const maxMembros = maxMembrosSelect ? parseInt(maxMembrosSelect.value, 10) : 6;

  if (!nome || !valor || valor < 500) {
    mostrarModal('Dados inválidos', 'Preenche todos os campos. O valor mínimo é 500 KZ.');
    return;
  }

  try {
    const codigo = await KixikilaManager.criarGrupo(
      nome, perfil.telefone, perfil.nome || 'Utilizador', valor, frequencia, maxMembros
    );
    mostrarModalConfirmar(
      'Grupo criado!',
      'Código do grupo: ' + codigo + '\n\nPartilha com os membros.',
      function() {
        if (typeof voltarDashboard === 'function') voltarDashboard();
      },
      'Partilhar via WhatsApp',
      function() {
        const msg = 'Entra no meu grupo Kixikila!\n\nGrupo: ' + nome + '\nCódigo: ' + codigo + '\nValor: ' + KixikilaManager.formatarValor(valor) + ' KZ\nPeriodicidade: ' + frequencia;
        window.open('https://wa.me/?text=' + encodeURIComponent(msg));
        if (typeof voltarDashboard === 'function') voltarDashboard();
      }
    );
  } catch (e) {
    mostrarModal('Erro', e.message);
  }
}

async function entrarGrupo() {
  const codigoInput = document.getElementById('entrarCodigo');
  const sessao = KixikilaManager.getSessao();
  const perfil = sessao?.perfil;

  const codigo = codigoInput ? codigoInput.value.trim().toUpperCase() : '';

  if (!codigo || codigo.length < 4) {
    mostrarModal('Código inválido', 'Insere o código do grupo correctamente.');
    return;
  }

  try {
    await KixikilaManager.entrarGrupo(codigo, perfil.telefone, perfil.nome || 'Utilizador');
    if (typeof mostrarToast === 'function') {
      mostrarToast('Entraste no grupo!');
    }
    if (typeof voltarDashboard === 'function') {
      voltarDashboard();
    }
  } catch (e) {
    mostrarModal('Erro', e.message);
  }
}

// ============================================
// FUNÇÕES SOCIAIS INTEGRADAS
// ============================================

// Estado dos likes
let grupoLikes = {};

// Carregar stories (membros dos grupos)
async function carregarStories() {
  const container = document.getElementById('storiesContainer');
  if (!container) return;
  
  const sessao = KixikilaManager.getSessao();
  const perfil = sessao?.perfil;
  if (!perfil) return;
  
  try {
    const grupos = await KixikilaManager.carregarMeusGrupos();
    const membrosUnicos = new Map();
    
    for (const grupo of grupos) {
      if (grupo.membros && Array.isArray(grupo.membros)) {
        for (const membro of grupo.membros) {
          if (membro.telefone !== perfil.telefone && !membrosUnicos.has(membro.telefone)) {
            membrosUnicos.set(membro.telefone, {
              nome: membro.nome,
              telefone: membro.telefone,
              foto: membro.foto_perfil || null
            });
          }
        }
      }
    }
    
    const membros = Array.from(membrosUnicos.values()).slice(0, 10);
    
    if (membros.length === 0) {
      container.innerHTML = '';
      return;
    }
    
    let storiesHtml = `
      <div class="story-item" onclick="abrirMeuStory()">
        <div class="story-ring">
          <div class="story-avatar">
            ${perfil.foto_perfil 
              ? '<img src="' + escapeHtml(perfil.foto_perfil) + '" alt="Seu story">'
              : '<div class="story-letra">' + (perfil.nome?.[0] || 'U').toUpperCase() + '</div>'
            }
          </div>
        </div>
        <span class="story-name">Seu story</span>
      </div>
    `;
    
    for (const membro of membros) {
      const primeiroNome = membro.nome.split(' ')[0];
      storiesHtml += `
        <div class="story-item" onclick="abrirPerfilMembro('${escapeHtml(membro.telefone)}')">
          <div class="story-ring">
            <div class="story-avatar">
              ${membro.foto 
                ? '<img src="' + escapeHtml(membro.foto) + '" alt="' + escapeHtml(membro.nome) + '">'
                : '<div class="story-letra">' + (membro.nome?.[0] || 'U').toUpperCase() + '</div>'
              }
            </div>
          </div>
          <span class="story-name">' + escapeHtml(primeiroNome) + '</span>
        </div>
      `;
    }
    
    container.innerHTML = storiesHtml;
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
      lucide.createIcons();
    }
    
  } catch (e) {
    console.error('Erro ao carregar stories:', e);
    container.innerHTML = '';
  }
}

function abrirMeuStory() {
  if (typeof mostrarToast === 'function') {
    mostrarToast('Adicione uma foto de perfil para criar o seu story');
  }
}

// Carregar trending (grupos mais populares)
async function carregarTrending() {
  const container = document.getElementById('trendingContainer');
  if (!container) return;
  
  try {
    const grupos = await KixikilaManager.carregarFeed({ estado: 'aberto', limite: 20 });
    
    if (!grupos || !grupos.length) {
      container.innerHTML = '<p style="padding:16px;text-align:center;color:var(--muted);">Sem tendencias no momento</p>';
      return;
    }
    
    const trending = [...grupos].sort((a, b) => b.membros.length - a.membros.length).slice(0, 5);
    
    let trendingHtml = '';
    for (let i = 0; i < trending.length; i++) {
      const grupo = trending[i];
      trendingHtml += `
        <div class="trending-item" onclick="abrirGrupoPorCodigo('${escapeHtml(grupo.codigo)}')">
          <div class="trending-rank">#${i + 1}</div>
          <div class="trending-info">
            <h4>${escapeHtml(grupo.nome)}</h4>
            <p>${KixikilaManager.formatarValor(grupo.valor)} KZ • ${grupo.periodicidade}</p>
          </div>
          <div class="trending-stats">${grupo.membros.length}/${grupo.max_membros} membros</div>
        </div>
      `;
    }
    
    container.innerHTML = trendingHtml;
    
  } catch (e) {
    console.error('Erro ao carregar trending:', e);
    container.innerHTML = '<p style="padding:16px;text-align:center;color:var(--muted);">Erro ao carregar tendencias</p>';
  }
}

function abrirGrupoPorCodigo(codigo) {
  if (typeof window !== 'undefined') {
    window._codigoGrupoAtual = codigo;
    if (typeof mostrarPagina === 'function') {
      mostrarPagina('VerGrupo');
      if (typeof carregarVerGrupo === 'function') {
        carregarVerGrupo(codigo);
      }
    }
  }
}

// Melhorar cards com métricas sociais
function melhorarCardsGrupos() {
  const cards = document.querySelectorAll('.feed-grupo-card, .card-grupo');
  
  for (const card of cards) {
    if (card.querySelector('.card-metrics')) continue;
    
    let codigoGrupo = card.getAttribute('data-codigo');
    if (!codigoGrupo) {
      const onclickAttr = card.getAttribute('onclick');
      if (onclickAttr) {
        const match = onclickAttr.match(/'([^']+)'/);
        if (match) codigoGrupo = match[1];
      }
    }
    
    if (!codigoGrupo) continue;
    
    if (!grupoLikes[codigoGrupo]) {
      grupoLikes[codigoGrupo] = {
        likes: Math.floor(Math.random() * 50) + 10,
        liked: false
      };
    }
    
    const likeCount = grupoLikes[codigoGrupo].likes;
    const liked = grupoLikes[codigoGrupo].liked;
    const views = Math.floor(Math.random() * 300) + 50;
    
    const metricsDiv = document.createElement('div');
    metricsDiv.className = 'card-metrics';
    metricsDiv.innerHTML = `
      <div class="metric-item" title="Visualizações">
        <i data-lucide="eye" style="width:14px;height:14px;"></i>
        <span>${views}</span>
      </div>
      <div class="metric-item like-metric" data-grupo="${escapeHtml(codigoGrupo)}" data-liked="${liked}" title="Curtir">
        <i data-lucide="heart" style="width:14px;height:14px;"></i>
        <span class="like-count">${likeCount}</span>
        <span>${liked ? 'Curtiu' : 'Curtir'}</span>
      </div>
      <div class="metric-item comment-metric" data-grupo="${escapeHtml(codigoGrupo)}" title="Comentar">
        <i data-lucide="message-circle" style="width:14px;height:14px;"></i>
        <span>Comentar</span>
      </div>
    `;
    
    card.appendChild(metricsDiv);
    
    const likeMetric = metricsDiv.querySelector('.like-metric');
    if (likeMetric) {
      likeMetric.style.cursor = 'pointer';
      likeMetric.onclick = (e) => {
        e.stopPropagation();
        handleGrupoLike(codigoGrupo, likeMetric);
      };
    }
    
    const commentMetric = metricsDiv.querySelector('.comment-metric');
    if (commentMetric) {
      commentMetric.style.cursor = 'pointer';
      commentMetric.onclick = (e) => {
        e.stopPropagation();
        if (typeof window !== 'undefined') {
          window._codigoGrupoAtual = codigoGrupo;
          if (typeof mostrarPagina === 'function') {
            mostrarPagina('Chat');
            if (typeof carregarChatGrupo === 'function') {
              carregarChatGrupo();
            }
          }
        }
      };
    }
  }
  
  if (typeof lucide !== 'undefined' && lucide.createIcons) {
    lucide.createIcons();
  }
}

// Handle like usando sistema de avaliação
function handleGrupoLike(codigoGrupo, element) {
  const sessao = KixikilaManager.getSessao();
  const perfil = sessao?.perfil;
  if (!perfil) {
    if (typeof mostrarToast === 'function') {
      mostrarToast('Faça login para curtir');
    }
    return;
  }
  
  const liked = element.getAttribute('data-liked') === 'true';
  const likeCountSpan = element.querySelector('.like-count');
  let currentLikes = parseInt(likeCountSpan.textContent, 10);
  
  if (!liked) {
    abrirModalReacao(codigoGrupo, element, currentLikes);
  } else {
    grupoLikes[codigoGrupo].liked = false;
    grupoLikes[codigoGrupo].likes--;
    likeCountSpan.textContent = grupoLikes[codigoGrupo].likes;
    element.setAttribute('data-liked', 'false');
    
    const heartIcon = element.querySelector('svg');
    if (heartIcon) {
      heartIcon.style.fill = 'none';
    }
    
    const textSpan = element.querySelector('span:last-child');
    if (textSpan) textSpan.textContent = 'Curtir';
    
    if (typeof mostrarToast === 'function') {
      mostrarToast('Like removido');
    }
  }
}

function abrirModalReacao(codigoGrupo, element, currentLikes) {
  KixikilaManager.carregarGrupo(codigoGrupo).then(grupo => {
    const modal = document.getElementById('reactionModal');
    const grupoNomeSpan = document.getElementById('reactionGrupoNome');
    
    if (grupoNomeSpan) {
      grupoNomeSpan.textContent = grupo.nome || 'este grupo';
    }
    
    const options = document.querySelectorAll('.reaction-option');
    for (const opt of options) {
      opt.onclick = () => {
        const reacao = opt.getAttribute('data-reaction');
        let estrelas = 3;
        
        switch(reacao) {
          case 'like': estrelas = 5; break;
          case 'love': estrelas = 5; break;
          case 'care': estrelas = 4; break;
          case 'haha': estrelas = 3; break;
          case 'wow': estrelas = 4; break;
          default: estrelas = 3;
        }
        
        confirmarReacao(codigoGrupo, element, currentLikes, estrelas, reacao);
        fecharModalReacao();
      };
    }
    
    if (modal) modal.classList.add('open');
    
  }).catch(() => {
    const modal = document.getElementById('reactionModal');
    if (modal) modal.classList.add('open');
  });
}

async function confirmarReacao(codigoGrupo, element, currentLikes, estrelas, reacao) {
  const sessao = KixikilaManager.getSessao();
  const perfil = sessao?.perfil;
  if (!perfil) return;
  
  try {
    const grupo = await KixikilaManager.carregarGrupo(codigoGrupo);
    const criadorTelefone = grupo.criador?.telefone;
    
    if (criadorTelefone) {
      const reacaoTexto = getReacaoTexto(reacao);
      await KixikilaManager.avaliar(
        perfil.telefone,
        criadorTelefone,
        estrelas,
        'Reagiu com ' + reacaoTexto + ' ao grupo ' + grupo.nome
      );
      
      grupoLikes[codigoGrupo].liked = true;
      grupoLikes[codigoGrupo].likes = currentLikes + 1;
      const likeCountSpan = element.querySelector('.like-count');
      if (likeCountSpan) likeCountSpan.textContent = grupoLikes[codigoGrupo].likes;
      element.setAttribute('data-liked', 'true');
      
      const heartIcon = element.querySelector('svg');
      if (heartIcon) {
        heartIcon.style.fill = '#ed4956';
        heartIcon.style.stroke = '#ed4956';
        heartIcon.style.transform = 'scale(1.3)';
        setTimeout(() => {
          heartIcon.style.transform = 'scale(1)';
        }, 200);
      }
      
      const textSpan = element.querySelector('span:last-child');
      if (textSpan) textSpan.textContent = 'Curtiu';
      
      criarEfeitoRipple(element);
      if (typeof mostrarToast === 'function') {
        mostrarToast(reacaoTexto + ' +' + estrelas + ' estrelas para o criador');
      }
    }
  } catch (e) {
    console.error('Erro ao reagir:', e);
    if (typeof mostrarToast === 'function') {
      mostrarToast('Erro ao processar reacao');
    }
  }
}

function getReacaoTexto(reacao) {
  const mapa = {
    'like': 'Curtiu',
    'love': 'Amou',
    'care': 'Apoiou',
    'haha': 'Divertido',
    'wow': 'Surpreendeu-se'
  };
  return mapa[reacao] || 'Curtiu';
}

function criarEfeitoRipple(element) {
  const rect = element.getBoundingClientRect();
  const ripple = document.createElement('div');
  ripple.className = 'like-ripple';
  ripple.innerHTML = '♥';
  ripple.style.left = (rect.left + rect.width / 2) + 'px';
  ripple.style.top = (rect.top + rect.height / 2) + 'px';
  document.body.appendChild(ripple);
  setTimeout(() => ripple.remove(), 500);
}

function fecharModalReacao() {
  const modal = document.getElementById('reactionModal');
  if (modal) modal.classList.remove('open');
}

// Double tap like
function configurarDoubleTapLike() {
  const cards = document.querySelectorAll('.feed-grupo-card, .card-grupo');
  
  for (const card of cards) {
    if (card._doubleTapHandler) {
      card.removeEventListener('click', card._doubleTapHandler);
    }
    
    let lastTap = 0;
    const handler = (e) => {
      const currentTime = new Date().getTime();
      const tapLength = currentTime - lastTap;
      
      if (tapLength < 300 && tapLength > 0) {
        e.preventDefault();
        e.stopPropagation();
        
        const likeMetric = card.querySelector('.like-metric');
        if (likeMetric) {
          likeMetric.click();
          const rect = e.target.getBoundingClientRect();
          const ripple = document.createElement('div');
          ripple.className = 'like-ripple';
          ripple.innerHTML = '♥';
          ripple.style.left = (rect.left + rect.width / 2) + 'px';
          ripple.style.top = (rect.top + rect.height / 2) + 'px';
          document.body.appendChild(ripple);
          setTimeout(() => ripple.remove(), 500);
        }
      }
      lastTap = currentTime;
    };
    
    card.addEventListener('click', handler);
    card._doubleTapHandler = handler;
  }
}

// Scroll to top
function configurarScrollToTop() {
  const btn = document.getElementById('scrollTopBtn');
  if (!btn) return;
  
  const container = document.querySelector('.dashboard-content');
  if (!container) return;
  
  const onScroll = () => {
    if (container.scrollTop > 300) {
      btn.classList.add('show');
    } else {
      btn.classList.remove('show');
    }
  };
  
  container.addEventListener('scroll', onScroll);
  
  btn.onclick = () => {
    container.scrollTo({ top: 0, behavior: 'smooth' });
  };
}

// Escape HTML para segurança
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Inicializar features sociais
setTimeout(function() {
  if (typeof configurarScrollToTop === 'function') {
    configurarScrollToTop();
  }
}, 500);

// Expor funções globalmente
window.carregarStories = carregarStories;
window.carregarTrending = carregarTrending;
window.melhorarCardsGrupos = melhorarCardsGrupos;
window.configurarDoubleTapLike = configurarDoubleTapLike;
window.configurarScrollToTop = configurarScrollToTop;
window.fecharModalReacao = fecharModalReacao;
window.handleGrupoLike = handleGrupoLike;
window.abrirGrupoPorCodigo = abrirGrupoPorCodigo;
window.abrirMeuStory = abrirMeuStory;