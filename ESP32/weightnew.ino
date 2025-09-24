#include "HX711.h"

#define LOADCELL_DOUT_PIN 4  // DT pin
#define LOADCELL_SCK_PIN 2   // SCK pin
HX711 scale;

// Start with a negative or positive factor depending on wiring
float CALIBRATION_FACTOR = -200.0;

// Exponential moving average smoothing
float smoothedWeight = 0.0;
float alpha = 0.3; // smoothing factor (0 < alpha <= 1)
float zeroThreshold = 2.0; // weights below this treated as 0

void setup() {
  Serial.begin(115200);
  delay(1000);

  // Initialize scale
  scale.begin(LOADCELL_DOUT_PIN, LOADCELL_SCK_PIN);
  scale.set_scale(CALIBRATION_FACTOR);
  
  // Tare to zero the scale initially
  scale.tare(); 
  Serial.println("✅ Scale Ready! Place no weight for initial zero.");
  Serial.println("Send 'T' via Serial to tare anytime.");
  delay(2000); // allow readings to stabilize
}

void loop() {
  // ---- Serial Command: Tare ----
  if (Serial.available() > 0) {
    char cmd = Serial.read();
    if (cmd == 'T' || cmd == 't') {
      scale.tare();  // tare to zero
      smoothedWeight = 0.0; // reset smoothing
      Serial.println("⚡ Scale Tared via Serial!");
    }
  }

  // ---- Read Weight ----
  if (scale.is_ready()) {
    // Take average of 10 readings
    float weight = scale.get_units(10);

    // Apply smoothing (EMA)
    smoothedWeight = alpha * weight + (1 - alpha) * smoothedWeight;

    // Auto-zero if weight is very small
    if (abs(smoothedWeight) < zeroThreshold) smoothedWeight = 0.0;

    // Print readings
    Serial.print("Weight: ");
    Serial.print(smoothedWeight, 1); // 1 decimal place
    Serial.println(" g");

    delay(200); // 5 readings per second
  } else {
    Serial.println("❌ HX711 not ready!");
    delay(500);
  }
}
