l// ============================================
// GRUPO — Ver Grupo, Chat, Pagamento, Avaliação
// ============================================

var _codigoGrupoAtual = '';

function abrirGrupo(codigo) {
    _codigoGrupoAtual = codigo;
    mostrarPagina('VerGrupo');
    carregarVerGrupo(codigo);
}

async function carregarVerGrupo(codigo) {
    try {
        const grupo  = await KixikilaManager.carregarGrupo(codigo);
        const sessao = KixikilaManager.getSessao();
        const perfil = sessao?.perfil;

        document.getElementById('verGrupoTitulo').textContent = grupo.nome;
        document.getElementById('verGrupoValor').textContent  =
            KixikilaManager.formatarValor(grupo.valor) + ' KZ / ' + grupo.periodicidade;
        document.getElementById('verGrupoEstado').textContent =
            grupo.estado === 'aberto' ? 'Aberto — a aceitar membros' : 'Grupo completo';
        document.getElementById('verGrupoCodigo').textContent = codigo;

        const membroAtual = grupo.membros.find(m => m.ordem === grupo.ordem_atual);
        document.getElementById('verGrupoOrdem').textContent = membroAtual
            ? `★ Ronda ${grupo.ordem_atual}/${grupo.membros.length} — A receber: ${membroAtual.nome}`
            : `Ronda ${grupo.ordem_atual}/${grupo.membros.length}`;

        const lista = document.getElementById('listaMembros');
        lista.innerHTML = '';
        grupo.membros.sort((a, b) => a.ordem - b.ordem).forEach(m => {
            const eAtual   = m.ordem === grupo.ordem_atual;
            const eProprio = m.telefone === perfil?.telefone;
            const div      = document.createElement('div');
            div.className  = 'membro-card' + (eAtual ? ' atual' : '') + (eProprio ? ' proprio' : '');
            div.style.cursor = 'pointer';
            div.onclick = () => abrirPerfilMembro(m.telefone);
            div.innerHTML  = `
                <div class="membro-avatar">${m.nome[0].toUpperCase()}</div>
                <div class="membro-info">
                    <h4>${m.nome}${eProprio ? ' <small style="color:var(--r)">tu</small>' : ''}</h4>
                    <small>${m.telefone}${eAtual ? ' &bull; ★ A receber' : ''}</small>
                </div>
                <span class="membro-status ${m.pago ? 'status-pago' : eAtual ? 'status-recebe' : 'status-pendente'}">
                    ${m.pago ? 'PAGO' : eAtual ? 'RECEBE' : 'PENDENTE'}
                </span>`;
            lista.appendChild(div);
        });
    } catch (e) {
        mostrarModal('Erro', 'Não foi possível carregar o grupo.');
    }
}

async function registarPagamento() {
    const sessao = KixikilaManager.getSessao();
    const perfil = sessao?.perfil;
    if (!perfil) return;
    
    mostrarModalConfirmar(
        'Confirmar pagamento',
        'Confirmas que efectuaste o pagamento desta ronda?',
        async () => {
            try {
                const res = await KixikilaManager.registarPagamento(_codigoGrupoAtual, perfil.telefone);
                if (res.todosPagaram) {
                    mostrarModal('Ronda concluída!', 'Todos os membros pagaram. A próxima ronda começa agora!');
                } else {
                    mostrarToast('Pagamento registado!');
                }
                carregarVerGrupo(_codigoGrupoAtual);
            } catch (e) {
                mostrarModal('Erro', e.message);
            }
        }
    );
}

function copiarCodigo() {
    navigator.clipboard.writeText(_codigoGrupoAtual).then(() => {
        mostrarToast('Código copiado!');
    });
}

function partilharGrupo() {
    const msg = `Entra no meu grupo Kixikila!\nCódigo: ${_codigoGrupoAtual}\n\nAcede em: https://plataformakixikila.vercel.app`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`);
}

function abrirChat() {
    mostrarPagina('Chat');
    carregarChatGrupo();
}

async function carregarChatGrupo() {
    try {
        const grupo  = await KixikilaManager.carregarGrupo(_codigoGrupoAtual);
        const sessao = KixikilaManager.getSessao();
        const perfil = sessao?.perfil;

        document.getElementById('chatNomeGrupo').textContent   = grupo.nome;
        document.getElementById('chatMembrosCount').textContent = grupo.membros.length + ' membros';

        const container = document.getElementById('chatMensagens');
        const mensagens = grupo.mensagens || [];

        if (!mensagens.length) {
            container.innerHTML = '<p style="text-align:center;color:var(--muted);padding:40px">Sem mensagens ainda.</p>';
            return;
        }

        container.innerHTML = '';
        mensagens.forEach(msg => {
            const meu  = msg.telefone === perfil?.telefone;
            const wrap = document.createElement('div');
            wrap.className = 'chat-balao-wrap ' + (meu ? 'meu' : 'outro');
            wrap.innerHTML = `
                ${!meu ? `<span class="chat-autor">${msg.nome}</span>` : ''}
                <div class="chat-balao ${meu ? 'meu' : 'outro'}">${msg.texto}</div>
                <span class="chat-data">${(msg.data || '').replace('T', ' ').slice(0, 16)}</span>`;
            container.appendChild(wrap);
        });
        container.scrollTop = container.scrollHeight;
    } catch (e) {}
}

async function enviarMensagem() {
    const texto  = document.getElementById('etMensagem').value.trim();
    const sessao = KixikilaManager.getSessao();
    const perfil = sessao?.perfil;
    if (!texto || !perfil) return;
    document.getElementById('etMensagem').value = '';
    try {
        await KixikilaManager.enviarMensagem(
            _codigoGrupoAtual, perfil.telefone, perfil.nome, texto
        );
        carregarChatGrupo();
    } catch (e) {
        mostrarModal('Erro', 'Não foi possível enviar a mensagem.');
    }
}

function abrirMembrosChat() {
    voltarGrupo();
}

function abrirAvaliacao() {
    KixikilaManager.carregarGrupo(_codigoGrupoAtual).then(grupo => {
        const sessao = KixikilaManager.getSessao();
        const perfil = sessao?.perfil;
        const outros = grupo.membros.filter(m => m.telefone !== perfil?.telefone);

        if (!outros.length) {
            mostrarModal('Sem membros', 'Não há outros membros para avaliar.'); return;
        }

        const sel = document.getElementById('selMembro');
        sel.innerHTML = outros.map(m => `<option value="${m.telefone}">${m.nome}</option>`).join('');

        _estrelasAvaliacao = 0;
        const wrap = document.getElementById('estrelasWrap');
        wrap.innerHTML = '';
        [1,2,3,4,5].forEach(n => {
            const btn = document.createElement('button');
            btn.className  = 'estrela-btn';
            btn.textContent = '★';
            btn.onclick     = () => {
                _estrelasAvaliacao = n;
                wrap.querySelectorAll('.estrela-btn').forEach((b, i) => {
                    b.classList.toggle('on', i < n);
                });
            };
            wrap.appendChild(btn);
        });

        document.getElementById('modalAvaliacao').style.display = 'flex';
    });
}

function fecharModalAvaliacao() {
    document.getElementById('modalAvaliacao').style.display = 'none';
}

async function confirmarAvaliacao() {
    if (!_estrelasAvaliacao) {
        mostrarToast('Selecciona as estrelas'); return;
    }
    const sessao  = KixikilaManager.getSessao();
    const perfil  = sessao?.perfil;
    const avaliado = document.getElementById('selMembro').value;
    fecharModalAvaliacao();
    try {
        const rep = await KixikilaManager.avaliar(perfil.telefone, avaliado, _estrelasAvaliacao, '');
        mostrarModal('Avaliação guardada!',
            `Reputação actualizada: ${KixikilaManager.reputacaoEstrelas(rep)} — ${KixikilaManager.reputacaoTexto(rep)}`);
    } catch (e) {
        mostrarModal('Erro', e.message);
    }
}

function voltarGrupo() {
    mostrarPagina('VerGrupo');
    carregarVerGrupo(_codigoGrupoAtual);
}