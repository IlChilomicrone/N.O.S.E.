/**
 * C-Lab ENI — Grafici Real-time (Chart.js)
 * Parametri: H2S, VOC, NH3 con soglie SNPA 268/2025
 */

const ChartsModule = (() => {

  const LIMITS = CONFIG.SNPA_LIMITS;
  const COLORS = CONFIG.ENI_COLORS;

  // ─── Store dei grafici ────────────────────────────────────────────────
  const charts = {};

  // ─── Generazione Dati Simulati ────────────────────────────────────────
  const history = {
    labels: [],
    H2S:   [],
    VOC:   [],
    NH3:   [],
    OU:    []
  };

  function generateInitialHistory() {
    const now = Date.now();
    const n   = CONFIG.HISTORY_POINTS;

    for (let i = n; i >= 0; i--) {
      const t = new Date(now - i * 8000);
      history.labels.push(t.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

      // Simulazione con fluttuazioni realistiche + eventuali picchi
      history.H2S.push(parseFloat((Math.random() * 4 + 0.5 + (Math.random() > 0.95 ? 6 : 0)).toFixed(2)));
      history.VOC.push(parseFloat((Math.random() * 120 + 40  + (Math.random() > 0.93 ? 100 : 0)).toFixed(1)));
      history.NH3.push(parseFloat((Math.random() * 50  + 15  + (Math.random() > 0.94 ? 80 : 0)).toFixed(1)));
      history.OU.push(parseFloat((Math.random() * 3   + 0.3  + (Math.random() > 0.96 ? 7 : 0)).toFixed(2)));
    }
  }

  // ─── Nuova lettura simulata ───────────────────────────────────────────
  function getNewReading() {
    // Genera trend realistici: random walk + rumore
    const last = {
      H2S: history.H2S[history.H2S.length - 1] || 2,
      VOC: history.VOC[history.VOC.length - 1] || 80,
      NH3: history.NH3[history.NH3.length - 1] || 30,
      OU:  history.OU[history.OU.length  - 1] || 1
    };

    const delta = { H2S: (Math.random()-0.5)*0.8, VOC: (Math.random()-0.5)*12, NH3: (Math.random()-0.5)*6, OU: (Math.random()-0.5)*0.4 };

    // Spike occasionale
    const spike = Math.random() > 0.96;
    return {
      H2S: Math.max(0.01, parseFloat((last.H2S + delta.H2S + (spike ? 5 + Math.random()*4 : 0)).toFixed(2))),
      VOC: Math.max(0.1,  parseFloat((last.VOC + delta.VOC  + (spike ? 80 + Math.random()*60 : 0)).toFixed(1))),
      NH3: Math.max(0.1,  parseFloat((last.NH3 + delta.NH3  + (spike ? 50 + Math.random()*40 : 0)).toFixed(1))),
      OU:  Math.max(0.01, parseFloat((last.OU  + delta.OU   + (spike ? 5  + Math.random()*3  : 0)).toFixed(2)))
    };
  }

  // ─── Configurazione comune ───────────────────────────────────────────
  const commonOptions = {
    responsive: true,
    maintainAspectRatio: true,
    animation: { duration: 400 },
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(13,18,32,0.95)',
        borderColor: 'rgba(255,255,255,0.08)',
        borderWidth: 1,
        titleColor: '#94A3B8',
        bodyColor: '#F0F4FF',
        padding: 10,
        cornerRadius: 8
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false },
        ticks: {
          color: '#52637A',
          maxTicksLimit: 8,
          font: { size: 10, family: "'JetBrains Mono', monospace" }
        }
      },
      y: {
        grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false },
        ticks: {
          color: '#52637A',
          font: { size: 10, family: "'JetBrains Mono', monospace" }
        },
        beginAtZero: true
      }
    }
  };

  // ─── Threshold Line Plugin  ───────────────────────────────────────────
  function thresholdPlugin(okVal, warnVal) {
    return {
      id: 'threshold',
      afterDraw(chart) {
        const { ctx, chartArea, scales } = chart;
        if (!chartArea) return;
        const { left, right } = chartArea;

        [{ val: warnVal, color: 'rgba(245,158,11,0.5)', label: 'Warning' },
         { val: okVal,   color: 'rgba(16,185,129,0.3)', label: 'OK' }].forEach(({ val, color, label }) => {
          const y = scales.y.getPixelForValue(val);
          ctx.save();
          ctx.beginPath();
          ctx.setLineDash([6, 4]);
          ctx.strokeStyle = color;
          ctx.lineWidth = 1.5;
          ctx.moveTo(left, y);
          ctx.lineTo(right, y);
          ctx.stroke();
          ctx.fillStyle = color;
          ctx.font = '9px JetBrains Mono';
          ctx.fillText(label, right - 42, y - 4);
          ctx.restore();
        });
      }
    };
  }

  // ─── Crea Gradient ────────────────────────────────────────────────────
  function createGradient(ctx, color1, color2) {
    const gradient = ctx.createLinearGradient(0, 0, 0, 250);
    gradient.addColorStop(0, color1);
    gradient.addColorStop(1, color2);
    return gradient;
  }

  // ─── Init Grafici ─────────────────────────────────────────────────────
  function initCharts() {
    generateInitialHistory();

    // H2S Chart
    const ctxH2S = document.getElementById('chart-h2s');
    if (ctxH2S) {
      const grad = createGradient(ctxH2S.getContext('2d'), 'rgba(239,68,68,0.25)', 'rgba(239,68,68,0.02)');
      charts.h2s = new Chart(ctxH2S, {
        type: 'line',
        data: {
          labels: [...history.labels],
          datasets: [{
            label: 'H₂S (ppb)',
            data: [...history.H2S],
            borderColor: '#EF4444',
            backgroundColor: grad,
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 4,
            pointHoverBackgroundColor: '#EF4444',
            tension: 0.4,
            fill: true
          }]
        },
        options: {
          ...commonOptions,
          scales: {
            ...commonOptions.scales,
            y: { ...commonOptions.scales.y, max: Math.max(15, Math.max(...history.H2S) * 1.3) }
          },
          plugins: {
            ...commonOptions.plugins,
            threshold: thresholdPlugin(LIMITS.H2S.ok, LIMITS.H2S.warning)
          }
        },
        plugins: [thresholdPlugin(LIMITS.H2S.ok, LIMITS.H2S.warning)]
      });
    }

    // VOC Chart
    const ctxVOC = document.getElementById('chart-voc');
    if (ctxVOC) {
      const grad = createGradient(ctxVOC.getContext('2d'), 'rgba(249,209,0,0.2)', 'rgba(249,209,0,0.02)');
      charts.voc = new Chart(ctxVOC, {
        type: 'line',
        data: {
          labels: [...history.labels],
          datasets: [{
            label: 'VOC (ppb)',
            data: [...history.VOC],
            borderColor: '#F9D100',
            backgroundColor: grad,
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 4,
            pointHoverBackgroundColor: '#F9D100',
            tension: 0.4,
            fill: true
          }]
        },
        options: {
          ...commonOptions,
          scales: {
            ...commonOptions.scales,
            y: { ...commonOptions.scales.y, max: Math.max(350, Math.max(...history.VOC) * 1.3) }
          }
        },
        plugins: [thresholdPlugin(LIMITS.VOC.ok, LIMITS.VOC.warning)]
      });
    }

    // NH3 Chart
    const ctxNH3 = document.getElementById('chart-nh3');
    if (ctxNH3) {
      const grad = createGradient(ctxNH3.getContext('2d'), 'rgba(59,130,246,0.2)', 'rgba(59,130,246,0.02)');
      charts.nh3 = new Chart(ctxNH3, {
        type: 'line',
        data: {
          labels: [...history.labels],
          datasets: [{
            label: 'NH₃ (ppb)',
            data: [...history.NH3],
            borderColor: '#3B82F6',
            backgroundColor: grad,
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 4,
            pointHoverBackgroundColor: '#3B82F6',
            tension: 0.4,
            fill: true
          }]
        },
        options: {
          ...commonOptions,
          scales: {
            ...commonOptions.scales,
            y: { ...commonOptions.scales.y, max: Math.max(180, Math.max(...history.NH3) * 1.3) }
          }
        },
        plugins: [thresholdPlugin(LIMITS.NH3.ok, LIMITS.NH3.warning)]
      });
    }
  }

  // ─── Aggiornamento Real-time ──────────────────────────────────────────
  function updateCharts() {
    const reading = getNewReading();
    const timeLabel = new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const MAX_POINTS = CONFIG.HISTORY_POINTS;

    // Aggiorna history
    history.labels.push(timeLabel);
    history.H2S.push(reading.H2S);
    history.VOC.push(reading.VOC);
    history.NH3.push(reading.NH3);
    history.OU.push(reading.OU);

    if (history.labels.length > MAX_POINTS) {
      history.labels.shift();
      history.H2S.shift();
      history.VOC.shift();
      history.NH3.shift();
      history.OU.shift();
    }

    // Aggiorna charts
    if (charts.h2s) {
      charts.h2s.data.labels = [...history.labels];
      charts.h2s.data.datasets[0].data = [...history.H2S];
      charts.h2s.update('none');
    }
    if (charts.voc) {
      charts.voc.data.labels = [...history.labels];
      charts.voc.data.datasets[0].data = [...history.VOC];
      charts.voc.update('none');
    }
    if (charts.nh3) {
      charts.nh3.data.labels = [...history.labels];
      charts.nh3.data.datasets[0].data = [...history.NH3];
      charts.nh3.update('none');
    }

    return reading;
  }

  // ─── Lettura Corrente ─────────────────────────────────────────────────
  function getCurrentReading() {
    const n = history.H2S.length;
    if (n === 0) return { H2S: 0, VOC: 0, NH3: 0, OU: 0 };
    return {
      H2S: history.H2S[n-1],
      VOC: history.VOC[n-1],
      NH3: history.NH3[n-1],
      OU:  history.OU[n-1]
    };
  }

  // ─── Stato Compliance ─────────────────────────────────────────────────
  function getComplianceState(reading) {
    const { H2S, VOC, NH3 } = reading;
    const L = LIMITS;

    if (H2S > L.H2S.alarm || VOC > L.VOC.alarm || NH3 > L.NH3.alarm) return 'alarm';
    if (H2S > L.H2S.warning || VOC > L.VOC.warning || NH3 > L.NH3.warning) return 'warning';
    return 'ok';
  }

  // ─── Percentuale rispetto soglia ──────────────────────────────────────
  function getLimitPercent(compound, value) {
    const alarm = LIMITS[compound]?.alarm || 10;
    return Math.min(100, Math.round((value / alarm) * 100));
  }

  // ─── Storico per correlazione timestamp ──────────────────────────────
  function getHistoryAtTimestamp(ts) {
    // Ritorna la lettura più vicina al timestamp fornito
    const idx = Math.max(0, history.H2S.length - Math.floor((Date.now() - ts) / 8000) - 1);
    return {
      H2S: history.H2S[idx] || 0,
      VOC: history.VOC[idx] || 0,
      NH3: history.NH3[idx] || 0,
      OU:  history.OU[idx]  || 0,
      label: history.labels[idx] || '—'
    };
  }

  return {
    initCharts,
    updateCharts,
    getCurrentReading,
    getComplianceState,
    getLimitPercent,
    getHistoryAtTimestamp,
    history
  };
})();

window.ChartsModule = ChartsModule;
