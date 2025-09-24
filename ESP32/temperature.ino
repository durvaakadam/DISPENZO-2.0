#include <OneWire.h>
#include <DallasTemperature.h>

// DS18B20 setup
#define ONE_WIRE_BUS 14   // GPIO4 for DS18B20
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);

void setup() {
  Serial.begin(115200);
  sensors.begin();
}

void loop() {
  sensors.requestTemperatures(); // Request temperature reading
  float tempC = sensors.getTempCByIndex(0);
  
  Serial.print("Temperature: ");
  Serial.print(tempC);
  Serial.println(" °C");

  // Example condition
  if (tempC > 35) {
    Serial.println("⚠️ High Temperature Alert!");
  }

  Serial.println("---------------------------");
  delay(2000);
}
