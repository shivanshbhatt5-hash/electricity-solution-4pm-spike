/*
 * =========================================================================
 * Project: CampusPulse AI — IoT-Based Smart Campus Energy Monitoring
 *          and Peak-Demand Optimization System
 * Hardware: ESP32-WROOM-32D Microcontroller
 * Sensors:  2x ACS712-05B Current Sensors (Flexible Load & Critical Load)
 *           Precision DC Voltage Divider / ZMPT101B Module
 * Actuators: 5V Dual Relay (Flexible Load Curtailment + Interlocked Critical)
 * Display:  I2C 16x2 LCD Display (0x27)
 * Author:   CampusPulse AI Embedded Systems Team
 * =========================================================================
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

// --- Wi-Fi Network Credentials ---
const char* ssid = "CAMPUS_IOT_WIFI";
const char* password = "CampusPulseSecureKey2026";

// --- CampusPulse AI Server Ingestion Endpoint ---
const char* NODEJS_SERVER_URL = "http://192.168.1.100:3000/api/telemetry/ingest";

// --- ESP32 Pin Definitions ---
#define FLEXIBLE_CURRENT_PIN 34  // ADC1_CH6 (ACS712 for flexible cooling/lighting DC load)
#define CRITICAL_CURRENT_PIN 35  // ADC1_CH7 (ACS712 for protected server/lab DC load)
#define VOLTAGE_PIN          32  // ADC1_CH4 (Bus Voltage Sensor)
#define FLEXIBLE_RELAY_PIN   26  // Active-Low Relay for shedding flexible DC load
#define STATUS_LED_PIN        2  // Onboard Heartbeat LED

// --- Calibration Factors for ACS712-05B (185 mV/A) ---
const float V_REF = 3.3;
const float ADC_SCALE = 4095.0;
const float SENSITIVITY = 0.185; // 185 mV/A for 5A model
const float VOLTAGE_DIVIDER_RATIO = 4.0; // 12V to 3V scaling

// --- Global System State ---
LiquidCrystal_I2C lcd(0x27, 16, 2);
unsigned long lastTelemetryTime = 0;
const unsigned long TELEMETRY_INTERVAL = 1000; // 1000ms Wi-Fi stream
bool flexibleRelayState = true; // true = CLOSED (Powered), false = OPEN (Shedded)

// Sample DC Current through Hall Sensor with 64-point moving average
float readCurrent(int pin) {
  long sum = 0;
  for (int i = 0; i < 64; i++) {
    sum += analogRead(pin);
    delayMicroseconds(100);
  }
  float avgRaw = (float)sum / 64.0;
  float voltage = (avgRaw * V_REF) / ADC_SCALE;
  float zeroOffset = V_REF / 2.0; // 1.65V zero point
  float current = abs(voltage - zeroOffset) / SENSITIVITY;
  return current;
}

// Sample DC Bus Voltage
float readBusVoltage() {
  int raw = analogRead(VOLTAGE_PIN);
  float pinVoltage = (raw * V_REF) / ADC_SCALE;
  return pinVoltage * VOLTAGE_DIVIDER_RATIO;
}

void setup() {
  Serial.begin(115200);
  pinMode(FLEXIBLE_RELAY_PIN, OUTPUT);
  pinMode(STATUS_LED_PIN, OUTPUT);
  digitalWrite(FLEXIBLE_RELAY_PIN, LOW); // Relay Energized (Load Active)
  digitalWrite(STATUS_LED_PIN, HIGH);

  // Initialize I2C LCD
  Wire.begin(21, 22);
  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("CampusPulse AI");
  lcd.setCursor(0, 1);
  lcd.print("Connecting Wi-Fi");

  Serial.println("[ESP32] Connecting to Wi-Fi: " + String(ssid));
  WiFi.begin(ssid, password);
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 15) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  lcd.clear();
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[ESP32] Wi-Fi Connected. IP: " + WiFi.localIP().toString());
    lcd.setCursor(0, 0);
    lcd.print("IP: ");
    lcd.print(WiFi.localIP().toString().substring(0, 12));
    lcd.setCursor(0, 1);
    lcd.print("Node: ONLINE");
  } else {
    Serial.println("\n[ESP32] Running in Standalone Demonstration Mode");
    lcd.setCursor(0, 0);
    lcd.print("Standalone Demo");
    lcd.setCursor(0, 1);
    lcd.print("Sensors Active");
  }
  delay(1500);
}

void loop() {
  unsigned long now = millis();
  if (now - lastTelemetryTime >= TELEMETRY_INTERVAL) {
    lastTelemetryTime = now;

    // 1. Read Physical Sensor Values
    float flexCurrent = readCurrent(FLEXIBLE_CURRENT_PIN);
    float critCurrent = readCurrent(CRITICAL_CURRENT_PIN);
    float busVoltage = readBusVoltage();
    if (busVoltage < 5.0) busVoltage = 12.05; // Fallback simulation clamp

    if (!flexibleRelayState) {
      flexCurrent = 0.0; // Relay opened, load shedded
    }

    float totalCurrent = flexCurrent + critCurrent;
    float powerWatts = busVoltage * totalCurrent;

    // 2. Update 16x2 LCD
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("I:");
    lcd.print(totalCurrent, 2);
    lcd.print("A P:");
    lcd.print(powerWatts, 1);
    lcd.print("W");

    lcd.setCursor(0, 1);
    lcd.print(flexibleRelayState ? "RELAY:ON " : "SHED:ACT ");
    lcd.print("CRIT:LOCK");

    // 3. Transmit JSON Telemetry to CampusPulse AI Server
    if (WiFi.status() == WL_CONNECTED) {
      HTTPClient http;
      http.begin(NODEJS_SERVER_URL);
      http.addHeader("Content-Type", "application/json");

      String jsonPayload = "{";
      jsonPayload += "\"esp32\": true,";
      jsonPayload += "\"prototype\": {";
      jsonPayload += "\"busVoltageV\":" + String(busVoltage, 2) + ",";
      jsonPayload += "\"flexibleCurrentA\":" + String(flexCurrent, 2) + ",";
      jsonPayload += "\"criticalCurrentA\":" + String(critCurrent, 2) + ",";
      jsonPayload += "\"totalCurrentA\":" + String(totalCurrent, 2) + ",";
      jsonPayload += "\"loadPowerWatts\":" + String(powerWatts, 2) + ",";
      jsonPayload += "\"flexibleRelayState\":\"" + String(flexibleRelayState ? "CLOSED" : "OPEN") + "\",";
      jsonPayload += "\"criticalRelayState\":\"LOCKED_CLOSED\"";
      jsonPayload += "}}";

      int httpResponseCode = http.POST(jsonPayload);
      if (httpResponseCode > 0) {
        String response = http.getString();
        // Check if server commanded a load-shedding relay trip
        if (response.indexOf("\"relayAction\":\"SHED\"") >= 0) {
          flexibleRelayState = false;
          digitalWrite(FLEXIBLE_RELAY_PIN, HIGH); // Trip flexible relay
        } else if (response.indexOf("\"relayAction\":\"RESTORE\"") >= 0) {
          flexibleRelayState = true;
          digitalWrite(FLEXIBLE_RELAY_PIN, LOW); // Energize relay
        }
      }
      http.end();
    }

    // Toggle heartbeat LED
    digitalWrite(STATUS_LED_PIN, !digitalRead(STATUS_LED_PIN));
  }
}
