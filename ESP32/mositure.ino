#define MOISTURE_PIN 34

#define DRY_VALUE 4095   // dry soil / air
#define WET_VALUE 1500   // fully wet soil (calibrate!)

void setup() {
  Serial.begin(115200);

  analogReadResolution(12);
  analogSetPinAttenuation(MOISTURE_PIN, ADC_11db);
}

void loop() {
  int raw = analogRead(MOISTURE_PIN);

  // constrain to safe range
  raw = constrain(raw, WET_VALUE, DRY_VALUE);

  // map to percentage (inverted)
  int moisturePercent = map(raw, DRY_VALUE, WET_VALUE, 0, 100);

  Serial.print("Raw: ");
  Serial.print(raw);
  Serial.print("  | Moisture: ");
  Serial.print(moisturePercent);
  Serial.println(" %");

  delay(500);
}
