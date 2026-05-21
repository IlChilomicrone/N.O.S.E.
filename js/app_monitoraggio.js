/**
 * C-Lab ENI — App Controller per Monitoraggio e Reportistica
 */

const AppState = {
  sensors: [],
  currentView: 'dashboard',
  alarmCount: 0,
  updateTimer: null,
  currentReading: null,
  currentState: null
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

  if (view === 'dashboard') {
    setTimeout(() => HeatmapModule.invalidate(), 100);
  }
  if (view === 'report' && window.ReportGenerator && AppState.currentReading) {
    ReportGenerator.updatePreview(AppState.currentReading, AppState.currentState);
  }

  const titles = {
    dashboard: { title: 'Dashboard Operativa', sub: 'Monitoraggio Real-time' },
    report:    { title: 'Generazione Report',  sub: 'UNI EN 13725 — Allegato 1' }
  };
  const t = titles[view] || titles.dashboard;
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

function updateDashboard() {
  if(!window.ChartsModule || !window.HeatmapModule) return;
  
  const reading = ChartsModule.updateCharts();
  const state   = ChartsModule.getComplianceState(reading);
  
  AppState.currentReading = reading;
  AppState.currentState = state;

  updateMetricCard('H2S', reading.H2S, 'ppb', state);
  updateMetricCard('VOC', reading.VOC, 'ppb', state);
  updateMetricCard('NH3', reading.NH3, 'ppb', state);
  updateMetricCard('OU',  reading.OU,  'ou/m³', 'ok');

  updateSemaphore(reading, state);
  updateSemaBars(reading);
  HeatmapModule.updateHeatmap();

  if (state === 'alarm') {
    AppState.alarmCount++;
    if (AppState.alarmCount <= 1 || AppState.alarmCount % 5 === 0) {
      showToast(`🚨 ALLARME: Superamento soglia SNPA rilevato! H2S: ${reading.H2S.toFixed(1)} ppb`, 'alarm');
    }
    document.getElementById('topbar-live')?.classList.add('alarm');
  } else if (state === 'warning') {
    document.getElementById('topbar-live')?.classList.remove('alarm');
  } else {
    document.getElementById('topbar-live')?.classList.remove('alarm');
  }
}

function updateMetricCard(id, value, unit, globalState) {
  const valEl = document.getElementById(`metric-val-${id}`);
  if (!valEl) return;
  const oldVal = parseFloat(valEl.dataset.val || '0');
  const LIMITS = window.CONFIG?.SNPA_LIMITS?.[id];
  let cardState = 'ok';
  if (LIMITS) {
    if (value > LIMITS.alarm) cardState = 'alarm';
    else if (value > LIMITS.warning) cardState = 'warning';
    else if (value > LIMITS.ok) cardState = 'info';
  }
  const card = document.getElementById(`metric-card-${id}`);
  if (card) card.className = `metric-card ${cardState}`;
  valEl.textContent = value.toFixed(id === 'OU' ? 2 : 1);
  valEl.dataset.val = value;
  const trendEl = document.getElementById(`metric-trend-${id}`);
  if (trendEl) {
    const diff = value - oldVal;
    trendEl.textContent = diff > 0 ? `↑ +${diff.toFixed(2)}` : diff < 0 ? `↓ ${diff.toFixed(2)}` : '→ stabile';
    trendEl.style.color = cardState === 'alarm' ? '#EF4444' : cardState === 'warning' ? '#F59E0B' : '#10B981';
  }
}

function updateSemaphore(reading, state) {
  const ring  = document.getElementById('semaphore-ring');
  const icon  = document.getElementById('semaphore-icon');
  const label = document.getElementById('semaphore-state');
  const norm  = document.getElementById('semaphore-norm');
  if (!ring) return;
  ring.className = `semaphore-ring ${state} ${state === 'alarm' ? 'pulse-alarm' : state === 'warning' ? 'pulse-warning' : 'pulse-ok'}`;
  const cfg = {
    ok:      { icon: '✅', label: 'CONFORME',     norm: 'Valori nei limiti SNPA 268/2025', color: '#10B981' },
    warning: { icon: '⚠️', label: 'ATTENZIONE',   norm: 'Avvicinarsi alle soglie SNPA',    color: '#F59E0B' },
    alarm:   { icon: '🚨', label: 'ALLARME',      norm: 'Superamento soglia SNPA 268/2025',color: '#EF4444' }
  }[state] || { icon: '✅', label: '', norm: '' };
  if (icon)  icon.textContent  = cfg.icon;
  if (label) { label.textContent = cfg.label; label.style.color = cfg.color; }
  if (norm)  norm.textContent  = cfg.norm;
}

function updateSemaBars(reading) {
  const compounds = ['H2S', 'VOC', 'NH3'];
  compounds.forEach(c => {
    const pct   = ChartsModule.getLimitPercent(c, reading[c]);
    const fill  = document.getElementById(`sema-fill-${c}`);
    const valEl = document.getElementById(`sema-val-${c}`);
    if (fill) {
      fill.style.width = pct + '%';
      const color = pct >= 100 ? '#EF4444' : pct >= 60 ? '#F59E0B' : '#10B981';
      fill.style.background = `linear-gradient(90deg, ${color}, ${color}88)`;
    }
    if (valEl) valEl.textContent = `${reading[c].toFixed(1)} ppb (${pct}%)`;
  });
}

async function runCitizenCheck() {
  const btn = document.getElementById('citizen-check-btn');
  if (btn) { btn.disabled = true; btn.innerHTML = `<div class="spinner"></div> Analisi in corso...`; }
  const citizenCoords = [45.4500, 12.2300];
  const ts = Date.now() - Math.random() * 900000;
  try {
    const result = await CitizenCheck.runCorrelationAnalysis(citizenCoords, ts, 'Odore pungente rilevato in zona Marghera');
    CitizenCheck.renderResult(result, 'citizen-result-dashboard');
    HeatmapModule.addCitizenMarker(citizenCoords, 'Segnalazione odore pungente — Marghera');
  } catch (err) {
    showToast('Errore durante analisi correlazione: ' + err.message, 'alarm');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = `<span class="citizen-btn-icon">👤</span><div class="citizen-btn-text"><h4 style="font-size:0.85rem;margin-bottom:0">Segnalazione Cittadino</h4><p style="font-size:0.7rem;margin:0">Check correlazione istantaneo</p></div>`; }
  }
}

// Load some base sensors for report generation even without MCDA view
function loadSensorsFromExcel() {
  if(!window.EXCEL_DATA) return;
  const sheet = EXCEL_DATA['MATRICE MCDA'];
  if(!sheet) return;
  
  // Format for report generator
  const headers = sheet[2];
  const dataRows = sheet.slice(3);
  
  AppState.sensors = dataRows.map(r => ({
    ranking: r["43"],
    name: r["3"],
    manufacturer: r["3"].split('—')[0]?.trim() || '',
    technology: [r["1"], r["2"]].filter(x=>x),
    lod_ppb: r["15"],
    atex_certified: r["6"] === 'Sì',
    mcda_scores: {
      compliance: parseFloat(r["13"])||0,
      performance: parseFloat(r["22"])||0,
      interoperabilita: parseFloat(r["33"])||0,
      economia: parseFloat(r["42"])||0,
      total: parseFloat(r["42"])||0 // Usiamo la G colonna (42) come totale
    }
  })).filter(s => s.name);
}

function initApp() {
  document.querySelectorAll('[data-nav]').forEach(el => {
    el.addEventListener('click', () => navigateTo(el.dataset.nav));
  });

  document.getElementById('sidebar-toggle')?.addEventListener('click', () => {
    document.getElementById('sidebar')?.classList.toggle('collapsed');
    setTimeout(() => HeatmapModule.invalidate(), 300);
  });

  document.getElementById('citizen-check-btn')?.addEventListener('click', runCitizenCheck);

  document.getElementById('btn-generate-pdf')?.addEventListener('click', () => {
    if(window.ReportGenerator) ReportGenerator.generatePDF(AppState.currentReading, AppState.currentState);
  });
  document.getElementById('btn-export-csv')?.addEventListener('click', () => {
    if(window.ReportGenerator) ReportGenerator.exportCSV(AppState.currentReading, AppState.currentState);
  });

  if(window.ChartsModule) ChartsModule.initCharts();
  if(window.HeatmapModule) HeatmapModule.initMap();
  
  loadSensorsFromExcel();

  navigateTo('dashboard');
  startClock();

  AppState.updateTimer = setInterval(updateDashboard, CONFIG.UPDATE_INTERVAL_MS);
  updateDashboard();
}

window.addEventListener('DOMContentLoaded', initApp);
