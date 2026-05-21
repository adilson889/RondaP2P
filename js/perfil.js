// ============================================
// PERFIL — O Meu Perfil
// ============================================

function abrirPerfil() {
    if (typeof mostrarPagina === 'function') {
        mostrarPagina('Perfil');
    }
    carregarDadosPerfil();
}

function carregarDadosPerfil() {
    const sessao = KixikilaManager.getSessao();
    if (!sessao) return;
    const perfil = sessao.perfil;

    const perfilNome = document.getElementById('perfilNome');
    const perfilTelefone = document.getElementById('perfilTelefone');
    const editNome = document.getElementById('editNome');
    const perfilReputacao = document.getElementById('perfilReputacao');
    
    if (perfilNome) perfilNome.textContent = perfil.nome || '';
    if (perfilTelefone) perfilTelefone.textContent = perfil.telefone || '';
    if (editNome) editNome.value = perfil.nome || '';

    const reputacao = perfil.reputacao || 0;
    if (perfilReputacao) {
        perfilReputacao.textContent = reputacao > 0
            ? KixikilaManager.reputacaoEstrelas(reputacao) + '  ' + KixikilaManager.reputacaoTexto(reputacao)
            : 'Sem avaliações';
    }

    const img = document.getElementById('perfilFotoImg');
    const letra = document.getElementById('perfilFotoLetra');
    
    if (perfil.foto_perfil && img) {
        img.src = perfil.foto_perfil;
        img.style.display = 'block';
        if (letra) letra.style.display = 'none';
    } else if (letra) {
        letra.textContent = (perfil.nome?.[0] || 'K').toUpperCase();
        letra.style.display = 'flex';
        if (img) img.style.display = 'none';
    }

    // Carregar stats da API
    KixikilaManager.carregarStats(perfil.telefone).then(stats => {
        const statGrupos = document.getElementById('statGrupos');
        const statAvaliacoes = document.getElementById('statAvaliacoes');
        if (statGrupos) statGrupos.textContent = stats.grupos_activos || 0;
        if (statAvaliacoes) statAvaliacoes.textContent = stats.total_avaliacoes || 0;
    }).catch(() => {
        const statGrupos = document.getElementById('statGrupos');
        const statAvaliacoes = document.getElementById('statAvaliacoes');
        if (statGrupos) statGrupos.textContent = '0';
        if (statAvaliacoes) statAvaliacoes.textContent = '0';
    });
    
    // Carregar resumo de avaliações
    carregarResumoAvaliacoes();
}

async function guardarPerfil() {
    const sessao = KixikilaManager.getSessao();
    if (!sessao) return;
    const perfil = sessao.perfil;

    const nomeInput = document.getElementById('editNome');
    const senhaInput = document.getElementById('editSenha');
    
    const nome = nomeInput ? nomeInput.value.trim() : '';
    const senha = senhaInput ? senhaInput.value.trim() : '';

    if (!nome) {
        if (typeof mostrarModal === 'function') {
            mostrarModal('Campo obrigatório', 'O nome não pode estar vazio.');
        }
        return;
    }

    try {
        const atualizado = await KixikilaManager.atualizarPerfil({
            telefone: perfil.telefone,
            nome: nome,
            senha: senha || undefined
        });
        
        if (typeof mostrarToast === 'function') {
            mostrarToast('Perfil actualizado!');
        }
        
        carregarDadosPerfil();
    } catch (e) {
        console.error('Erro ao atualizar perfil:', e);
        if (typeof mostrarModal === 'function') {
            mostrarModal('Erro', e.message);
        }
    }
}

// ============================================
// RESUMO DE AVALIAÇÕES (usando stats)
// ============================================

async function carregarResumoAvaliacoes() {
    const container = document.getElementById('minhasAvaliacoesLista');
    if (!container) return;
    
    const sessao = KixikilaManager.getSessao();
    const perfil = sessao?.perfil;
    if (!perfil) return;
    
    try {
        const stats = await KixikilaManager.carregarStats(perfil.telefone);
        const totalAvaliacoes = stats.total_avaliacoes || 0;
        const reputacao = perfil.reputacao || 0;
        
        if (totalAvaliacoes === 0) {
            container.innerHTML = '<p style="color:var(--muted);text-align:center;padding:16px;">Nenhuma avaliação recebida ainda.</p>';
            return;
        }
        
        const estrelas = KixikilaManager.reputacaoEstrelas(reputacao);
        const texto = KixikilaManager.reputacaoTexto(reputacao);
        
        container.innerHTML = `
            <div class="resumo-avaliacoes">
                <div class="resumo-nota">
                    <span class="resumo-valor">${reputacao.toFixed(1)}</span>
                    <span class="resumo-estrelas">${estrelas}</span>
                    <span class="resumo-texto">${texto}</span>
                </div>
                <div class="resumo-total">
                    Baseado em ${totalAvaliacoes} avaliação${totalAvaliacoes !== 1 ? 'ões' : ''}
                </div>
            </div>
        `;
        
    } catch (e) {
        console.error('Erro ao carregar resumo de avaliações:', e);
        container.innerHTML = '<p style="color:var(--muted);text-align:center;padding:16px;">Erro ao carregar avaliações.</p>';
    }
}

// ============================================
// NOTIFICAÇÕES
// ============================================

async function carregarNotificacoes() {
    const container = document.getElementById('notificacoesLista');
    if (!container) return;
    
    const sessao = KixikilaManager.getSessao();
    const perfil = sessao?.perfil;
    if (!perfil) return;
    
    try {
        const notificacoes = await KixikilaManager.carregarNotificacoes();
        const lista = notificacoes.notificacoes || [];
        
        if (!lista.length) {
            container.innerHTML = '<p style="color:var(--muted);text-align:center;padding:16px;">Nenhuma notificação.</p>';
            return;
        }
        
        container.innerHTML = '';
        for (const notif of lista) {
            const div = document.createElement('div');
            div.className = 'notificacao-item ' + (notif.lida ? 'lida' : 'nao-lida');
            div.setAttribute('data-id', notif.id);
            div.onclick = () => {
                if (!notif.lida) {
                    marcarNotificacaoLida(notif.id);
                }
            };
            div.innerHTML = `
                <div class="notificacao-icon"><i data-lucide="${getNotificacaoIcon(notif.tipo)}"></i></div>
                <div class="notificacao-conteudo">
                    <div class="notificacao-mensagem">${escapeHtml(notif.mensagem)}</div>
                    <div class="notificacao-data">${formatarDataAvaliacao(notif.criada_em)}</div>
                </div>
                ${!notif.lida ? '<div class="notificacao-badge"></div>' : ''}
            `;
            container.appendChild(div);
        }
        
        if (typeof lucide !== 'undefined' && lucide.createIcons) {
            lucide.createIcons();
        }
        
        const badge = document.getElementById('notificacoesBadge');
        if (badge) {
            const naoLidas = lista.filter(n => !n.lida).length;
            badge.textContent = naoLidas > 0 ? naoLidas : '';
            badge.style.display = naoLidas > 0 ? 'flex' : 'none';
        }
        
    } catch (e) {
        console.error('Erro ao carregar notificações:', e);
        container.innerHTML = '<p style="color:var(--muted);text-align:center;padding:16px;">Erro ao carregar notificações.</p>';
    }
}

function getNotificacaoIcon(tipo) {
    const icones = {
        'avaliacao': 'star',
        'pagamento': 'credit-card',
        'receber': 'wallet',
        'nova_ronda': 'refresh-cw',
        'grupo_encerrado': 'flag',
        'convite': 'mail',
        'removido': 'user-x',
        'membro_saiu': 'log-out',
        'novo_membro': 'user-plus'
    };
    return icones[tipo] || 'bell';
}

async function marcarNotificacaoLida(id) {
    try {
        await KixikilaManager.marcarNotificacaoLida(id);
        const item = document.querySelector(`.notificacao-item[data-id="${id}"]`);
        if (item) {
            item.classList.remove('nao-lida');
            item.classList.add('lida');
            const badge = item.querySelector('.notificacao-badge');
            if (badge) badge.remove();
        }
        
        const badgeGlobal = document.getElementById('notificacoesBadge');
        if (badgeGlobal) {
            const naoLidas = document.querySelectorAll('.notificacao-item.nao-lida').length;
            badgeGlobal.textContent = naoLidas > 0 ? naoLidas : '';
            badgeGlobal.style.display = naoLidas > 0 ? 'flex' : 'none';
        }
    } catch (e) {
        console.error('Erro ao marcar notificação como lida:', e);
    }
}

function abrirNotificacoes() {
    if (typeof mostrarPagina === 'function') {
        mostrarPagina('Notificacoes');
    }
    carregarNotificacoes();
}

// ============================================
// AVALIAÇÃO DIRECTA
// ============================================

function abrirAvaliacaoDireta(telefone, nome) {
    window._telefoneAvaliacaoDireta = telefone;
    window._nomeAvaliacaoDireta = nome;
    
    const avalNome = document.getElementById('avalDiretaNome');
    if (avalNome) avalNome.textContent = nome;
    
    window._estrelasAvaliacao = 0;
    const wrap = document.getElementById('estrelasWrapDireta');
    if (!wrap) return;
    
    wrap.innerHTML = '';
    for (let i = 1; i <= 5; i++) {
        const btn = document.createElement('button');
        btn.className = 'estrela-btn';
        btn.textContent = '★';
        btn.onclick = (function(n) {
            return function() {
                window._estrelasAvaliacao = n;
                const btns = wrap.querySelectorAll('.estrela-btn');
                for (let j = 0; j < btns.length; j++) {
                    btns[j].classList.toggle('on', j < n);
                }
            };
        })(i);
        wrap.appendChild(btn);
    }
    
    const overlay = document.getElementById('overlayAvaliacaoDireta');
    if (overlay) overlay.style.display = 'flex';
}

function fecharAvaliacaoDireta() {
    const overlay = document.getElementById('overlayAvaliacaoDireta');
    if (overlay) overlay.style.display = 'none';
    window._estrelasAvaliacao = 0;
    
    const comentario = document.getElementById('comentarioAvaliacao');
    if (comentario) comentario.value = '';
}

async function confirmarAvaliacaoDireta() {
    if (!window._estrelasAvaliacao) {
        if (typeof mostrarToast === 'function') {
            mostrarToast('Seleccione uma classificação');
        }
        return;
    }
    
    const sessao = KixikilaManager.getSessao();
    const perfil = sessao?.perfil;
    if (!perfil) return;
    
    const comentarioInput = document.getElementById('comentarioAvaliacao');
    const comentario = comentarioInput ? comentarioInput.value.trim() : '';
    
    try {
        await KixikilaManager.avaliar(
            perfil.telefone, 
            window._telefoneAvaliacaoDireta, 
            window._estrelasAvaliacao, 
            comentario
        );
        
        fecharAvaliacaoDireta();
        
        if (typeof mostrarToast === 'function') {
            mostrarToast('Avaliação enviada!');
        }
        
        if (typeof abrirPerfilMembro === 'function') {
            abrirPerfilMembro(window._telefoneAvaliacaoDireta);
        }
        
        carregarDadosPerfil();
        
    } catch (e) {
        console.error('Erro ao enviar avaliação:', e);
        if (typeof mostrarToast === 'function') {
            mostrarToast(e.message);
        }
    }
}

// ============================================
// UTILITÁRIOS
// ============================================

function formatarDataAvaliacao(dataStr) {
    if (!dataStr) return 'Data desconhecida';
    try {
        const data = new Date(dataStr);
        return data.toLocaleDateString('pt-AO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch (e) {
        return dataStr;
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================
// INICIALIZAR NOTIFICAÇÕES NO TOPO
// ============================================

function adicionarBadgeNotificacoes() {
    const topnav = document.querySelector('.topnav');
    if (!topnav) return;
    
    if (document.getElementById('notificacoesBtn')) return;
    
    const btnNotif = document.createElement('button');
    btnNotif.id = 'notificacoesBtn';
    btnNotif.className = 'btn-icon';
    btnNotif.setAttribute('onclick', 'abrirNotificacoes()');
    btnNotif.style.position = 'relative';
    btnNotif.innerHTML = '<i data-lucide="bell"></i>';
    
    const badge = document.createElement('span');
    badge.id = 'notificacoesBadge';
    badge.style.cssText = `
        position: absolute;
        top: -4px;
        right: -4px;
        background: #ed4956;
        color: white;
        font-size: 10px;
        font-weight: bold;
        min-width: 16px;
        height: 16px;
        border-radius: 50%;
        display: none;
        align-items: center;
        justify-content: center;
        padding: 0 4px;
    `;
    btnNotif.appendChild(badge);
    
    const avatar = topnav.querySelector('.topnav-avatar');
    if (avatar) {
        topnav.insertBefore(btnNotif, avatar);
    } else {
        topnav.appendChild(btnNotif);
    }
    
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
        lucide.createIcons();
    }
    
    setTimeout(() => {
        carregarNotificacoes();
    }, 1000);
}

if (typeof window !== 'undefined') {
    const originalCarregarDashboard = window.carregarDashboard;
    if (originalCarregarDashboard) {
        window.carregarDashboard = async function() {
            await originalCarregarDashboard();
            setTimeout(adicionarBadgeNotificacoes, 500);
        };
    }
}

// Expor funções globalmente
window.carregarResumoAvaliacoes = carregarResumoAvaliacoes;
window.carregarNotificacoes = carregarNotificacoes;
window.abrirNotificacoes = abrirNotificacoes;
window.marcarNotificacaoLida = marcarNotificacaoLida;
window.fecharAvaliacaoDireta = fecharAvaliacaoDireta;
window.confirmarAvaliacaoDireta = confirmarAvaliacaoDireta;
window.abrirAvaliacaoDireta = abrirAvaliacaoDireta;