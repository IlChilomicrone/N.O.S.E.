/**
 * C-Lab ENI — Generatore Report UNI EN 13725 Allegato 1
 * jsPDF per PDF audit-ready, CSV per export matrice ARPA
 */

const ReportGenerator = (() => {

  // ─── Metadati report ──────────────────────────────────────────────────
  function getReportMeta() {
    return {
      siteName:      CONFIG.SITE_NAME,
      siteCoords:    CONFIG.SITE_COORDS,
      dateStr:       new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' }),
      timeStr:       new Date().toLocaleTimeString('it-IT'),
      reportNumber:  `CLAB-ENI-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
      operator:      'C-Lab ENI — Sistema AI C-Lab v2.3',
      normRef:       'UNI EN 13725:2022 — SNPA 268/2025'
    };
  }

  // ─── Aggiorna Preview HTML ────────────────────────────────────────────
  function updatePreview(reading, state) {
    const meta = getReportMeta();
    const el = document.getElementById('report-preview-doc');
    if (!el) return;

    el.innerHTML = `
      <div style="border-bottom:3px solid #22514a;padding-bottom:12px;margin-bottom:16px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div>
            <div style="font-size:0.7rem;color:#666;text-transform:uppercase;letter-spacing:0.1em">Progetto C-Lab ENI</div>
            <h1 style="font-size:1.2rem;color:#22514a;margin:4px 0 2px">RAPPORTO DI MONITORAGGIO AMBIENTALE</br>EMISSIONI ODORIGENE INDUSTRIALI</h1>
            <div style="font-size:0.75rem;color:#444">Allegato 1 — Conformità SNPA 268/2025</div>
          </div>
          <div style="text-align:right;font-size:0.78rem">
            <div style="font-weight:bold;color:#22514a">ENI S.p.A. — C-Lab</div>
            <div style="color:#666">N° ${meta.reportNumber}</div>
            <div style="color:#666">${meta.dateStr}</div>
          </div>
        </div>
      </div>

      <h2>1. Informazioni Generali</h2>
      <table>
        <tr><td><strong>Impianto</strong></td><td>${meta.siteName}</td></tr>
        <tr><td><strong>Coordinate</strong></td><td>${meta.siteCoords[0].toFixed(4)}°N, ${meta.siteCoords[1].toFixed(4)}°E</td></tr>
        <tr><td><strong>Data Analisi</strong></td><td>${meta.dateStr} ore ${meta.timeStr}</td></tr>
        <tr><td><strong>Riferimento Normativo</strong></td><td>${meta.normRef}</td></tr>
        <tr><td><strong>Stato Impianto</strong></td><td>${state === 'ok' ? 'Conforme' : state === 'warning' ? 'Attenzione' : 'Allarme'}</td></tr>
        <tr><td><strong>Redatto da</strong></td><td>${meta.operator}</td></tr>
      </table>

      <h2>2. Dati Ambientali (Real-time)</h2>
      <table>
        <thead><tr><th>Parametro</th><th>Simbolo</th><th>Valore Rilevato</th><th>Limite (Allarme)</th><th>Stato</th><th>Unità</th></tr></thead>
        <tbody>
          <tr><td>Idrogeno Solforato</td><td>H₂S</td><td style="font-weight:bold">${reading.H2S.toFixed(1)}</td><td>${CONFIG.SNPA_LIMITS.H2S.alarm}</td><td style="color:${reading.H2S > CONFIG.SNPA_LIMITS.H2S.alarm ? 'red' : 'green'}">${reading.H2S > CONFIG.SNPA_LIMITS.H2S.alarm ? 'ALLARME' : 'OK'}</td><td>ppb</td></tr>
          <tr><td>Composti Organici Volatili</td><td>VOC</td><td style="font-weight:bold">${reading.VOC.toFixed(1)}</td><td>${CONFIG.SNPA_LIMITS.VOC.alarm}</td><td style="color:${reading.VOC > CONFIG.SNPA_LIMITS.VOC.alarm ? 'red' : 'green'}">${reading.VOC > CONFIG.SNPA_LIMITS.VOC.alarm ? 'ALLARME' : 'OK'}</td><td>ppb</td></tr>
          <tr><td>Ammoniaca</td><td>NH₃</td><td style="font-weight:bold">${reading.NH3.toFixed(1)}</td><td>${CONFIG.SNPA_LIMITS.NH3.alarm}</td><td style="color:${reading.NH3 > CONFIG.SNPA_LIMITS.NH3.alarm ? 'red' : 'green'}">${reading.NH3 > CONFIG.SNPA_LIMITS.NH3.alarm ? 'ALLARME' : 'OK'}</td><td>ppb</td></tr>
          <tr><td>Unità Olfattometriche</td><td>O.U.</td><td style="font-weight:bold">${reading.OU.toFixed(2)}</td><td>${CONFIG.SNPA_LIMITS.OU.alarm}</td><td style="color:${reading.OU > CONFIG.SNPA_LIMITS.OU.alarm ? 'red' : 'green'}">${reading.OU > CONFIG.SNPA_LIMITS.OU.alarm ? 'ALLARME' : 'OK'}</td><td>ou/m³</td></tr>
        </tbody>
      </table>

      <h2>3. Identificazione della Fonte (Tracking)</h2>
      <p style="font-size:0.8rem;line-height:1.7;color:#222">
        In base ai dati anemometrici (direzione prevalente del vento attuale: SE, 4.2 m/s) e alla mappa di dispersione termica elaborata, l'eventuale nube odorigena si sposta verso Nord-Ovest rispetto alle emissioni della raffineria. La correlazione con le segnalazioni cittadine attive è costantemente valutata dal sistema.
      </p>

      <h2>4. Dichiarazione di Conformità</h2>
      <p style="font-size:0.78rem;color:#444">
        Il presente rapporto è stato generato dal sistema C-Lab AI in data ${meta.dateStr} e costituisce documento tecnico 
        preliminare ai sensi della delibera SNPA 268/2025.
      </p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:20px">
        <div style="border-top:1px solid #999;padding-top:8px;font-size:0.75rem;color:#444">
          <div>Data e Firma Responsabile Ambientale ENI</div>
          <div style="margin-top:30px">_____________________________</div>
        </div>
        <div style="border-top:1px solid #999;padding-top:8px;font-size:0.75rem;color:#444">
          <div>Timbro Agenzia (ARPA)</div>
          <div style="margin-top:30px">_____________________________</div>
        </div>
      </div>
      <div style="text-align:center;margin-top:16px;font-size:0.65rem;color:#999;border-top:1px solid #eee;padding-top:8px">
        C-Lab ENI — Piattaforma Monitoraggio Odorigeno | Rif: ${meta.reportNumber} | ${meta.dateStr}
      </div>
    `;
  }

  // ─── Genera PDF con jsPDF ─────────────────────────────────────────────
  async function generatePDF(reading, state) {
    if (typeof window.jspdf === 'undefined') {
      showToast('Libreria jsPDF non caricata', 'alarm');
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc  = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const meta = getReportMeta();

    const W  = 210;
    const M  = 18;
    const CW = W - M * 2;
    let y    = M;

    const eniGreen = [34, 81, 74];
    const eniYellow = [213, 206, 46];
    const grey   = [74, 85, 104];
    const light  = [250, 253, 246];

    function addPage() { doc.addPage(); y = M; drawHeader(); }

    function drawHeader() {
      doc.setFillColor(...eniGreen);
      doc.rect(0, 0, W, 14, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('C-Lab ENI — Piattaforma Monitoraggio Emissioni Odorigene', M, 9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Rif: ${meta.reportNumber} | ${meta.dateStr}`, W - M, 9, { align: 'right' });
      y = 20;
    }

    // ─ Copertina ─
    drawHeader();

    // Titolo
    doc.setFillColor(...eniGreen);
    doc.rect(M, y, CW, 1.5, 'F');
    y += 6;
    doc.setTextColor(...eniGreen);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('RAPPORTO DI MONITORAGGIO', M, y);
    y += 9;
    doc.text('AMBIENTALE ODORIGENO', M, y);
    y += 7;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...grey);
    doc.text('Allegato 1 — Conformità SNPA 268/2025', M, y);
    y += 2;
    doc.setFillColor(...eniGreen);
    doc.rect(M, y, CW, 1.5, 'F');
    y += 10;

    // Info box
    doc.setFillColor(...light);
    doc.rect(M, y, CW, 45, 'F');
    doc.setFillColor(...eniGreen);
    doc.rect(M, y, 1.5, 45, 'F');
    y += 6;
    [
      ['Impianto:',  meta.siteName],
      ['Coordinate:', `${meta.siteCoords[0].toFixed(4)}°N, ${meta.siteCoords[1].toFixed(4)}°E`],
      ['Data:', `${meta.dateStr} ore ${meta.timeStr}`],
      ['Stato:', state === 'ok' ? 'Conforme' : state === 'warning' ? 'Attenzione' : 'Allarme'],
      ['Redatto da:', meta.operator]
    ].forEach(([label, val]) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...grey);
      doc.text(label, M + 5, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 30, 30);
      doc.text(String(val), M + 40, y);
      y += 6;
    });
    y += 10;

    // ─ Tabella Valori ─
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...eniGreen);
    doc.text('Valori Registrati', M, y);
    y += 6;

    const cols = ['Parametro', 'Simbolo', 'Rilevato', 'Soglia', 'Unità'];
    const widths = [60, 25, 30, 30, 20];

    doc.setFillColor(...eniGreen);
    doc.rect(M, y, CW, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    let xOff = M + 2;
    cols.forEach((c, i) => {
      doc.text(c, xOff, y + 5.5);
      xOff += widths[i];
    });
    y += 8;

    const dataRows = [
      ['Idrogeno Solforato', 'H2S', reading.H2S.toFixed(1), CONFIG.SNPA_LIMITS.H2S.alarm.toString(), 'ppb'],
      ['Composti Organici', 'VOC', reading.VOC.toFixed(1), CONFIG.SNPA_LIMITS.VOC.alarm.toString(), 'ppb'],
      ['Ammoniaca', 'NH3', reading.NH3.toFixed(1), CONFIG.SNPA_LIMITS.NH3.alarm.toString(), 'ppb'],
      ['Unità Olfattometriche', 'O.U.', reading.OU.toFixed(2), CONFIG.SNPA_LIMITS.OU.alarm.toString(), 'ou/m3']
    ];

    dataRows.forEach((row, idx) => {
      const isEven = idx % 2 === 0;
      doc.setFillColor(isEven ? 250 : 240, isEven ? 250 : 244, isEven ? 250 : 255);
      doc.rect(M, y, CW, 8, 'F');
      
      xOff = M + 2;
      row.forEach((val, i) => {
        if (i === 2) {
            doc.setFont('helvetica', 'bold');
            if (parseFloat(val) > parseFloat(row[3])) doc.setTextColor(220, 38, 38);
            else doc.setTextColor(30, 150, 30);
        } else {
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(30, 30, 30);
        }
        doc.text(val, xOff, y + 5.5);
        xOff += widths[i];
      });
      y += 8;
    });

    y += 12;

    // ─ Sezione Analisi ─
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...eniGreen);
    doc.text('Identificazione Fonte', M, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(50, 50, 50);

    const narText = "In base ai dati anemometrici (direzione prevalente del vento attuale: SE, 4.2 m/s) e alla mappa di dispersione termica elaborata, l'eventuale nube odorigena si sposta verso Nord-Ovest rispetto alle emissioni della raffineria. La correlazione con le segnalazioni cittadine attive è costantemente valutata dal sistema.";
    const lines = doc.splitTextToSize(narText, CW);
    lines.forEach(line => {
      if (y > 270) addPage();
      doc.text(line, M, y);
      y += 5.5;
    });

    y += 15;

    // ─ Firme ─
    if (y > 250) addPage();
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...grey);
    doc.line(M, y, M + 70, y);         doc.line(W - M - 70, y, W - M, y);
    y += 5;
    doc.text('Responsabile Ambientale ENI', M, y);
    doc.text('Timbro ARPA', W - M - 70, y);
    y += 12;

    // Footer
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150, 150, 150);
    doc.text(`C-Lab ENI | ${meta.reportNumber} | ${meta.dateStr} — Documento generato automaticamente. Validare prima della trasmissione ufficiale.`, W/2, 290, { align: 'center' });

    doc.save(`CLabENI_Report_${meta.reportNumber}.pdf`);
    showToast('PDF generato: CLabENI_Report_' + meta.reportNumber + '.pdf', 'ok');
  }

  // ─── Export CSV per ARPA ──────────────────────────────────────────────
  function exportCSV(reading, state) {
    const headers = [
      'Data','Ora','Stato Globale','H2S (ppb)','VOC (ppb)','NH3 (ppb)','OU (ou/m3)'
    ];

    const meta = getReportMeta();
    const rows = [
      [meta.dateStr, meta.timeStr, state, reading.H2S.toFixed(2), reading.VOC.toFixed(2), reading.NH3.toFixed(2), reading.OU.toFixed(2)]
    ];

    const csvContent = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `CLabENI_DatiAmbientali_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('CSV esportato per ARPA', 'ok');
  }

  return { updatePreview, generatePDF, exportCSV };
})();

window.ReportGenerator = ReportGenerator;
