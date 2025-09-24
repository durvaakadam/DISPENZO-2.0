#define TRIG_PIN 5
#define ECHO_PIN 18

long duration;
float distance;
float containerHeight = 30.0; // cm

void setup() {
  Serial.begin(115200);
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
}

void loop() {
  // --- Trigger the ultrasonic sensor ---
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  // --- Measure echo ---
  duration = pulseIn(ECHO_PIN, HIGH);

  // --- Convert duration to distance in cm ---
  distance = duration * 0.034 / 2;

  // --- Calculate fill level ---
  float fillLevel = containerHeight - distance;          // how much material is in the container
  float percentage = (fillLevel / containerHeight) * 100; // fill percentage

  // --- Print readings ---
  Serial.print("Distance: ");
  Serial.print(distance);
  Serial.println(" cm");

  Serial.print("Fill Level: ");
  Serial.print(fillLevel);
  Serial.print(" cm (");
  Serial.print(percentage);
  Serial.println("%)");

  // --- Low stock alert ---
  if (percentage < 20) {
    Serial.println("⚠️ Low Stock Alert!");
  }

  Serial.println("---------------------------");
  delay(2000); // wait 2 seconds before next reading
}