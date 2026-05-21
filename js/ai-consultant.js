/**
 * C-Lab ENI — AI Consultant
 * Integrazione Gemini 2.0 Flash per analisi NLP dei sensori odorigeni
 */

const AIConsultant = (() => {

  const API_KEY    = CONFIG.GEMINI_API_KEY;
  const MODEL      = CONFIG.GEMINI_MODEL;
  const ENDPOINT   = `${CONFIG.GEMINI_ENDPOINT}${MODEL}:generateContent?key=${API_KEY}`;

  // ─── Prompt Engineering ──────────────────────────────────────────────
  function buildSensorPrompt(sensorName) {
    return `Sei un esperto tecnico senior specializzato in sensori per il monitoraggio odorigeno industriale, con competenze nella normativa ATEX (Direttiva 2014/34/EU), SNPA 268/2025 e UNI EN 13725. Stai supportando il progetto C-Lab di ENI per la valutazione di sensori da installare in una raffineria con aree ATEX Zone 1.

Utilizza il tool di Google Search Grounding a tua disposizione per fare una ricerca in tempo reale sul web, reperendo schede tecniche aggiornate e dati reali sul sensore. Dai la massima priorità alla ricerca di dati reali.

Analizza il sensore "${sensorName}" e restituisci ESCLUSIVAMENTE un oggetto JSON valido (senza markdown, senza testo aggiuntivo, senza backtick) con questa struttura esatta:

{
  "name": "nome commerciale esatto del sensore",
  "manufacturer": "nome del produttore",
  "technology": ["PID"|"MOS"|"EC"|"FID"|"NDIR"|"Lidar"|"Fotometrico"],
  "lod_ppb": <numero float - limite di rilevamento in ppb>,
  "range_ppb": {"min": 0, "max": <numero intero>},
  "range_unit": "unità di misura del range (es. ppb isobutilene, ppb H2S)",
  "response_time_sec": <numero intero in secondi>,
  "atex_certified": <true|false>,
  "atex_zone": "<zona ATEX es. 'Zone 1 & 2 (ATEX II 2G Ex ib IIC T4)'> o null",
  "snpa_compliant": <true|false - compatibile con delibera SNPA 268/2025>,
  "uni_en_13725_compliant": <true|false - conforme UNI EN 13725>,
  "protocols": ["MQTT"|"Modbus RTU"|"Modbus TCP"|"API REST"|"4-20mA"|"SDI-12"|"OPC-UA"|"Profibus"],
  "lorawan_ready": <true|false>,
  "capex_eur": <numero intero stima prezzo acquisto in EUR>,
  "opex_annual_eur": <numero intero stima manutenzione annuale in EUR>,
  "calpuff_ready": <true|false - dati esportabili per CALPUFF/AERMOD>,
  "pid_mos_combo": <true|false - usa sia PID che MOS>,
  "notes": "breve nota tecnica in italiano (max 200 caratteri) sul punto di forza principale"
}

Se non conosci esattamente il sensore "${sensorName}", fornisci stime tecnicamente plausibili basate su sensori simili dello stesso produttore o della stessa categoria tecnologica, indicando nelle note che i dati sono stimati. Non lasciare mai campi null tranne atex_zone se non ATEX.`;
  }

  function buildRemediationPrompt(compound, concentration, windDir) {
    return `Sei un esperto di ingegneria ambientale per raffinerie petrolifere (normativa italiana ed europea).

Il sensore ha rilevato ${compound} a ${concentration} ppb con vento proveniente da ${windDir}.
Il superamento della soglia SNPA 268/2025 è confermato.

Restituisci ESCLUSIVAMENTE un JSON valido:
{
  "fonte_probabile": "descrizione breve della fonte emissiva più probabile in raffineria",
  "metodi_abbattimento": [
    {
      "nome": "nome del metodo",
      "icona": "emoji",
      "descrizione": "descrizione tecnica breve (max 120 char)",
      "efficienza": "percentuale riduzione tipica (es. 85-95%)",
      "priorita": "URGENTE|ALTA|MEDIA"
    }
  ],
  "azioni_immediate": ["azione 1 immediata", "azione 2 immediata"],
  "normativa_applicabile": "riferimento normativo principale"
}`;
  }

  // ─── Chiamata API Gemini ─────────────────────────────────────────────
  async function callGemini(prompt, isJSON = true) {
    const body = {
      contents: [{ parts: [{ text: prompt }] }],
      tools: [{ googleSearch: {} }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 2048,
        ...(isJSON && { responseMimeType: 'application/json' })
      },
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT",        threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_HATE_SPEECH",       threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
      ]
    };

    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Gemini API error ${res.status}: ${err.error?.message || res.statusText}`);
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!text) throw new Error('Risposta AI vuota');
    return text;
  }

  // ─── Parse JSON dalla risposta ────────────────────────────────────────
  function parseJSON(text) {
    // Rimuove eventuali backtick o markdown rimasti
    let cleaned = text
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim();

    // Trova il primo { e l'ultimo }
    const start = cleaned.indexOf('{');
    const end   = cleaned.lastIndexOf('}');
    if (start !== -1 && end !== -1) {
      cleaned = cleaned.substring(start, end + 1);
    }

    return JSON.parse(cleaned);
  }

  // ─── Analizza Sensore ─────────────────────────────────────────────────
  async function analyzeSensor(sensorName) {
    let sensorData = null;
    try {
      const prompt = buildSensorPrompt(sensorName);
      const rawText = await callGemini(prompt, true);
      sensorData = parseJSON(rawText);
    } catch (error) {
      console.warn("Gemini API fallback for analyzeSensor:", error);
      if (sensorName.toLowerCase().includes('hack') || sensorName.toLowerCase().includes('lange')) {
        sensorData = {
          name: "Hach Lange Amtax sc",
          manufacturer: "Hach",
          technology: ["EC"],
          lod_ppb: 10,
          range_ppb: { min: 0, max: 2000 },
          range_unit: "ppb NH3",
          response_time_sec: 300,
          atex_certified: true,
          atex_zone: "Zone 2",
          snpa_compliant: true,
          uni_en_13725_compliant: false,
          protocols: ["Modbus RTU", "4-20mA"],
          lorawan_ready: false,
          capex_eur: 4500,
          opex_annual_eur: 800,
          calpuff_ready: true,
          pid_mos_combo: false,
          notes: "Sensore di riferimento per ammoniaca (NH3). Modalità offline attivata."
        };
      } else {
        throw error;
      }
    }

    // Aggiunge metadata
    sensorData.id = 'sensor-' + Date.now();
    sensorData.added_at = new Date().toISOString();
    sensorData.source = 'ai_generated';

    // Sanity check e default
    sensorData.technology = Array.isArray(sensorData.technology) ? sensorData.technology : [sensorData.technology || 'N/D'];
    sensorData.protocols  = Array.isArray(sensorData.protocols)  ? sensorData.protocols  : [];
    sensorData.range_ppb  = sensorData.range_ppb || { min: 0, max: 1000 };
    sensorData.lod_ppb    = parseFloat(sensorData.lod_ppb) || 1;
    sensorData.response_time_sec = parseInt(sensorData.response_time_sec) || 30;
    sensorData.capex_eur  = parseInt(sensorData.capex_eur)  || 3000;
    sensorData.opex_annual_eur = parseInt(sensorData.opex_annual_eur) || 600;

    // Booleanizzazione
    ['atex_certified','snpa_compliant','uni_en_13725_compliant','lorawan_ready','calpuff_ready','pid_mos_combo'].forEach(k => {
      sensorData[k] = Boolean(sensorData[k]);
    });

    return sensorData;
  }

  // ─── Suggerisci Remediation ───────────────────────────────────────────
  async function getRemediation(compound, concentration, windDir) {
    const prompt = buildRemediationPrompt(compound, concentration, windDir);
    const text = await callGemini(prompt, true);
    return parseJSON(text);
  }

  // ─── Genera Narrativa per Report ──────────────────────────────────────
  async function generateReportNarrative(sensors, siteInfo) {
    const sensorList = sensors.map((s, i) =>
      `${i+1}. ${s.name} (${s.manufacturer}): score MCDA ${s.mcda_scores.total}/10, ATEX: ${s.atex_certified ? 'Sì' : 'NO ⚠️'}, LOD: ${s.lod_ppb} ppb`
    ).join('\n');

    const prompt = `Sei un consulente tecnico che redige il rapporto UNI EN 13725 Allegato 1 per il progetto C-Lab ENI.

Sito: ${siteInfo.name}
Coordinate: ${siteInfo.coords.join(', ')}
Data: ${new Date().toLocaleDateString('it-IT')}

Sensori analizzati:
${sensorList}

Redigi in italiano il "Paragrafo 3 - Analisi e Valutazione" del rapporto (max 300 parole), con tono tecnico-scientifico, citando la delibera SNPA 268/2025, UNI EN 13725 e la Direttiva ATEX. Giustifica la scelta del sensore con score più alto. Output: solo testo senza JSON.`;

    return await callGemini(prompt, false);
  }

  // ─── Chat risposta generica ───────────────────────────────────────────
  async function chat(message, context) {
    const sensorContext = context && context.length > 0
      ? `\n\nSensori attualmente in valutazione:\n${context.map(s => `- ${s.name}: score ${s.mcda_scores?.total || 'N/D'}/10`).join('\n')}`
      : '';

    const prompt = `Sei ARIA (Advanced Rating Intelligence Assistant), l'AI consulente del progetto C-Lab ENI per il monitoraggio odorigeno industriale. Sei esperta di: sensori odorigeni, normativa ATEX, SNPA 268/2025, UNI EN 13725, protocolli IoT industriali (MQTT, Modbus, LoRaWAN), modelli dispersione CALPUFF/AERMOD.${sensorContext}

Messagio utente: "${message}"

Rispondi in italiano, con tono professionale ma accessibile. Se l'utente menziona il nome di un sensore, suggerisci di usare il pulsante "Analizza" o scrivilo nella chat con il prefisso "analizza:". Max 200 parole.`;

    try {
      return await callGemini(prompt, false);
    } catch (error) {
      console.warn("Gemini API fallback for chat:", error);
      const msgLower = message.toLowerCase();
      if (msgLower.includes('hack') || msgLower.includes('lange')) {
        return "Ciao! Non riesco a collegarmi ai server in questo momento, ma conosco il sensore Hach Lange. È un ottimo analizzatore per l'ammoniaca (NH3). Clicca per aggiungerlo: analizza: Hack Lange";
      }
      return "Siamo offline o c'è un problema con le API Gemini. Se vuoi provare la demo offline, dimmi di analizzare 'Hack Lange'.";
    }
  }

  return {
    analyzeSensor,
    getRemediation,
    generateReportNarrative,
    chat
  };
})();

window.AIConsultant = AIConsultant;
