#include <Adafruit_Fingerprint.h>

// Use UART2 on ESP32
HardwareSerial FingerSerial(2);
Adafruit_Fingerprint finger(&FingerSerial);

uint8_t enrollID = 0;
char mode = 0;   // 'E' or 'M'

void setup() {
  Serial.begin(115200);
  delay(2000);

  Serial.println("\n=== FINGERPRINT SYSTEM ===");

  // RX = GPIO16, TX = GPIO17
  FingerSerial.begin(57600, SERIAL_8N1, 16, 17);
  finger.begin(57600);

  if (!finger.verifyPassword()) {
    Serial.println("❌ Fingerprint sensor NOT detected");
    while (1);
  }

  Serial.println("✅ Fingerprint sensor detected");
  Serial.println("Type:");
  Serial.println("E → Enroll fingerprint");
  Serial.println("M → Match fingerprint");
}

void loop() {
  // -------- MODE SELECTION --------
  if (mode == 0 && Serial.available()) {
    mode = toupper(Serial.read());
    Serial.readString(); // clear buffer

    if (mode == 'E') {
      Serial.println("\n📝 ENROLLMENT MODE");
      Serial.println("Enter Fingerprint ID (1–127):");
    } 
    else if (mode == 'M') {
      Serial.println("\n🔍 MATCH MODE");
      Serial.println("Place finger on sensor...");
    } 
    else {
      Serial.println("❌ Invalid option. Type E or M");
      mode = 0;
    }
  }

  // -------- ENROLL MODE --------
  if (mode == 'E' && Serial.available()) {
    enrollID = Serial.parseInt();
    Serial.readString();

    if (enrollID < 1 || enrollID > 127) {
      Serial.println("❌ Invalid ID. Enter 1–127");
      return;
    }

    Serial.print("\n▶ Enrolling Fingerprint ID #");
    Serial.println(enrollID);

    if (enrollFingerprint(enrollID)) {
      Serial.println("🎉 ENROLLMENT SUCCESS");
    } else {
      Serial.println("❌ ENROLLMENT FAILED — Try again");
    }

    Serial.println("\nEnter another ID (1–127) OR reset board:");
  }

  // -------- MATCH MODE --------
  if (mode == 'M') {
    matchFingerprint();
  }
}

// ================= ENROLL FUNCTION =================
bool enrollFingerprint(uint8_t id) {
  int p = -1;

  Serial.println("Place finger firmly on sensor");
  delay(1000);

  while (p != FINGERPRINT_OK) {
    p = finger.getImage();
    if (p == FINGERPRINT_NOFINGER) {
      Serial.print(".");
      delay(100);
    }
  }
  Serial.println("\n✔ First image captured");

  if (finger.image2Tz(1) != FINGERPRINT_OK) return false;

  Serial.println("Remove finger");
  delay(2500);

  while (finger.getImage() != FINGERPRINT_NOFINGER);

  Serial.println("Place SAME finger again");
  delay(1000);

  p = -1;
  while (p != FINGERPRINT_OK) {
    p = finger.getImage();
    if (p == FINGERPRINT_NOFINGER) {
      Serial.print(".");
      delay(100);
    }
  }
  Serial.println("\n✔ Second image captured");

  if (finger.image2Tz(2) != FINGERPRINT_OK) return false;

  if (finger.createModel() != FINGERPRINT_OK) {
    Serial.println("❌ Fingerprints did NOT match");
    return false;
  }

  if (finger.storeModel(id) != FINGERPRINT_OK) {
    Serial.println("❌ Could not store fingerprint");
    return false;
  }

  return true;
}

// ================= MATCH FUNCTION =================
void matchFingerprint() {
  uint8_t p = finger.getImage();
  if (p != FINGERPRINT_OK) return;

  if (finger.image2Tz() != FINGERPRINT_OK) return;

  p = finger.fingerSearch();
  if (p == FINGERPRINT_OK) {
    Serial.print("✅ MATCH FOUND → ID: ");
    Serial.print(finger.fingerID);
    Serial.print(" | Confidence: ");
    Serial.println(finger.confidence);
    delay(2000);
  } else {
    Serial.println("❌ No match found");
    delay(2000);
  }
}
