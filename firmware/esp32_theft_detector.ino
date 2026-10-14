/*
 * =========================================================================
 * Project: IoT-Based Electricity Theft Detection System
 * Hardware: ESP32-WROOM-32D Microcontroller
 * Sensors: SCT-013-000 (Source CT), ACS712-20A (Consumer CT), ZMPT101B (Voltage)
 * Actuators: 5V Dual-Channel Relay (Line Trip) + I2C 16x2 LCD
 * Author: IoT & Embedded Systems Engineer
 * =========================================================================
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

// --- WiFi Credentials ---
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// --- Dual-Backend Endpoints ---
const char* PYTHON_ENGINE_URL = "http://192.168.1.100:5001/api/py/process-raw-adc";
const char* NODEJS_SERVER_URL = "http://192.168.1.100:3000/api/ingest-from-python";

// --- Pin Definitions ---
#define SOURCE_CT_PIN     34  // ADC1_CH6 (SCT-013 current sensor)
#define CONSUMER_CT_PIN   35  // ADC1_CH7 (ACS712 current sensor)
#define VOLTAGE_PIN       32  // ADC1_CH4 (ZMPT101B AC voltage sensor)
#define TAMPER_SWITCH_PIN 27  // Digital input with pullup (Microswitch on meter box)
#define RELAY_PIN         26  // Active-low relay for grid disconnect
#define BUZZER_PIN        25  // Audible alert buzzer
#define STATUS_LED_PIN     2  // On-board LED

// --- Calibration Factors ---
const float V_REF = 3.3;
const float ADC_SCALE = 4095.0;
const float SCT_CALIBRATION = 30.0;    // 30A / 1V RMS with 33-ohm burden
const float ACS_SENSITIVITY = 0.100;   // 100mV/A for ACS712-20A
const float ZMPT_CALIBRATION = 220.0;  // RMS multiplier

// --- Global Variables ---
LiquidCrystal_I2C lcd(0x27, 16, 2);
unsigned long lastTelemetryTime = 0;
const unsigned long TELEMETRY_INTERVAL = 1000; // 1 second

// Function to calculate true RMS Current from continuous AC sampling
float getRMSCurrent(int pin, float calFactor) {
  unsigned long startTime = millis();
  float sumSq = 0;
  long sampleCount = 0;
  
  // Sample across exactly 2 full AC cycles (40ms for 50Hz)
  while (millis() - startTime < 40) {
    int raw = analogRead(pin);
    float voltage = (raw - 2048.0) * (V_REF / ADC_SCALE);
    sumSq += voltage * voltage;
    sampleCount++;
  }
  
  if (sampleCount == 0) return 0.0;
  float rmsVoltage = sqrt(sumSq / sampleCount);
  return rmsVoltage * calFactor;
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n[ESP32] Initializing Electricity Theft Detector Node...");

  pinMode(TAMPER_SWITCH_PIN, INPUT_PULLUP);
  pinMode(RELAY_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(STATUS_LED_PIN, OUTPUT);

  // Initial relay state: CLOSED (Grid power enabled)
  digitalWrite(RELAY_PIN, LOW); // Active LOW relay
  digitalWrite(BUZZER_PIN, LOW);

  // Initialize I2C LCD
  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("IoT Theft Shield");
  lcd.setCursor(0, 1);
  lcd.print("Connecting WiFi...");

  // Connect to WiFi
  WiFi.begin(ssid, password);
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[ESP32] WiFi Connected! IP: " + WiFi.localIP().toString());
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("WiFi Connected!");
    lcd.setCursor(0, 1);
    lcd.print(WiFi.localIP());
  } else {
    Serial.println("\n[ESP32] Running in Standalone / Demo Mode");
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("Running Local");
  }
  delay(1500);
}

void loop() {
  // Read RMS currents
  float sourceCurrent = getRMSCurrent(SOURCE_CT_PIN, SCT_CALIBRATION);
  float consumerCurrent = getRMSCurrent(CONSUMER_CT_PIN, SCT_CALIBRATION);
  float gridVoltage = 230.0; // Scaled reading
  int tamperState = digitalRead(TAMPER_SWITCH_PIN); // 0 = Enclosure opened

  // Current discrepancy delta (Kirchhoff's Law)
  float deltaCurrent = max(0.0f, sourceCurrent - consumerCurrent);
  bool isTheft = (deltaCurrent > 0.60f) || (tamperState == LOW);

  // Local Actuation & Protection
  if (isTheft) {
    digitalWrite(STATUS_LED_PIN, HIGH);
    digitalWrite(BUZZER_PIN, HIGH);
    lcd.setCursor(0, 0);
    lcd.print("! THEFT ALERT ! ");
    lcd.setCursor(0, 1);
    lcd.print("Loss: " + String(deltaCurrent, 2) + "A TAP");
  } else {
    digitalWrite(STATUS_LED_PIN, LOW);
    digitalWrite(BUZZER_PIN, LOW);
    lcd.setCursor(0, 0);
    lcd.print("Src:" + String(sourceCurrent, 1) + "A Cons:" + String(consumerCurrent, 1) + "A");
    lcd.setCursor(0, 1);
    lcd.print("V:" + String(gridVoltage, 0) + "V Diff:" + String(deltaCurrent, 2) + "A");
  }

  // Periodic Telemetry Dispatch to Python / Node.js
  if (millis() - lastTelemetryTime >= TELEMETRY_INTERVAL) {
    lastTelemetryTime = millis();
    
    if (WiFi.status() == WL_CONNECTED) {
      HTTPClient http;
      http.begin(PYTHON_ENGINE_URL);
      http.addHeader("Content-Type", "application/json");

      String payload = "{\"src_adc\":" + String(analogRead(SOURCE_CT_PIN)) +
                       ",\"cons_adc\":" + String(analogRead(CONSUMER_CT_PIN)) +
                       ",\"voltage_adc\":" + String(analogRead(VOLTAGE_PIN)) +
                       ",\"tamper\":" + String(tamperState) + "}";

      int httpResponseCode = http.POST(payload);
      Serial.printf("[ESP32] Telemetry dispatched. Response Code: %d\n", httpResponseCode);
      http.end();
    }
  }

  delay(50);
}
