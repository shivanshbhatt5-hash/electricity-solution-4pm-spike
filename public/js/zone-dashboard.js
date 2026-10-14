/**
 * CampusPulse AI // Zone-Wise Consumption Analysis & Data-Quality Hub
 * Interactive building selector, peak demand spike decomposition,
 * data-quality indicators, and historical logs export.
 */

class ZoneAnalyticsDashboard {
  constructor() {
    this.buildings = [];
    this.selectedBuildingId = 'all';
    this.charts = {};
    this.historicalLogs = [];

    this.init();
    this.listenToTelemetry();
  }

  async init() {
    await this.fetchBuildings();
    this.renderBuildingCards();
    this.initCharts();
    this.initHistoricalLogs();
    this.bindEvents();
  }

  async fetchBuildings() {
    try {
      const res = await fetch('/api/buildings');
      const data = await res.json();
      this.buildings = data.buildings || [];
    } catch (e) {
      console.error('Error fetching buildings:', e);
    }
  }

  renderBuildingCards() {
    const container = document.getElementById('buildingZoneGrid');
    if (!container) return;

    container.innerHTML = this.buildings.map(b => {
      const isPeak = b.status === 'PEAK_SPIKE' || b.status === 'HIGH_LOAD';
      const statusBadge = isPeak 
        ? `<span class="header-badge-tag" style="background: rgba(244, 63, 94, 0.12); color: #f43f5e;">Peak Alert</span>`
        : (b.category === 'Data Center' || b.category === 'Laboratory'
            ? `<span class="protected-badge">🔒 Protected</span>`
            : `<span class="header-badge-tag" style="background: rgba(16, 185, 129, 0.12); color: #10b981;">Normal</span>`);

      return `
        <div class="recommendation-card levitate-subtle ${this.selectedBuildingId === b.id ? 'approved' : ''}" 
             data-id="${b.id}" style="cursor: pointer;" onclick="window.zoneDashboard.selectBuilding('${b.id}')">
          <div class="recommendation-header">
            <div>
              <div class="recommendation-title">${b.name}</div>
              <div class="recommendation-zone">
                <span>Category: <b>${b.category}</b></span>
              </div>
            </div>
            ${statusBadge}
          </div>

          <div class="recommendation-metrics-row" style="margin-top: 0.5rem;">
            <div class="rec-metric-item">
              <span class="rec-metric-label">Current Demand</span>
              <span class="rec-metric-val" style="color: #0284c7;">${b.currentKW.toFixed(1)} kW</span>
            </div>
            <div class="rec-metric-item">
              <span class="rec-metric-label">Flexible Load</span>
              <span class="rec-metric-val" style="color: ${b.flexibleKW > 0 ? '#f59e0b' : '#64748b'};">${b.flexibleKW.toFixed(1)} kW</span>
            </div>
            <div class="rec-metric-item">
              <span class="rec-metric-label">Critical Load</span>
              <span class="rec-metric-val" style="color: #10b981;">${b.criticalKW.toFixed(1)} kW</span>
            </div>
            <div class="rec-metric-item">
              <span class="rec-metric-label">Data Quality</span>
              <span class="rec-metric-val" style="color: #10b981;">${b.dataQualityPct}%</span>
            </div>
          </div>

          <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 0.35rem; display: flex; justify-content: space-between;">
            <span>☀️ Rooftop Solar: <b>${b.solarRooftopKW} kW</b></span>
            <span>PF: <b>${b.powerFactor}</b></span>
          </div>

          ${b.criticalEquipment ? `
            <div class="safety-interlock-notice" style="margin-top: 0.5rem; font-size: 0.74rem;">
              <span>Protected: <b>${b.criticalEquipment}</b></span>
            </div>
          ` : ''}
        </div>
      `;
    }).join('');
  }

  selectBuilding(id) {
    this.selectedBuildingId = this.selectedBuildingId === id ? 'all' : id;
    this.renderBuildingCards();
    this.updateCharts();
  }

  initCharts() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.06)';
    const textColor = isDark ? '#94a3b8' : '#0f172a';

    // 1. Zone Demand Comparison Chart (Bar)
    const barCanvas = document.getElementById('zoneDemandBarChart');
    if (barCanvas && window.Chart) {
      this.charts.bar = new Chart(barCanvas.getContext('2d'), {
        type: 'bar',
        data: {
          labels: this.buildings.map(b => b.name.split(' ')[0]),
          datasets: [
            {
              label: 'Current Demand (kW)',
              data: this.buildings.map(b => b.currentKW),
              backgroundColor: 'rgba(2, 132, 199, 0.75)',
              borderColor: '#0284c7',
              borderWidth: 1.5,
              borderRadius: 6
            },
            {
              label: 'Flexible Sheddable (kW)',
              data: this.buildings.map(b => b.flexibleKW),
              backgroundColor: 'rgba(245, 158, 11, 0.75)',
              borderColor: '#f59e0b',
              borderWidth: 1.5,
              borderRadius: 6
            },
            {
              label: 'Protected Critical (kW)',
              data: this.buildings.map(b => b.criticalKW),
              backgroundColor: 'rgba(16, 185, 129, 0.8)',
              borderColor: '#10b981',
              borderWidth: 1.5,
              borderRadius: 6
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
              labels: { color: textColor, font: { family: 'Plus Jakarta Sans', size: 11 } }
            }
          },
          scales: {
            x: { grid: { display: false }, ticks: { color: textColor } },
            y: { grid: { color: gridColor }, ticks: { color: textColor, callback: v => `${v} kW` } }
          }
        }
      });
    }

    // 2. Evening Peak Decomposition Donut Chart
    const donutCanvas = document.getElementById('peakSpikeDonutChart');
    if (donutCanvas && window.Chart) {
      this.charts.donut = new Chart(donutCanvas.getContext('2d'), {
        type: 'doughnut',
        data: {
          labels: ['Central Cooling & ACs', 'Hostel Appliances & Geysers', 'Campus Lighting', 'Labs & Research', 'Server Infrastructure'],
          datasets: [{
            data: [42, 28, 14, 11, 5], // % contribution to 4 PM - 9 PM evening peak
            backgroundColor: [
              '#0284c7',
              '#f43f5e',
              '#f59e0b',
              '#8b5cf6',
              '#10b981'
            ],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'right',
              labels: { color: textColor, font: { family: 'Plus Jakarta Sans', size: 10 } }
            }
          },
          cutout: '68%'
        }
      });
    }
  }

  updateCharts() {
    if (this.charts.bar) {
      this.charts.bar.data.labels = this.buildings.map(b => b.name.split(' ')[0]);
      this.charts.bar.data.datasets[0].data = this.buildings.map(b => b.currentKW);
      this.charts.bar.data.datasets[1].data = this.buildings.map(b => b.flexibleKW);
      this.charts.bar.data.datasets[2].data = this.buildings.map(b => b.criticalKW);
      this.charts.bar.update();
    }
  }

  initHistoricalLogs() {
    const tableBody = document.getElementById('historicalRecordsTableBody');
    if (!tableBody) return;

    // Seed realistic 12 historical records
    const hours = ['17:00', '16:30', '16:00', '15:30', '15:00', '14:30', '14:00', '13:30', '13:00', '12:30', '12:00', '11:30'];
    this.historicalLogs = hours.map((time, idx) => {
      const gross = 1240 - idx * 32 + (Math.random() * 15 - 7);
      const solar = Math.max(0, 310 - Math.abs(idx - 10) * 45);
      const net = gross - solar;
      const isBreach = net > 1000;
      const dq = (98.5 + (Math.random() * 1.2 - 0.4)).toFixed(1);

      return {
        timestamp: `Today ${time}`,
        zone: idx % 2 === 0 ? 'Campus-Wide Master Grid' : 'Student Hostels & HVAC',
        grossDemandKW: gross.toFixed(1),
        solarKW: solar.toFixed(1),
        netDemandKW: net.toFixed(1),
        peakFlag: isBreach ? 'CRITICAL BREACH' : 'NORMAL',
        dataQualityPct: dq
      };
    });

    tableBody.innerHTML = this.historicalLogs.map(row => `
      <tr style="border-bottom: 1px solid var(--border-subtle); font-size: 0.84rem;">
        <td style="padding: 0.75rem 1rem; font-family: var(--font-mono);">${row.timestamp}</td>
        <td style="padding: 0.75rem 1rem; font-weight: 600;">${row.zone}</td>
        <td style="padding: 0.75rem 1rem; font-family: var(--font-mono); color: #0284c7;">${row.grossDemandKW} kW</td>
        <td style="padding: 0.75rem 1rem; font-family: var(--font-mono); color: #f59e0b;">${row.solarKW} kW</td>
        <td style="padding: 0.75rem 1rem; font-family: var(--font-mono); font-weight: 700; color: ${row.peakFlag === 'CRITICAL BREACH' ? '#f43f5e' : '#10b981'};">
          ${row.netDemandKW} kW
        </td>
        <td style="padding: 0.75rem 1rem;">
          <span class="header-badge-tag" style="background: ${row.peakFlag === 'CRITICAL BREACH' ? 'rgba(244, 63, 94, 0.12)' : 'rgba(16, 185, 129, 0.12)'}; color: ${row.peakFlag === 'CRITICAL BREACH' ? '#f43f5e' : '#10b981'};">
            ${row.peakFlag}
          </span>
        </td>
        <td style="padding: 0.75rem 1rem; font-family: var(--font-mono); color: #10b981;">${row.dataQualityPct}% PRR</td>
      </tr>
    `).join('');
  }

  exportHistoricalCSV() {
    const headers = ['Timestamp', 'Zone', 'Gross Demand (kW)', 'Rooftop Solar (kW)', 'Net Demand (kW)', 'Peak Status', 'Data Quality'];
    const rows = this.historicalLogs.map(l => [
      l.timestamp,
      `"${l.zone}"`,
      l.grossDemandKW,
      l.solarKW,
      l.netDemandKW,
      l.peakFlag,
      `${l.dataQualityPct}%`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `CampusPulse_Energy_Log_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  bindEvents() {
    const exportBtn = document.getElementById('btnExportLogs');
    if (exportBtn) {
      exportBtn.onclick = () => this.exportHistoricalCSV();
    }
  }

  listenToTelemetry() {
    if (window.app) {
      window.app.on('telemetry', (data) => {
        if (data.dataQuality) {
          const dqPrr = document.getElementById('statDQPrr');
          const dqLatency = document.getElementById('statDQLatency');
          const dqDrift = document.getElementById('statDQDrift');
          const dqScore = document.getElementById('statDQScore');

          if (dqPrr) dqPrr.textContent = `${data.dataQuality.packetDeliveryRate}%`;
          if (dqLatency) dqLatency.textContent = `${data.dataQuality.latencyMs} ms`;
          if (dqDrift) dqDrift.textContent = `±${data.dataQuality.sensorDriftPct}%`;
          if (dqScore) dqScore.textContent = `${data.dataQuality.meterHealthScore} / 100`;
        }
      });
    }
  }
}

window.zoneDashboard = new ZoneAnalyticsDashboard();
