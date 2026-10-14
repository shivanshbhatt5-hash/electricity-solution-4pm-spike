const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const { WebSocketServer, WebSocket } = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3000;
const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'http://127.0.0.1:5001';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// =========================================================================
// CampusPulse AI System In-Memory State
// =========================================================================
const campusState = {
  systemName: 'CampusPulse AI',
  version: '2.5.0-smart-campus',
  esp32Connected: true,
  pythonConnected: true,
  lastHeartbeat: new Date().toISOString(),
  
  // Simulation & Optimization Control
  simulationMode: 'normal_day', // 'normal_day' | 'evening_peak' | 'solar_drop' | 'optimized_active'
  optimizationActive: false,    // true when AI load-shedding is approved & engaged
  simulatedHour: 17.25,         // 5:15 PM (Late Afternoon Peak Spike Window)
  
  // Campus Grid Telemetry
  telemetry: {
    timestamp: new Date().toLocaleTimeString(),
    simulatedTimeStr: '17:15',
    gridVoltage: 230.2,            // Volts RMS
    gridFrequency: 50.02,          // Hz
    gridPowerFactor: 0.94,
    totalCampusDemandKW: 1215.4,   // Baseline gross campus power
    solarGenerationKW: 68.2,       // Declining afternoon rooftop solar
    netGridDemandKW: 1147.2,       // Net import from utility grid
    contractDemandLimitKW: 1000.0, // Maximum sanctioned demand before penalty
    peakStatus: 'PEAK_THRESHOLD_BREACH', // 'NORMAL' | 'PRE_PEAK_WARNING' | 'PEAK_THRESHOLD_BREACH' | 'OPTIMIZED_ACTIVE'
    peakRiskIndex: 88.5,           // 0 - 100%
    avoidedPeakKW: 0.0,
    dailyEnergyKWh: 14820.5,
    dailySolarKWh: 2840.0,
    dailyCostINR: 135400,
    carbonSavedKg: 2320.0
  },

  // Miniature Prototype Testbed Telemetry (Low-Voltage DC Demonstration Load)
  prototype: {
    nodeId: 'ESP32-CAMPUS-NODE-01',
    firmware: 'v3.2.0-campuspulse-rtos',
    wifiRSSI: -58, // dBm
    ipAddress: '192.168.1.142',
    busVoltageV: 12.05,
    flexibleCurrentA: 2.18,       // Demonstrates flexible HVAC fan / LED load
    criticalCurrentA: 1.42,       // Demonstrates protected lab server / emergency load
    totalCurrentA: 3.60,
    loadPowerWatts: 43.38,
    flexibleRelayState: 'CLOSED', // 'CLOSED' (Powered) | 'OPEN' (Shedded / Optimized)
    criticalRelayState: 'LOCKED_CLOSED', // Strictly protected!
    status: 'ONLINE'
  },

  // Data-Quality Indicators
  dataQuality: {
    packetDeliveryRate: 98.7,   // % packets received successfully
    latencyMs: 18,              // Transmission delay
    sensorDriftPct: 0.26,       // Drift from baseline calibration
    meterHealthScore: 99.1,     // Aggregate meter network health (0-100)
    inconsistentMeters: 1,      // Number of flagged meters (e.g. noisy reading)
    qualityGrade: 'EXCELLENT',
    lastSync: new Date().toISOString()
  },

  // Monitored Campus Zones & Academic Buildings
  buildings: [
    {
      id: 'bldg-eng',
      name: 'Engineering & Technology Block',
      category: 'Academic',
      currentKW: 282.4,
      baselinePeakKW: 310.0,
      flexibleKW: 65.0,
      criticalKW: 42.0,
      solarRooftopKW: 82.0,
      solarCapacityKW: 120.0,
      powerFactor: 0.95,
      status: 'HIGH_LOAD',
      dataQualityPct: 99.4,
      criticalProtectionActive: true,
      criticalEquipment: 'VLSI Computing Cluster, Mechatronics Test Benches',
      flexibleLoads: 'Corridor AC (+2°C buffer), Atrium Lighting, Lecture Hall Pre-cooling',
      coordinates: { lat: 28.6295, lng: 77.3638 }
    },
    {
      id: 'bldg-sci',
      name: 'Advanced Science & Research Labs',
      category: 'Laboratory',
      currentKW: 242.0,
      baselinePeakKW: 255.0,
      flexibleKW: 28.0,
      criticalKW: 184.0,
      solarRooftopKW: 45.0,
      solarCapacityKW: 60.0,
      powerFactor: 0.93,
      status: 'PROTECTED_ACTIVE',
      dataQualityPct: 98.9,
      criticalProtectionActive: true,
      criticalEquipment: 'Cryo-Freezers (-80°C), Bio-Safety Exhaust Fume Hoods, Laser Spectrometer',
      flexibleLoads: 'Common Room HVAC, Office Peripheral Banks',
      coordinates: { lat: 28.6280, lng: 77.3650 }
    },
    {
      id: 'bldg-hostel',
      name: 'Student Hostels (Block A & B)',
      category: 'Hostel',
      currentKW: 318.5,
      baselinePeakKW: 345.0,
      flexibleKW: 98.0,
      criticalKW: 35.0,
      solarRooftopKW: 75.0,
      solarCapacityKW: 100.0,
      powerFactor: 0.92,
      status: 'PEAK_SPIKE',
      dataQualityPct: 97.4,
      criticalProtectionActive: true,
      criticalEquipment: 'Emergency Lighting, Fire Alarm Panels, Medical Clinic Backup',
      flexibleLoads: 'Central Electric Geysers (Staggered Cycling), Common Room ACs, Laundry Banks',
      coordinates: { lat: 28.6265, lng: 77.3672 }
    },
    {
      id: 'bldg-hvac',
      name: 'Central Chiller & HVAC Cooling Plant',
      category: 'Cooling / HVAC',
      currentKW: 228.0,
      baselinePeakKW: 260.0,
      flexibleKW: 115.0,
      criticalKW: 22.0,
      solarRooftopKW: 0.0,
      solarCapacityKW: 0.0,
      powerFactor: 0.96,
      status: 'HEAVY_DRAW',
      dataQualityPct: 99.8,
      criticalProtectionActive: true,
      criticalEquipment: 'Chilled Water Circulation Pumps, Pressure Safety Loop',
      flexibleLoads: 'Primary Chiller Variable Frequency Drive (Setpoint Ramp +1.8°C)',
      coordinates: { lat: 28.6272, lng: 77.3625 }
    },
    {
      id: 'bldg-data',
      name: 'Campus Data Center & ICT Backbone',
      category: 'Data Center',
      currentKW: 96.5,
      baselinePeakKW: 98.0,
      flexibleKW: 0.0, // Non-sheddable!
      criticalKW: 96.5,
      solarRooftopKW: 35.0,
      solarCapacityKW: 40.0,
      powerFactor: 0.99,
      status: 'PROTECTED_LOCKED',
      dataQualityPct: 100.0,
      criticalProtectionActive: true,
      criticalEquipment: 'ERP Database Servers, High-Performance Compute Blades, Optical Core',
      flexibleLoads: 'NONE [100% Mission-Critical Protected]',
      coordinates: { lat: 28.6310, lng: 77.3620 }
    },
    {
      id: 'bldg-amenities',
      name: 'Dining Commons, Library & Admin Hub',
      category: 'Amenities / Admin',
      currentKW: 135.0,
      baselinePeakKW: 155.0,
      flexibleKW: 42.0,
      criticalKW: 18.0,
      solarRooftopKW: 62.0,
      solarCapacityKW: 80.0,
      powerFactor: 0.94,
      status: 'NORMAL',
      dataQualityPct: 98.6,
      criticalProtectionActive: true,
      criticalEquipment: 'Cold Storage Food Freezers, Security Server',
      flexibleLoads: 'Administrative Block Post-5PM ACs, Architectural Facade Floodlights',
      coordinates: { lat: 28.6325, lng: 77.3660 }
    }
  ],

  // AI Decision-Support Recommendations for Peak-Demand Optimization
  recommendations: [
    {
      id: 'REC-OPT-01',
      title: 'Dynamic Chiller Setpoint Adjustment (+2.0°C)',
      targetZone: 'Central Chiller & HVAC Cooling Plant',
      actionType: 'TEMPERATURE_RAMP',
      recommendedWindow: '16:30 - 19:30 (Peak Solar Decline)',
      potentialPeakCutKW: 92.0,
      costSavingsINR: 5240,
      occupantComfortImpact: 'NEGLIGIBLE (<0.4°C thermal drift with pre-cooling buffer)',
      riskLevel: 'LOW',
      criticalProtected: true,
      status: 'PENDING_APPROVAL', // 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED'
      safetyInterlock: 'Research Labs & Cleanroom Chilled Loops are LOCKED from curtailment'
    },
    {
      id: 'REC-OPT-02',
      title: 'Staggered Hostel Water-Heater Cycling & Laundry Deferral',
      targetZone: 'Student Hostels (Block A & B)',
      actionType: 'LOAD_STAGGERING',
      recommendedWindow: '17:00 - 20:00 (Evening Surge)',
      potentialPeakCutKW: 74.0,
      costSavingsINR: 4210,
      occupantComfortImpact: 'VERY LOW (Alternating 15-min thermal storage cycles)',
      riskLevel: 'LOW',
      criticalProtected: true,
      status: 'PENDING_APPROVAL',
      safetyInterlock: 'Hostel emergency lighting and water supply pumps remain 100% active'
    },
    {
      id: 'REC-OPT-03',
      title: 'Campus Perimeter & Architectural Facade Lighting Dimming (40%)',
      targetZone: 'Campus Amenities & Outdoor Infrastructure',
      actionType: 'LIGHTING_TRIM',
      recommendedWindow: '18:00 - 20:30 (Evening Peak)',
      potentialPeakCutKW: 28.0,
      costSavingsINR: 1590,
      occupantComfortImpact: 'NONE (Pedestrian pathways retain full lumen safety specs)',
      riskLevel: 'ZERO',
      criticalProtected: true,
      status: 'PENDING_APPROVAL',
      safetyInterlock: 'Pathways, security CCTV and entry gate floodlights remain at 100%'
    },
    {
      id: 'REC-OPT-04',
      title: 'Low-Voltage Prototype Demonstration Flexible Load Shedding',
      targetZone: 'IoT Physical Testbed (ESP32 Demonstration Unit)',
      actionType: 'RELAY_SHED',
      recommendedWindow: 'Immediate Live Demonstration',
      potentialPeakCutKW: 0.026, // Low-voltage demo load (26W drop)
      costSavingsINR: 15,
      occupantComfortImpact: 'DEMO ONLY',
      riskLevel: 'ZERO',
      criticalProtected: true,
      status: 'PENDING_APPROVAL',
      safetyInterlock: 'Demonstrates physical relay tripping flexible DC fan while keeping critical LED node ON'
    }
  ],

  // Real-Time Peak Alerts & Notifications
  alerts: [
    {
      id: 'ALT-PEAK-01',
      timestamp: '2026-10-14 17:10:22',
      severity: 'CRITICAL',
      title: 'Contract Maximum Demand Threshold Exceeded',
      message: 'Net campus grid demand (1147 kW) has breached the contractual maximum demand sanction (1000 kW) due to declining rooftop solar and evening cooling surge.',
      affectedZone: 'Campus-Wide Grid Substation',
      recommendedAction: 'Approve AI Chiller & Hostel load scheduling recommendations to shave 194 kW.',
      status: 'ACTIVE_WARNING',
      notificationSentTo: 'Chief Facilities Engineer, Energy Manager (SMS + Web Dashboard)'
    },
    {
      id: 'ALT-SOLAR-02',
      timestamp: '2026-10-14 16:45:00',
      severity: 'HIGH',
      title: 'Late-Afternoon Rooftop Solar Output Dropped by 78%',
      message: 'Solar irradiance dropped from 820 W/m² (noon) to 140 W/m². Campus solar generation decreased from 310 kW to 68 kW, shifting load directly to utility grid.',
      affectedZone: 'All Rooftop Solar Arrays (400 kWp Total)',
      recommendedAction: 'Engage pre-cooling thermal buffer before evening peak.',
      status: 'ACKNOWLEDGED',
      notificationSentTo: 'SCADA System Gateway'
    },
    {
      id: 'ALT-METER-03',
      timestamp: '2026-10-14 15:30:11',
      severity: 'MEDIUM',
      title: 'Data-Quality Anomaly: Hostel Block B Meter 04 Packet Jitter',
      message: 'Submeter telemetry recorded 2 missed packets over 10 minutes. Statistical Kalman filter interpolation applied automatically.',
      affectedZone: 'Hostel Block B Wing 2 Meter',
      recommendedAction: 'Inspect Wi-Fi repeater bridge in Hostel B quad.',
      status: 'INTERPOLATED_SAFE',
      notificationSentTo: 'IoT Network Diagnostics'
    }
  ],

  // 24-Hour Diurnal Demand & Solar Profiles
  diurnalProfile: generateDiurnalProfile(),

  // Live Telemetry Streaming History (last 30 seconds)
  telemetryHistory: []
};

// Generate realistic 24-hour campus diurnal curve showing late-afternoon solar decline and evening peak
function generateDiurnalProfile() {
  const profile = [];
  for (let h = 0; h < 24; h++) {
    // Base campus demand curve: low at night (350 kW), rises in morning (800 kW),
    // reaches afternoon baseline (950 kW), peaks late afternoon / evening 4 PM - 8 PM (1150 - 1240 kW)
    let demand = 380;
    if (h >= 6 && h < 9) demand = 450 + (h - 6) * 130;
    else if (h >= 9 && h < 13) demand = 840 + (h - 9) * 40;
    else if (h >= 13 && h < 16) demand = 960 + (h - 13) * 30;
    else if (h >= 16 && h < 20) {
      // THE PEAK DEMAND SPIKE: 4 PM to 8 PM!
      const peakFactors = [1120, 1220, 1245, 1180];
      demand = peakFactors[h - 16];
    } else if (h >= 20 && h < 23) {
      demand = 1050 - (h - 20) * 160;
    } else {
      demand = 480 - (h === 23 ? 70 : 0);
    }

    // Rooftop solar curve: 0 at night, rises 7 AM, peaks at 12:30 PM (~340 kW), drops rapidly 4 PM - 6:30 PM
    let solar = 0;
    if (h >= 6 && h <= 18) {
      const solarAngle = (h - 6) / 12 * Math.PI;
      solar = Math.max(0, Math.round(340 * Math.sin(solarAngle)));
      // Cloud factor and decline in late afternoon
      if (h === 16) solar = 110;
      if (h === 17) solar = 55;
      if (h === 18) solar = 12;
    }

    // Net demand from grid = gross demand - solar
    const netDemand = Math.max(100, demand - solar);

    // Optimized demand (after CampusPulse AI load shifting & peak shaving)
    let optimizedNet = netDemand;
    if (h >= 16 && h <= 20) {
      // Shaves up to 210 kW during peak window, without affecting critical loads!
      const cuts = [135, 215, 240, 180];
      optimizedNet = netDemand - cuts[h - 16];
    }

    profile.push({
      hour: h,
      timeLabel: `${h.toString().padStart(2, '0')}:00`,
      grossDemandKW: demand,
      solarGenerationKW: solar,
      netGridDemandKW: netDemand,
      optimizedGridDemandKW: optimizedNet,
      thresholdLimitKW: 1000.0
    });
  }
  return profile;
}

// Seed initial history
const now = Date.now();
for (let i = 25; i >= 0; i--) {
  const t = new Date(now - i * 1200);
  campusState.telemetryHistory.push({
    time: t.toLocaleTimeString(),
    grossDemand: 1215 + (Math.random() * 8 - 4),
    solarGen: 68 + (Math.random() * 4 - 2),
    netDemand: 1147 + (Math.random() * 6 - 3),
    demoFlexibleCurrent: 2.18 + (Math.random() * 0.04 - 0.02),
    demoCriticalCurrent: 1.42 + (Math.random() * 0.02 - 0.01),
    voltage: 230.2 + (Math.random() * 1.2 - 0.6)
  });
}

// =========================================================================
// REST API Endpoints
// =========================================================================

// System Status & Mode
app.get('/api/status', (req, res) => {
  res.json({
    status: 'ONLINE',
    systemName: campusState.systemName,
    version: campusState.version,
    esp32Connected: campusState.esp32Connected,
    pythonConnected: campusState.pythonConnected,
    optimizationActive: campusState.optimizationActive,
    simulationMode: campusState.simulationMode,
    simulatedHour: campusState.simulatedHour,
    lastHeartbeat: campusState.lastHeartbeat,
    activeClients: wss.clients.size,
    uptimeSeconds: Math.floor(process.uptime())
  });
});

// Real-Time Campus Telemetry & Historical Window
app.get('/api/telemetry', (req, res) => {
  res.json({
    current: campusState.telemetry,
    prototype: campusState.prototype,
    dataQuality: campusState.dataQuality,
    history: campusState.telemetryHistory.slice(-30),
    diurnalProfile: campusState.diurnalProfile
  });
});

// Zone-Wise Building Details
app.get('/api/buildings', (req, res) => {
  res.json({
    buildings: campusState.buildings,
    totalCount: campusState.buildings.length,
    totalGrossKW: campusState.buildings.reduce((acc, b) => acc + b.currentKW, 0),
    totalFlexibleKW: campusState.buildings.reduce((acc, b) => acc + b.flexibleKW, 0),
    totalCriticalKW: campusState.buildings.reduce((acc, b) => acc + b.criticalKW, 0),
    totalSolarKW: campusState.buildings.reduce((acc, b) => acc + b.solarRooftopKW, 0)
  });
});

// AI Optimization Recommendations
app.get('/api/recommendations', (req, res) => {
  const totalPotentialShaveKW = campusState.recommendations.reduce((acc, r) => acc + r.potentialPeakCutKW, 0);
  const totalPotentialSavingsINR = campusState.recommendations.reduce((acc, r) => acc + r.costSavingsINR, 0);

  res.json({
    recommendations: campusState.recommendations,
    optimizationActive: campusState.optimizationActive,
    totalPotentialShaveKW: parseFloat(totalPotentialShaveKW.toFixed(1)),
    totalPotentialSavingsINR: totalPotentialSavingsINR,
    criticalLoadsProtected: true
  });
});

// Approve or Execute AI Recommendation Actions
app.post('/api/recommendations/apply', (req, res) => {
  const { actionId, approveAll } = req.body;

  if (approveAll) {
    campusState.optimizationActive = true;
    campusState.recommendations.forEach(r => r.status = 'APPROVED');
    campusState.prototype.flexibleRelayState = 'OPEN'; // Shed flexible demo load
    campusState.telemetry.peakStatus = 'OPTIMIZED_ACTIVE';
    campusState.telemetry.avoidedPeakKW = 194.0;
    campusState.telemetry.netGridDemandKW = 953.2; // Dropped safely below 1000 kW threshold!
  } else if (actionId) {
    const target = campusState.recommendations.find(r => r.id === actionId);
    if (target) {
      target.status = 'APPROVED';
      if (actionId === 'REC-OPT-04') {
        campusState.prototype.flexibleRelayState = 'OPEN';
      }
    }
    const approvedCount = campusState.recommendations.filter(r => r.status === 'APPROVED').length;
    if (approvedCount >= 2) {
      campusState.optimizationActive = true;
      campusState.telemetry.peakStatus = 'OPTIMIZED_ACTIVE';
      campusState.telemetry.avoidedPeakKW = 145.0;
      campusState.telemetry.netGridDemandKW = 1002.2;
    }
  }

  // Create audit alert
  const auditAlert = {
    id: `ALT-OPT-${Math.floor(1000 + Math.random() * 9000)}`,
    timestamp: new Date().toLocaleTimeString(),
    severity: 'SUCCESS',
    title: 'AI Peak-Demand Optimization Action Applied',
    message: `Facility Manager approved load scheduling action. 194 kW flexible load curtailed without disrupting protected research labs or servers.`,
    affectedZone: 'Campus-Wide HVAC & Hostels',
    status: 'ACTIVE_OPTIMIZATION',
    notificationSentTo: 'BMS Substation Controller, ESP32 Testbed'
  };
  campusState.alerts.unshift(auditAlert);

  broadcastToClients({
    type: 'OPTIMIZATION_STATE_CHANGED',
    optimizationActive: campusState.optimizationActive,
    recommendations: campusState.recommendations,
    prototype: campusState.prototype,
    telemetry: campusState.telemetry,
    newAlert: auditAlert
  });

  res.json({
    success: true,
    optimizationActive: campusState.optimizationActive,
    recommendations: campusState.recommendations,
    prototype: campusState.prototype
  });
});

// Reset Optimization back to Baseline
app.post('/api/recommendations/reset', (req, res) => {
  campusState.optimizationActive = false;
  campusState.recommendations.forEach(r => r.status = 'PENDING_APPROVAL');
  campusState.prototype.flexibleRelayState = 'CLOSED';
  campusState.telemetry.peakStatus = 'PEAK_THRESHOLD_BREACH';
  campusState.telemetry.avoidedPeakKW = 0.0;
  campusState.telemetry.netGridDemandKW = 1147.2;

  broadcastToClients({
    type: 'OPTIMIZATION_STATE_CHANGED',
    optimizationActive: campusState.optimizationActive,
    recommendations: campusState.recommendations,
    prototype: campusState.prototype,
    telemetry: campusState.telemetry
  });

  res.json({ success: true, message: 'System reset to Baseline peak load scenario' });
});

// Toggle Prototype Flexible Load Relay Directly
app.post('/api/prototype/relay', (req, res) => {
  const { relayState } = req.body;
  if (relayState) {
    campusState.prototype.flexibleRelayState = relayState;
  } else {
    campusState.prototype.flexibleRelayState = campusState.prototype.flexibleRelayState === 'CLOSED' ? 'OPEN' : 'CLOSED';
  }

  broadcastToClients({
    type: 'PROTOTYPE_RELAY_UPDATE',
    prototype: campusState.prototype
  });

  res.json({ success: true, prototype: campusState.prototype });
});

// Financial Analytics, Baseline vs Optimized & Sustainability Data
app.get('/api/analytics', (req, res) => {
  res.json({
    summary: {
      baselinePeakDemandKW: 1245.0,
      optimizedPeakDemandKW: 982.0,
      peakDemandReductionKW: 263.0,
      peakDemandReductionPct: 21.1,
      
      dailyEnergyKWh: 14820,
      dailySolarGenerationKWh: 2840,
      solarSelfConsumptionPct: 96.8,
      
      baselineDailyCostINR: 148500,
      optimizedDailyCostINR: 121200,
      dailySavingsINR: 27300,
      dailySavingsPct: 18.4,
      
      monthlyPeakDemandPenaltyAvoidedINR: 95000,
      projectedAnnualSavingsINR: 1140000,
      
      dailyCarbonAvoidedKg: 2410,
      equivalentTreesPlanted: 108,
      greenCampusRating: 'A+ (Exemplary Energy Transition)',
      criticalLoadContinuityScorePct: 100.0,
      telemetryDataQualityScorePct: 98.9
    },
    zones: [
      {
        zone: 'Engineering & Tech Complex',
        baselineKW: 310.0,
        optimizedKW: 245.0,
        reductionKW: 65.0,
        monthlySavingsINR: 58500,
        solarYieldKWh: 420,
        dataQualityPct: 99.4
      },
      {
        zone: 'Advanced Science & Research Labs',
        baselineKW: 255.0,
        optimizedKW: 227.0,
        reductionKW: 28.0,
        monthlySavingsINR: 25200,
        solarYieldKWh: 230,
        dataQualityPct: 98.9
      },
      {
        zone: 'Student Hostels (Block A & B)',
        baselineKW: 345.0,
        optimizedKW: 247.0,
        reductionKW: 98.0,
        monthlySavingsINR: 88200,
        solarYieldKWh: 380,
        dataQualityPct: 97.4
      },
      {
        zone: 'Central Chiller & HVAC Cooling Plant',
        baselineKW: 260.0,
        optimizedKW: 145.0,
        reductionKW: 115.0,
        monthlySavingsINR: 103500,
        solarYieldKWh: 0,
        dataQualityPct: 99.8
      },
      {
        zone: 'Campus Data Center & ICT Hub',
        baselineKW: 98.0,
        optimizedKW: 98.0,
        reductionKW: 0.0, // Strictly Protected
        monthlySavingsINR: 0,
        solarYieldKWh: 180,
        dataQualityPct: 100.0
      },
      {
        zone: 'Dining Commons & Amenities Hub',
        baselineKW: 155.0,
        optimizedKW: 113.0,
        reductionKW: 42.0,
        monthlySavingsINR: 37800,
        solarYieldKWh: 310,
        dataQualityPct: 98.6
      }
    ]
  });
});

// Alerts
app.get('/api/alerts', (req, res) => {
  res.json(campusState.alerts);
});

// Hardware Nodes
app.get('/api/hardware', (req, res) => {
  res.json([
    {
      id: 'esp32',
      name: 'ESP32-WROOM-32D Dual-Core Microcontroller',
      role: 'Demonstration Testbed Edge Controller & Wi-Fi Gateway',
      status: 'ONLINE',
      ipAddress: '192.168.1.142',
      reading: '3.60 A (Total Load Current)',
      specs: '240MHz Tensilica LX6, 520KB SRAM, 802.11 b/g/n Wi-Fi'
    },
    {
      id: 'current-flexible',
      name: 'ACS712-05B Hall-Effect Current Sensor (Flexible Branch)',
      role: 'Measures low-voltage sheddable demonstration DC load (Fan/Lighting)',
      status: 'ONLINE',
      ipAddress: 'ADC Pin GPIO34',
      reading: `${campusState.prototype.flexibleCurrentA} A`,
      specs: '185 mV/A Sensitivity, Galvanic Isolation'
    },
    {
      id: 'current-critical',
      name: 'ACS712-05B Hall-Effect Current Sensor (Protected Branch)',
      role: 'Measures low-voltage protected critical load (Server/Lab simulator)',
      status: 'ONLINE',
      ipAddress: 'ADC Pin GPIO35',
      reading: `${campusState.prototype.criticalCurrentA} A`,
      specs: '185 mV/A Sensitivity, Continuous Monitoring'
    },
    {
      id: 'voltage-sensor',
      name: 'Precision DC Voltage Divider / ZMPT101B AC Module',
      role: 'Testbed & Grid RMS Voltage Measurement',
      status: 'ONLINE',
      ipAddress: 'ADC Pin GPIO32',
      reading: `${campusState.prototype.busVoltageV} V`,
      specs: '±0.5% Calibrated RMS Linearity'
    },
    {
      id: 'relay-flexible',
      name: 'Solid-State Relay (Flexible Load Control)',
      role: 'Remotely sheds sheddable campus loads during peak warnings',
      status: campusState.prototype.flexibleRelayState === 'CLOSED' ? 'ONLINE (ENERGIZED)' : 'ONLINE (SHEDDED)',
      ipAddress: 'GPIO26 (Optocoupled Trigger)',
      reading: campusState.prototype.flexibleRelayState,
      specs: 'Optically Isolated, Zero-Cross Switching'
    },
    {
      id: 'relay-critical',
      name: 'Hardware Interlocked Circuit (Critical Load Protection)',
      role: 'Hardwired bypass preventing shedding of essential server/lab loads',
      status: 'ONLINE (PERMANENTLY LOCKED ON)',
      ipAddress: 'Direct Bus Safety Circuit',
      reading: 'LOCKED_CLOSED',
      specs: '100% Continuity Fail-Safe'
    }
  ]);
});

// Telemetry Ingestion from Physical ESP32 or Python Engine
app.post('/api/telemetry/ingest', (req, res) => {
  const data = req.body;
  if (!data) return res.status(400).json({ error: 'Missing telemetry payload' });

  campusState.lastHeartbeat = new Date().toISOString();
  if (data.esp32) campusState.esp32Connected = true;
  if (data.python) campusState.pythonConnected = true;

  if (data.prototype) {
    campusState.prototype = { ...campusState.prototype, ...data.prototype };
  }

  if (data.telemetry) {
    campusState.telemetry = { ...campusState.telemetry, ...data.telemetry };
  }

  broadcastToClients({
    type: 'TELEMETRY_UPDATE',
    telemetry: campusState.telemetry,
    prototype: campusState.prototype,
    dataQuality: campusState.dataQuality
  });

  res.json({ success: true, timestamp: Date.now() });
});

// =========================================================================
// WebSocket Streaming for Real-Time Dashboard Updates
// =========================================================================
function broadcastToClients(data) {
  const payload = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

wss.on('connection', (ws) => {
  // Send immediate sync snapshot
  ws.send(JSON.stringify({
    type: 'INITIAL_SYNC',
    systemName: campusState.systemName,
    telemetry: campusState.telemetry,
    prototype: campusState.prototype,
    dataQuality: campusState.dataQuality,
    buildings: campusState.buildings,
    recommendations: campusState.recommendations,
    alerts: campusState.alerts.slice(0, 8),
    optimizationActive: campusState.optimizationActive,
    diurnalProfile: campusState.diurnalProfile,
    history: campusState.telemetryHistory.slice(-25)
  }));

  ws.on('message', (message) => {
    try {
      const parsed = JSON.parse(message);
      if (parsed.action === 'APPROVE_RECOMMENDATION') {
        const rec = campusState.recommendations.find(r => r.id === parsed.id);
        if (rec) rec.status = 'APPROVED';
        if (parsed.id === 'REC-OPT-04') {
          campusState.prototype.flexibleRelayState = 'OPEN';
        }
        broadcastToClients({
          type: 'OPTIMIZATION_STATE_CHANGED',
          optimizationActive: campusState.optimizationActive,
          recommendations: campusState.recommendations,
          prototype: campusState.prototype
        });
      } else if (parsed.action === 'TOGGLE_PROTOTYPE_RELAY') {
        campusState.prototype.flexibleRelayState = campusState.prototype.flexibleRelayState === 'CLOSED' ? 'OPEN' : 'CLOSED';
        broadcastToClients({
          type: 'PROTOTYPE_RELAY_UPDATE',
          prototype: campusState.prototype
        });
      }
    } catch (e) {
      console.error('WS Error parsing client message:', e);
    }
  });
});

// =========================================================================
// Real-Time Background Campus Simulation Loop (Runs Every 1000ms)
// Simulates live physical measurements, slight grid fluctuations,
// and smooth demonstration responsiveness.
// =========================================================================
setInterval(() => {
  const isOptimized = campusState.optimizationActive;
  const jitter = Math.random() * 4 - 2;

  // Base Demand & Solar based on late afternoon / evening peak
  let baseGross = isOptimized ? (982.0 + jitter) : (1215.0 + jitter);
  let baseSolar = Math.max(0, 68.0 + (Math.random() * 2 - 1));
  let netDemand = parseFloat((baseGross - baseSolar).toFixed(1));

  let peakStatus = 'PEAK_THRESHOLD_BREACH';
  if (isOptimized) {
    peakStatus = 'OPTIMIZED_ACTIVE';
  } else if (netDemand < 1000.0) {
    peakStatus = 'NORMAL';
  }

  // Update Prototype Values
  let flexCur = campusState.prototype.flexibleRelayState === 'CLOSED' ? (2.18 + (Math.random() * 0.04 - 0.02)) : 0.0;
  let critCur = 1.42 + (Math.random() * 0.02 - 0.01);
  let totalCur = parseFloat((flexCur + critCur).toFixed(2));
  let busV = parseFloat((12.02 + (Math.random() * 0.08 - 0.04)).toFixed(2));
  let pWatts = parseFloat((busV * totalCur).toFixed(2));

  campusState.prototype.flexibleCurrentA = parseFloat(flexCur.toFixed(2));
  campusState.prototype.criticalCurrentA = parseFloat(critCur.toFixed(2));
  campusState.prototype.totalCurrentA = totalCur;
  campusState.prototype.busVoltageV = busV;
  campusState.prototype.loadPowerWatts = pWatts;

  campusState.telemetry = {
    timestamp: new Date().toLocaleTimeString(),
    simulatedTimeStr: '17:15',
    gridVoltage: parseFloat((230.1 + (Math.random() * 0.8 - 0.4)).toFixed(1)),
    gridFrequency: parseFloat((50.0 + (Math.random() * 0.04 - 0.02)).toFixed(2)),
    gridPowerFactor: 0.94,
    totalCampusDemandKW: parseFloat(baseGross.toFixed(1)),
    solarGenerationKW: parseFloat(baseSolar.toFixed(1)),
    netGridDemandKW: netDemand,
    contractDemandLimitKW: 1000.0,
    peakStatus: peakStatus,
    peakRiskIndex: isOptimized ? 42.0 : 88.5,
    avoidedPeakKW: isOptimized ? 233.0 : 0.0,
    dailyEnergyKWh: parseFloat((campusState.telemetry.dailyEnergyKWh + 0.34).toFixed(1)),
    dailySolarKWh: 2840.0,
    dailyCostINR: isOptimized ? 121200 : 135400,
    carbonSavedKg: isOptimized ? 2580.0 : 2320.0
  };

  // Add to streaming history
  campusState.telemetryHistory.push({
    time: campusState.telemetry.timestamp,
    grossDemand: campusState.telemetry.totalCampusDemandKW,
    solarGen: campusState.telemetry.solarGenerationKW,
    netDemand: campusState.telemetry.netGridDemandKW,
    demoFlexibleCurrent: campusState.prototype.flexibleCurrentA,
    demoCriticalCurrent: campusState.prototype.criticalCurrentA,
    voltage: campusState.telemetry.gridVoltage
  });
  if (campusState.telemetryHistory.length > 40) {
    campusState.telemetryHistory.shift();
  }

  broadcastToClients({
    type: 'TELEMETRY_UPDATE',
    telemetry: campusState.telemetry,
    prototype: campusState.prototype,
    dataQuality: campusState.dataQuality,
    optimizationActive: campusState.optimizationActive
  });
}, 1000);

server.listen(PORT, () => {
  console.log(`================================================================`);
  console.log(` CampusPulse AI // IoT Smart Campus Energy Management Server`);
  console.log(` Web Dashboard running on:   http://localhost:${PORT}`);
  console.log(` WebSocket Streaming on:    ws://localhost:${PORT}`);
  console.log(`================================================================`);
});
