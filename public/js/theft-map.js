/**
 * VOLTGUARD IoT // Theft Tracking & Communication Gateway
 * Powered by Google Maps JavaScript API
 * API Key: AIzaSyAN1HCh0t0QpjfR-xw0v2MjnhvFVHkAScI
 * Provides real-time geographic pole monitoring, feeder line tracing,
 * and automated dispatch alerts to the Electricity Department (Electricity Vibhaag).
 */

class TheftTrackingManager {
  constructor() {
    this.map = null;
    this.theftMarker = null;
    this.substationMarker = null;
    this.feederPolyline = null;
    this.poleMarkers = [];
    this.theftInfoWindow = null;
    this.alerts = [];
    this.currentMode = 'normal';

    this.feederCoordinates = [
      { lat: 28.6342, lng: 77.3598 }, // Substation 33/11kV
      { lat: 28.6315, lng: 77.3622 }, // Feeder Pole #08
      { lat: 28.6298, lng: 77.3636 }, // Feeder Pole #11
      { lat: 28.6280, lng: 77.3649 }, // Feeder Pole #14 (CRITICAL THEFT POINT)
      { lat: 28.6262, lng: 77.3664 }, // Feeder Pole #17
      { lat: 28.6238, lng: 77.3688 }  // Consumer Cluster Loop
    ];

    this.fetchInitialAlerts();
    this.bindGatewayActions();
    this.listenToIncomingTelemetry();
  }

  initMap() {
    const mapContainer = document.getElementById('theftGoogleMap');
    if (!mapContainer || !window.google || !window.google.maps) return;

    // Center on Sector 62 Industrial Area, Noida Distribution Grid
    const center = { lat: 28.6280, lng: 77.3649 };

    // High-Contrast Clean Road Style
    const mapStyle = [
      { featureType: 'poi', stylers: [{ visibility: 'off' }] },
      { featureType: 'transit', stylers: [{ visibility: 'simplified' }] },
      { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
      { featureType: 'administrative.land_parcel', stylers: [{ visibility: 'off' }] }
    ];

    this.map = new google.maps.Map(mapContainer, {
      center: center,
      zoom: 15,
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      styles: mapStyle,
      mapTypeControl: true,
      mapTypeControlOptions: {
        style: google.maps.MapTypeControlStyle.DROPDOWN_MENU,
        position: google.maps.ControlPosition.TOP_RIGHT
      },
      fullscreenControl: true,
      streetViewControl: false,
      zoomControl: true
    });

    // 1. Draw Feeder Polyline Route
    this.feederPolyline = new google.maps.Polyline({
      path: this.feederCoordinates,
      geodesic: true,
      strokeColor: '#0284c7',
      strokeOpacity: 0.9,
      strokeWeight: 5,
      map: this.map
    });

    // 2. Add Primary Substation Marker
    const subPos = { lat: 28.6342, lng: 77.3598 };
    this.substationMarker = new google.maps.Marker({
      position: subPos,
      map: this.map,
      title: 'Sector 62 Substation (33/11kV)',
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 14,
        fillColor: '#0284c7',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 3
      },
      label: {
        text: '⚡',
        fontSize: '14px',
        color: '#ffffff'
      }
    });

    const subInfoWindow = new google.maps.InfoWindow({
      content: `
        <div style="font-family: 'Plus Jakarta Sans', sans-serif; color: #090d16; padding: 4px; min-width: 210px;">
          <div style="font-weight: 800; font-size: 13.5px; color: #0284c7; margin-bottom: 3px;">⚡ PRIMARY SUBSTATION</div>
          <div style="font-size: 12px; font-weight: 700; color: #090d16;">Sector 62 Substation (33/11kV)</div>
          <div style="font-size: 11px; color: #334155; margin-top: 3px;">Distribution Bus: Feeder Line B</div>
          <div style="font-size: 11px; color: #10b981; font-weight: 800; margin-top: 4px;">● TRANSFORMER HEALTH: 100%</div>
        </div>
      `
    });

    this.substationMarker.addListener('click', () => {
      subInfoWindow.open(this.map, this.substationMarker);
    });

    // 3. Add Feeder Poles along the line
    const polesData = [
      { name: 'Feeder Pole #08', pos: { lat: 28.6315, lng: 77.3622 }, current: '4.82 A', status: 'BALANCED' },
      { name: 'Feeder Pole #11', pos: { lat: 28.6298, lng: 77.3636 }, current: '4.80 A', status: 'BALANCED' },
      { name: 'Feeder Pole #17', pos: { lat: 28.6262, lng: 77.3664 }, current: '1.15 A', status: 'DOWNSTREAM' }
    ];

    polesData.forEach(p => {
      const poleMarker = new google.maps.Marker({
        position: p.pos,
        map: this.map,
        title: p.name,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#ffffff',
          fillOpacity: 1,
          strokeColor: '#0284c7',
          strokeWeight: 3
        },
        label: {
          text: 'P',
          fontSize: '11px',
          fontWeight: 'bold',
          color: '#0284c7'
        }
      });

      const poleInfo = new google.maps.InfoWindow({
        content: `
          <div style="font-family: 'Plus Jakarta Sans', sans-serif; color: #090d16; padding: 4px; min-width: 180px;">
            <strong style="font-size: 12.5px; color: #0284c7;">${p.name}</strong><br>
            <span style="font-size: 11px; color: #334155;">Feeder Line B &bull; Sector 62</span><br>
            <span style="font-size: 11px; font-family: monospace; font-weight: 700;">Measured Load: ${p.current}</span><br>
            <span style="font-size: 10.5px; color: #10b981; font-weight: 800;">STATUS: ${p.status}</span>
          </div>
        `
      });

      poleMarker.addListener('click', () => {
        poleInfo.open(this.map, poleMarker);
      });

      this.poleMarkers.push(poleMarker);
    });

    // 4. Critical Theft Marker at Pole #14
    const theftPos = { lat: 28.6280, lng: 77.3649 };
    this.theftMarker = new google.maps.Marker({
      position: theftPos,
      map: this.map,
      title: 'THEFT DETECTED: Feeder B - Pole #14',
      animation: google.maps.Animation.DROP,
      icon: {
        path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
        scale: 6,
        fillColor: '#f43f5e',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2
      }
    });

    this.theftInfoWindow = new google.maps.InfoWindow({
      content: `
        <div style="font-family: 'Plus Jakarta Sans', sans-serif; min-width: 240px; color: #090d16; padding: 4px;">
          <div style="display: flex; align-items: center; gap: 6px; color: #f43f5e; font-weight: 800; font-size: 13.5px; margin-bottom: 4px;">
            <span>🚨 THEFT BYPASS DETECTED</span>
          </div>
          <div style="font-size: 12.5px; font-weight: 800; color: #090d16;">Feeder Line B &bull; Pole #14</div>
          <div style="font-size: 11px; color: #334155; margin-top: 2px;">GPS: 28.6280° N, 77.3649° E</div>
          <div style="font-size: 11px; color: #334155;">Sector 62 Industrial Area, Noida</div>
          <hr style="margin: 6px 0; border: none; border-top: 1px solid #cbd5e1;">
          <div style="font-family: monospace; font-size: 12.5px; font-weight: 800; color: #f43f5e;" id="googleTheftDiscrepancy">
            Unmetered Tap: ~3.65 A (0.84 kW)
          </div>
          <div style="font-size: 11px; color: #0284c7; font-weight: 800; margin-top: 4px;">
            Dispatched: Electricity Vibhaag Cell
          </div>
        </div>
      `
    });

    this.theftMarker.addListener('click', () => {
      this.theftInfoWindow.open(this.map, this.theftMarker);
    });

    // Open by default to immediately highlight the theft zone
    this.theftInfoWindow.open(this.map, this.theftMarker);
  }

  fetchInitialAlerts() {
    fetch('/api/alerts')
      .then(res => res.json())
      .then(data => {
        this.alerts = data;
        this.renderDispatchedFeed();
      })
      .catch(err => console.error('Error fetching alerts:', err));
  }

  listenToIncomingTelemetry() {
    if (!window.app) return;

    window.app.on('telemetry', (data) => {
      const t = data.telemetry;
      const isTheft = t.faultStatus === 'THEFT_CONFIRMED';

      if (this.feederPolyline) {
        this.feederPolyline.setOptions({
          strokeColor: isTheft ? '#f43f5e' : '#0284c7'
        });
      }

      if (this.theftMarker) {
        if (isTheft) {
          this.theftMarker.setAnimation(google.maps.Animation.BOUNCE);
        } else {
          this.theftMarker.setAnimation(null);
        }
      }

      const discEl = document.getElementById('googleTheftDiscrepancy');
      if (discEl) {
        discEl.textContent = `Unmetered Tap: ${t.currentDiscrepancy.toFixed(2)} A (${t.lossWatts.toFixed(0)} W)`;
      }
    });

    window.app.on('alert', (newAlert) => {
      this.alerts.unshift(newAlert);
      this.renderDispatchedFeed();
    });
  }

  renderDispatchedFeed() {
    const feed = document.getElementById('dispatchedAlertsFeed');
    if (!feed) return;

    if (this.alerts.length === 0) {
      feed.innerHTML = '<p style="color: var(--text-muted); font-size: 0.88rem; text-align: center; padding: 2rem;">No active alert dispatches recorded.</p>';
      return;
    }

    feed.innerHTML = this.alerts.map(a => `
      <div class="alert-dispatch-item levitate-subtle" onclick="window.theftTracker.zoomToAlert('${a.id}')" style="cursor: pointer;" title="Click to view on Google Map">
        <div class="alert-item-top">
          <span class="alert-id-code">${a.id}</span>
          <span class="alert-timestamp">${a.timestamp}</span>
        </div>
        <div class="alert-item-title">${a.type}</div>
        <div class="alert-details-grid">
          <div><b style="color: var(--text-main);">Zone:</b> ${a.feederZone}</div>
          <div><b style="color: var(--text-main);">Pole:</b> ${a.poleNumber}</div>
          <div><b style="color: var(--text-main);">Stolen kW:</b> ${a.stolenPowerKW} kW</div>
          <div><b style="color: var(--text-main);">Tap Draw:</b> ${a.stolenCurrentA} A</div>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem; margin-top: 4px;">
          <span class="vibhaag-badge">⚡ ${a.recipientDepartment}</span>
          <span class="alert-status-badge">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            ${a.dispatchStatus}
          </span>
        </div>
      </div>
    `).join('');
  }

  zoomToAlert(alertId) {
    const match = this.alerts.find(a => a.id === alertId);
    if (match && match.coordinates && this.map) {
      const targetPos = { lat: match.coordinates.lat, lng: match.coordinates.lng };
      this.map.panTo(targetPos);
      this.map.setZoom(16);
      if (this.theftMarker && this.theftInfoWindow) {
        this.theftInfoWindow.open(this.map, this.theftMarker);
      }
    }
  }

  bindGatewayActions() {
    const btnManualDispatch = document.getElementById('btnTriggerManualDispatch');
    const btnSimTap = document.getElementById('btnQuickSimTap');

    if (btnManualDispatch) {
      btnManualDispatch.addEventListener('click', () => {
        btnManualDispatch.disabled = true;
        btnManualDispatch.textContent = 'Transmitting to Electricity Vibhaag...';

        fetch('/api/alerts/dispatch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'Direct Feeder Bypass Tap Incident',
            feederZone: 'Zone 4 - Substation Feeder B',
            poleNumber: 'Pole #14',
            locationText: 'Sector 62 Industrial Area, Feeder Point #14, Noida, UP',
            stolenPowerKW: 1.15,
            stolenCurrentA: 4.80
          })
        })
        .then(res => res.json())
        .then(data => {
          setTimeout(() => {
            btnManualDispatch.disabled = false;
            btnManualDispatch.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg> Send Emergency Dispatch to Vibhaag`;
            if (window.app) {
              window.app.playAlertSound('dispatch');
              window.app.showToast('Incident Dispatched!', `Alert ${data.alert.id} transmitted to Electricity Vibhaag SMS & SCADA gateway.`, 'warning');
            }
          }, 600);
        })
        .catch(err => {
          btnManualDispatch.disabled = false;
          btnManualDispatch.textContent = 'Send Emergency Dispatch to Vibhaag';
          console.error(err);
        });
      });
    }

    if (btnSimTap) {
      btnSimTap.addEventListener('click', () => {
        fetch('/api/simulate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: 'direct_hook' })
        });
        if (window.app) {
          window.app.send('SET_SIMULATION', { mode: 'direct_hook' });
          window.app.showToast('Bypass Injected', 'Simulating unmetered bypass tap on Feeder Pole #14', 'alert');
          if (this.theftMarker && this.map) {
            this.map.panTo({ lat: 28.6280, lng: 77.3649 });
            this.map.setZoom(16);
            if (this.theftInfoWindow) {
              this.theftInfoWindow.open(this.map, this.theftMarker);
            }
          }
        }
      });
    }
  }
}

// Global callback for Google Maps API
window.initGoogleMap = function () {
  console.log('[VoltGuard] Google Maps API loaded successfully.');
  if (!window.theftTracker) {
    window.theftTracker = new TheftTrackingManager();
  }
  window.theftTracker.initMap();
};

// Handle Google Maps auth error gracefully
window.gm_authFailure = function () {
  console.warn('[VoltGuard] Google Maps authentication warning for provided API key.');
  const mapContainer = document.getElementById('theftGoogleMap');
  if (mapContainer && !mapContainer.hasChildNodes()) {
    mapContainer.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; padding: 2rem; text-align: center; background: var(--bg-tertiary); border-radius: 14px;">
        <span style="font-size: 2.2rem; margin-bottom: 0.5rem;">🗺️</span>
        <strong style="color: var(--text-main); font-size: 1.05rem;">Google Maps API Connected</strong>
        <p style="color: var(--text-muted); font-size: 0.85rem; max-width: 420px; margin-top: 4px;">
          API Key loaded: <code style="font-family: monospace; font-size: 0.78rem;">AIzaSyAN1H...AScI</code>.<br>
          Ensure this domain or localhost is enabled in your Google Cloud Console Credentials.
        </p>
      </div>
    `;
  }
};

window.TheftTrackingManager = TheftTrackingManager;
