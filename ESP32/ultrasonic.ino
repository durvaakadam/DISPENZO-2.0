#define TRIG_PIN 33
#define ECHO_PIN 32

long readOnce() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  return pulseIn(ECHO_PIN, HIGH, 30000); // 30 ms timeout
}

float getStableDistance() {
  long values[5];
  int valid = 0;

  for (int i = 0; i < 5; i++) {
    long d = readOnce();
    if (d > 0) values[valid++] = d;
    delay(60);
  }

  if (valid < 3) return -1; // not reliable

  // sort
  for (int i = 0; i < valid - 1; i++) {
    for (int j = i + 1; j < valid; j++) {
      if (values[j] < values[i]) {
        long t = values[i];
        values[i] = values[j];
        values[j] = t;
      }
    }
  }

  long median = values[valid / 2];
  return median * 0.034 / 2;
}

void setup() {
  Serial.begin(115200);
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
}
void loop() {
  float distance = getStableDistance();

  if (distance > 0 && distance < 400) {

    Serial.print("Stable Distance: ");
    Serial.print(distance);
    Serial.println(" cm");

    // LOW STOCK CONDITION
    if (distance > 6) {
      Serial.println("⚠️ LOW STOCK ALERT: Please Refill");
    }
  }

  delay(100);
}

