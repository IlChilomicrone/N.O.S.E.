/**
 * C-Lab ENI — Motore MCDA (Multi-Criteria Decision Analysis)
 * Algoritmo TOPSIS con pesi scientifici per la valutazione dei sensori odorigeni
 * Delibera SNPA 268/2025 | UNI EN 13725 | ATEX Directive 2014/34/EU
 */

const MCDAEngine = (() => {

  // ─── Definizione Criteri e Pesi ──────────────────────────────────────────
  const WEIGHTS = CONFIG.MCDA_WEIGHTS;
  const BONUS   = CONFIG.MCDA_BONUS;

  // ─── Calcolo Sub-score: Compliance & Safety (40%) ─────────────────────
  function calcComplianceScore(sensor) {
    let score = 0;
    const weights = { atex: 0.45, snpa: 0.35, uni: 0.20 };

    // ATEX Certification (peso 45%)
    if (sensor.atex_certified) {
      let atexScore = 8.0;
      if (sensor.atex_zone) {
        if (sensor.atex_zone.includes('Zone 0')) atexScore = 10.0;       // Massima (spazi confinati)
        else if (sensor.atex_zone.includes('Zone 1')) atexScore = 9.5;   // Alta (aree pericolose)
        else if (sensor.atex_zone.includes('Zone 2')) atexScore = 8.5;   // Media (aree normali)
      }
      score += atexScore * weights.atex;
    } else {
      // NO ATEX → RISCHIO ALTO, ma contribuisce 0
      score += 0 * weights.atex;
    }

    // SNPA 268/2025 Compliance (peso 35%)
    score += (sensor.snpa_compliant ? 10 : 2) * weights.snpa;

    // UNI EN 13725 (peso 20%)
    score += (sensor.uni_en_13725_compliant ? 10 : 1) * weights.uni;

    return Math.min(10, parseFloat(score.toFixed(2)));
  }

  // ─── Calcolo Sub-score: Performance Tecnica (25%) ─────────────────────
  function calcPerformanceScore(sensor) {
    const ranges = CONFIG.MARKET_RANGES;

    // LOD — più basso è meglio (normalizzazione inversa logaritmica)
    let lodScore = 10;
    if (sensor.lod_ppb > 0) {
      // Con scala log: LOD 0.001 → 10, LOD 1 → 7.5, LOD 100 → 4, LOD 500 → 1
      const logMin = Math.log10(ranges.lod_ppb.min);
      const logMax = Math.log10(ranges.lod_ppb.max);
      const logVal = Math.log10(sensor.lod_ppb);
      lodScore = 10 - 9 * ((logVal - logMin) / (logMax - logMin));
      lodScore = Math.max(1, Math.min(10, lodScore));
    }

    // Range di rilevamento — più alto è meglio
    const maxRange = sensor.range_ppb ? sensor.range_ppb.max : 0;
    const rangeScore = Math.min(10, 1 + 9 * (maxRange / ranges.range_ppb.max));

    // Tempo di risposta — più basso è meglio
    const respTime = sensor.response_time_sec || 60;
    let timeScore;
    if (respTime <= 2)   timeScore = 10;
    else if (respTime <= 5)  timeScore = 9;
    else if (respTime <= 15) timeScore = 7.5;
    else if (respTime <= 30) timeScore = 6;
    else if (respTime <= 60) timeScore = 4;
    else if (respTime <= 120) timeScore = 2.5;
    else timeScore = 1;

    // Tecnologia utilizzata (bonus per tecnologie avanzate)
    let techBonus = 0;
    const tech = sensor.technology || [];
    if (tech.includes('PID')) techBonus += 0.5;   // PID: eccellente per VOC
    if (tech.includes('EC'))  techBonus += 0.3;   // EC: selettiva, accurata
    if (tech.includes('FID')) techBonus += 0.6;   // FID: gold standard aromatics
    if (tech.includes('MOS')) techBonus += 0.0;   // MOS: meno selettiva
    if (sensor.pid_mos_combo) techBonus += 0.5;   // Combo PID+MOS: full spectrum

    // Pesi interni: LOD 40%, Range 30%, Tempo 30%
    const rawScore = lodScore * 0.40 + rangeScore * 0.30 + timeScore * 0.30;
    return Math.min(10, parseFloat((rawScore + techBonus).toFixed(2)));
  }

  // ─── Calcolo Sub-score: Interoperabilità (20%) ─────────────────────────
  function calcInteroperabilityScore(sensor) {
    const protocols = sensor.protocols || [];
    let score = 0;

    // Protocolli industriali (max 7.5 punti)
    if (protocols.some(p => p.toLowerCase().includes('mqtt')))     score += 2.0;
    if (protocols.some(p => p.toLowerCase().includes('modbus')))   score += 2.0;
    if (protocols.some(p => p.toLowerCase().includes('api rest') || p.toLowerCase().includes('rest'))) score += 1.5;
    if (protocols.some(p => p.toLowerCase().includes('4-20ma')))   score += 0.5;
    if (protocols.some(p => p.toLowerCase().includes('modbus tcp'))) score += 0.5;
    if (protocols.some(p => p.toLowerCase().includes('opc')))      score += 0.5;

    // LoRaWAN ready (aggiuntivo, priorità ENI) — 2 punti
    if (sensor.lorawan_ready) score += 2.0;

    // Bonus integrazione modelli dispersione
    if (sensor.calpuff_ready) score += BONUS.dispersion_ready;

    // Numero totale protocolli (molteplicità = 0.2 per protocollo, max 0.8)
    const protoCount = protocols.length;
    score += Math.min(0.8, protoCount * 0.2);

    return Math.min(10, parseFloat(score.toFixed(2)));
  }

  // ─── Calcolo Sub-score: Sostenibilità Economica (15%) ──────────────────
  function calcEconomyScore(sensor) {
    const ranges = CONFIG.MARKET_RANGES;

    // CAPEX: più basso è meglio
    const capex = sensor.capex_eur || 5000;
    let capexScore;
    if (capex < 1000)       capexScore = 10;
    else if (capex < 3000)  capexScore = 8.5;
    else if (capex < 6000)  capexScore = 7;
    else if (capex < 10000) capexScore = 5.5;
    else if (capex < 15000) capexScore = 4;
    else if (capex < 20000) capexScore = 2.5;
    else                    capexScore = 1;

    // OPEX annuo: più basso è meglio
    const opex = sensor.opex_annual_eur || 1000;
    let opexScore;
    if (opex < 300)       opexScore = 10;
    else if (opex < 600)  opexScore = 8.5;
    else if (opex < 1000) opexScore = 7;
    else if (opex < 2000) opexScore = 5;
    else if (opex < 3000) opexScore = 3;
    else                  opexScore = 1;

    // TCO 5 anni = CAPEX + OPEX*5 (normalizzato)
    const tco = capex + opex * 5;
    let tcoScore;
    if (tco < 5000)        tcoScore = 10;
    else if (tco < 10000)  tcoScore = 8;
    else if (tco < 20000)  tcoScore = 6;
    else if (tco < 35000)  tcoScore = 4;
    else if (tco < 50000)  tcoScore = 2.5;
    else                   tcoScore = 1;

    // Pesi: CAPEX 35%, OPEX 35%, TCO 30%
    const score = capexScore * 0.35 + opexScore * 0.35 + tcoScore * 0.30;
    return Math.min(10, parseFloat(score.toFixed(2)));
  }

  // ─── Calcolo Score Totale Ponderato + TOPSIS ──────────────────────────
  function calcTotalScore(subscores) {
    let total =
      subscores.compliance       * WEIGHTS.compliance       +
      subscores.performance      * WEIGHTS.performance      +
      subscores.interoperabilita * WEIGHTS.interoperabilita +
      subscores.economia         * WEIGHTS.economia;

    return Math.min(10, parseFloat(total.toFixed(2)));
  }

  // ─── Calcolo TOPSIS Closeness (ranking relativo) ──────────────────────
  function calcTOPSIS(sensors) {
    if (!sensors || sensors.length === 0) return sensors;

    const criteria = ['compliance', 'performance', 'interoperabilita', 'economia'];
    const wts = [WEIGHTS.compliance, WEIGHTS.performance, WEIGHTS.interoperabilita, WEIGHTS.economia];

    // 1. Matrice normalizzata (Euclidean norm)
    const norms = criteria.map((c, ci) => {
      const sum = sensors.reduce((acc, s) => acc + Math.pow(s.mcda_scores[c], 2), 0);
      return Math.sqrt(sum) || 1;
    });

    const normalized = sensors.map(s => ({
      id: s.id,
      vals: criteria.map((c, ci) => s.mcda_scores[c] / norms[ci])
    }));

    // 2. Matrice pesata
    const weighted = normalized.map(s => ({
      id: s.id,
      vals: s.vals.map((v, i) => v * wts[i])
    }));

    // 3. Soluzioni ideale A+ e anti-ideale A-
    const aPlus  = criteria.map((_, i) => Math.max(...weighted.map(s => s.vals[i])));
    const aMinus = criteria.map((_, i) => Math.min(...weighted.map(s => s.vals[i])));

    // 4. Distanze
    const distances = weighted.map(s => {
      const dPlus  = Math.sqrt(s.vals.reduce((acc, v, i) => acc + Math.pow(v - aPlus[i],  2), 0));
      const dMinus = Math.sqrt(s.vals.reduce((acc, v, i) => acc + Math.pow(v - aMinus[i], 2), 0));
      const closeness = (dPlus + dMinus) > 0 ? dMinus / (dPlus + dMinus) : 0;
      return { id: s.id, closeness };
    });

    // Aggiorna closeness su ogni sensore
    sensors.forEach(s => {
      const d = distances.find(d => d.id === s.id);
      if (d) s.topsis_closeness = parseFloat(d.closeness.toFixed(4));
    });

    return sensors;
  }

  // ─── Valutazione Singolo Sensore ──────────────────────────────────────
  function evaluateSensor(sensor) {
    const subscores = {
      compliance:       calcComplianceScore(sensor),
      performance:      calcPerformanceScore(sensor),
      interoperabilita: calcInteroperabilityScore(sensor),
      economia:         calcEconomyScore(sensor)
    };

    // Bonus: PID+MOS combo
    if (sensor.pid_mos_combo) {
      subscores.performance = Math.min(10, subscores.performance + BONUS.pid_mos_combo);
    }

    const total = calcTotalScore(subscores);

    // Flag RISCHIO ALTO se non ATEX
    const highRisk = !sensor.atex_certified;

    return {
      ...sensor,
      mcda_scores: {
        ...subscores,
        total
      },
      high_risk: highRisk,
      topsis_closeness: 0  // calcolato dopo con TOPSIS su tutto il set
    };
  }

  // ─── Valuta e Ordina Lista Sensori ─────────────────────────────────────
  function rankSensors(sensors) {
    // 1. Calcola subscores per tutti
    let evaluated = sensors.map(s => evaluateSensor(s));

    // 2. Applica TOPSIS per closeness relativo
    evaluated = calcTOPSIS(evaluated);

    // 3. Ordina per score totale (TOPSIS closeness come tie-breaker)
    evaluated.sort((a, b) => {
      const diff = b.mcda_scores.total - a.mcda_scores.total;
      if (Math.abs(diff) < 0.05) return b.topsis_closeness - a.topsis_closeness;
      return diff;
    });

    // 4. Assegna ranking
    evaluated.forEach((s, i) => { s.ranking = i + 1; });

    return evaluated;
  }

  // ─── Genera Giustificazione Tecnica (per Report ARPA) ─────────────────
  function generateJustification(sensor) {
    const s = sensor.mcda_scores;
    const lines = [];

    lines.push(`Il sensore ${sensor.name} di ${sensor.manufacturer} ha ottenuto un punteggio MCDA complessivo di ${s.total}/10.`);

    // Compliance
    if (sensor.atex_certified) {
      lines.push(`✅ ATEX certificato (${sensor.atex_zone || 'Zone 1/2'}): conforme alla Direttiva ATEX 2014/34/EU per ambienti potenzialmente esplosivi. Score compliance: ${s.compliance}/10.`);
    } else {
      lines.push(`⚠️ RISCHIO ALTO: Il sensore non è certificato ATEX. Non idoneo per aree classificate di raffineria ENI. Score compliance: ${s.compliance}/10.`);
    }

    // Performance
    lines.push(`📊 Performance tecnica (${s.performance}/10): LOD ${sensor.lod_ppb} ppb, range 0-${sensor.range_ppb?.max || '?'} ppb, tempo risposta ${sensor.response_time_sec}s. Tecnologia: ${(sensor.technology || []).join(' + ')}.`);

    // Interoperabilità
    lines.push(`🔗 Interoperabilità (${s.interoperabilita}/10): Protocolli supportati: ${(sensor.protocols || []).join(', ')}. LoRaWAN: ${sensor.lorawan_ready ? 'SÌ' : 'NO'}. CALPUFF/AERMOD: ${sensor.calpuff_ready ? 'SÌ' : 'NO'}.`);

    // Economia
    lines.push(`💰 Economia (${s.economia}/10): CAPEX €${sensor.capex_eur?.toLocaleString('it-IT') || 'N/D'}, OPEX €${sensor.opex_annual_eur?.toLocaleString('it-IT') || 'N/D'}/anno. TCO 5 anni: €${(sensor.capex_eur + sensor.opex_annual_eur * 5).toLocaleString('it-IT') || 'N/D'}.`);

    if (sensor.pid_mos_combo) {
      lines.push(`🌟 BONUS: Combinazione PID + MOS garantisce copertura dello spettro odorigeno completo (VOC + miscele complesse).`);
    }
    if (sensor.calpuff_ready) {
      lines.push(`🌟 BONUS: Integrabile con modelli di dispersione CALPUFF/AERMOD per la modellazione degli impatti odorigeni.`);
    }

    return lines.join('\n\n');
  }

  // ─── Color mapping per score ──────────────────────────────────────────
  function scoreColor(score) {
    if (score >= 8) return '#10B981';
    if (score >= 6) return '#F59E0B';
    if (score >= 4) return '#EF4444';
    return '#6B7280';
  }

  function scoreClass(score) {
    if (score >= 8) return 'high';
    if (score >= 6) return 'medium';
    return 'low';
  }

  function scoreColorCSS(score) {
    if (score >= 8)  return 'var(--status-ok)';
    if (score >= 6)  return 'var(--status-warning)';
    return 'var(--status-alarm)';
  }

  // ─── Public API ────────────────────────────────────────────────────────
  return {
    evaluateSensor,
    rankSensors,
    generateJustification,
    scoreColor,
    scoreClass,
    scoreColorCSS,
    calcComplianceScore,
    calcPerformanceScore,
    calcInteroperabilityScore,
    calcEconomyScore
  };
})();

window.MCDAEngine = MCDAEngine;
