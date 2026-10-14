/**
 * VOLTGUARD IoT // Fault & Anomaly Live Monitoring Dashboard
 * Real-time dials, comparative Chart.js streaming graphs, and simulation injector
 */

class FaultMonitoringDashboard {
  constructor() {
    this.chart = null;
    this.maxDataPoints = 25;
    this.initChart();
    this.bindControls();
    this.listenToTelemetry();
  }

  initChart() {
    const canvas = document.getElementById('comparativeCurrentChart');
    if (!canvas || !window.Chart) return;

    const ctx = canvas.getContext('2d');

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          {
            label: 'Source Feeder Current (I_src)',
            data: [],
            borderColor: '#0284c7', // Electric Blue
            backgroundColor: 'rgba(2, 132, 199, 0.08)',
            borderWidth: 2.5,
            tension: 0.35,
            pointRadius: 2,
            fill: false
          },
          {
            label: 'Consumer Metered Current (I_cons)',
            data: [],
            borderColor: '#10b981', // Emerald
            backgroundColor: 'rgba(16, 185, 129, 0.08)',
            borderWidth: 2.5,
            tension: 0.35,
            pointRadius: 2,
            fill: false
          },
          {
            label: 'Theft Discrepancy Delta (ΔI)',
            data: [],
            borderColor: '#ef4444', // Alert Red
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            borderWidth: 2,
            borderDash: [5, 5],
            tension: 0.2,
            pointRadius: 3,
            fill: true
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 400 },
        interaction: { intersect: false, mode: 'index' },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              usePointStyle: true,
              boxWidth: 8,
              font: { family: "'Plus Jakarta Sans', sans-serif", size: 12, weight: '600' }
            }
          },
          tooltip: {
            backgroundColor: '#0f172a',
            titleFont: { family: "'JetBrains Mono', monospace", size: 12 },
            bodyFont: { family: "'Inter', sans-serif", size: 12 },
            padding: 10,
            cornerRadius: 8
          }
        },
        scales: {
          x: {
            grid: { color: '#f1f5f9' },
            ticks: { font: { family: "'JetBrains Mono', monospace", size: 10 }, maxRotation: 0 }
          },
          y: {
            beginAtZero: true,
            max: 10,
            grid: { color: '#f1f5f9' },
            ticks: {
              font: { family: "'JetBrains Mono', monospace", size: 11 },
              callback: (val) => `${val} A`
            }
          }
        }
      }
    });
  }

  listenToTelemetry() {
    if (!window.app) return;

    window.app.on('telemetry', (data) => {
      const t = data.telemetry;
      this.updateDials(t);
      this.updateChart(t);
      this.updateStatusBanner(t);
    });

    // Populate initial history if present
    window.app.on('sync', (syncData) => {
      if (syncData.history && this.chart) {
        this.chart.data.labels = [];
        this.chart.data.datasets[0].data = [];
        this.chart.data.datasets[1].data = [];
        this.chart.data.datasets[2].data = [];

        syncData.history.forEach(item => {
          this.chart.data.labels.push(item.time);
          this.chart.data.datasets[0].data.push(item.srcCurrent);
          this.chart.data.datasets[1].data.push(item.consCurrent);
          this.chart.data.datasets[2].data.push(item.delta);
        });
        this.chart.update();
      }
    });
  }

  updateDials(t) {
    // Update numerical readings
    const srcEl = document.getElementById('valSourceCurrent');
    const consEl = document.getElementById('valConsumerCurrent');
    const voltEl = document.getElementById('valGridVoltage');
    const deltaEl = document.getElementById('valDeltaCurrent');
    const lossWEl = document.getElementById('valLossWatts');
    const stolenKWhEl = document.getElementById('valStolenKWh');

    if (srcEl) srcEl.textContent = t.sourceCurrent.toFixed(2);
    if (consEl) consEl.textContent = t.consumerCurrent.toFixed(2);
    if (voltEl) voltEl.textContent = t.voltage.toFixed(1);
    if (deltaEl) deltaEl.textContent = t.currentDiscrepancy.toFixed(2);
    if (lossWEl) lossWEl.textContent = `${t.lossWatts} W`;
    if (stolenKWhEl) stolenKWhEl.textContent = `${t.accumulatedStolenKWh.toFixed(3)} kWh`;

    // Highlight Delta card if theft detected
    const deltaCard = document.getElementById('cardDeltaHighlight');
    if (deltaCard) {
      if (t.faultStatus === 'THEFT_CONFIRMED') {
        deltaCard.classList.add('theft-highlight');
      } else {
        deltaCard.classList.remove('theft-highlight');
      }
    }
  }

  updateChart(t) {
    if (!this.chart) return;

    const labels = this.chart.data.labels;
    const srcData = this.chart.data.datasets[0].data;
    const consData = this.chart.data.datasets[1].data;
    const deltaData = this.chart.data.datasets[2].data;

    labels.push(t.timestamp || new Date().toLocaleTimeString());
    srcData.push(t.sourceCurrent);
    consData.push(t.consumerCurrent);
    deltaData.push(t.currentDiscrepancy);

    if (labels.length > this.maxDataPoints) {
      labels.shift();
      srcData.shift();
      consData.shift();
      deltaData.shift();
    }

    this.chart.update('none'); // Update smoothly without lag
  }

  updateStatusBanner(t) {
    const banner = document.getElementById('liveFaultBanner');
    const pill = document.getElementById('bannerFaultPill');
    const desc = document.getElementById('bannerFaultDesc');
    const conf = document.getElementById('bannerConfidenceScore');

    if (!banner || !pill) return;

    if (t.faultStatus === 'THEFT_CONFIRMED') {
      banner.className = 'system-status-banner alert-state levitate-subtle';
      pill.className = 'banner-status-pill theft-active';
      pill.innerHTML = `<span class="status-dot offline"></span> THEFT DETECTED (${t.currentDiscrepancy}A LEAKAGE)`;
      if (desc) desc.textContent = 'Active unmetered current tap bypassing consumer smart meter on Feeder Line B Pole #14.';
      if (conf) conf.textContent = `${t.anomalyConfidence}% AI Confidence`;
    } else if (t.faultStatus === 'SUSPICIOUS_DROP') {
      banner.className = 'system-status-banner warning-state';
      pill.className = 'banner-status-pill';
      pill.style.background = '#fffbeb';
      pill.style.color = '#d97706';
      pill.innerHTML = `<span class="status-dot warning"></span> SUSPICIOUS DISCREPANCY`;
      if (desc) desc.textContent = 'Unusual current deviation detected. Monitoring feeder stability.';
      if (conf) conf.textContent = `${t.anomalyConfidence}% Anomaly Prob.`;
    } else {
      banner.className = 'system-status-banner';
      pill.className = 'banner-status-pill';
      pill.style.background = '';
      pill.style.color = '';
      pill.innerHTML = `<span class="status-dot online"></span> SYSTEM NORMAL // NO THEFT DETECTED`;
      if (desc) desc.textContent = 'Source and Consumer current levels are balanced within normal technical line loss limits.';
      if (conf) conf.textContent = 'Nominal (99.8% Healthy)';
    }
  }

  bindControls() {
    // Fault injection buttons
    const btnDirectHook = document.getElementById('btnSimDirectHook');
    const btnMeterBypass = document.getElementById('btnSimMeterBypass');
    const btnTamperSwitch = document.getElementById('btnSimTamperSwitch');
    const btnResetNormal = document.getElementById('btnSimResetNormal');

    const triggerMode = (mode) => {
      fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode })
      });
      if (window.app) {
        window.app.send('SET_SIMULATION', { mode });
      }
    };

    if (btnDirectHook) {
      btnDirectHook.addEventListener('click', () => {
        triggerMode('direct_hook');
        window.app.showToast('Fault Injected', 'Simulating 3.5A Direct Line Hook Bypass', 'alert');
      });
    }

    if (btnMeterBypass) {
      btnMeterBypass.addEventListener('click', () => {
        triggerMode('meter_bypass');
        window.app.showToast('Fault Injected', 'Simulating Consumer Shunt Meter Bypass', 'alert');
      });
    }

    if (btnTamperSwitch) {
      btnTamperSwitch.addEventListener('click', () => {
        triggerMode('tamper_switch');
        window.app.showToast('Fault Injected', 'Simulating Enclosure Microswitch Tamper', 'warning');
      });
    }

    if (btnResetNormal) {
      btnResetNormal.addEventListener('click', () => {
        triggerMode('normal');
        window.app.showToast('System Reset', 'All line parameters restored to normal balanced state', 'info');
      });
    }
  }
}

window.FaultMonitoringDashboard = FaultMonitoringDashboard;
