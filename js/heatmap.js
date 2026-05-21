/**
 * C-Lab ENI — Heatmap Odore + Rosa dei Venti
 * Leaflet.js + leaflet.heat + D3.js (Rosa dei Venti SVG)
 */

const HeatmapModule = (() => {

  let map = null;
  let heatLayer = null;
  let sensorMarkers = [];
  let windArrowLayer = null;
  let updateInterval = null;

  // ─── Dati Vento Simulati ──────────────────────────────────────────────
  const windState = {
    direction: 135,   // gradi (SE = vento che va verso NW)
    speed: 4.2,       // m/s
    dirLabel: 'SE'
  };

  const WIND_DIRECTIONS = [
    { deg: 0,   label: 'N'  }, { deg: 45,  label: 'NE' },
    { deg: 90,  label: 'E'  }, { deg: 135, label: 'SE' },
    { deg: 180, label: 'S'  }, { deg: 225, label: 'SW' },
    { deg: 270, label: 'W'  }, { deg: 315, label: 'NW' }
  ];

  // Frequenza vento storica Ravenna (%)
  const WIND_FREQUENCY = [8, 12, 15, 18, 14, 10, 9, 14];

  // ─── Sensori posizionati sulla mappa ──────────────────────────────────
  const SENSOR_LOCATIONS = [
    { id: 'S01', name: 'Punto di Emissione A — Topping',     coords: [45.4526, 12.2384], type: 'PID',  status: 'ok'      },
    { id: 'S02', name: 'Perimetro Nord — Stoccaggio',        coords: [45.4546, 12.2434], type: 'EC',   status: 'warning' },
    { id: 'S03', name: 'Area Trattamento Acque (TAS)',        coords: [45.4486, 12.2414], type: 'MOS',  status: 'ok'      },
    { id: 'S04', name: 'Perimetro Est — Fonderie',            coords: [45.4516, 12.2474], type: 'PID',  status: 'alarm'   },
    { id: 'S05', name: 'Punto di Emissione B — Hydro',       coords: [45.4496, 12.2354], type: 'EC',   status: 'ok'      },
    { id: 'GW1', name: 'Gateway LoRaWAN — Torretta N',       coords: [45.4556, 12.2404], type: 'GW',   status: 'ok'      },
    { id: 'GW2', name: 'Gateway LoRaWAN — Torretta S',       coords: [45.4476, 12.2444], type: 'GW',   status: 'ok'      }
  ];

  // ─── Genera Heatmap data dalla direzione vento ─────────────────────────
  function generateHeatData() {
    const center = CONFIG.SITE_COORDS;
    const points = [];
    const windRad = (windState.direction * Math.PI) / 180;

    // Nuvola principale dal sito (+ deriva per vento)
    for (let i = 0; i < 80; i++) {
      const angle = Math.random() * 2 * Math.PI;
      const r     = Math.random() * 0.008;
      const drift = (Math.random() * 0.006 + 0.002) * windState.speed / 5;

      const lat = center[0] + r * Math.cos(angle) + drift * Math.cos(windRad);
      const lng = center[1] + r * Math.sin(angle) + drift * Math.sin(windRad);

      const intensity = Math.random() * 0.7 + 0.3;
      points.push([lat, lng, intensity]);
    }

    // Tail della nuvola nella direzione del vento
    for (let i = 0; i < 40; i++) {
      const t     = Math.random() * 0.015 + 0.005;
      const perp  = (Math.random() - 0.5) * 0.003;
      const lat   = center[0] + t * Math.cos(windRad) + perp * Math.sin(windRad);
      const lng   = center[1] + t * Math.sin(windRad) + perp * Math.cos(windRad);
      const decay = 1 - (t / 0.02);
      points.push([lat, lng, decay * (Math.random() * 0.5 + 0.1)]);
    }

    return points;
  }

  // ─── Inizializza Mappa ─────────────────────────────────────────────────
  function initMap() {
    const mapEl = document.getElementById('map-leaflet');
    if (!mapEl || map) return;

    map = L.map('map-leaflet', {
      center: CONFIG.SITE_COORDS,
      zoom:   CONFIG.MAP_ZOOM,
      zoomControl: true,
      attributionControl: false
    });

    // Tile Layer light (CartoDB Positron)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CartoDB',
      subdomains: 'abcd',
      maxZoom: 18
    }).addTo(map);

    // Attribuzione ENI
    L.control.attribution({ position: 'bottomright', prefix: 'C-Lab ENI' }).addTo(map);

    // Heatmap Layer
    const heatData = generateHeatData();
    heatLayer = L.heatLayer(heatData, {
      radius:    28,
      blur:      22,
      maxZoom:   16,
      max:       1.0,
      gradient:  {
        0.0: '#22514a',
        0.2: '#418561',
        0.4: '#d5ce2e',
        0.6: '#ba683e',
        0.8: '#ba683e',
        1.0: '#ba683e'
      }
    }).addTo(map);

    // Perimetro sito ENI
    const center = CONFIG.SITE_COORDS;
    L.circle(center, {
      radius:      1800,
      color:       CONFIG.ENI_COLORS.blue,
      fillColor:   CONFIG.ENI_COLORS.blue,
      fillOpacity: 0.04,
      weight:      2,
      dashArray:   '6,4',
      opacity:     0.5
    }).addTo(map).bindTooltip('Perimetro Monitoraggio C-Lab ENI', { permanent: false });

    // Marcatore sito principale
    const siteIcon = L.divIcon({
      className: '',
      html: `<div style="
        width:42px;height:42px;
        background:linear-gradient(135deg,#003399,#001F66);
        border:2px solid #F9D100;
        border-radius:50%;
        display:flex;align-items:center;justify-content:center;
        font-size:1.2rem;
        box-shadow:0 0 20px rgba(0,51,153,0.6);
        cursor:pointer;
      ">🏭</div>`,
      iconSize: [42, 42],
      iconAnchor: [21, 21]
    });
    L.marker(center, { icon: siteIcon })
      .addTo(map)
      .bindPopup(`<div style="color:#000;font-family:Inter,sans-serif;font-size:13px;min-width:220px">
        <strong style="color:#003399;">${CONFIG.SITE_NAME}</strong><br>
        <span style="color:#666;font-size:11px;">Raffineria ENI — Zona Industriale Porto</span><br><br>
        <b>Coord:</b> ${center[0].toFixed(4)}, ${center[1].toFixed(4)}<br>
        <b>Area:</b> Zona ATEX classificata<br>
        <b>Sensori attivi:</b> ${SENSOR_LOCATIONS.filter(s => s.type !== 'GW').length}
      </div>`);

    // Sensori e Gateway
    addSensorMarkers();

    // Scale
    L.control.scale({ metric: true, imperial: false, position: 'bottomleft' }).addTo(map);

    // Rosa dei Venti (SVG via D3)
    initWindRose();
  }

  // ─── Marker Sensori ────────────────────────────────────────────────────
  function addSensorMarkers() {
    SENSOR_LOCATIONS.forEach(loc => {
      const colors = {
        ok:      { bg: '#10B981', border: '#34D399' },
        warning: { bg: '#F59E0B', border: '#FBBF24' },
        alarm:   { bg: '#EF4444', border: '#F87171' }
      };
      const isGW = loc.type === 'GW';
      const col = colors[loc.status] || colors.ok;

      const icon = L.divIcon({
        className: '',
        html: `<div style="
          width:${isGW ? 32 : 26}px;height:${isGW ? 32 : 26}px;
          background:${isGW ? '#1a2235' : col.bg}22;
          border:2px solid ${isGW ? '#4A5568' : col.bg};
          border-radius:${isGW ? '6px' : '50%'};
          display:flex;align-items:center;justify-content:center;
          font-size:${isGW ? '1rem' : '0.75rem'};
          box-shadow:0 0 ${isGW ? 8 : 12}px ${col.bg}66;
        ">${isGW ? '📡' : (loc.type === 'PID' ? '🔵' : loc.type === 'EC' ? '🟢' : '🟡')}</div>`,
        iconSize: [isGW ? 32 : 26, isGW ? 32 : 26],
        iconAnchor: [isGW ? 16 : 13, isGW ? 16 : 13]
      });

      const marker = L.marker(loc.coords, { icon })
        .addTo(map)
        .bindPopup(`<div style="font-family:Inter,sans-serif;font-size:12px;min-width:200px;color:#111">
          <strong>${loc.name}</strong><br>
          <span style="color:#666">${loc.id} — ${loc.type}</span><br>
          <span style="color:${loc.status === 'alarm' ? '#dc2626' : loc.status === 'warning' ? '#d97706' : '#059669'};font-weight:700;text-transform:uppercase;font-size:10px;">
            ● ${loc.status.toUpperCase()}
          </span>
          ${isGW ? '<br><span style="color:#666;font-size:10px;">LoRaWAN Gateway — Online</span>' : ''}
        </div>`);

      sensorMarkers.push(marker);
    });
  }

  // ─── Rosa dei Venti (D3.js SVG) ───────────────────────────────────────
  function initWindRose() {
    const container = document.getElementById('wind-rose-overlay');
    if (!container || typeof d3 === 'undefined') return;

    const size = 130;
    const cx = size / 2;
    const cy = size / 2;
    const outerR = 52;

    const svg = d3.select(container)
      .append('svg')
      .attr('width', size).attr('height', size)
      .style('border-radius', '50%');

    // Griglia circolare
    [0.3, 0.6, 1.0].forEach(ratio => {
      svg.append('circle')
        .attr('cx', cx).attr('cy', cy)
        .attr('r', outerR * ratio)
        .attr('fill', 'none')
        .attr('stroke', 'rgba(255,255,255,0.1)')
        .attr('stroke-width', 0.8);
    });

    // Assi cardinali
    ['N','E','S','W'].forEach((label, i) => {
      const rad = (i * 90 - 90) * Math.PI / 180;
      svg.append('line')
        .attr('x1', cx).attr('y1', cy)
        .attr('x2', cx + outerR * Math.cos(rad)).attr('y2', cy + outerR * Math.sin(rad))
        .attr('stroke', 'rgba(255,255,255,0.15)').attr('stroke-width', 0.8);

      svg.append('text')
        .attr('x', cx + (outerR + 8) * Math.cos(rad))
        .attr('y', cy + (outerR + 8) * Math.sin(rad))
        .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
        .attr('fill', '#52637A').attr('font-size', '8px').attr('font-family', 'Inter,sans-serif')
        .text(label);
    });

    // Petali vento (frequenza per direzione)
    const petalArc = d3.arc()
      .innerRadius(0)
      .startAngle(d => (d.deg - 22.5) * Math.PI / 180)
      .endAngle(d => (d.deg + 22.5) * Math.PI / 180);

    WIND_FREQUENCY.forEach((freq, i) => {
      const r = (freq / 20) * outerR * 0.9;
      petalArc.outerRadius(r);
      const isCurrentDir = i === WIND_DIRECTIONS.findIndex(d => d.label === windState.dirLabel);

      svg.append('path')
        .attr('transform', `translate(${cx},${cy})`)
        .attr('d', petalArc({ deg: WIND_DIRECTIONS[i].deg * Math.PI / 180 } ))
        .attr('fill', isCurrentDir ? 'rgba(249,209,0,0.6)' : 'rgba(0,68,204,0.4)')
        .attr('stroke', isCurrentDir ? 'rgba(249,209,0,0.8)' : 'rgba(0,68,204,0.6)')
        .attr('stroke-width', 0.8);
    });

    // Freccia direzione vento corrente
    drawWindArrow(svg, cx, cy, outerR);

    // Label velocità
    svg.append('text')
      .attr('x', cx).attr('y', size - 8)
      .attr('text-anchor', 'middle')
      .attr('fill', '#F9D100')
      .attr('font-size', '9px')
      .attr('font-family', 'JetBrains Mono, monospace')
      .attr('id', 'wind-speed-label')
      .text(`${windState.dirLabel} ${windState.speed} m/s`);
  }

  function drawWindArrow(svg, cx, cy, outerR) {
    const rad = (windState.direction - 90) * Math.PI / 180;
    const len = outerR * 0.7;

    svg.selectAll('.wind-arrow').remove();
    svg.append('line')
      .attr('class', 'wind-arrow')
      .attr('x1', cx - len * 0.3 * Math.cos(rad)).attr('y1', cy - len * 0.3 * Math.sin(rad))
      .attr('x2', cx + len * Math.cos(rad)).attr('y2', cy + len * Math.sin(rad))
      .attr('stroke', '#F9D100').attr('stroke-width', 2.5)
      .attr('marker-end', 'url(#arrow)');

    // Arrowhead marker (definisci solo una volta)
    if (!svg.select('defs').node()) {
      const defs = svg.append('defs');
      defs.append('marker')
        .attr('id', 'arrow').attr('viewBox', '0 0 10 10')
        .attr('refX', 9).attr('refY', 5)
        .attr('markerWidth', 5).attr('markerHeight', 5)
        .attr('orient', 'auto')
        .append('path').attr('d', 'M 0 0 L 10 5 L 0 10 z').attr('fill', '#F9D100');
    }
  }

  // ─── Aggiorna Heatmap ───────────────────────────────────────────────────
  function updateHeatmap() {
    if (!heatLayer) return;

    // Varia leggermente il vento
    windState.direction = (windState.direction + (Math.random() - 0.5) * 5 + 360) % 360;
    windState.speed     = Math.max(0.5, Math.min(12, windState.speed + (Math.random() - 0.5) * 0.5));
    windState.dirLabel  = getWindLabel(windState.direction);

    // Aggiorna heatmap
    const newData = generateHeatData();
    heatLayer.setLatLngs(newData);

    // Aggiorna label vento
    const label = document.getElementById('wind-speed-label');
    if (label) label.textContent = `${windState.dirLabel} ${windState.speed.toFixed(1)} m/s`;

    // Aggiorna widget topbar
    const windWidget = document.getElementById('wind-display');
    if (windWidget) windWidget.textContent = `💨 ${windState.dirLabel} ${windState.speed.toFixed(1)} m/s`;
  }

  function getWindLabel(deg) {
    const dirs = ['N','NE','E','SE','S','SW','W','NW'];
    const idx  = Math.round(deg / 45) % 8;
    return dirs[idx];
  }

  // ─── Aggiunge marker segnalazione cittadino ────────────────────────────
  function addCitizenMarker(coords, message) {
    if (!map) return;
    const icon = L.divIcon({
      className: '',
      html: `<div style="
        width:36px;height:36px;background:rgba(239,68,68,0.9);
        border:2px solid #fff;border-radius:50%;
        display:flex;align-items:center;justify-content:center;
        font-size:1.1rem;box-shadow:0 0 15px rgba(239,68,68,0.6);
        animation: pulse 1s ease infinite;
      ">👤</div>`,
      iconSize: [36,36], iconAnchor: [18,18]
    });
    L.marker(coords, { icon }).addTo(map)
      .bindPopup(`<div style="font-family:Inter;font-size:12px;color:#111">
        <strong>🚨 Segnalazione Cittadino</strong><br>${message}<br>
        <span style="color:#666;font-size:10px;">${new Date().toLocaleTimeString('it-IT')}</span>
      </div>`)
      .openPopup();

    map.flyTo(coords, 14, { duration: 1.5 });
  }

  // ─── API pubblica ─────────────────────────────────────────────────────
  return {
    initMap,
    updateHeatmap,
    addCitizenMarker,
    getWindState: () => ({ ...windState }),
    invalidate: () => map && map.invalidateSize()
  };
})();

window.HeatmapModule = HeatmapModule;
