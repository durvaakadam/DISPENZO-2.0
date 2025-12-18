#define RELAY_PIN 26   // Relay controlling the pump

void setup() {
  Serial.begin(115200);

  pinMode(RELAY_PIN, OUTPUT);

  // Relay OFF at startup
  digitalWrite(RELAY_PIN, HIGH);

  Serial.println("Pump Control Ready");
  Serial.println("Send: PUMPON or PUMPOFF");
}

void loop() {
  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();

    if (cmd.equalsIgnoreCase("PUMPON")) {
      digitalWrite(RELAY_PIN, LOW);   // Relay ON
      Serial.println("💧 Pump ON");
    }
    else if (cmd.equalsIgnoreCase("PUMPOFF")) {
      digitalWrite(RELAY_PIN, HIGH);  // Relay OFF
      Serial.println("❌ Pump OFF");
    }
    else {
      Serial.println("Unknown command");
    }
  }
}
