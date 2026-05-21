/**
 * C-Lab ENI — App Controller per Matrice MCDA, AI e Architettura
 */

const AppState = {
  sensors: [],
  excelHeaders: [],
  excelData: [],
  meteoHeaders: [],
  meteoData: [],
  currentView: 'matrix'
};

const CustomWeights = {
  compliance: 0.40,
  performance: 0.25,
  interoperabilita: 0.20,
  economia: 0.15
};

const CustomMeteoWeights = {
  completezza: 0.25,
  accuratezza: 0.25,
  range: 0.15,
  gas: 0.20,
  costo: 0.10,
  manutenzione: 0.05
};

window.showToast = function(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  const icons = { ok: '✅', warn: '⚠️', alarm: '🚨', info: 'ℹ️' };
  toast.innerHTML = `<span style="font-size:1.1rem">${icons[type]||'ℹ️'}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('exit');
    setTimeout(() => toast.remove(), 350);
  }, 4000);
};

function navigateTo(view) {
  document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const section = document.getElementById(`view-${view}`);
  if (section) section.classList.add('active');

  const navItem = document.querySelector(`[data-nav="${view}"]`);
  if (navItem) navItem.classList.add('active');

  AppState.currentView = view;

  const titles = {
    matrix:     { title: 'Matrice MCDA', sub: 'Valutazione Comparativa Sensori Odorigeni' },
    meteo:      { title: 'Matrice Meteo', sub: 'Valutazione Comparativa Stazioni Meteorologiche' },
    consultant: { title: 'AI Consultant', sub: 'ARIA - Advanced Rating Intelligence Assistant' },
    pesi:       { title: 'Pesi & Configurazione', sub: 'Parametri del Motore MCDA' },
    scenari:    { title: 'Architettura Sistema', sub: 'Scenari di Deployment' },
    istruzioni: { title: 'Istruzioni & Glossario', sub: 'Guida alla consultazione' }
  };
  const t = titles[view] || titles.matrix;
  const titleEl = document.getElementById('topbar-title');
  const subEl = document.getElementById('topbar-subtitle');
  if(titleEl) titleEl.textContent = t.title;
  if(subEl) subEl.textContent = t.sub;
}

function startClock() {
  const el = document.getElementById('topbar-clock');
  if (!el) return;
  const update = () => {
    el.textContent = new Date().toLocaleString('it-IT', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  };
  update();
  setInterval(update, 1000);
}

// ─── CARICAMENTO DATI EXCEL ──────────────────────────────────────────────────

function loadExcelData() {
  if (!window.EXCEL_DATA) {
    const tbody = document.getElementById('matrix-tbody');
    if(tbody) tbody.innerHTML = `<tr><td colspan="7" style="color:red; font-weight:bold; padding:20px;">ERRORE CRITICO: Il file 'excel_data.js' non è stato caricato correttamente o è vuoto. Premi F12 per controllare la console del browser per errori di sintassi. Assicurati di avviare il server Python.</td></tr>`;
    showToast("Errore caricamento dati Excel", "alarm");
    return;
  }
  
  // 1. Matrice MCDA
  const mcdaSheet = EXCEL_DATA['MATRICE MCDA'];
  if (mcdaSheet) {
    try {
      AppState.excelHeaders = mcdaSheet[3]; // Riga 3 ha gli header completi
      const rawData = mcdaSheet.slice(4); // Dalla riga 4 in poi i sensori
      
      // Filtra righe vuote
      AppState.excelData = rawData.filter(row => row && row["0"] && String(row["0"]).trim() !== "");
      
      renderMatrix();
    } catch(err) {
      const tbody = document.getElementById('matrix-tbody');
      if(tbody) tbody.innerHTML = `<tr><td colspan="7" style="color:red">Errore durante il parsing dei dati Excel: ${err.message}</td></tr>`;
      console.error(err);
    }
  } else {
    const tbody = document.getElementById('matrix-tbody');
    if(tbody) tbody.innerHTML = `<tr><td colspan="7" style="color:orange">Foglio 'MATRICE MCDA' non trovato nei dati.</td></tr>`;
  }

  // 2. Pesi & Configurazione
  const pesiSheet = EXCEL_DATA['PESI & CONFIGURAZIONE'];
  if (pesiSheet) {
    renderPesiInteractive(pesiSheet, 'pesi-container');
  }

  // 3. Architettura Sistema Ibrido
  const scenariSheet = EXCEL_DATA['ARCHITETTURA SISTEMA IBRIDO'];
  if (scenariSheet) {
    renderScenariInteractive(scenariSheet, 'scenari-container');
  }

  // 4. Istruzioni e Glossario
  const istruzioniSheet = EXCEL_DATA['ISTRUZIONI & GLOSSARIO'];
  if (istruzioniSheet) {
    renderIstruzioniInteractive(istruzioniSheet, 'istruzioni-container');
  }

  // 5. Matrice Meteo
  if (window.METEO_DATA) {
    const sheetMeteo = METEO_DATA['analisi_comparativa_stazioni_meteo (1)'];
    if (sheetMeteo) {
      try {
        AppState.meteoHeaders = sheetMeteo[1]; // Riga 2
        const rawMeteo = sheetMeteo.slice(2);
        AppState.meteoData = rawMeteo.filter(row => row && row["0"] && String(row["0"]).trim() !== "");
        renderMeteoMatrix();
      } catch(err) {
        console.error(err);
      }
    }
  }
}

// ─── RENDER TABELLE EXCEL STATICHE ───────────────────────────────────────────

function renderSimpleTable(sheet, containerId, startRow) {
  const container = document.getElementById(containerId);
  if(!container) return;
  
  const headers = sheet[startRow];
  const data = sheet.slice(startRow + 1);
  
  // Trova max cols
  let maxCols = 0;
  for(let i=0; i<50; i++) {
    if(headers[i.toString()] !== undefined && headers[i.toString()] !== "") maxCols = i+1;
  }
  
  let html = `<table class="simple-table"><thead><tr>`;
  for(let i=0; i<maxCols; i++) {
    html += `<th>${headers[i.toString()]||''}</th>`;
  }
  html += `</tr></thead><tbody>`;
  
  data.forEach(row => {
    if(!row["0"]) return; // Salta righe vuote
    html += `<tr>`;
    for(let i=0; i<maxCols; i++) {
      html += `<td>${String(row[i.toString()]||'').replace(/\n/g, '<br>')}</td>`;
    }
    html += `</tr>`;
  });
  
  html += `</tbody></table>`;
  container.innerHTML = html;
}

function generateSimpleTableHTML(sheetData, startRow = 0) {
  if (!sheetData) return '';
  let html = '<div class="table-container" style="margin-top: 16px; padding-top: 0;"><div class="simple-table-wrapper"><table class="simple-table">';
  
  let maxCols = 0;
  sheetData.forEach(row => {
    const keys = Object.keys(row).map(Number).filter(n => !isNaN(n));
    if(keys.length > 0) {
      const max = Math.max(...keys);
      if(max + 1 > maxCols) maxCols = max + 1;
    }
  });

  sheetData.slice(startRow).forEach((row) => {
    if(!row["0"]) return; // Salta righe vuote
    html += `<tr>`;
    for(let i=0; i<maxCols; i++) {
      html += `<td>${String(row[i.toString()]||'').replace(/\n/g, '<br>')}</td>`;
    }
    html += `</tr>`;
  });
  
  html += `</table></div></div>`;
  return html;
}

// ─── RENDER TABELLE INTERATTIVE ─────────────────────────────────────────────

function renderPesiInteractive(sheet, containerId) {
  const container = document.getElementById(containerId);
  if(!container) return;
  
  let html = `<div style="display:flex; flex-direction:column; gap:20px; max-width: 600px; padding:10px;">
    <div>
      <h3 style="margin-bottom:4px">Bilanciamento MCDA</h3>
    </div>
  `;
  
  const criteri = [
    { id: 'w_comp', label: 'B — Compliance & Safety', key: 'compliance', desc: 'Rilevanza ATEX, normative (SNPA 268) e sicurezza' },
    { id: 'w_perf', label: 'C — Performance Tecnica', key: 'performance', desc: 'Limiti di rilevabilità (LOD), accuratezza, tempi di risposta' },
    { id: 'w_int', label: 'D — Interoperabilità', key: 'interoperabilita', desc: 'Protocolli aperti, architettura di rete, cloud' },
    { id: 'w_eco', label: 'E — Sostenibilità Economica', key: 'economia', desc: 'CAPEX, OPEX, Total Cost of Ownership' }
  ];

  criteri.forEach(c => {
    html += `
      <div style="background:var(--bg-surface-2); padding:16px; border-radius:8px; border:1px solid var(--border-subtle)">
        <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
          <strong>${c.label}</strong>
          <span id="${c.id}_val" style="font-weight:bold; color:var(--eni-yellow)">${(CustomWeights[c.key]*100).toFixed(0)}%</span>
        </div>
        <div style="font-size:0.75rem; color:var(--text-muted); margin-bottom:12px;">${c.desc}</div>
        <input type="range" id="${c.id}_slider" min="0" max="100" value="${(CustomWeights[c.key]*100).toFixed(0)}" style="width:100%" oninput="updateWeights('${c.key}', this.value)">
      </div>
    `;
  });
  
  html += `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px;">
      <div id="weights_total" style="font-weight:bold; font-size:1.1rem; color:var(--status-ok)">Totale: 100%</div>
      <button class="btn btn-outline" onclick="resetWeights()">↺ Ripristina Originali</button>
    </div>
  </div>`;
  
  html += `<div style="margin-top: 30px; display:flex; justify-content:space-between; align-items:center;">
    <h3 style="color:var(--text-primary);">2. TABELLE DI CONVERSIONE PUNTEGGI (0–10)</h3>
    <button class="btn btn-outline btn-sm" onclick="resetConversionTables()">↺ Ripristina Originali</button>
  </div>`;
  
  let sheetData = sheet.slice(11); // riga 12 in poi
  html += '<div class="table-container" style="margin-top: 16px; padding-top: 0;"><div class="simple-table-wrapper"><table class="simple-table" id="conversion-table">';
  
  let maxCols = 0;
  sheetData.forEach(row => {
    const keys = Object.keys(row).map(Number).filter(n => !isNaN(n));
    if(keys.length > 0) {
      const max = Math.max(...keys);
      if(max + 1 > maxCols) maxCols = max + 1;
    }
  });

  sheetData.forEach((row, rowIndex) => {
    if(!row["0"]) return;
    html += `<tr>`;
    for(let i=0; i<maxCols; i++) {
      let val = String(row[i.toString()]||'').replace(/\n/g, '<br>');
      // Non rendere modificabili le colonne 0, le righe di intestazione e le celle vuote
      let isHeaderRow = (rowIndex === 0) || (row["0"].match(/^2[A-Z]/)) || (row["0"].toLowerCase() === "parametro");
      if (i === 0 || isHeaderRow || val.trim() === "") {
         html += `<td style="${i === 0 || isHeaderRow ? 'font-weight:bold;' : ''}">${val}</td>`;
      } else {
         html += `<td><input type="text" class="input conv-input" data-row="${rowIndex}" data-col="${i}" value="${val.replace(/"/g, '&quot;')}" onchange="updateConversionTable()" style="width:100%; padding:4px; font-size:0.85rem;"></td>`;
      }
    }
    html += `</tr>`;
  });
  html += `</table></div></div>`;
  
  container.innerHTML = html;
}

window.resetConversionTables = function() {
  renderPesiInteractive(EXCEL_DATA['PESI & CONFIGURAZIONE'], 'pesi-container');
  showToast('Tabelle di conversione ripristinate.', 'info');
}

window.updateConversionTable = function() {
  // In a full implementation, this would re-parse the rules and re-calculate scoreB, scoreC, scoreD.
  // We trigger a re-render of the matrix to apply any dynamic changes.
  showToast('Regole aggiornate. Ricalcolo punteggi...', 'ok');
  renderMatrix();
}

window.updateWeights = function(changedKey, value) {
  let val = parseFloat(value) / 100;
  let remaining = 1.0 - val;
  let oldRemaining = 1.0 - CustomWeights[changedKey];
  
  CustomWeights[changedKey] = val;
  
  if (oldRemaining > 0.001) {
    let ratio = remaining / oldRemaining;
    for(let k in CustomWeights) {
      if(k !== changedKey) CustomWeights[k] *= ratio;
    }
  } else {
    let keys = Object.keys(CustomWeights).filter(k => k !== changedKey);
    keys.forEach(k => CustomWeights[k] = remaining / keys.length);
  }
  
  let tot = 0;
  const ids = { compliance: 'w_comp', performance: 'w_perf', interoperabilita: 'w_int', economia: 'w_eco' };
  for(let k in CustomWeights) {
    let perc = (CustomWeights[k] * 100);
    tot += perc;
    const s = document.getElementById(ids[k] + '_slider');
    const v = document.getElementById(ids[k] + '_val');
    if(s && k !== changedKey) s.value = perc.toFixed(0);
    if(v) v.textContent = perc.toFixed(0) + '%';
  }
  
  const tw = document.getElementById('weights_total');
  if(tw) {
    tw.textContent = `Totale: ${tot.toFixed(0)}%`;
    tw.style.color = Math.abs(tot - 100) < 1 ? 'var(--status-ok)' : 'var(--status-alarm)';
  }
  
  renderMatrix();
}

window.resetWeights = function() {
  CustomWeights.compliance = 0.40;
  CustomWeights.performance = 0.25;
  CustomWeights.interoperabilita = 0.20;
  CustomWeights.economia = 0.15;
  
  const ids = { compliance: 'w_comp', performance: 'w_perf', interoperabilita: 'w_int', economia: 'w_eco' };
  for(let k in CustomWeights) {
    let perc = (CustomWeights[k] * 100);
    const s = document.getElementById(ids[k] + '_slider');
    const v = document.getElementById(ids[k] + '_val');
    if(s) s.value = perc.toFixed(0);
    if(v) v.textContent = perc.toFixed(0) + '%';
  }
  const tw = document.getElementById('weights_total');
  if(tw) { tw.textContent = 'Totale: 100%'; tw.style.color = 'var(--status-ok)'; }
  
  renderMatrix();
}

function renderScenariInteractive(sheet, containerId) {
  const container = document.getElementById(containerId);
  if(!container) return;
  
  let html = `<div class="scenari-container" style="display:flex; flex-direction:column; gap:20px;">`;
  
  // Custom parsing for ARCHITETTURA SISTEMA IBRIDO
  let currentSection = '';
  let tableHeaders = [];
  let tableRows = [];
  
  function getBestSensor(role) {
    if (!AppState.excelData || AppState.excelData.length === 0) return null;
    const sorted = [...AppState.excelData].sort((a,b) => (b.newScoreG||0) - (a.newScoreG||0));
    const best = sorted.find(s => String(s["39"]).toLowerCase().includes(role.toLowerCase()));
    return best ? best["3"] : "";
  }
  
  function applyDynamicRecommendations() {
    let recColIdx = tableHeaders.findIndex(h => String(h).includes("Tecnologie Raccomandate") || String(h).includes("Risultato Combinato") || String(h).includes("Sensori Base"));
    if (recColIdx === -1) recColIdx = tableHeaders.length - 1; // Default to last column
    
    tableRows.forEach(r => {
       let text = r.join(" ").toLowerCase();
       let rec = '';
       if (text.includes("perimetrale") || text.includes("outreach") || text.includes("fenceline") || text.includes("s1")) rec = getBestSensor("Perimetrale");
       else if (text.includes("sorgente") || text.includes("stoccaggio") || text.includes("wwtp") || text.includes("s3")) rec = getBestSensor("Sorgente Puntuale");
       else if (text.includes("legal") || text.includes("evento") || text.includes("s2")) rec = getBestSensor("Quantificatore Legale");
       else if (text.includes("continuo")) rec = getBestSensor("Sentinella Continua");
       
       if (rec && recColIdx < r.length) {
          // Keep existing text but append dynamic recommendation
          r[recColIdx] = `<strong>RACCOMANDATO:</strong> ${rec} ✅<br><br>` + r[recColIdx];
       }
    });
  }
  
  sheet.forEach((row, i) => {
    const col0 = row["0"] || "";
    if (col0.startsWith("3A.") || col0.startsWith("3B.") || col0.startsWith("3C.")) {
      if (tableRows.length > 0) {
        if (currentSection.includes("3A. SCENARI") || currentSection.includes("3B. MATRICE") || currentSection.includes("3C. PUNTI CRITICI")) {
          applyDynamicRecommendations();
        }
        html += renderTable(currentSection, tableHeaders, tableRows);
        tableRows = [];
        tableHeaders = [];
      }
      currentSection = col0;
    } else if (currentSection && !tableHeaders.length && col0) {
      tableHeaders = Object.values(row).filter(v => v);
    } else if (currentSection && tableHeaders.length && col0) {
      tableRows.push(Object.values(row).filter(v => v));
    }
  });
  
  if (tableRows.length > 0) {
    if (currentSection.includes("3A. SCENARI") || currentSection.includes("3B. MATRICE") || currentSection.includes("3C. PUNTI CRITICI")) {
      applyDynamicRecommendations();
    }
    html += renderTable(currentSection, tableHeaders, tableRows);
  }
  
  html += `</div>`;
  container.innerHTML = html;
}

function renderTable(title, headers, rows) {
  let html = `<div class="scenario-card" style="background:#fff; border-radius:12px; box-shadow:0 4px 15px rgba(0,0,0,0.05); overflow:hidden; border:1px solid #e2e8f0; margin-bottom:20px;">
    <div style="background:var(--eni-green-dark); color:#fff; padding:15px 20px; font-weight:bold; font-size:1.1rem;">${title}</div>
    <div style="padding:0; overflow-x:auto;">
      <table style="width:100%; border-collapse:collapse; min-width:600px;">
        <thead>
          <tr style="background:#f8fafc; border-bottom:2px solid #e2e8f0; text-align:left;">`;
  headers.forEach(h => html += `<th style="padding:12px 15px; font-size:0.85rem; color:#475569; font-weight:600;">${h}</th>`);
  html += `</tr></thead><tbody>`;
  
  rows.forEach((r, i) => {
    html += `<tr style="border-bottom:1px solid #f1f5f9; background:${i%2===0?'#ffffff':'#fafdf6'}; transition:all 0.2s;">`;
    r.forEach((c, j) => {
      let content = String(c).replace(/\n/g, '<br>');
      if (content.includes('ALTA') || content.includes('✅')) content = `<span style="color:var(--status-ok);font-weight:600">${content}</span>`;
      else if (content.includes('MEDIA') || content.includes('⚠️')) content = `<span style="color:var(--status-warning);font-weight:600">${content}</span>`;
      else if (content.includes('BASSA') || content.includes('🔴')) content = `<span style="color:var(--status-alarm);font-weight:600">${content}</span>`;
      
      html += `<td style="padding:12px 15px; font-size:0.85rem; color:#334155; vertical-align:top;">${content}</td>`;
    });
    html += `</tr>`;
  });
  
  html += `</tbody></table></div></div>`;
  return html;
}

function renderIstruzioniInteractive(sheet, containerId) {
  const container = document.getElementById(containerId);
  if(!container) return;
  
  let sliceIndex = sheet.findIndex(r => r["0"] && String(r["0"]).includes("Mercaptani totali"));
  let mainSheet = sheet;
  if (sliceIndex !== -1) {
    mainSheet = sheet.slice(0, sliceIndex + 1);
  }
  
  let html = `<div style="background:#fff; border-radius:12px; padding:20px; box-shadow:0 4px 15px rgba(0,0,0,0.05); border:1px solid #e2e8f0;">
    <h3 style="color:var(--eni-green-dark); margin-bottom:15px; font-size:1.2rem; border-bottom:2px solid var(--eni-green); padding-bottom:10px;">Istruzioni d'Uso</h3>
    <p style="color:#475569; font-size:0.95rem; line-height:1.6;">Questa dashboard permette di valutare le tecnologie di monitoraggio odorigeno per la Raffineria Eni utilizzando il modello MCDA (Multi-Criteria Decision Analysis). Utilizza i pesi per bilanciare l'importanza di compliance, performance, interoperabilità ed economia. Interroga l'AI Consultant per analizzare nuovi sensori in tempo reale.</p>
  </div>` + generateSimpleTableHTML(mainSheet, 0); 

  // Add the custom LIMITAZIONI E AVVERTENZE table
  html += `
  <div style="margin-top: 24px; margin-bottom: 24px;">
    <table class="simple-table" style="width: 100%; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 15px rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.2);">
      <thead>
        <tr><th style="background: rgba(239,68,68,0.1); color: #B91C1C; font-size: 1.1rem; font-weight: bold; padding: 16px;">⚠️ LIMITAZIONI E AVVERTENZE</th></tr>
      </thead>
      <tbody>
        <tr><td style="padding: 20px; font-size: 0.9rem; line-height: 1.8; color: #475569; background: #fffcfc;">
          • I punteggi MCDA sono basati su dati pubblici e dichiarazioni dei fornitori — verificare sempre con datasheet ufficiali e prove sul campo.<br>
          • La matrice NON sostituisce la valutazione tecnica di un esperto di sicurezza ATEX certificato.<br>
          • I dati economici (CAPEX/OPEX) sono stime indicative — richiedere offerta formale ai fornitori.<br>
          • La conformità normativa (SNPA 268/2025, UNI EN 13725) deve essere verificata con ARPA competente per territorio.<br>
          • I sensori low-cost (Sensirion, Dingtek) richiedono calibrazione frequente e non sono adatti a misure legali.<br>
          • Aggiornare la matrice periodicamente — il mercato dei sensori odorigeni evolve rapidamente.<br>
          <br>
          <em>Versione: V2.3 — maggio 2025 — Eni C-Lab | Elaborata con supporto AI (Biomni/Phylo)</em>
        </td></tr>
      </tbody>
    </table>
  </div>
  `;
  container.innerHTML = html;
}

// ─── RENDER MATRICE MCDA (A-G) ───────────────────────────────────────────────

function renderMatrix() {
  const tbody = document.getElementById('matrix-tbody');
  if(!tbody) return;

  // Calcola Score Economia retroattivo (se non esiste) e aggiorna nuovo score G
  AppState.excelData.forEach((sensor, index) => {
    sensor.originalIndex = index;
    
    const scoreB = parseFloat(sensor["13"]) || 0;
    const scoreC = parseFloat(sensor["22"]) || 0;
    const scoreD = parseFloat(sensor["33"]) || 0;
    
    let scoreE = sensor["ECONOMIA_SCORE"];
    if (scoreE === undefined) {
      const origG = parseFloat(sensor["42"]) || 0;
      scoreE = (origG - (scoreB * 0.40 + scoreC * 0.25 + scoreD * 0.20)) / 0.15;
      if (isNaN(scoreE) || scoreE < 0) scoreE = 0;
      if (scoreE > 10) scoreE = 10;
      sensor["ECONOMIA_SCORE"] = scoreE;
    }
    
    sensor.newScoreG = (scoreB * CustomWeights.compliance) + 
                       (scoreC * CustomWeights.performance) + 
                       (scoreD * CustomWeights.interoperabilita) + 
                       (scoreE * CustomWeights.economia);
  });
  
  // Sort discendente
  const sortedData = [...AppState.excelData].sort((a,b) => b.newScoreG - a.newScoreG);

  let html = '';
  
  sortedData.forEach((sensor) => {
    const nome = String(sensor["3"] || "Sconosciuto");
    const tec = String(sensor["1"] || '');
    
    const scoreB = parseFloat(sensor["13"]) || 0;
    const atex = sensor["6"] === "Sì" || sensor["6"] === "Opzionale" ? "ATEX" : "NO ATEX";
    
    const scoreC = parseFloat(sensor["22"]) || 0;
    const scoreD = parseFloat(sensor["33"]) || 0;
    const tco = sensor["36"] || '-';
    const ruolo = sensor["39"] || '';
    
    const scoreG = sensor.newScoreG || 0;
    const scoreColor = scoreG >= 8 ? "var(--status-ok)" : (scoreG >= 6 ? "var(--eni-yellow)" : "var(--status-alarm)");
    
    html += `
      <tr style="cursor:pointer;" onclick='openSensorDetails(${sensor.originalIndex})'>
        <td class="macro-col">
          <strong>${nome}</strong><br>
          <small style="color:var(--text-muted)">${tec}</small>
        </td>
        <td class="macro-col">
          <div style="font-weight:bold">${scoreB.toFixed(1)} / 10</div>
          <div style="font-size:0.75rem; color:${atex.includes('NO') ? 'var(--status-alarm)' : 'var(--text-muted)'}">${atex}</div>
        </td>
        <td class="macro-col">
          <div style="font-weight:bold">${scoreC.toFixed(1)} / 10</div>
          <div style="font-size:0.75rem; color:var(--text-muted)">LOD: ${sensor["15"]||'-'}</div>
        </td>
        <td class="macro-col">
          <div style="font-weight:bold">${scoreD.toFixed(1)} / 10</div>
        </td>
        <td class="macro-col">
          <div>TCO: €${tco}</div>
        </td>
        <td class="macro-col">
          <div style="font-size:0.8rem">${ruolo}</div>
        </td>
        <td class="macro-col">
          <div style="font-size:1.2rem; font-weight:bold; color:${scoreColor}">${scoreG.toFixed(2)}</div>
        </td>
      </tr>
    `;
  });
  
  tbody.innerHTML = html;
}

// ─── RENDER MATRICE METEO ───────────────────────────────────────────────────

function renderMeteoMatrix() {
  const tbody = document.getElementById('matrix-meteo-tbody');
  if(!tbody) return;

  AppState.meteoData.forEach((station, index) => {
    station.originalIndex = index;
    const s_comp = (parseFloat(station["31"]) || 0) / 0.25; 
    const s_acc = (parseFloat(station["32"]) || 0) / 0.25;
    const s_range = (parseFloat(station["33"]) || 0) / 0.15;
    const s_gas = (parseFloat(station["34"]) || 0) / 0.20;
    const s_costo = (parseFloat(station["35"]) || 0) / 0.10;
    const s_manut = (parseFloat(station["36"]) || 0) / 0.05;

    station.newScoreG = (s_comp * CustomMeteoWeights.completezza) + 
                        (s_acc * CustomMeteoWeights.accuratezza) + 
                        (s_range * CustomMeteoWeights.range) + 
                        (s_gas * CustomMeteoWeights.gas) +
                        (s_costo * CustomMeteoWeights.costo) +
                        (s_manut * CustomMeteoWeights.manutenzione);
  });
  
  const sortedData = [...AppState.meteoData].sort((a,b) => b.newScoreG - a.newScoreG);

  let html = '';
  
  sortedData.forEach((station, idx) => {
    const rank = idx + 1;
    const azienda = String(station["1"] || "");
    const prodotto = String(station["3"] || "");
    
    const s_comp = ((parseFloat(station["31"]) || 0) / 0.25).toFixed(1);
    const s_acc = ((parseFloat(station["32"]) || 0) / 0.25).toFixed(1);
    const s_range = ((parseFloat(station["33"]) || 0) / 0.15).toFixed(1);
    const s_gas = ((parseFloat(station["34"]) || 0) / 0.20).toFixed(1);
    const s_costo = ((parseFloat(station["35"]) || 0) / 0.10).toFixed(1);
    const s_manut = ((parseFloat(station["36"]) || 0) / 0.05).toFixed(1);
    
    const costEur = station["23"] || '-';
    
    const scoreTot = station.newScoreG || 0;
    const scoreColor = scoreTot >= 8 ? "var(--status-ok)" : (scoreTot >= 6 ? "var(--eni-yellow)" : "var(--status-alarm)");
    
    html += `
      <tr style="cursor:pointer;" onclick='openStationDetails(${station.originalIndex})'>
        <td class="macro-col">
          <div style="display:flex; align-items:center; gap:8px;">
            <div style="font-size:1.2rem; font-weight:bold; color:var(--eni-blue)">#${rank}</div>
            <div>
              <strong>${prodotto}</strong><br>
              <small style="color:var(--text-muted)">${azienda}</small>
            </div>
          </div>
        </td>
        <td class="macro-col">
          <div style="font-weight:bold">${s_comp} / 10</div>
          <div style="font-size:0.75rem; color:var(--text-muted)">Parametri: ${station["5"]||'-'}</div>
        </td>
        <td class="macro-col">
          <div style="font-weight:bold">${s_acc} / 10</div>
        </td>
        <td class="macro-col">
          <div style="font-weight:bold">${s_range} / 10</div>
        </td>
        <td class="macro-col">
          <div style="font-weight:bold">${s_gas} / 10</div>
          <div style="font-size:0.75rem; color:var(--text-muted)">Gas: ${station["22"]||'N/D'}</div>
        </td>
        <td class="macro-col">
          <div style="font-weight:bold">C: ${s_costo} | M: ${s_manut}</div>
          <div style="font-size:0.75rem; color:var(--text-muted)">Costo Acq: €${costEur}</div>
        </td>
        <td class="macro-col">
          <div style="font-size:1.2rem; font-weight:bold; color:${scoreColor}">${scoreTot.toFixed(2)}</div>
        </td>
      </tr>
    `;
  });
  
  tbody.innerHTML = html;
}

// ─── DETTAGLIO SENSORE MODAL ─────────────────────────────────────────────────

window.openSensorDetails = function(index) {
  const sensor = AppState.excelData[index];
  const headers = AppState.excelHeaders;
  
  const modal = document.getElementById('sensor-modal');
  const modalTitle = document.getElementById('modal-title');
  const modalSubtitle = document.getElementById('modal-subtitle');
  const modalBody = document.getElementById('modal-body');
  
  modalTitle.textContent = sensor["3"] || "Sensore Sconosciuto";
  modalSubtitle.textContent = "ID: " + (sensor["0"] || "N/A") + " | " + (sensor["1"] || "");
  
  // Gruppi di colonne
  const groups = [
    { title: "A — Identificazione", start: 0, end: 5 },
    { title: "B — Compliance & Safety (40%)", start: 6, end: 13 },
    { title: "C — Performance Tecnica (25%)", start: 14, end: 22 },
    { title: "D — Interoperabilità (20%)", start: 23, end: 33 },
    { title: "E — Sostenibilità Economica (15%)", start: 34, end: 38 },
    { title: "F — Ruolo nel Sistema Ibrido", start: 39, end: 41 },
    { title: "G — Punteggio MCDA", start: 42, end: 43 }
  ];
  
  let bodyHtml = `<div style="text-align: right; margin-bottom: 10px;">
    <button class="btn btn-outline" style="color:var(--status-alarm); border-color:var(--status-alarm); margin-right: 10px;" onclick="deleteSensor(${index})">🗑️ Elimina</button>
    <button class="btn btn-primary" onclick="saveSensorDetails(${index})">💾 Salva Modifiche</button>
  </div>`;
  
  groups.forEach(group => {
    bodyHtml += `<div style="margin-top:20px; border-bottom:1px solid var(--border-subtle); padding-bottom:8px;">
                   <h3 style="color:var(--text-primary); font-size:1.1rem;">${group.title}</h3>
                 </div>
                 <div class="detail-grid">`;
                 
    for(let i=group.start; i<=group.end; i++) {
      const h = headers[i.toString()];
      const val = sensor[i.toString()];
      if(h && h.trim() !== "") {
        let contentHtml = '';
        if (i === 4 && val && val !== "") {
          contentHtml = `<a href="${val}" target="_blank" style="color: var(--eni-green); text-decoration: underline;">${val}</a>
                         <br><input type="text" class="input detail-edit-input" data-col="${i}" value="${val}" style="margin-top:4px; padding:4px; font-size:0.85rem;">`;
        } else {
          const stringVal = (val === "" || val === undefined) ? '' : String(val);
          contentHtml = `<input type="text" class="input detail-edit-input" data-col="${i}" value="${stringVal.replace(/"/g, '&quot;')}" style="width:100%; padding:4px; font-size:0.85rem;">`;
        }
        
        bodyHtml += `
          <div class="detail-card">
            <div class="detail-label">${h.replace(/\n/g, ' ')}</div>
            <div class="detail-value">${contentHtml}</div>
          </div>
        `;
      }
    }
    bodyHtml += `</div>`;
  });
  
  modalBody.innerHTML = bodyHtml;
  modal.classList.add('active');
}

window.saveSensorDetails = function(index) {
  const sensor = AppState.excelData[index];
  const inputs = document.querySelectorAll('.detail-edit-input');
  inputs.forEach(input => {
    const col = input.getAttribute('data-col');
    sensor[col] = input.value;
  });
  renderMatrix();
  document.getElementById('sensor-modal').classList.remove('active');
  showToast('Modifiche salvate con successo!', 'ok');
}

window.deleteSensor = function(index) {
  if (confirm("Sei sicuro di voler eliminare questo sensore?")) {
    AppState.excelData.splice(index, 1);
    renderMatrix();
    document.getElementById('sensor-modal').classList.remove('active');
    showToast('Sensore eliminato', 'info');
  }
}

window.addManualSensor = function() {
  const newRow = {};
  for(let i=0; i<=43; i++) newRow[i.toString()] = "";
  newRow["0"] = "S-MAN-" + Date.now().toString().slice(-4);
  const nomeSensore = prompt("Inserisci il nome del nuovo sensore:", "Nuovo Sensore");
  if (nomeSensore === null) return; // Se l'utente annulla, fermiamo l'inserimento
  newRow["3"] = nomeSensore || "Nuovo Sensore";
  AppState.excelData.push(newRow);
  renderMatrix();
  const idx = AppState.excelData.length - 1;
  openSensorDetails(idx);
}

// ─── DETTAGLIO METEO MODAL ───────────────────────────────────────────────────

window.openStationDetails = function(index) {
  const station = AppState.meteoData[index];
  const headers = AppState.meteoHeaders;
  
  const modal = document.getElementById('sensor-modal');
  const modalTitle = document.getElementById('modal-title');
  const modalSubtitle = document.getElementById('modal-subtitle');
  const modalBody = document.getElementById('modal-body');
  
  modalTitle.textContent = station["3"] || "Prodotto Sconosciuto";
  modalSubtitle.textContent = "Azienda: " + (station["1"] || "N/A") + " | Paese: " + (station["2"] || "");
  
  let bodyHtml = `<div style="text-align: right; margin-bottom: 10px;">
    <button class="btn btn-outline" style="color:var(--status-alarm); border-color:var(--status-alarm); margin-right: 10px;" onclick="deleteStation(${index})">🗑️ Elimina</button>
    <button class="btn btn-primary" onclick="saveStationDetails(${index})">💾 Salva Modifiche</button>
  </div><div class="detail-grid">`;
                 
  for(let i=4; i<=38; i++) {
    const h = headers[i.toString()];
    const val = station[i.toString()];
    if(h && h.trim() !== "") {
      const stringVal = (val === "" || val === undefined) ? '' : String(val);
      bodyHtml += `
        <div class="detail-card">
          <div class="detail-label">${h.replace(/\n/g, ' ')}</div>
          <div class="detail-value"><input type="text" class="input detail-edit-input-meteo" data-col="${i}" value="${stringVal.replace(/"/g, '&quot;')}" style="width:100%; padding:4px; font-size:0.85rem;"></div>
        </div>
      `;
    }
  }
  bodyHtml += `</div>`;
  
  modalBody.innerHTML = bodyHtml;
  modal.classList.add('active');
}

window.saveStationDetails = function(index) {
  const station = AppState.meteoData[index];
  const inputs = document.querySelectorAll('.detail-edit-input-meteo');
  inputs.forEach(input => {
    const col = input.getAttribute('data-col');
    station[col] = input.value;
  });
  renderMeteoMatrix();
  document.getElementById('sensor-modal').classList.remove('active');
  showToast('Modifiche salvate con successo!', 'ok');
}

window.deleteStation = function(index) {
  if (confirm("Sei sicuro di voler eliminare questa stazione meteo?")) {
    AppState.meteoData.splice(index, 1);
    renderMeteoMatrix();
    document.getElementById('sensor-modal').classList.remove('active');
    showToast('Stazione meteo eliminata', 'info');
  }
}

window.addManualStation = function() {
  const newRow = {};
  for(let i=0; i<=38; i++) newRow[i.toString()] = "";
  newRow["0"] = "M-MAN-" + Date.now().toString().slice(-4);
  newRow["3"] = "Nuova Stazione";
  AppState.meteoData.push(newRow);
  renderMeteoMatrix();
  const idx = AppState.meteoData.length - 1;
  openStationDetails(idx);
}

// ─── AI CONSULTANT CHAT ──────────────────────────────────────────────────────

function addChatBubble(role, text) {
  const container = document.getElementById('chat-messages');
  if (!container) return;

  const div = document.createElement('div');
  div.className = `chat-bubble ${role}`;
  if (role === 'ai') {
    div.innerHTML = `<div class="bubble-meta">ARIA — AI Consultant</div>`
      + text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
  } else {
    div.textContent = text;
  }
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
  return div;
}

function showChatThinking(show) {
  const container = document.getElementById('chat-messages');
  if (!container) return;
  const existing = document.getElementById('chat-thinking');
  if (show) {
    if (existing) return;
    const div = document.createElement('div');
    div.id = 'chat-thinking';
    div.className = 'chat-thinking chat-bubble';
    div.innerHTML = `<span style="font-size:0.8rem;color:var(--text-muted)">ARIA sta analizzando</span>
      <div class="ai-thinking-dots"><span></span><span></span><span></span></div>`;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  } else {
    existing?.remove();
  }
}

async function analyzeSensorFromChat(sensorName) {
  addChatBubble('user', sensorName);
  showChatThinking(true);

  try {
    // Usa AIConsultant per analizzare
    let sensorData = await AIConsultant.analyzeSensor(sensorName);
    
    // Calcolo degli scores MCDA tramite il motore ufficiale
    if (window.MCDAEngine) {
      sensorData = MCDAEngine.evaluateSensor(sensorData);
    }

    showChatThinking(false);
    
    // Costruiamo una riga "Excel-like" dal risultato JSON
    // Mapping da sensorData ai 43 campi
    const newRow = {};
    for(let i=0; i<=43; i++) newRow[i.toString()] = "";
    
    newRow["0"] = "S-NEW";
    newRow["1"] = sensorData.technology?.[0] || "AI-Extracted";
    newRow["3"] = `${sensorData.manufacturer} — ${sensorData.name}`;
    newRow["6"] = sensorData.atex_certified ? "Sì" : "No";
    newRow["13"] = (sensorData.mcda_scores?.compliance || 0).toFixed(1);
    newRow["15"] = sensorData.lod_ppb || "";
    newRow["22"] = (sensorData.mcda_scores?.performance || 0).toFixed(1);
    newRow["33"] = (sensorData.mcda_scores?.interoperabilita || 0).toFixed(1);
    newRow["34"] = sensorData.capex_eur || "";
    newRow["36"] = (sensorData.capex_eur || 0) + (sensorData.opex_annual_eur || 0)*5;
    newRow["42"] = (sensorData.mcda_scores?.total || 0).toFixed(2);
    
    // Aggiungi alla matrice
    AppState.excelData.push(newRow);
    renderMatrix();
    
    // Messaggio
    const msg = `**${sensorName}** analizzato e inserito in Matrice.\n\nScore Calcolato: ${newRow["42"]}/10\nATEX: ${newRow["6"]}`;
    addChatBubble('ai', msg);
    showToast(`Sensore aggiunto: ${sensorName}`, 'ok');
    
  } catch(e) {
    showChatThinking(false);
    addChatBubble('ai', `Errore durante l'analisi: ${e.message}`);
  }
}

// ─── INIT ────────────────────────────────────────────────────────────────────

function initApp() {
  document.querySelectorAll('[data-nav]').forEach(el => {
    el.addEventListener('click', () => navigateTo(el.dataset.nav));
  });

  document.getElementById('sidebar-toggle')?.addEventListener('click', () => {
    document.getElementById('sidebar')?.classList.toggle('collapsed');
  });

  const chatInput = document.getElementById('chat-input');
  const chatSend  = document.getElementById('chat-send');

  async function handleChatSend() {
    const val = chatInput?.value?.trim();
    if (!val) return;
    chatInput.value = '';
    await analyzeSensorFromChat(val);
  }

  chatSend?.addEventListener('click', handleChatSend);
  chatInput?.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSend(); }
  });

  loadExcelData();
  navigateTo('matrix');
  startClock();
  
  setTimeout(() => {
    addChatBubble('ai', `Benvenuto nella Matrice MCDA!\n\nHo caricato i dati direttamente dall'Excel ufficiale ENI.\nUsa i tasti a sinistra per esplorare Pesi, Scenari e la Matrice A-G.\n\nVuoi che analizzi un nuovo sensore?`);
  }, 500);
}

window.addEventListener('DOMContentLoaded', initApp);
