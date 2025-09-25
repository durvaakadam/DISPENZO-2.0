#define TRIG_PIN 33
#define ECHO_PIN 32

long duration;
float distance;
float containerHeight = 10.0;   // Height of your funnel in cm
float lowStockThreshold = 8.0;  // Distance threshold to trigger low stock alert (tune this value)

void setup() {
  Serial.begin(115200);
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
}

void loop() {
  // Trigger the ultrasonic sensor
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  // Measure echo
  duration = pulseIn(ECHO_PIN, HIGH);

  // Convert duration to distance in cm
  distance = duration * 0.034 / 2;

  // Calculate fill level
  float fillLevel = containerHeight - distance;
  if (fillLevel < 0) fillLevel = 0; // Avoid negative values
  float percentage = (fillLevel / containerHeight) * 100;

  // Print readings
  Serial.print("Distance from sensor: "); Serial.print(distance); Serial.println(" cm");
  Serial.print("Fill level: "); Serial.print(fillLevel); Serial.print(" cm ("); 
  Serial.print(percentage); Serial.println("%)");

  // Low stock alert
  if (distance > lowStockThreshold) {  // Distance increased -> low grain
    Serial.println("⚠️ Low Stock Detected!");
  }

  Serial.println("---------------------------");
  delay(2000); // 2-second interval
}
