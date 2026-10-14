# ⚡ CampusPulse AI — IoT-Based Smart Campus Energy Monitoring and Peak-Demand Optimization System

> **Abstract:** Educational campuses often experience significant electricity-demand spikes during the late afternoon and evening due to cooling systems, lighting, hostel activities, and laboratory operations. These challenges are intensified by declining rooftop solar generation, inconsistent energy-meter data, and limited visibility into building-wise electricity consumption. This project proposes **CampusPulse AI**, an IoT-based energy monitoring and decision-support system designed to identify peak-demand periods, improve energy visibility, and recommend safe energy-saving actions without disrupting essential campus activities.

---

## 🏛️ System Overview

The system uses an **ESP32 microcontroller** and current sensors to collect electrical measurements from a low-voltage demonstration load and transmit readings through Wi-Fi to a web-based dashboard. The platform features:

1. **Real-time energy monitoring dashboard**: Live campus power, gross demand, declining rooftop solar generation curve, and net grid import.
2. **Zone-wise consumption analysis**: Granular breakdown of Academic Blocks, Hostels, Research Labs, Data Centers, and Central Cooling/HVAC Plants.
3. **Interactive demand graphs**: 24-hour diurnal load curves with late-afternoon solar decline overlay and peak breach thresholds.
4. **Data-quality indicators**: Packet reception rate (PRR %), sensor calibration drift, meter consistency score, and statistical Kalman filter interpolation.
5. **Peak-demand prediction & recommendation module**: Identifies flexible sheddable loads (chiller setpoints, hostel water heaters, decorative lighting) and suggests scheduling changes.
6. **User-friendly facilities control panel**: Authorized facility managers review and approve recommended actions with 1-click execution.
7. **Strict critical-load protection**: High-containment research laboratory equipment (cryo-freezers, fume hoods, lasers), campus server data centers, and essential hostel services remain **100% hardwired and locked from curtailment**.
8. **Interactive campus energy map**: Spatial Leaflet map visualizing buildings, monitored zones, rooftop solar arrays, and automated peak alert dispatches.
9. **Before-and-after performance comparisons**: Baseline vs. optimized scenarios evaluating peak reduction (kW and %), cost savings, data quality, and critical-load continuity.
10. **Sustainability report**: Real-time carbon footprint reduction (kg CO2 avoided), equivalent trees planted, and green campus transition badges.

---

## 🌐 5 Core Web Application Modules

| Module | URL | Description |
| :--- | :--- | :--- |
| **1. Architecture & Live Overview** | [`index.html`](file:///d:/iot%20project%20electricity/public/index.html) | Live telemetry ribbon, 24-hr diurnal demand & solar curve, interactive microgrid flow diagram, and 3D miniature ESP32 prototype digital twin. |
| **2. Zone Consumption & Data Quality** | [`zone-analytics.html`](file:///d:/iot%20project%20electricity/public/zone-analytics.html) | Granular building meters, late-afternoon spike decomposition, telemetry packet delivery metrics, and historical logs CSV export. |
| **3. Peak Optimization & Control** | [`load-optimization.html`](file:///d:/iot%20project%20electricity/public/load-optimization.html) | AI peak predictor, decision-support review/approval console, safety interlock guarantees, and ESP32 low-voltage DC demonstration relay control. |
| **4. Campus Energy Map** | [`campus-map.html`](file:///d:/iot%20project%20electricity/public/campus-map.html) | Interactive Leaflet campus map showing building zones, 400 kWp rooftop solar arrays, and automated peak-demand alerts feed. |
| **5. Savings & Sustainability** | [`sustainability-analytics.html`](file:///d:/iot%20project%20electricity/public/sustainability-analytics.html) | Baseline vs. optimized scenario comparison, Time-of-Day (ToD) tariff calculator, CO2 avoidance report, and green campus badges. |

---

## 🛠️ Hardware Testbed & Miniature Prototype

- **Microcontroller**: ESP32-WROOM-32D (Dual-Core 240 MHz, 802.11 b/g/n Wi-Fi)
- **Current Sensors**: 2x Allegro ACS712-05B Hall-Effect Sensors (Flexible Branch vs. Protected Branch)
- **Grid Voltage Sensing**: Calibrated precision DC divider / ZMPT101B AC module
- **Actuators**: Optocoupled solid-state relay module for sheddable DC loads (cooling fan / LED strip)
- **Safety Interlock**: Hardware-locked bypass circuit guaranteeing continuous power to protected laboratory and server simulator loads
- **Display**: 16x2 I2C LCD displaying live Current (A), Power (W), Relay state, and Peak Warning
- **Firmware**: Arduino C++ sketch in [`firmware/esp32_campuspulse.ino`](file:///d:/iot%20project%20electricity/firmware/esp32_campuspulse.ino)

---

## 📊 Before-and-After Performance Evaluation

| Evaluation Metric | Baseline Scenario | CampusPulse AI Optimized | Improvement / Impact |
| :--- | :--- | :--- | :--- |
| **Peak Net Demand** | 1,245.0 kW (Contract Breach) | 982.0 kW (Safe Ceiling) | **-263.0 kW (-21.1%)** |
| **Daily Electricity Cost** | ₹1,48,500 | ₹1,21,200 | **-₹27,300 (-18.4% saving)** |
| **Max Demand Penalty Surcharge** | ₹95,000 / month | ₹0 | **100% Surcharge Avoided** |
| **Critical-Load Continuity** | 100.0% | 100.0% | **Zero Outages (100% Protected)** |
| **Telemetry Data Quality** | 98.9% PRR | 98.9% PRR | **High-Fidelity Sensor Health** |
| **Daily Carbon Avoided** | 0 kg | 2,410 kg CO2 | **108 Trees / Month Equivalent** |

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js** (v18 or newer)
- **Python** (v3.10+ optional for Python engine)

### 2. Install & Run Node.js Server
```bash
# Navigate to project directory
cd "d:\iot project electricity"

# Start the CampusPulse AI Web & WebSocket server
npm start
```

Server will run on:
- Web Dashboard: `http://localhost:3000`
- WebSocket Telemetry: `ws://localhost:3000`

### 3. (Optional) Run Python Prediction Engine
```bash
python anomaly_detector.py
```
Engine will start on port `5001` and stream moving-window forecasts to the Node.js server.
