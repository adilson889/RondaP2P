// ── moeda.js — Detecção de país e moeda por GPS ──────────────

const PAISES_LUSOFONIA = {
  AO: { nome: 'Angola',     moeda: 'KZ',  simbolo: 'KZ',  locale: 'pt-AO', regioes: [] },
  BR: { nome: 'Brasil',     moeda: 'BRL', simbolo: 'R$',  locale: 'pt-BR', regioes: [] },
  PT: { nome: 'Portugal',   moeda: 'EUR', simbolo: '€',   locale: 'pt-PT', regioes: [] },
  MZ: { nome: 'Moçambique', moeda: 'MZN', simbolo: 'MT',  locale: 'pt-MZ', regioes: [] },
  CV: { nome: 'Cabo Verde', moeda: 'CVE', simbolo: 'ECV', locale: 'pt-CV', regioes: [] },
  ST: { nome: 'São Tomé',   moeda: 'STN', simbolo: 'Db',  locale: 'pt-ST', regioes: [] },
  GW: { nome: 'Guiné-Bissau', moeda: 'XOF', simbolo: 'CFA', locale: 'pt-GW', regioes: [] },
  TL: { nome: 'Timor-Leste', moeda: 'USD', simbolo: '$',  locale: 'pt-TL', regioes: [] },
};

// País activo — começa com Angola por defeito
let _paisAtivo = PAISES_LUSOFONIA['AO'];

// Retorna o símbolo da moeda activa
function getMoeda() {
  return _paisAtivo.simbolo;
}

// Retorna o país activo completo
function getPais() {
  return _paisAtivo;
}

// Formata valor com a moeda correcta
function formatarMoeda(valor) {
  if (!valor && valor !== 0) return '—';
  try {
    return new Intl.NumberFormat(_paisAtivo.locale).format(valor) + ' ' + _paisAtivo.simbolo;
  } catch {
    return valor.toLocaleString() + ' ' + _paisAtivo.simbolo;
  }
}

// Define país manualmente (chamado no registo)
function definirPais(codigoPais) {
  const p = PAISES_LUSOFONIA[codigoPais];
  if (p) {
    _paisAtivo = p;
    try { localStorage.setItem('kx_pais', codigoPais); } catch (_) {}
  }
}

// Carrega país guardado (chamado no init)
function carregarPaisGuardado() {
  try {
    const cod = localStorage.getItem('kx_pais');
    if (cod && PAISES_LUSOFONIA[cod]) {
      _paisAtivo = PAISES_LUSOFONIA[cod];
      return true;
    }
  } catch (_) {}
  return false;
}

// Detecta país por GPS usando reverse geocoding gratuito
async function detectarPaisPorGPS() {
  // Se já tem país guardado, usa esse
  if (carregarPaisGuardado()) return _paisAtivo;

  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(_paisAtivo); // fallback Angola
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          // Usa nominatim (OpenStreetMap) — gratuito, sem API key
          const url = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=pt`;
          const r = await fetch(url, {
            headers: { 'Accept-Language': 'pt' }
          });
          const dados = await r.json();
          const codigoPais = dados?.address?.country_code?.toUpperCase();

          if (codigoPais && PAISES_LUSOFONIA[codigoPais]) {
            definirPais(codigoPais);
          }
          // Se país não é lusófono, mantém Angola por defeito
          resolve(_paisAtivo);
        } catch {
          resolve(_paisAtivo);
        }
      },
      () => resolve(_paisAtivo), // recusou GPS — mantém Angola
      { timeout: 5000, maximumAge: 60 * 60 * 1000 } // cache GPS 1 hora
    );
  });
}

// Inicializa automaticamente quando o script carrega
(async function initMoeda() {
  await detectarPaisPorGPS();
  // Dispara evento para quem precisar reagir
  window.dispatchEvent(new CustomEvent('moedaCarregada', { detail: _paisAtivo }));
})();