#define BLYNK_TEMPLATE_ID   "TMPL3YWFQwuD6"
#define BLYNK_TEMPLATE_NAME "DISPENZO2"
#define BLYNK_AUTH_TOKEN    "9Lb6XZtHooS-pcBEUNRXgsWBih5Y634l"

#include <SPI.h>
#include <MFRC522.h>
#include "HX711.h"
#include <WiFi.h>
#include <BlynkSimpleEsp32.h>

// ---------------- HX711 Load Cell ----------------
#define LOADCELL_DOUT_PIN 4  // DT
#define LOADCELL_SCK_PIN 2   // SCK
HX711 scale;
float CALIBRATION_FACTOR = 2280.0; // Adjust after calibration
bool weightActive = false;

// ---------------- Relay (Solenoid) ----------------
#define RELAY_PIN 26  // Solenoid control

// ---------------- RFID -----------------
#define SS_PIN 14    // SDA
#define RST_PIN 33   // RST
MFRC522 rfid(SS_PIN, RST_PIN);
bool rfidActive = false;

// ---------------- Notifications -----------------
bool sendNotification = false; // Control sending notification

// ---------------- Blynk -----------------
char ssid[] = "Durva's A35";      
char pass[] = "12345678";  

// Timer for non-blocking weight reading
unsigned long lastWeightPrint = 0;
const unsigned long weightInterval = 1000;

void setup() {
  Serial.begin(115200);
  delay(1000);

  // ---- HX711 Setup ----
  scale.begin(LOADCELL_DOUT_PIN, LOADCELL_SCK_PIN);
  delay(500);
  if (scale.is_ready()) {
    scale.set_scale(CALIBRATION_FACTOR);
    scale.tare();
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

  // ---- Blynk Setup ----
  Blynk.begin(BLYNK_AUTH_TOKEN, ssid, pass);
  Serial.println("ESP32 Connected to Blynk ✅");
}

// ---- Blynk Virtual Pins ----
// V1 = Solenoid ON/OFF
BLYNK_WRITE(V1) {
  int value = param.asInt();
  if (value == 1) { digitalWrite(RELAY_PIN, LOW); Serial.println("💧 Solenoid ON via Blynk"); }
  else { digitalWrite(RELAY_PIN, HIGH); Serial.println("❌ Solenoid OFF via Blynk"); }
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
  Serial.println(rfidActive ? "🔎 RFID SCAN STARTED via Blynk" : "⏹️ RFID SCAN STOPPED via Blynk");
}

// ---- Main loop ----
void loop() {
  Blynk.run();

  // ---- Serial Commands ----
  if (Serial.available() > 0) {
    String command = Serial.readStringUntil('\n');
    command.trim();

    if (command.equalsIgnoreCase("ON")) { digitalWrite(RELAY_PIN, LOW); Serial.println("💧 Solenoid ON"); }
    else if (command.equalsIgnoreCase("OFF")) { digitalWrite(RELAY_PIN, HIGH); Serial.println("❌ Solenoid OFF"); }
    else if (command.equalsIgnoreCase("START")) { weightActive = true; Serial.println("📊 Weight STARTED"); }
    else if (command.equalsIgnoreCase("STOP")) { weightActive = false; Serial.println("⏹️ Weight STOPPED"); }
    else if (command.equalsIgnoreCase("SCAN")) { rfidActive = true; Serial.println("🔎 RFID SCAN STARTED"); }
    else if (command.equalsIgnoreCase("STOPSCAN")) { rfidActive = false; Serial.println("⏹️ RFID SCAN STOPPED"); }
    else if (command.equalsIgnoreCase("SEND")) {
      sendNotification = true;
      Serial.println("📨 Sending notification...");
      Blynk.logEvent("notification", "Hello from GROUP 2");
    }
    else if (command.equalsIgnoreCase("STOPSEND")) {
      sendNotification = false;
      Serial.println("📨 Notifications DISABLED");
    }
    else { Serial.println("⚠️ Unknown command."); }
  }

  // ---- RFID Scanning ----
  if (rfidActive) {
    if (rfid.PICC_IsNewCardPresent() && rfid.PICC_ReadCardSerial()) {
      Serial.print("Card UID: ");
      for (byte i = 0; i < rfid.uid.size; i++) {
        if (rfid.uid.uidByte[i] < 0x10) Serial.print("0");
        Serial.print(rfid.uid.uidByte[i], HEX); Serial.print(" ");
      }
      Serial.println();
      rfid.PICC_HaltA();
    }
  }

  // ---- Weight Reading ---- (non-blocking)
  if (weightActive && scale.is_ready()) {
    if (millis() - lastWeightPrint >= weightInterval) {
      lastWeightPrint = millis();
      long weight = scale.get_units(10);
      float weight_oz = weight / 28.34952;

      Serial.print("Weight: "); Serial.print(weight);
      Serial.print(" g | "); Serial.print(weight_oz, 2); Serial.println(" oz");

      // Optional: send to Blynk V4
      Blynk.virtualWrite(V4, weight);
    }
  }
}