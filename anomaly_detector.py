#!/usr/bin/env python3
"""
CampusPulse AI — IoT-Based Smart Campus Energy Monitoring and Peak-Demand Optimization System
Python Predictive Telemetry Processor & Peak-Demand Optimization Engine
-----------------------------------------------------------------------------------------
Author: CampusPulse AI Core Engineering Team
Backend: Python 3 Flask Engine (Port 5001)
Inter-process communication: REST Webhook & WebSocket bridge to Node.js Server (Port 3000)
"""

import time
import math
import random
import threading
import requests
from flask import Flask, request, jsonify

app = Flask(__name__)

NODE_SERVER_URL = "http://127.0.0.1:3000/api/telemetry/ingest"

# Internal Engine State
state = {
    "engine_status": "ACTIVE",
    "forecast_horizon_hours": 4.0,
    "contract_demand_limit_kw": 1000.0,
    "rooftop_solar_capacity_kw": 400.0,
    "simulation_hour": 17.25, # 5:15 PM (Evening Peak Window)
    "optimization_engaged": False,
    "total_scans": 0,
    "predicted_peak_kw": 1245.0,
    "shaving_target_kw": 194.0
}

def calculate_solar_output(hour_float, capacity_kw=400.0):
    """
    Computes rooftop solar generation curve with late-afternoon decline.
    Peaks at solar noon (~340 kW), drops rapidly from 4 PM (110 kW) to 6:30 PM (0 kW).
    """
    if hour_float < 6.5 or hour_float > 18.5:
        return 0.0
    
    # Normalized solar arc (6:30 AM to 6:30 PM)
    arc = (hour_float - 6.5) / 12.0 * math.pi
    ideal_output = capacity_kw * 0.85 * math.sin(arc)
    
    # Late afternoon accelerated drop factor
    if hour_float > 16.0:
        decline_factor = max(0.0, 1.0 - (hour_float - 16.0) / 2.5)
        ideal_output = ideal_output * decline_factor
        
    return max(0.0, round(ideal_output + random.uniform(-1.5, 1.5), 1))

def predict_campus_demand(hour_float, optimization_active=False):
    """
    Simulates realistic diurnal university electricity consumption.
    Reflects sharp evening spikes from 4 PM to 9 PM due to chillers, hostel geysers,
    and lighting, while protecting critical servers and science laboratories.
    """
    base_load = 420.0 # Base nighttime / baseline load
    
    # Time-of-day campus curve
    if 8.0 <= hour_float < 16.0:
        academic_load = 520.0 + random.uniform(-15.0, 15.0)
    elif 16.0 <= hour_float < 21.0:
        # THE PEAK SPIKE WINDOW (Cooling + Hostels + Lighting)
        academic_load = 760.0 + random.uniform(-10.0, 10.0)
    else:
        academic_load = 180.0
        
    gross = base_load + academic_load
    
    # If optimization is active, shave flexible loads while keeping critical loads locked
    if optimization_active:
        gross -= 194.0 # 92kW chiller + 74kW hostels + 28kW lighting
        
    return round(gross, 1)

def run_prediction_loop():
    """
    Continuous background prediction thread forecasting peak breaches,
    monitoring telemetry data-quality, and feeding the Node.js WebSocket hub.
    """
    print("[Python Predictive Engine] Background peak optimization thread running...")
    
    while True:
        try:
            hour = state["simulation_hour"]
            solar = calculate_solar_output(hour, state["rooftop_solar_capacity_kw"])
            gross = predict_campus_demand(hour, state["optimization_engaged"])
            net_grid = max(0.0, round(gross - solar, 1))
            
            is_breach = net_grid > state["contract_demand_limit_kw"]
            status_label = "OPTIMIZED_ACTIVE" if state["optimization_engaged"] else ("PEAK_THRESHOLD_BREACH" if is_breach else "NORMAL")
            
            payload = {
                "python": True,
                "telemetry": {
                    "timestamp": time.strftime("%H:%M:%S"),
                    "totalCampusDemandKW": gross,
                    "solarGenerationKW": solar,
                    "netGridDemandKW": net_grid,
                    "contractDemandLimitKW": state["contract_demand_limit_kw"],
                    "peakStatus": status_label,
                    "gridVoltage": round(230.2 + random.uniform(-0.6, 0.6), 1),
                    "gridFrequency": round(50.0 + random.uniform(-0.03, 0.03), 2)
                }
            }
            
            # Send payload to Node.js ingestion gateway
            try:
                requests.post(NODE_SERVER_URL, json=payload, timeout=0.8)
            except Exception:
                pass # Node server might be rebooting or running standalone
                
            state["total_scans"] += 1
            time.sleep(1.2)
        except Exception as e:
            print(f"[Python Engine Error]: {e}")
            time.sleep(2.0)

@app.route('/api/py/status', methods=['GET'])
def get_status():
    return jsonify({
        "engine": "CampusPulse AI Peak Prediction & Telemetry Processor",
        "status": "ONLINE",
        "scans": state["total_scans"],
        "contractCeilingKW": state["contract_demand_limit_kw"],
        "shavingTargetKW": state["shaving_target_kw"],
        "optimizationActive": state["optimization_engaged"]
    })

@app.route('/api/py/set-optimization', methods=['POST'])
def set_optimization():
    data = request.get_json() or {}
    state["optimization_engaged"] = bool(data.get("active", False))
    return jsonify({
        "success": True,
        "optimizationEngaged": state["optimization_engaged"]
    })

if __name__ == '__main__':
    # Start background prediction loop in daemon thread
    thread = threading.Thread(target=run_prediction_loop, daemon=True)
    thread.start()
    
    print("==========================================================================")
    print(" CampusPulse AI // Python Peak-Demand Prediction Engine running on Port 5001")
    print("==========================================================================")
    app.run(host='0.0.0.0', port=5001, debug=False, use_reloader=False)
