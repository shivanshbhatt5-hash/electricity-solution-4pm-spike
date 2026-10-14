/**
 * CampusPulse AI // Global Application Logic & Telemetry Hub
 * WebSocket Client, Theme Switcher, Audio Synthesizer, Live Ticker & Decision Event Bus
 */

class CampusPulseApp {
  constructor() {
    this.ws = null;
    this.wsUrl = `ws://${window.location.hostname}:${window.location.port || 3000}`;
    this.audioCtx = null;
    this.lastPeakState = 'NORMAL';
    this.listeners = new Map();
    this.currentTheme = localStorage.getItem('campuspulse-theme') || 'light';

    this.systemData = {
      esp32Connected: true,
      pythonConnected: true,
      optimizationActive: false,
      simulationMode: 'normal_day',
      telemetry: {},
      prototype: {},
      dataQuality: {},
      buildings: [],
      recommendations: [],
      alerts: []
    };

    this.applyTheme(this.currentTheme);
    this.initAudioContext();
    this.initWebSocket();
    this.initGlobalNavbar();
  }

  applyTheme(theme) {
    this.currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('campuspulse-theme', theme);

    const toggleBtn = document.getElementById('themeToggleBtn');
    if (toggleBtn) {
      toggleBtn.innerHTML = theme === 'dark' 
        ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`
        : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
      toggleBtn.title = theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Cyber Dark Mode';
    }
  }

  toggleTheme() {
    this.applyTheme(this.currentTheme === 'dark' ? 'light' : 'dark');
  }

  initAudioContext() {
    const unlockAudio = () => {
      if (!this.audioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
          this.audioCtx = new AudioContext();
        }
      }
      document.removeEventListener('click', unlockAudio);
    };
    document.addEventListener('click', unlockAudio);
  }

  playAlertSound(type = 'alarm') {
    if (!this.audioCtx) return;
    try {
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      if (type === 'alarm') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(740, this.audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(370, this.audioCtx.currentTime + 0.35);
        gain.gain.setValueAtTime(0.18, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.35);
        osc.start();
        osc.stop(this.audioCtx.currentTime + 0.4);
      } else if (type === 'dispatch' || type === 'success') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, this.audioCtx.currentTime);
        osc.frequency.setValueAtTime(659.25, this.audioCtx.currentTime + 0.1);
        osc.frequency.setValueAtTime(783.99, this.audioCtx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.14, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.35);
        osc.start();
        osc.stop(this.audioCtx.currentTime + 0.35);
      }
    } catch (e) {
      console.warn('Audio playback suppressed:', e);
    }
  }

  initWebSocket() {
    try {
      this.ws = new WebSocket(this.wsUrl);

      this.ws.onopen = () => {
        console.log('[CampusPulse WS] Connected to Smart Campus Telemetry Stream');
        this.updateGlobalBadge(true, 'ESP32 Synced');
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          this.handleIncomingMessage(msg);
        } catch (err) {
          console.error('[CampusPulse WS] Parse error:', err);
        }
      };

      this.ws.onclose = () => {
        this.updateGlobalBadge(false, 'Reconnecting...');
        setTimeout(() => this.initWebSocket(), 2000);
      };

      this.ws.onerror = (err) => {
        console.error('[CampusPulse WS] Socket error:', err);
      };
    } catch (e) {
      console.error('[CampusPulse WS] Init error:', e);
    }
  }

  handleIncomingMessage(msg) {
    if (msg.type === 'INITIAL_SYNC') {
      this.systemData = { ...this.systemData, ...msg };
      this.updateTicker(msg.telemetry, msg.prototype, msg.dataQuality);
      this.dispatch('sync', msg);
    } else if (msg.type === 'TELEMETRY_UPDATE') {
      this.systemData.telemetry = msg.telemetry;
      if (msg.prototype) this.systemData.prototype = msg.prototype;
      if (msg.dataQuality) this.systemData.dataQuality = msg.dataQuality;
      if (msg.optimizationActive !== undefined) this.systemData.optimizationActive = msg.optimizationActive;

      this.updateTicker(msg.telemetry, msg.prototype, msg.dataQuality);

      if (msg.telemetry && msg.telemetry.peakStatus === 'PEAK_THRESHOLD_BREACH' && this.lastPeakState !== 'PEAK_THRESHOLD_BREACH') {
        this.playAlertSound('alarm');
        this.showToast('PEAK SPIKE ALERT!', `Campus demand (${msg.telemetry.netGridDemandKW} kW) has breached the 1000 kW contract ceiling. Review AI recommendations.`, 'alert');
      }
      if (msg.telemetry) this.lastPeakState = msg.telemetry.peakStatus;

      this.dispatch('telemetry', msg);
    } else if (msg.type === 'OPTIMIZATION_STATE_CHANGED') {
      this.systemData.optimizationActive = msg.optimizationActive;
      this.systemData.recommendations = msg.recommendations;
      if (msg.prototype) this.systemData.prototype = msg.prototype;
      if (msg.telemetry) this.systemData.telemetry = msg.telemetry;

      this.playAlertSound('success');
      this.showToast('Peak Shaving Engaged', `AI Load Optimization approved. Flexible loads curtailed; critical server/lab loads strictly protected.`, 'info');
      this.dispatch('optimizationChange', msg);
    } else if (msg.type === 'PROTOTYPE_RELAY_UPDATE') {
      this.systemData.prototype = msg.prototype;
      this.showToast('Prototype Relay Toggled', `Flexible Demonstration Load is now ${msg.prototype.flexibleRelayState}`, 'info');
      this.dispatch('prototypeRelay', msg.prototype);
    } else if (msg.type === 'NEW_ALERT') {
      this.playAlertSound('alarm');
      this.showToast(msg.alert.title, msg.alert.message, 'warning');
      this.dispatch('newAlert', msg.alert);
    }
  }

  updateTicker(t, p, dq) {
    if (!t) return;
    const grossEl = document.getElementById('tickerGross');
    const solarEl = document.getElementById('tickerSolar');
    const netEl = document.getElementById('tickerNet');
    const statusEl = document.getElementById('tickerStatus');
    const protoEl = document.getElementById('tickerPrototype');
    const dqEl = document.getElementById('tickerDQ');

    if (grossEl) grossEl.textContent = `${t.totalCampusDemandKW ? t.totalCampusDemandKW.toFixed(1) : '1215.4'} kW`;
    if (solarEl) solarEl.textContent = `${t.solarGenerationKW ? t.solarGenerationKW.toFixed(1) : '68.2'} kW`;
    if (netEl) netEl.textContent = `${t.netGridDemandKW ? t.netGridDemandKW.toFixed(1) : '1147.2'} kW`;

    if (statusEl) {
      if (t.peakStatus === 'OPTIMIZED_ACTIVE') {
        statusEl.textContent = 'OPTIMIZED (SAFE)';
        statusEl.style.color = '#10b981';
      } else if (t.peakStatus === 'PEAK_THRESHOLD_BREACH') {
        statusEl.textContent = 'PEAK BREACH (>1000 kW)';
        statusEl.style.color = '#f43f5e';
      } else if (t.peakStatus === 'PRE_PEAK_WARNING') {
        statusEl.textContent = 'PRE-PEAK WARNING';
        statusEl.style.color = '#f59e0b';
      } else {
        statusEl.textContent = 'NORMAL';
        statusEl.style.color = '#10b981';
      }
    }

    if (protoEl && p) {
      protoEl.textContent = `${p.totalCurrentA ? p.totalCurrentA.toFixed(2) : '3.60'} A (${p.flexibleRelayState === 'OPEN' ? 'SHEDDED' : 'FULL'})`;
      protoEl.style.color = p.flexibleRelayState === 'OPEN' ? '#10b981' : '#0284c7';
    }

    if (dqEl && dq) {
      dqEl.textContent = `${dq.packetDeliveryRate ? dq.packetDeliveryRate : '98.7'}% PRR`;
    }
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  dispatch(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(cb => cb(data));
    }
  }

  send(action, payload = {}) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ action, ...payload }));
    }
  }

  updateGlobalBadge(online, text) {
    const badge = document.getElementById('globalSystemStatusBadge');
    if (badge) {
      const dot = badge.querySelector('.status-dot');
      const textSpan = badge.querySelector('.status-text');
      if (dot) {
        dot.className = `status-dot ${online ? 'online' : 'offline'}`;
      }
      if (textSpan) {
        textSpan.textContent = text || (online ? 'ESP32 Synced' : 'Offline');
      }
    }
  }

  showToast(title, message, type = 'info') {
    let container = document.getElementById('campuspulse-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'campuspulse-toast-container';
      container.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        display: flex;
        flex-direction: column;
        gap: 12px;
        z-index: 99999;
        pointer-events: none;
      `;
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'levitate-subtle';
    const borderColor = type === 'alert' ? '#f43f5e' : (type === 'warning' ? '#f59e0b' : '#10b981');
    const bgColor = 'var(--bg-card)';

    toast.style.cssText = `
      background: ${bgColor};
      backdrop-filter: blur(16px);
      border: 1px solid var(--border-card);
      border-left: 5px solid ${borderColor};
      padding: 14px 18px;
      border-radius: 14px;
      box-shadow: 0 12px 30px -4px rgba(15, 23, 42, 0.16);
      max-width: 400px;
      pointer-events: auto;
      transition: all 0.3s ease;
      transform: translateY(20px);
      opacity: 0;
    `;

    toast.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
        <strong style="font-size: 0.92rem; color: var(--text-main); font-family: 'Plus Jakarta Sans', sans-serif;">${title}</strong>
        <span style="cursor: pointer; color: var(--text-muted); font-size: 1.15rem; line-height: 1;" onclick="this.parentElement.parentElement.remove()">&times;</span>
      </div>
      <p style="margin-top: 4px; font-size: 0.84rem; color: var(--text-secondary); line-height: 1.45;">${message}</p>
    `;

    container.appendChild(toast);
    requestAnimationFrame(() => {
      toast.style.transform = 'translateY(0)';
      toast.style.opacity = '1';
    });

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 350);
    }, 4500);
  }

  initGlobalNavbar() {
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (currentPath.endsWith(href) || (currentPath === '/' && href === 'index.html')) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    const toggleBtn = document.getElementById('themeToggleBtn');
    if (toggleBtn) {
      toggleBtn.onclick = () => this.toggleTheme();
    }
  }
}

// Global instance
window.app = new CampusPulseApp();
