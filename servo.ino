#include <ESP32Servo.h>

// ---------------- Servo ----------------
Servo armServo;
bool initialized = false;  // flag to track if we sent first command

void setup() {
  Serial.begin(115200);

  // Attach servo to GPIO13
  armServo.attach(13);

  Serial.println("⚡ Servo ready. Send RIGHT or LEFT command to move it.");
  Serial.println("⚠️ Servo will NOT move on upload/power-up.");
}

void loop() {
  if (Serial.available() > 0) {
    String command = Serial.readStringUntil('\n');
    command.trim();  // remove whitespace

    if (command.equalsIgnoreCase("RIGHT")) {
      armServo.write(0);
      Serial.println("⬅️ Servo moved RIGHT (0°)");
      initialized = true;
    }
    else if (command.equalsIgnoreCase("LEFT")) {
      armServo.write(90);
      Serial.println("➡️ Servo moved LEFT (90°)");
      initialized = true;
    }
    else {
      Serial.println("⚠️ Unknown command. Use RIGHT or LEFT.");
    }
  }
}