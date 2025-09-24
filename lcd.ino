#include <LiquidCrystal.h>

// RS, E, D4, D5, D6, D7
LiquidCrystal lcd(21, 22, 19, 18, 5, 15);

void setup() {
  lcd.begin(16, 2);          // initialize the 16x2 LCD
  lcd.print("DURVA KADAM!"); // print message on first row
  lcd.setCursor(0, 1);       // move to second row
  lcd.print("SACHI JADHAV!");
}

void loop() {
  // nothing here, static message
}