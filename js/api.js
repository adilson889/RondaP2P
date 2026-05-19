/**
 * KixikilaManager.js — Versão Web (PWA)
 * Comunicação com a API Vercel + Cache Local (localStorage)
 * Convertido de: KixikilaManager.kt
 */

const KixikilaManager = (() => {
    const BASE_URL = "https://sire-kixikila-api.vercel.app/";

    // ── CACHE LOCAL (localStorage) ──────────────────────────────
    function salvarGrupoLocal(codigo, grupo) {
        localStorage.setItem(`grupo_${codigo}`, JSON.stringify(grupo));
    }

    function carregarGrupoLocal(codigo) {
        const json = localStorage.getItem(`grupo_${codigo}`);
        return json ? JSON.parse(json) : null;
    }

    function salvarMeusGrupos(codigos) {
        localStorage.setItem("meus_grupos", JSON.stringify(codigos));
    }

    function carregarMeusGrupos() {
        const json = localStorage.getItem("meus_grupos");
        return json ? JSON.parse(json) : [];
    }

    function salvarPerfilLocal(perfil) {
        localStorage.setItem("perfil_kixikila", JSON.stringify(perfil));
    }

    function carregarPerfilLocal() {
        const json = localStorage.getItem("perfil_kixikila");
        return json ? JSON.parse(json) : null;
    }

    function marcarPerfilComoVisto(telefone) {
        localStorage.setItem(`visto_${telefone}`, "true");
    }

    function perfilJaVisto(telefone) {
        return localStorage.getItem(`visto_${telefone}`) === "true";
    }

    // ── API CALLS ──────────────────────────────────────────────

    /**
     * Sincroniza o perfil do utilizador com o servidor.
     * Equivalente a: sincronizarPerfil() no Kotlin
     */
    async function sincronizarPerfil(telefone, nome, genero, cor) {
        const resposta = await fetch(`${BASE_URL}perfil`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ telefone, nome, genero, cor })
        });
        if (!resposta.ok) throw new Error(`Erro no servidor: ${resposta.status}`);
        const dados = await resposta.json();
        salvarPerfilLocal(dados.perfil || dados);
        return dados;
    }

    /**
     * Carrega o perfil de um membro (apenas uma vez).
     * Equivalente a: carregarPerfil() no Kotlin
     */
    async function carregarPerfil(telefone) {
        if (perfilJaVisto(telefone)) {
            throw new Error("view_once");
        }
        const resposta = await fetch(`${BASE_URL}perfil/${telefone.replace(/\+/g, "")}`);
        if (!resposta.ok) throw new Error("Não encontrado");
        const perfil = await resposta.json();
        marcarPerfilComoVisto(telefone);
        return perfil;
    }

    /**
     * Cria um novo grupo de poupança.
     * Equivalente a: criarGrupo() no Kotlin
     */
    async function criarGrupo(nome, telefone, nomeAdmin, valor, frequencia, maxMembros) {
        const resposta = await fetch(`${BASE_URL}grupo/criar`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nome, telefone, nomeAdmin, valor, periodicidade: frequencia, maxMembros })
        });
        if (!resposta.ok) {
            const erro = await resposta.text();
            throw new Error(`Erro ${resposta.status}: ${erro}`);
        }
        const dados = await resposta.json();
        const codigo = dados.codigo;
        
        // Guardar na lista de meus grupos
        const meus = carregarMeusGrupos();
        if (!meus.includes(codigo)) {
            meus.push(codigo);
            salvarMeusGrupos(meus);
        }
        return codigo;
    }

    /**
     * Carrega os dados de um grupo (online ou cache local).
     * Equivalente a: carregarGrupo() no Kotlin
     */
    async function carregarGrupo(codigo) {
        try {
            const resposta = await fetch(`${BASE_URL}grupo/${codigo}`);
            if (resposta.ok) {
                const grupo = await resposta.json();
                salvarGrupoLocal(codigo, grupo);
                return grupo;
            }
        } catch (erro) {
            console.warn("Offline, a carregar da cache local...");
        }
        // Fallback para cache local
        const local = carregarGrupoLocal(codigo);
        if (local) return local;
        throw new Error("Grupo não encontrado");
    }

    /**
     * Entra num grupo existente.
     * Equivalente a: entrarGrupo() no Kotlin
     */
    async function entrarGrupo(codigo, telefone, nomeUsuario) {
        const resposta = await fetch(`${BASE_URL}grupo/${codigo}/entrar`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ telefone, nome: nomeUsuario })
        });
        if (!resposta.ok) {
            const erro = await resposta.json();
            throw new Error(erro.erro || "Código inválido ou grupo cheio");
        }
        const dados = await resposta.json();
        
        // Guardar na lista de meus grupos
        const meus = carregarMeusGrupos();
        if (!meus.includes(codigo)) {
            meus.push(codigo);
            salvarMeusGrupos(meus);
        }
        return codigo;
    }

    /**
     * Regista o pagamento de um membro.
     * Equivalente a: registarPagamento() no Kotlin
     */
    async function registarPagamento(codigo, telefone) {
        const resposta = await fetch(`${BASE_URL}grupo/${codigo}/pagar`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ telefone })
        });
        if (!resposta.ok) throw new Error("Erro ao registar pagamento");
        const dados = await resposta.json();
        return {
            todosPagaram: dados.todos_pagaram || false,
            proximo: dados.proximo || 1
        };
    }

    /**
     * Envia uma mensagem no chat do grupo.
     * Equivalente a: enviarMensagem() no Kotlin
     */
    async function enviarMensagem(codigo, telefone, nome, texto) {
        const resposta = await fetch(`${BASE_URL}grupo/${codigo}/mensagem`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ telefone, nome, texto })
        });
        if (!resposta.ok) throw new Error("Erro ao enviar mensagem");
    }

    /**
     * Avalia um membro do grupo.
     * Equivalente a: avaliar() no Kotlin
     */
    async function avaliar(avaliador, avaliado, estrelas, comentario) {
        const resposta = await fetch(`${BASE_URL}avaliar`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ avaliador, avaliado, estrelas, comentario })
        });
        if (!resposta.ok) throw new Error("Erro ao avaliar");
        const dados = await resposta.json();
        return dados.reputacao || 0.0;
    }

    // ── UTILITÁRIOS ────────────────────────────────────────────

    function reputacaoTexto(reputacao) {
        if (reputacao >= 4.5) return "Excelente";
        if (reputacao >= 3.5) return "Confiável";
        if (reputacao >= 2.5) return "Regular";
        if (reputacao >= 1.5) return "Fraco";
        if (reputacao > 0) return "Novo";
        return "Sem avaliações";
    }

    function reputacaoEstrelas(reputacao) {
        const cheias = Math.floor(reputacao);
        return "★".repeat(cheias) + "☆".repeat(5 - cheias);
    }

    function formatarValor(valor) {
        return new Intl.NumberFormat('pt-AO').format(valor);
    }

    // ── API PÚBLICA ────────────────────────────────────────────
    return {
        salvarGrupoLocal,
        carregarGrupoLocal,
        salvarMeusGrupos,
        carregarMeusGrupos,
        salvarPerfilLocal,
        carregarPerfilLocal,
        marcarPerfilComoVisto,
        perfilJaVisto,
        sincronizarPerfil,
        carregarPerfil,
        criarGrupo,
        carregarGrupo,
        entrarGrupo,
        registarPagamento,
        enviarMensagem,
        avaliar,
        reputacaoTexto,
        reputacaoEstrelas,
        formatarValor
    };
})();