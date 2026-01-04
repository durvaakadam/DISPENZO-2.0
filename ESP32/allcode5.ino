#define BLYNK_TEMPLATE_ID   "TMPL3YWFQwuD6"
#define BLYNK_TEMPLATE_NAME "DISPENZO2"
#define BLYNK_AUTH_TOKEN    "9Lb6XZtHooS-pcBEUNRXgsWBih5Y634l"

#include <ESP32Servo.h>
#include <SPI.h>
#include <MFRC522.h>
#include "HX711.h"
#include <WiFi.h>
#include <BlynkSimpleEsp32.h>
#include <LiquidCrystal.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <Adafruit_Fingerprint.h>

// ---------------- Servo ----------------
Servo armServo;
// --------------- Fingerprint ----------------
HardwareSerial FingerSerial(2);
Adafruit_Fingerprint finger(&FingerSerial);

bool fingerprintMatchActive = false;

// ---------------- HX711 Load Cell ----------------
#define LOADCELL_DOUT_PIN 4  // DT
#define LOADCELL_SCK_PIN 2   // SCK
HX711 scale;
float CALIBRATION_FACTOR = -200.0; // Adjust after calibration
bool weightActive = false;

// EMA smoothing parameters
float smoothedWeight = 0.0;
float alpha = 0.3;       // smoothing factor (0 < alpha <= 1)
float zeroThreshold = 2.0; // below this weight treated as 0

// ---------------- Relay (Solenoid) ----------------
#define RELAY_PIN 26  // Solenoid control
bool solenoidActive = false;
unsigned long solenoidStartTime = 0;
const unsigned long SOLENOID_ON_DURATION = 10000; // 5 seconds

// ---------------- RFID -----------------
#define SS_PIN 14    // SDA
#define RST_PIN 33   // RST
MFRC522 rfid(SS_PIN, RST_PIN);
bool rfidActive = false;

// ---------------- Temperature -----------------
#define ONE_WIRE_BUS 14 // GPIO for DS18B20
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);
bool tempActive = false;


// ---------------- Ultrasonic ----------------
#define TRIG_PIN 33
#define ECHO_PIN 32

bool ultraActive = false;

// ---------------- Moisture Sensor ----------------
#define MOISTURE_PIN 34   // ADC1 pin (SAFE on ESP32)

#define DRY_VALUE 4095    // air / dry
#define WET_VALUE 1500    // fully wet (calibrate!)

bool moistureActive = false;
unsigned long lastMoistureRead = 0;
const unsigned long moistureInterval = 500; // ms



// ---------------- Notifications -----------------
bool sendNotification = false; // Control sending notification

// ---------------- Blynk -----------------
char ssid[] = "Durva's A35";      
char pass[] = "12345678";  

// Timer for non-blocking weight reading
unsigned long lastWeightPrint = 0;
const unsigned long weightInterval = 200; // faster reading

// Timer for RFID default UID
unsigned long rfidStartTime = 0;
bool defaultUIDShown = false; // flag to show default UID only once

int weightReadCount = 0;
const int MAX_WEIGHT_READINGS = 30;

// ---------------- LCD ----------------
// RS, E, D4, D5, D6, D7
LiquidCrystal lcd(21, 22, 19, 18, 5, 15);

void setup() {
  Serial.begin(115200);
  delay(1000);

  // ---- Fingerprint Setup ----
FingerSerial.begin(57600, SERIAL_8N1, 16, 17);
finger.begin(57600);

if (finger.verifyPassword()) {
  Serial.println("✅ Fingerprint sensor ready");
} else {
  Serial.println("❌ Fingerprint sensor NOT detected");
}

  // ---- Servo Setup ----
  armServo.attach(13);
  Serial.println("⚡ Servo ready. Send RIGHT or LEFT command via Serial.");

  // ---- HX711 Setup ----
  scale.begin(LOADCELL_DOUT_PIN, LOADCELL_SCK_PIN);
  delay(500);
  if (scale.is_ready()) {
    scale.set_scale(CALIBRATION_FACTOR);
    scale.tare();
    smoothedWeight = 0.0;
    Serial.println("✅ Scale Ready!");
  } else {
    Serial.println("❌ HX711 not found!");
  }

  // ---- Relay Setup ----
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, HIGH); // OFF
  Serial.println("✅ Solenoid Control Ready!");

  // ---- RFID Setup ----
  SPI.begin(5, 19, 23, 14); // SCK=5, MISO=19, MOSI=23, SS=14
  rfid.PCD_Init();
  Serial.println("✅ RFID Ready!");

  // ---- Temperature Setup ----
  sensors.begin();
  Serial.println("🌡️ Temperature Sensor Ready!");

//ultra
  pinMode(TRIG_PIN, OUTPUT);
pinMode(ECHO_PIN, INPUT);

// ---- Moisture Sensor Setup ----
analogReadResolution(12);
analogSetPinAttenuation(MOISTURE_PIN, ADC_11db);
Serial.println("💧 Moisture Sensor Ready!");

  // ---- Blynk Setup ----
  Blynk.begin(BLYNK_AUTH_TOKEN, ssid, pass);
  Serial.println("ESP32 Connected to Blynk ✅");

  // ---- LCD Setup ----
  lcd.begin(16, 2);
  lcd.print("Weight System");
  lcd.setCursor(0, 1);
  lcd.print("Initializing...");
  delay(2000);
  lcd.clear();

  Serial.println("Send 'T' via Serial to tare anytime.");
}

// ---- Blynk Virtual Pins ----
// V1 = Solenoid ON/OFF
BLYNK_WRITE(V1) {
  int value = param.asInt();
  if (value) {
    digitalWrite(RELAY_PIN, LOW);
    solenoidActive = true;
    solenoidStartTime = millis();
    Serial.println("💧 Solenoid ON via Blynk");
  } else {
    digitalWrite(RELAY_PIN, HIGH);
    solenoidActive = false;
    Serial.println("❌ Solenoid OFF via Blynk");
  }
}

// V2 = Start/Stop weight measurement
BLYNK_WRITE(V2) {
  int value = param.asInt();
  weightActive = (value == 1);
  Serial.println(weightActive ? "📊 Weight STARTED via Blynk" : "⏹️ Weight STOPPED via Blynk");
}

// V3 = Start/Stop RFID scanning
BLYNK_WRITE(V3) {
  int value = param.asInt();
  rfidActive = (value == 1);
  rfidStartTime = millis(); // reset timer for default UID
  defaultUIDShown = false;  // reset flag for new scan
  Serial.println(rfidActive ? "🔎 RFID SCAN STARTED via Blynk" : "⏹️ RFID SCAN STOPPED via Blynk");

  if (rfidActive) {
    lcd.setCursor(0, 1);
    lcd.print("UID: -- -- --");
  } else {
    lcd.setCursor(0, 1);
    lcd.print("UID:          "); // clear row
  }
}

void loop() {
  Blynk.run();

  // ---- Serial Commands ----
  if (Serial.available() > 0) {
    String command = Serial.readStringUntil('\n');
    command.trim();

    if (command.equalsIgnoreCase("ON")) { 
      digitalWrite(RELAY_PIN, LOW);
      solenoidActive = true;
      solenoidStartTime = millis();
      Serial.println("💧 Solenoid ON"); 
    }
    else if (command.equalsIgnoreCase("OFF")) { 
      digitalWrite(RELAY_PIN, HIGH);
      solenoidActive = false;
      Serial.println("❌ Solenoid OFF"); 
    }
    else if (command.equalsIgnoreCase("START")) { weightActive = true; Serial.println("📊 Weight STARTED"); }
    else if (command.equalsIgnoreCase("STOP")) { weightActive = false; Serial.println("⏹️ Weight STOPPED"); }
    else if (command.equalsIgnoreCase("SCAN")) { 
      rfidActive = true; 
      rfidStartTime = millis();
      defaultUIDShown = false;
      Serial.println("🔎 RFID SCAN STARTED"); 
      lcd.setCursor(0,1);
      lcd.print("UID: -- -- --"); 
    }
    else if (command.equalsIgnoreCase("STOPSCAN")) { 
      rfidActive = false; 
      Serial.println("⏹️ RFID SCAN STOPPED"); 
      lcd.setCursor(0,1);
      lcd.print("UID:          "); 
    }
    else if (command.equalsIgnoreCase("TEMP")) { tempActive = true; Serial.println("🌡️ Temperature Reading STARTED"); }
    else if (command.equalsIgnoreCase("TSTOP")) { tempActive = false; Serial.println("🌡️ Temperature Reading STOPPED"); }
    else if (command.equalsIgnoreCase("SEND")) { sendNotification = true; Serial.println("📨 Sending notification..."); Blynk.logEvent("notification", "WELCOME TO DISPENZO!"); }

else if (command.equalsIgnoreCase("ALERT")) { 
  Serial.println("🚨 Sending notification...");
  Blynk.logEvent("alert_event", "⚠️ Stock Low! Please Refill.");
}
    else if (command.equalsIgnoreCase("STOPSEND")) { sendNotification = false; Serial.println("📨 Notifications DISABLED"); }
    else if (command.equalsIgnoreCase("T")) { scale.tare(); smoothedWeight = 0.0; Serial.println("⚡ Scale Tared via Serial!"); }
    else if (command.equalsIgnoreCase("RIGHT")) { armServo.write(0); Serial.println("⬅️ Servo moved RIGHT (0°)"); }
    else if (command.equalsIgnoreCase("LEFT")) { armServo.write(90); Serial.println("➡️ Servo moved LEFT (90°)"); }
    else if (command.equalsIgnoreCase("ULTRA")) { ultraActive = true; Serial.println("📡 Ultrasonic Monitoring STARTED"); }
    else if (command.equalsIgnoreCase("USTOP")) { ultraActive = false; Serial.println("📡 Ultrasonic Monitoring STOPPED"); }
     else if (command.equalsIgnoreCase("MOIST")) { moistureActive = true; Serial.println("💧 Moisture Reading STARTED");}
    else if (command.equalsIgnoreCase("MSTOP")) { moistureActive = false; Serial.println("💧 Moisture Reading STOPPED");
    else if (command.equalsIgnoreCase("FP_MATCH")) {
  fingerprintMatchActive = true;
  Serial.println("🔍 Fingerprint matching started");
  lcd.setCursor(0,1);
  lcd.print("Place Finger   ");
}

    else { Serial.println("⚠️ Unknown command."); }
  }

  // ---- Auto turn OFF solenoid after 5 seconds ----
  if (solenoidActive && millis() - solenoidStartTime >= SOLENOID_ON_DURATION) {
    digitalWrite(RELAY_PIN, HIGH);
    solenoidActive = false;
    Serial.println("❌ Solenoid OFF (auto)");
  }

  // ---- RFID Scanning ----
  if (rfidActive) {
    if (rfid.PICC_IsNewCardPresent() && rfid.PICC_ReadCardSerial()) {
      String uidStr = "";
      for (byte i = 0; i < rfid.uid.size; i++) {
        if (rfid.uid.uidByte[i] < 0x10) uidStr += "0";
        uidStr += String(rfid.uid.uidByte[i], HEX);
        if (i < rfid.uid.size - 1) uidStr += " ";
      }
      rfid.PICC_HaltA();
      Serial.print("Card UID: "); Serial.println(uidStr);
      lcd.setCursor(0,1);
      lcd.print("UID: " + uidStr + "  "); 
      defaultUIDShown = true;
    }
    else if (!defaultUIDShown && millis() - rfidStartTime >= 3000) {
      String defaultUID = "73 69 83 02";
      Serial.print("Default UID: "); Serial.println(defaultUID);
      lcd.setCursor(0,1);
      lcd.print("UID: " + defaultUID + "  ");
      defaultUIDShown = true;
    }
  }

  // ---- Weight Reading ----
  if (weightActive && scale.is_ready()) {
    if (millis() - lastWeightPrint >= weightInterval) {
      lastWeightPrint = millis();
      float weight = scale.get_units(10);
      smoothedWeight = alpha * weight + (1 - alpha) * smoothedWeight;
      if (abs(smoothedWeight) < zeroThreshold) smoothedWeight = 0.0;
      float weight_oz = smoothedWeight / 28.34952;

      Serial.print("Weight: "); Serial.print(smoothedWeight,1);
      Serial.print(" g | "); Serial.print(weight_oz,2); Serial.println(" oz");

      Blynk.virtualWrite(V4, smoothedWeight);

      lcd.setCursor(0,0);
      lcd.print("Weight: ");
      lcd.print(smoothedWeight,1);
      lcd.print(" g   ");
      weightReadCount++;
      if (weightReadCount >= MAX_WEIGHT_READINGS) {
        weightActive = false;
        Serial.println("⏹️ Max weight readings reached (30). Stopping...");
        weightReadCount = 0; // reset counter for next session
      }
    }
  }

  // ---- Temperature Reading ----
  if (tempActive) {
    sensors.requestTemperatures();
    float tempC = sensors.getTempCByIndex(0);
    Serial.print("Temperature: "); Serial.print(tempC); Serial.println(" °C");
    if (tempC > 35) Serial.println("⚠️ High Temperature Alert!");
    delay(500); // read every 0.5 sec
  }
// ---- Ultrasonic Reading (STABLE) ----
if (ultraActive) {

  float distance = getStableDistance();

  if (distance > 0 && distance < 400) {

    Serial.print("Stable Distance: ");
    Serial.print(distance);
    Serial.println(" cm");

    if (distance > 6) {
      Serial.println("⚠️ LOW STOCK ALERT: Please Refill");
    }
  }

  delay(150);
}

// ---- Moisture Reading ----
if (moistureActive && millis() - lastMoistureRead >= moistureInterval) {

  lastMoistureRead = millis();

  int raw = analogRead(MOISTURE_PIN);

  // keep values safe
  raw = constrain(raw, WET_VALUE, DRY_VALUE);

  // convert to percentage
  int moisturePercent = map(raw, DRY_VALUE, WET_VALUE, 0, 100);

  Serial.print("Moisture Raw: ");
  Serial.print(raw);
  Serial.print(" | Moisture: ");
  Serial.print(moisturePercent);
  Serial.println(" %");

  // OPTIONAL ALERT
  if (moisturePercent >30 ) {
    Serial.println("⚠️ HIGH MOISTURE ALERT!");
  }

  // OPTIONAL Blynk
  Blynk.virtualWrite(V5, moisturePercent);
}



  // ---- Fingerprint Matching ----
  if (fingerprintMatchActive) {
    handleFingerprintMatch();
  }
}   // ✅ loop() ENDS HERE


// ================= Fingerprint Function =================
void handleFingerprintMatch() {
  uint8_t p = finger.getImage();
  if (p != FINGERPRINT_OK) return;

  if (finger.image2Tz() != FINGERPRINT_OK) return;

  p = finger.fingerSearch();
  if (p == FINGERPRINT_OK) {
    Serial.print("✅ Fingerprint MATCHED → ID: ");
    Serial.println(finger.fingerID);

    lcd.setCursor(0,1);
    lcd.print("FP OK ID: ");
    lcd.print(finger.fingerID);
  } else {
    Serial.println("❌ Fingerprint NOT matched");
    lcd.setCursor(0,1);
    lcd.print("FP Failed      ");
  }

  fingerprintMatchActive = false;
  delay(2000);
}


