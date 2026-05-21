/**
 * C-Lab ENI — Correlazione Segnalazioni Cittadini
 * Algoritmo: incrocio picco sensore ± 15min con direzione vento → impatto
 */

const CitizenCheck = (() => {

  // ─── Stato segnalazione ───────────────────────────────────────────────
  let activeReport = null;

  // ─── Fonti emissive note ───────────────────────────────────────────────
  const EMISSION_SOURCES = [
    { id: 'src-1', name: 'Unità Topping T-101',     compound: 'H2S',  coords: [44.416, 12.221], category: 'Distillazione' },
    { id: 'src-2', name: 'Vasca TAS — Area C',      compound: 'NH3',  coords: [44.412, 12.224], category: 'Trattamento Acque' },
    { id: 'src-3', name: 'Serbatoi Stoccaggio N02', compound: 'VOC',  coords: [44.418, 12.226], category: 'Stoccaggio' },
    { id: 'src-4', name: 'Flare Stack F-01',        compound: 'H2S',  coords: [44.415, 12.230], category: 'Combustione' },
    { id: 'src-5', name: 'Hydrotreater HT-2',       compound: 'VOC',  coords: [44.413, 12.218], category: 'Trattamento' }
  ];

  // ─── Calcola distanza e angolo tra due coordinate ──────────────────────
  function haversineDistance(c1, c2) {
    const R   = 6371000;
    const φ1  = c1[0] * Math.PI / 180;
    const φ2  = c2[0] * Math.PI / 180;
    const Δφ  = (c2[0] - c1[0]) * Math.PI / 180;
    const Δλ  = (c2[1] - c1[1]) * Math.PI / 180;
    const a   = Math.sin(Δφ/2)**2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }

  function angleBetween(from, to) {
    const dy = to[0] - from[0];
    const dx = to[1] - from[1];
    let angle = Math.atan2(dx, dy) * 180 / Math.PI;
    if (angle < 0) angle += 360;
    return angle;
  }

  // ─── Calcola probabilità impatto basata su:
  //     - Eccedenza parametri al timestamp
  //     - Direzione vento verso area segnalazione
  //     - Distanza dalla sorgente
  function calcCorrelationScore(reading, windState, citizenLocation, sourceLocation) {
    const LIMITS = CONFIG.SNPA_LIMITS;
    let score = 0;

    // 1. Eccedenza parametri (max 40 punti)
    if (reading.H2S > LIMITS.H2S.warning) score += Math.min(20, (reading.H2S / LIMITS.H2S.warning) * 10);
    if (reading.VOC > LIMITS.VOC.warning) score += Math.min(10, (reading.VOC / LIMITS.VOC.warning) * 5);
    if (reading.NH3 > LIMITS.NH3.warning) score += Math.min(10, (reading.NH3 / LIMITS.NH3.warning) * 5);

    // 2. Allineamento vento → cittadino (max 35 punti)
    const windDir   = windState.direction;  // direzione verso cui soffia il vento
    const angleToC  = angleBetween(sourceLocation, citizenLocation);
    const angleDiff = Math.abs(windDir - angleToC);
    const normDiff  = Math.min(angleDiff, 360 - angleDiff); // 0-180

    // Più è allineato, più punti
    const windAlignment = Math.max(0, 35 * (1 - normDiff / 90));
    score += windAlignment;

    // 3. Distanza dalla fonte (max 25 punti)
    const dist = haversineDistance(sourceLocation, citizenLocation);
    // Distanza ottimale di trasporto: 500-2000m
    let distScore = 0;
    if (dist < 300)        distScore = 5;   // troppo vicino, improbabile dispersione
    else if (dist < 800)   distScore = 25;  // alta probabilità
    else if (dist < 2000)  distScore = 18;  // media probabilità
    else if (dist < 5000)  distScore = 8;   // bassa probabilità
    else                   distScore = 2;
    score += distScore;

    return Math.min(100, Math.round(score));
  }

  // ─── Determina Livello Correlazione ──────────────────────────────────
  function getCorrelationLevel(score) {
    if (score >= 70) return { level: 'ALTA',   cls: 'high',   icon: '', msg: 'Correlazione altamente probabile' };
    if (score >= 45) return { level: 'MEDIA',  cls: 'medium', icon: '', msg: 'Correlazione possibile' };
    return              { level: 'BASSA',  cls: 'low',    icon: '', msg: 'Correlazione improbabile' };
  }

  // ─── Identifica Composto Predominante ────────────────────────────────
  function getDominantCompound(reading) {
    const LIMITS = CONFIG.SNPA_LIMITS;
    const ratios = {
      H2S: reading.H2S / LIMITS.H2S.warning,
      VOC: reading.VOC / LIMITS.VOC.warning,
      NH3: reading.NH3 / LIMITS.NH3.warning
    };
    const dominant = Object.keys(ratios).reduce((a,b) => ratios[a] > ratios[b] ? a : b);
    return { compound: dominant, ratio: ratios[dominant], value: reading[dominant] };
  }

  // ─── Run analisi correlazione completa ────────────────────────────────
  async function runCorrelationAnalysis(citizenCoords, timestamp, notes) {
    activeReport = { citizenCoords, timestamp, notes };

    // Lettura sensori al momento della segnalazione
    const reading  = ChartsModule.getHistoryAtTimestamp(timestamp);
    const wind     = HeatmapModule.getWindState();
    const dominant = getDominantCompound(reading);

    // Analizza ogni fonte emissiva
    const sourceAnalysis = EMISSION_SOURCES
      .filter(src => src.compound === dominant.compound || dominant.ratio > 1.5)
      .map(src => {
        const score = calcCorrelationScore(reading, wind, citizenCoords, src.coords);
        const dist  = Math.round(haversineDistance(src.coords, citizenCoords));
        return { ...src, score, dist };
      })
      .sort((a, b) => b.score - a.score);

    const topSource = sourceAnalysis[0];
    const corr      = getCorrelationLevel(topSource?.score || 0);

    // Richiedi remediation all'AI
    let remediation = null;
    try {
      remediation = await AIConsultant.getRemediation(
        dominant.compound,
        Math.round(dominant.value),
        wind.dirLabel
      );
    } catch (_) {
      remediation = getDefaultRemediation(dominant.compound);
    }

    return {
      timestamp: new Date(timestamp).toLocaleString('it-IT'),
      reading,
      dominant,
      wind,
      topSource,
      sourceAnalysis: sourceAnalysis.slice(0, 3),
      correlation: corr,
      remediation,
      citizenCoords
    };
  }

  // ─── Remediation di fallback (offline) ───────────────────────────────
  function getDefaultRemediation(compound) {
    const remediations = {
      H2S: {
        fonte_probabile: 'Probabile: Unità Topping o sistema di trattamento solfuri — H₂S da processo distillazione greggio',
        metodi_abbattimento: [
          { nome: 'Scrubber Alcalino NaOH', icona: '', descrizione: 'Assorbimento H₂S in soluzione NaOH 15% — efficace per emissioni puntuali', efficienza: '90-98%', priorita: 'URGENTE' },
          { nome: 'Torcia di sicurezza (Flare)', icona: '', descrizione: 'Combustione controllata del gas — smaltimento emergenziale', efficienza: '99%', priorita: 'URGENTE' },
          { nome: 'Biolavatore (Bioscrubber)', icona: '', descrizione: 'Degradazione biologica H₂S mediante Thiobacillus — basso consumo energetico', efficienza: '80-95%', priorita: 'ALTA' }
        ],
        azioni_immediate: ['Verificare tenuta valvole unità di distillazione', 'Attivare protocollo allerta ARPA e Comune', 'Ridurre carico unità Topping del 20%'],
        normativa_applicabile: 'SNPA 268/2025 art. 7 — D.Lgs 152/2006 Parte V'
      },
      VOC: {
        fonte_probabile: 'Probabile: Serbatoi di stoccaggio grezzo — evaporazione VOC per effetto termico (breathing losses)',
        metodi_abbattimento: [
          { nome: 'Tetto Galleggiante Interno (IFR)', icona: '', descrizione: 'Riduce le emissioni di breathing losses nei serbatoi a tetto fisso', efficienza: '85-95%', priorita: 'ALTA' },
          { nome: 'Recupero Vapori (VRU)', icona: '', descrizione: 'Sistema di recupero vapori ad adsorbimento su carbone attivo — valore recuperato', efficienza: '95-99%', priorita: 'ALTA' },
          { nome: 'Ossidazione Termica Rigenerativa (RTO)', icona: '', descrizione: 'Combustione termica ad alta efficienza energetica per VOC', efficienza: '98-99%', priorita: 'MEDIA' }
        ],
        azioni_immediate: ['Verificare pressione serbatoi e stato sigilli', 'Ridurre temperature di stoccaggio se possibile', 'Notificare ARPA con dati sensori puntatori'],
        normativa_applicabile: 'SNPA 268/2025 — Direttiva VOC 1999/13/CE — D.Lgs 152/2006'
      },
      NH3: {
        fonte_probabile: 'Probabile: Vasca trattamento acque (TAS) o sistema refrigerazione — NH₃ da decomposizione biologica o perdita circuito frigorifero',
        metodi_abbattimento: [
          { nome: 'Aerazione Forzata + Copertura', icona: '', descrizione: 'Confinamento vasche TAS con copertura rigida e aspirazione forzata verso scrubber', efficienza: '80-90%', priorita: 'ALTA' },
          { nome: 'Scrubber Acido H₂SO₄', icona: '', descrizione: 'Neutralizzazione NH₃ con acido solforico in torre di lavaggio', efficienza: '90-95%', priorita: 'URGENTE' },
          { nome: 'Biofiltro', icona: '', descrizione: 'Degradazione biologica NH₃ su materiale organico — soluzione a lungo termine', efficienza: '75-90%', priorita: 'MEDIA' }
        ],
        azioni_immediate: ['Verificare perdite circuito frigorifero', 'Controllare pH vasche TAS (ottimale 6.5-7.5)', 'Aumentare frequenza areazione vasche'],
        normativa_applicabile: 'SNPA 268/2025 — D.Lgs 152/2006 All. I Parte V'
      }
    };
    return remediations[compound] || remediations.VOC;
  }

  function renderResult(result, containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;

    const { correlation, dominant, wind, topSource, reading, remediation, sourceAnalysis } = result;

    const sourceRows = sourceAnalysis.map((s, i) => `
      <div class="remed-item" style="margin-bottom:8px">
        <div>
          <div class="remed-title">${s.name} — <span style="color:${s.score > 60 ? '#ef4444' : s.score > 40 ? '#f59e0b' : '#10b981'}">${s.score}% correlazione</span></div>
          <div class="remed-desc">${s.category} | Distanza: ${s.dist}m | Composto: ${s.compound}</div>
        </div>
      </div>
    `).join('');

    const remItems = (remediation?.metodi_abbattimento || []).map(m => `
      <div class="remed-item">
        <div>
          <div class="remed-title">${m.nome} <span class="badge badge-${m.priorita === 'URGENTE' ? 'alarm' : m.priorita === 'ALTA' ? 'warning' : 'info'}">${m.priorita}</span></div>
          <div class="remed-desc">${m.descrizione}</div>
          <div class="remed-eff" style="color:var(--status-ok)">✓ Efficienza: ${m.efficienza}</div>
        </div>
      </div>
    `).join('');

    el.innerHTML = `
      <div class="correlation-result">
        <div class="correlation-header">
          <div>
            <div class="correlation-level ${correlation.cls}">Correlazione ${correlation.level}</div>
            <div style="font-size:0.8rem;color:var(--text-muted)">${correlation.msg} — Score: ${topSource?.score || 0}/100</div>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
          <div class="spec-item">
            <div class="spec-label">Composto Dominante</div>
            <div class="spec-value" style="color:var(--status-alarm)">${dominant.compound}</div>
            <div style="font-size:0.72rem;color:var(--text-muted)">${dominant.value.toFixed(2)} ppb (${(dominant.ratio*100).toFixed(0)}% soglia)</div>
          </div>
          <div class="spec-item">
            <div class="spec-label">Vento al Timestamp</div>
            <div class="spec-value">${wind.dirLabel} ${wind.speed.toFixed(1)} m/s</div>
            <div style="font-size:0.72rem;color:var(--text-muted)">Dir. ${Math.round(wind.direction)}° — ${result.timestamp}</div>
          </div>
        </div>

        ${topSource ? `
        <div style="font-size:0.75rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted);margin-bottom:8px">Fonti Analizzate</div>
        ${sourceRows}
        ` : ''}

        ${remediation ? `
        <div class="divider"></div>
        <div style="font-size:0.75rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted);margin-bottom:4px">Fonte Probabile</div>
        <div style="font-size:0.82rem;color:var(--text-secondary);margin-bottom:12px;padding:8px;background:var(--bg-surface-2);border-radius:8px">${remediation.fonte_probabile}</div>

        <div style="font-size:0.75rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted);margin-bottom:8px">Metodi di Abbattimento</div>
        ${remItems}

        <div class="divider"></div>
        <div style="font-size:0.75rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted);margin-bottom:8px">Azioni Immediate</div>
        ${(remediation.azioni_immediate || []).map((a,i) => `
          <div style="display:flex;gap:8px;align-items:flex-start;margin-bottom:6px;font-size:0.82rem">
            <span style="color:var(--status-alarm);font-weight:700;flex-shrink:0">${i+1}.</span>
            <span>${a}</span>
          </div>
        `).join('')}

        <div style="font-size:0.7rem;color:var(--text-muted);margin-top:8px;padding:6px 10px;background:var(--bg-surface-3);border-radius:6px">
          Normativa: ${remediation.normativa_applicabile}
        </div>
        ` : ''}
      </div>
    `;
  }

  return {
    runCorrelationAnalysis,
    renderResult,
    getDefaultRemediation
  };
})();

window.CitizenCheck = CitizenCheck;
