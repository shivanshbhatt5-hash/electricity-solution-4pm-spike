/**
 * VOLTGUARD IoT // Financial Analytics & Loss Calculator
 * Location-wise stolen electricity breakdown and dynamic tariff calculator
 */

class FinancialAnalyticsManager {
  constructor() {
    this.analyticsData = null;
    this.tariffRate = 7.50; // INR per unit (kWh)
    this.durationHours = 720; // 30 days = 720 hrs
    this.stolenPowerKW = 1.08; // Base monitored loss kW
    this.currencySymbol = '₹';

    this.chart = null;
    this.initChart();
    this.fetchAnalyticsData();
    this.bindCalculatorEvents();
    this.recalculate();
  }

  fetchAnalyticsData() {
    fetch('/api/analytics')
      .then(res => res.json())
      .then(data => {
        this.analyticsData = data;
        this.renderTable(data.zones);
        this.updateZoneChart(data.zones);
      })
      .catch(err => console.error('Error fetching financial analytics:', err));
  }

  initChart() {
    const canvas = document.getElementById('zoneRevenueLossChart');
    if (!canvas || !window.Chart) return;

    const ctx = canvas.getContext('2d');
    this.chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: [],
        datasets: [{
          label: 'Estimated Monthly Revenue Loss (₹)',
          data: [],
          backgroundColor: [
            'rgba(2, 132, 199, 0.75)',
            'rgba(245, 158, 11, 0.75)',
            'rgba(99, 102, 241, 0.75)',
            'rgba(239, 68, 68, 0.85)',
            'rgba(220, 38, 38, 0.85)'
          ],
          borderColor: [
            '#0284c7',
            '#f59e0b',
            '#6366f1',
            '#ef4444',
            '#dc2626'
          ],
          borderWidth: 1.5,
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => ` Loss: ${this.currencySymbol}${Number(context.raw).toLocaleString('en-IN')}`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { family: "'Plus Jakarta Sans', sans-serif", size: 10 } }
          },
          y: {
            beginAtZero: true,
            ticks: {
              font: { family: "'JetBrains Mono', monospace", size: 10 },
              callback: (val) => `${this.currencySymbol}${val / 1000}k`
            }
          }
        }
      }
    });
  }

  updateZoneChart(zones) {
    if (!this.chart || !zones) return;
    this.chart.data.labels = zones.map(z => z.zone.split(' - ')[0]);
    this.chart.data.datasets[0].data = zones.map(z => Math.round(z.stolenKWhMonth * this.tariffRate));
    this.chart.update();
  }

  renderTable(zones) {
    const tbody = document.getElementById('analyticsTableBody');
    if (!tbody || !zones) return;

    tbody.innerHTML = zones.map(z => {
      const monthlyLoss = Math.round(z.stolenKWhMonth * this.tariffRate);
      const riskClass = z.status === 'CRITICAL_RISK' ? 'critical' : (z.status === 'HIGH_RISK' ? 'high' : 'low');
      const riskText = z.status.replace('_', ' ');

      return `
        <tr>
          <td>
            <strong>${z.zone}</strong><br>
            <span style="font-size: 0.78rem; color: #64748b;">${z.substation}</span>
          </td>
          <td style="font-family: 'JetBrains Mono', monospace;">${z.voltageV} V</td>
          <td style="font-family: 'JetBrains Mono', monospace;">${z.sourceKVA} kVA</td>
          <td style="font-family: 'JetBrains Mono', monospace;">${z.stolenKVA} kVA</td>
          <td style="font-family: 'JetBrains Mono', monospace; font-weight: 700; color: #ef4444;">${z.stolenKWhMonth.toLocaleString()} kWh</td>
          <td style="font-family: 'JetBrains Mono', monospace; font-weight: 700;">${this.currencySymbol}${monthlyLoss.toLocaleString('en-IN')}</td>
          <td><span class="tag-risk ${riskClass}">${riskText}</span></td>
        </tr>
      `;
    }).join('');
  }

  bindCalculatorEvents() {
    const tariffInput = document.getElementById('calcTariffRate');
    const hoursSlider = document.getElementById('calcDurationSlider');
    const hoursLabel = document.getElementById('calcDurationLabel');
    const stolenPowerSlider = document.getElementById('calcPowerSlider');
    const stolenPowerLabel = document.getElementById('calcPowerLabel');
    const currencySelect = document.getElementById('calcCurrencySelect');
    const btnSyncLiveTheft = document.getElementById('btnSyncLiveTheftToCalc');
    const btnExportReport = document.getElementById('btnExportAuditReport');

    if (tariffInput) {
      tariffInput.addEventListener('input', (e) => {
        this.tariffRate = parseFloat(e.target.value) || 0;
        this.recalculate();
        if (this.analyticsData) {
          this.renderTable(this.analyticsData.zones);
          this.updateZoneChart(this.analyticsData.zones);
        }
      });
    }

    if (hoursSlider) {
      hoursSlider.addEventListener('input', (e) => {
        this.durationHours = parseInt(e.target.value);
        if (hoursLabel) {
          const days = Math.round(this.durationHours / 24);
          hoursLabel.textContent = `${this.durationHours} Hours (${days} Days)`;
        }
        this.recalculate();
      });
    }

    if (stolenPowerSlider) {
      stolenPowerSlider.addEventListener('input', (e) => {
        this.stolenPowerKW = parseFloat(e.target.value);
        if (stolenPowerLabel) stolenPowerLabel.textContent = `${this.stolenPowerKW.toFixed(2)} kW`;
        this.recalculate();
      });
    }

    if (currencySelect) {
      currencySelect.addEventListener('change', (e) => {
        this.currencySymbol = e.target.value === 'USD' ? '$' : '₹';
        this.recalculate();
        if (this.analyticsData) {
          this.renderTable(this.analyticsData.zones);
          this.updateZoneChart(this.analyticsData.zones);
        }
      });
    }

    if (btnSyncLiveTheft) {
      btnSyncLiveTheft.addEventListener('click', () => {
        if (window.app && window.app.systemData.telemetry) {
          const deltaA = window.app.systemData.telemetry.currentDiscrepancy || 0;
          const v = window.app.systemData.telemetry.voltage || 230;
          const kw = (deltaA * v * 0.96) / 1000;
          this.stolenPowerKW = Math.max(0.2, parseFloat(kw.toFixed(2)));
          if (stolenPowerSlider) stolenPowerSlider.value = this.stolenPowerKW;
          if (stolenPowerLabel) stolenPowerLabel.textContent = `${this.stolenPowerKW.toFixed(2)} kW`;
          this.recalculate();
          window.app.showToast('Synchronized with Live Feeder', `Loaded ${this.stolenPowerKW.toFixed(2)} kW detected theft draw from ESP32`, 'info');
        }
      });
    }

    if (btnExportReport) {
      btnExportReport.addEventListener('click', () => {
        window.print();
      });
    }
  }

  recalculate() {
    const totalUnitsStolenKWh = this.stolenPowerKW * this.durationHours;
    const totalMonetaryLoss = totalUnitsStolenKWh * this.tariffRate;
    const co2FootprintKg = totalUnitsStolenKWh * 0.82; // ~0.82 kg CO2 per kWh grid average
    const annualProjectedLoss = (this.stolenPowerKW * 8760) * this.tariffRate; // 8760 hours in a year

    // Update UI elements
    const resUnits = document.getElementById('calcResUnits');
    const resLoss = document.getElementById('calcResLoss');
    const resCO2 = document.getElementById('calcResCO2');
    const resAnnual = document.getElementById('calcResAnnual');

    if (resUnits) resUnits.textContent = `${totalUnitsStolenKWh.toLocaleString(undefined, { maximumFractionDigits: 1 })} kWh`;
    if (resLoss) resLoss.textContent = `${this.currencySymbol}${totalMonetaryLoss.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
    if (resCO2) resCO2.textContent = `${co2FootprintKg.toLocaleString(undefined, { maximumFractionDigits: 0 })} kg`;
    if (resAnnual) resAnnual.textContent = `${this.currencySymbol}${annualProjectedLoss.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  }
}

window.FinancialAnalyticsManager = FinancialAnalyticsManager;
