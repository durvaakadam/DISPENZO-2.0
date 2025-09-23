#include <ESP32Servo.h>

Servo armServo;  

int currentPos = 0;  // track current angle

void setup() {
  Serial.begin(115200);
  armServo.attach(13);  // attach servo to GPIO13
  armServo.write(currentPos); // start at 0°
  Serial.println("Send 'L' for Left (90°), 'R' for Right (0°)");
}

void loop() {
  if (Serial.available()) {
    char cmd = Serial.read();

    if (cmd == 'L') {         // Move to 90° left
      currentPos = 90;
      armServo.write(currentPos);
      Serial.println("Moved Left (90°)");
    }
    else if (cmd == 'R') {    // Move back to 0°
      currentPos = 0;
      armServo.write(currentPos);
      Serial.println("Moved Right (0°)");
    }
  }
}
