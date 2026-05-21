/**
 * C-Lab ENI — Configurazione Globale
 * Costanti, API keys, limiti normativi e parametri MCDA
 */

const CONFIG = {
  // ─── API Gemini ────────────────────────────────────────────────────────────
  GEMINI_API_KEY:  "AIzaSyAYH7OQdjiMdTcl0xdOMvoq2qZ-05j1y8E",
  GEMINI_MODEL:    "gemini-2.5-flash",
  GEMINI_ENDPOINT: "https://generativelanguage.googleapis.com/v1beta/models/",

  // ─── Sito Industriale ──────────────────────────────────────────────────────
  SITE_NAME:   "Enilive Venezia — Porto Marghera",
  SITE_COORDS: [45.4526, 12.2384],   // Raffineria Eni Venezia
  SITE_RADIUS_KM: 3,
  MAP_ZOOM: 14,

  // ─── Limiti Normativi SNPA 268/2025 (ppb) ─────────────────────────────────
  SNPA_LIMITS: {
    H2S:  { ok: 3,   warning: 5,   alarm: 10  },   // Idrogeno Solforato
    VOC:  { ok: 150, warning: 200, alarm: 400 },   // Composti Organici Volatili (come toluene)
    NH3:  { ok: 70,  warning: 100, alarm: 200 },   // Ammoniaca
    OU:   { ok: 1,   warning: 5,   alarm: 10  }    // Odour Units (EN 13725)
  },

  // ─── Pesi MCDA Scientifici ─────────────────────────────────────────────────
  MCDA_WEIGHTS: {
    compliance:        0.40,   // Compliance & Safety
    performance:       0.25,   // Performance Tecnica
    interoperabilita:  0.20,   // Interoperabilità
    economia:          0.15    // Sostenibilità Economica
  },

  // ─── Bonus Score MCDA ─────────────────────────────────────────────────────
  MCDA_BONUS: {
    pid_mos_combo:     0.5,    // PID + MOS combinati: copertura spettro completa
    dispersion_ready:  0.5     // Integrazione CALPUFF / AERMOD
  },

  // ─── Range di Mercato (normalizzazione TOPSIS) ─────────────────────────────
  MARKET_RANGES: {
    lod_ppb:         { min: 0.0001, max: 500 },   // più basso = meglio
    range_ppb:       { min: 0,      max: 50000 },  // più alto = meglio
    response_time_s: { min: 1,      max: 300 },    // più basso = meglio
    capex_eur:       { min: 500,    max: 30000 },  // più basso = meglio
    opex_annual_eur: { min: 100,    max: 5000 }    // più basso = meglio
  },

  // ─── Aggiornamento Dati Simulati ───────────────────────────────────────────
  UPDATE_INTERVAL_MS: 8000,    // Intervallo aggiornamento grafico (8s)
  HISTORY_POINTS:     60,      // Punti storico grafici

  // ─── Colori ENI Corporate ──────────────────────────────────────────────────
  ENI_COLORS: {
    blue:     '#003399',
    yellow:   '#F9D100',
    grey:     '#4A5568',
    darkBg:   '#0A0E1A',
    surface:  '#111827',
    surface2: '#1F2937',
    green:    '#10B981',
    amber:    '#F59E0B',
    red:      '#EF4444'
  }
};

// ─── Sensori Demo Pre-caricati (Proof of Concept) ─────────────────────────────
const DEMO_SENSORS = [
  {
    id: 'demo-001',
    name: 'Ion Science Falco',
    manufacturer: 'Ion Science Ltd',
    technology: ['PID'],
    lod_ppb: 0.001,
    range_ppb: { min: 0, max: 20 },
    range_unit: 'ppm isobutilene',
    response_time_sec: 1.5,
    atex_certified: true,
    atex_zone: 'Zone 1 & 2 (ATEX II 2G Ex ib IIC T4)',
    snpa_compliant: true,
    uni_en_13725_compliant: true,
    protocols: ['MQTT', 'Modbus RTU', '4-20mA'],
    lorawan_ready: true,
    capex_eur: 8500,
    opex_annual_eur: 1200,
    calpuff_ready: true,
    pid_mos_combo: false,
    notes: 'Photoionization detector di alta precisione. Standard per VOC in ambienti ATEX. Ionizzazione a lampada UV 10.6 eV.',
    source: 'demo'
  },
  {
    id: 'demo-002',
    name: 'Oizom Odosense',
    manufacturer: 'Oizom Instruments Pvt. Ltd.',
    technology: ['MOS', 'EC'],
    lod_ppb: 5,
    range_ppb: { min: 0, max: 1000 },
    range_unit: 'ppb OU equivalenti',
    response_time_sec: 30,
    atex_certified: false,
    atex_zone: null,
    snpa_compliant: false,
    uni_en_13725_compliant: false,
    protocols: ['MQTT', 'API REST'],
    lorawan_ready: true,
    capex_eur: 1800,
    opex_annual_eur: 400,
    calpuff_ready: false,
    pid_mos_combo: false,
    notes: 'Array di sensori MOS (Metal Oxide Semiconductor) + EC per misura multi-gas. Non certificato ATEX: idoneo solo per aree sicure.',
    source: 'demo'
  },
  {
    id: 'demo-003',
    name: 'Membrapor H2S-C/200',
    manufacturer: 'Membrapor AG',
    technology: ['EC'],
    lod_ppb: 0.1,
    range_ppb: { min: 0, max: 200 },
    range_unit: 'ppb H₂S',
    response_time_sec: 15,
    atex_certified: true,
    atex_zone: 'Zone 0, 1, 2 (ATEX II 1/2G Ex iaIIC T6)',
    snpa_compliant: true,
    uni_en_13725_compliant: true,
    protocols: ['Modbus RTU', '4-20mA', 'Modbus TCP'],
    lorawan_ready: false,
    capex_eur: 3200,
    opex_annual_eur: 650,
    calpuff_ready: true,
    pid_mos_combo: false,
    notes: 'Cella elettrochimica (EC) specializzata H₂S ad alta selettività. IZone 0 certificata — adatta per spazi confinati raffineria.',
    source: 'demo'
  }
];

// Esporta su window global (no ES modules per compatibilità browser locale)
window.CONFIG = CONFIG;
window.DEMO_SENSORS = DEMO_SENSORS;
