#include "HX711.h"

// ---------------- HX711 Load Cell ----------------
#define LOADCELL_DOUT_PIN 4  // DT
#define LOADCELL_SCK_PIN 2   // SCK
HX711 scale;
float CALIBRATION_FACTOR = 20.0; // Adjust after calibration

void setup() {
  Serial.begin(115200);
  delay(500);

  // HX711 Setup
  scale.begin(LOADCELL_DOUT_PIN, LOADCELL_SCK_PIN);
  delay(500);
  if (scale.is_ready()) {
    scale.set_scale(CALIBRATION_FACTOR);
    scale.tare(); // Reset to 0
    Serial.println("✅ HX711 Scale Ready!");
  } else {
    Serial.println("❌ HX711 not found!");
  }
}

void loop() {
  if (scale.is_ready()) {
    long weight = scale.get_units(10);  // average of 10 readings
    float weight_oz = weight / 28.34952;

    Serial.print("Weight: ");
    Serial.print(weight);
    Serial.print(" g | ");
    Serial.print(weight_oz, 2);
    Serial.println(" oz");

    delay(1000); // read every 1 second
  }
}