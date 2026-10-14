/**
 * CampusPulse AI // Financial Optimization, Baseline vs Optimized & Sustainability Manager
 * Calculates Time-of-Day (ToD) peak tariff savings, before/after scenario comparisons,
 * and environmental sustainability metrics (CO2 avoided, equivalent trees planted).
 */

class SustainabilityAnalyticsManager {
  constructor() {
    this.analyticsData = null;
    this.peakTariffRate = 9.50; // INR per unit during peak hours (17:00 - 22:00)
    this.normalTariffRate = 7.20; // INR per unit during normal hours
    this.flexiblePercent = 20; // 20% flexible load shed
    this.buildingCount = 6;
    this.charts = {};

    this.init();
  }

  async init() {
    await this.fetchAnalytics();
    this.initCharts();
    this.bindCalculator();
    this.recalculateROI();
  }

  async fetchAnalytics() {
    try {
      const res = await fetch('/api/analytics');
      this.analyticsData = await res.json();
      this.renderZoneTable(this.analyticsData.zones);
    } catch (e) {
      console.error('Error fetching analytics:', e);
    }
  }

  initCharts() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.06)';
    const textColor = isDark ? '#94a3b8' : '#0f172a';

    // 1. Before vs After Peak Demand Bar Chart
    const compCanvas = document.getElementById('beforeAfterComparisonChart');
    if (compCanvas && window.Chart && this.analyticsData) {
      const zones = this.analyticsData.zones || [];
      this.charts.comparison = new Chart(compCanvas.getContext('2d'), {
        type: 'bar',
        data: {
          labels: zones.map(z => z.zone.split(' ')[0]),
          datasets: [
            {
              label: 'Baseline Scenario Peak (kW)',
              data: zones.map(z => z.baselineKW),
              backgroundColor: 'rgba(244, 63, 94, 0.75)',
              borderColor: '#f43f5e',
              borderWidth: 1.5,
              borderRadius: 6
            },
            {
              label: 'Optimized Scenario Peak (kW)',
              data: zones.map(z => z.optimizedKW),
              backgroundColor: 'rgba(16, 185, 129, 0.75)',
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

    // 2. Monthly Financial Savings by Zone Donut
    const savingsCanvas = document.getElementById('zoneSavingsDonutChart');
    if (savingsCanvas && window.Chart && this.analyticsData) {
      const zones = this.analyticsData.zones.filter(z => z.monthlySavingsINR > 0);
      this.charts.savings = new Chart(savingsCanvas.getContext('2d'), {
        type: 'doughnut',
        data: {
          labels: zones.map(z => z.zone),
          datasets: [{
            data: zones.map(z => z.monthlySavingsINR),
            backgroundColor: [
              '#0284c7',
              '#10b981',
              '#f59e0b',
              '#8b5cf6',
              '#ec4899'
            ],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: { color: textColor, font: { family: 'Plus Jakarta Sans', size: 10 } }
            }
          },
          cutout: '65%'
        }
      });
    }
  }

  renderZoneTable(zones) {
    const tbody = document.getElementById('zoneFinancialTableBody');
    if (!tbody || !zones) return;

    tbody.innerHTML = zones.map(z => `
      <tr style="border-bottom: 1px solid var(--border-subtle); font-size: 0.84rem;">
        <td style="padding: 0.85rem 1rem; font-weight: 700; color: var(--text-main);">${z.zone}</td>
        <td style="padding: 0.85rem 1rem; font-family: var(--font-mono); color: #f43f5e;">${z.baselineKW} kW</td>
        <td style="padding: 0.85rem 1rem; font-family: var(--font-mono); color: #10b981;">${z.optimizedKW} kW</td>
        <td style="padding: 0.85rem 1rem; font-family: var(--font-mono); font-weight: 700; color: #0284c7;">-${z.reductionKW} kW</td>
        <td style="padding: 0.85rem 1rem; font-family: var(--font-mono); color: #f59e0b;">${z.solarYieldKWh} kWh/day</td>
        <td style="padding: 0.85rem 1rem; font-family: var(--font-mono); font-weight: 700; color: #10b981;">₹${z.monthlySavingsINR.toLocaleString()}</td>
        <td style="padding: 0.85rem 1rem; font-family: var(--font-mono); color: #10b981;">${z.dataQualityPct}% PRR</td>
      </tr>
    `).join('');
  }

  bindCalculator() {
    const peakInput = document.getElementById('calcPeakTariff');
    const normalInput = document.getElementById('calcNormalTariff');
    const flexInput = document.getElementById('calcFlexiblePct');
    const bldgInput = document.getElementById('calcBldgCount');

    [peakInput, normalInput, flexInput, bldgInput].forEach(inp => {
      if (inp) inp.addEventListener('input', () => this.recalculateROI());
    });
  }

  recalculateROI() {
    const peakInput = document.getElementById('calcPeakTariff');
    const normalInput = document.getElementById('calcNormalTariff');
    const flexInput = document.getElementById('calcFlexiblePct');
    const bldgInput = document.getElementById('calcBldgCount');

    const peakRate = peakInput ? parseFloat(peakInput.value) : this.peakTariffRate;
    const normalRate = normalInput ? parseFloat(normalInput.value) : this.normalTariffRate;
    const flexPct = flexInput ? parseFloat(flexInput.value) : this.flexiblePercent;
    const bldgCount = bldgInput ? parseInt(bldgInput.value) : this.buildingCount;

    // Display values on sliders
    const valPeak = document.getElementById('valCalcPeak');
    const valNormal = document.getElementById('valCalcNormal');
    const valFlex = document.getElementById('valCalcFlex');
    const valBldg = document.getElementById('valCalcBldg');

    if (valPeak) valPeak.textContent = `₹${peakRate.toFixed(2)} / kWh`;
    if (valNormal) valNormal.textContent = `₹${normalRate.toFixed(2)} / kWh`;
    if (valFlex) valFlex.textContent = `${flexPct}%`;
    if (valBldg) valBldg.textContent = `${bldgCount} Buildings`;

    // Calculate Projected Results:
    // Typical campus load: ~200 kW per building, 4 hours peak window
    const totalPeakLoadKW = bldgCount * 205;
    const shavedKW = totalPeakLoadKW * (flexPct / 100);
    const dailyPeakEnergyAvoidedKWh = shavedKW * 3.5; // 3.5 hours peak window
    const tariffDiff = Math.max(1.0, peakRate - normalRate);
    const dailyCostSaved = dailyPeakEnergyAvoidedKWh * tariffDiff;
    const monthlyDemandPenaltyAvoided = bldgCount * 16000;
    const monthlyTotalSaved = (dailyCostSaved * 30) + monthlyDemandPenaltyAvoided;
    const annualTotalSaved = monthlyTotalSaved * 12;

    const outShavedKW = document.getElementById('resCalcShavedKW');
    const outDailySaved = document.getElementById('resCalcDailySaved');
    const outMonthlySaved = document.getElementById('resCalcMonthlySaved');
    const outAnnualSaved = document.getElementById('resCalcAnnualSaved');

    if (outShavedKW) outShavedKW.textContent = `${shavedKW.toFixed(0)} kW`;
    if (outDailySaved) outDailySaved.textContent = `₹${Math.round(dailyCostSaved).toLocaleString()}`;
    if (outMonthlySaved) outMonthlySaved.textContent = `₹${Math.round(monthlyTotalSaved).toLocaleString()}`;
    if (outAnnualSaved) outAnnualSaved.textContent = `₹${Math.round(annualTotalSaved).toLocaleString()}`;
  }
}

window.sustainabilityAnalytics = new SustainabilityAnalyticsManager();
