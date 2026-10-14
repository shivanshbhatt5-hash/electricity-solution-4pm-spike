/**
 * CampusPulse AI // Interactive Campus Energy Map & Peak-Demand Alert Center
 * Powered by Leaflet.js (Local & Offline Resilient)
 * Features real-time building zone status, rooftop solar overlays,
 * protected critical load badges, and automated facility dispatch notifications.
 */

class CampusEnergyMapManager {
  constructor() {
    this.map = null;
    this.markers = [];
    this.buildings = [];
    this.alerts = [];

    this.init();
    this.listenToTelemetry();
  }

  async init() {
    await this.fetchData();
    this.initMap();
    this.renderAlertFeed();
  }

  async fetchData() {
    try {
      const [bldgRes, alertRes] = await Promise.all([
        fetch('/api/buildings'),
        fetch('/api/alerts')
      ]);
      const bldgData = await bldgRes.json();
      const alertData = await alertRes.json();

      this.buildings = bldgData.buildings || [];
      this.alerts = alertData || [];
    } catch (e) {
      console.error('Error fetching campus map data:', e);
    }
  }

  initMap() {
    const mapContainer = document.getElementById('campusLeafletMap');
    if (!mapContainer || !window.L) return;

    // Center on Campus Quad (Noida / Delhi NCR tech campus coordinates)
    const center = [28.6290, 77.3645];

    this.map = L.map('campusLeafletMap', {
      center: center,
      zoom: 16,
      minZoom: 14,
      maxZoom: 18,
      zoomControl: true
    });

    // Clean OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors • CampusPulse AI'
    }).addTo(this.map);

    this.renderBuildingMarkers();
    this.renderGridSubstation();
  }

  renderBuildingMarkers() {
    this.markers.forEach(m => this.map.removeLayer(m));
    this.markers = [];

    this.buildings.forEach(b => {
      const isPeak = b.status === 'PEAK_SPIKE' || b.status === 'HIGH_LOAD';
      const isProtected = b.category === 'Data Center' || b.category === 'Laboratory';
      const color = isPeak ? '#f43f5e' : (isProtected ? '#10b981' : '#0284c7');

      // Custom HTML Marker Icon
      const customIcon = L.divIcon({
        className: 'campus-map-marker',
        html: `
          <div style="position: relative; display: flex; align-items: center; justify-content: center;">
            ${isPeak ? `<div style="position: absolute; width: 34px; height: 34px; border-radius: 50%; background: rgba(244, 63, 94, 0.4); animation: radarPulseGreen 1.5s infinite;"></div>` : ''}
            <div style="width: 22px; height: 22px; border-radius: 50%; background: ${color}; border: 3px solid #ffffff; box-shadow: 0 4px 10px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: #fff; font-size: 10px; font-weight: bold;">
              ${isProtected ? '🔒' : (b.solarRooftopKW > 50 ? '☀️' : '⚡')}
            </div>
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      const marker = L.marker([b.coordinates.lat, b.coordinates.lng], { icon: customIcon }).addTo(this.map);

      // Popup Content
      const popupHtml = `
        <div style="font-family: 'Plus Jakarta Sans', sans-serif; min-width: 230px; padding: 4px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <strong style="font-size: 0.95rem; color: #0f172a;">${b.name}</strong>
          </div>
          <div style="font-size: 0.76rem; color: #64748b; margin-bottom: 8px;">Zone: <b>${b.category}</b></div>

          <div style="background: #f8fafc; border-radius: 8px; padding: 8px; font-size: 0.8rem; display: flex; flex-direction: column; gap: 4px; border: 1px solid #e2e8f0;">
            <div style="display: flex; justify-content: space-between;">
              <span>Current Demand:</span>
              <strong style="color: #0284c7; font-family: monospace;">${b.currentKW} kW</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>Rooftop Solar:</span>
              <strong style="color: #f59e0b; font-family: monospace;">${b.solarRooftopKW} kW</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>Flexible Sheddable:</span>
              <strong style="color: #f59e0b; font-family: monospace;">${b.flexibleKW} kW</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>Critical Protected:</span>
              <strong style="color: #10b981; font-family: monospace;">${b.criticalKW} kW</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>Data Quality:</span>
              <strong style="color: #10b981; font-family: monospace;">${b.dataQualityPct}% PRR</strong>
            </div>
          </div>

          ${b.criticalEquipment ? `
            <div style="margin-top: 8px; font-size: 0.74rem; color: #059669; background: #ecfdf5; padding: 6px 8px; border-radius: 6px; border-left: 3px solid #10b981;">
              🔒 <b>Protected:</b> ${b.criticalEquipment}
            </div>
          ` : ''}
        </div>
      `;

      marker.bindPopup(popupHtml);
      this.markers.push(marker);
    });
  }

  renderGridSubstation() {
    const subIcon = L.divIcon({
      className: 'substation-marker',
      html: `
        <div style="width: 28px; height: 28px; background: #0f172a; border: 2px solid #38bdf8; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: #38bdf8; font-size: 14px; box-shadow: 0 4px 12px rgba(0,0,0,0.4);">
          ⚡
        </div>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });

    const subMarker = L.marker([28.6335, 77.3605], { icon: subIcon }).addTo(this.map);
    subMarker.bindPopup(`
      <div style="font-family: sans-serif; padding: 4px;">
        <strong>Main Campus 33/11kV Substation</strong>
        <p style="font-size: 0.8rem; color: #64748b; margin-top: 4px;">Sanctioned Maximum Demand: <b>1,000 kW</b></p>
        <p style="font-size: 0.78rem; color: #f43f5e; margin-top: 2px;">Feeder status: <b>Active Ingestion</b></p>
      </div>
    `);
  }

  renderAlertFeed() {
    const container = document.getElementById('dispatchedAlertsFeed');
    if (!container) return;

    if (this.alerts.length === 0) {
      container.innerHTML = `<p style="font-size: 0.85rem; color: var(--text-muted); padding: 1rem;">No active peak alerts.</p>`;
      return;
    }

    container.innerHTML = this.alerts.map(a => {
      const isCritical = a.severity === 'CRITICAL';
      const isSuccess = a.severity === 'SUCCESS';
      const borderCol = isCritical ? '#f43f5e' : (isSuccess ? '#10b981' : '#f59e0b');

      return `
        <div style="padding: 1rem; background: var(--bg-secondary); border-radius: 12px; border: 1px solid var(--border-subtle); border-left: 4px solid ${borderCol}; margin-bottom: 0.85rem;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <strong style="font-size: 0.9rem; color: var(--text-main);">${a.title}</strong>
            <span class="header-badge-tag" style="background: ${isCritical ? 'rgba(244, 63, 94, 0.12)' : 'rgba(16, 185, 129, 0.12)'}; color: ${borderCol};">
              ${a.severity}
            </span>
          </div>

          <p style="font-size: 0.82rem; color: var(--text-secondary); margin-top: 0.35rem; line-height: 1.5;">${a.message}</p>

          <div style="margin-top: 0.6rem; font-size: 0.76rem; color: var(--text-muted); display: flex; justify-content: space-between; flex-wrap: wrap; gap: 4px;">
            <span>Zone: <b>${a.affectedZone}</b></span>
            <span>${a.timestamp}</span>
          </div>

          <div style="margin-top: 0.4rem; font-size: 0.74rem; color: var(--accent-cyan);">
            Dispatched to: <b>${a.notificationSentTo || 'Facilities Management Gateway'}</b>
          </div>
        </div>
      `;
    }).join('');
  }

  listenToTelemetry() {
    if (window.app) {
      window.app.on('newAlert', (newAlert) => {
        this.alerts.unshift(newAlert);
        this.renderAlertFeed();
      });

      window.app.on('telemetry', (data) => {
        // Can re-sync building loads dynamically
      });
    }
  }
}

window.campusMapManager = new CampusEnergyMapManager();
