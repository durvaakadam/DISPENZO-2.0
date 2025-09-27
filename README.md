#  DISPENZO 2.0 – Smart Ration Dispensing & Monitoring System  

[![Made with ESP32](https://img.shields.io/badge/ESP32-IoT-blue)](https://www.espressif.com/en/products/socs/esp32) [![Frontend-React](https://img.shields.io/badge/Frontend-React-green)](https://reactjs.org/) [![Backend-Node.js](https://img.shields.io/badge/Backend-Node.js-yellow)](https://nodejs.org/) [![License: MIT](https://img.shields.io/badge/License-MIT-red)](LICENSE)


The Smart Ration Distribution System (SRDS) modernizes the Public Distribution System (PDS) by using RFID authentication to ensure that only eligible beneficiaries receive their rations. By automating the process, it reduces fraud, manual errors, and delays, offering a more efficient and transparent distribution system. The system provides real-time access to accurate records through a web portal, ensuring fair and timely ration distribution.



## 🖥️ Dashboard  

✅ Temperature Monitoring Card with toggle  
✅ Container Level Card (on-demand check)  
✅ Weight Tracking Card (live updates during dispensing)  
✅ Alert banners (⚠️ high temp / low inventory)  

## 📌 Circuit Diagram

<img src="/images/circuit_diag.jpeg" alt="CIRCUIT DIAGRAM" width="600"/>


## 📸 PROJECT MODEL

<div style="display: flex; gap: 10px;">
  <img src="/images/new1.jpeg" alt="SETUP" width="300"/>
  <img src="/images/new4.jpeg" alt="SETUP" width="300"/>
</div>




## 🔌 Hardware Requirements  

- **ESP32** (Wi-Fi microcontroller)  
- **HX711 + Load Cell** (weight measurement)  
- **DHT11/DHT22** (temperature monitoring)  
- **Ultrasonic Sensor (HC-SR04)** (container level detection)  
- **Servo Motor (MG995 / SG90)** (automated dispensing)  
- **Power Supply (9V/12V regulated)**  
- *(Optional)* Relay Module (for LEDs / actuators)  



## 📦 Installation  

### 1️⃣ ESP32 Firmware  

- Install **Arduino IDE** + ESP32 board core  
- Install required libraries:  
  - `ESP32Servo`  
  - `HX711`  
  - `Blynk`  
  - `MFRC522` *(only if RFID is needed)*  
- Flash the firmware code to ESP32  



### 2️⃣ Backend (Node.js + Socket.IO)  

```bash
git clone https://github.com/your-username/dispenzo-2.0.git
cd dispenzo-2.0/backend
npm install
npm start

```

### 3️⃣ Frontend (React Dashboard)

```bash
cd ../frontend
npm install
npm run dev
```

### 4️⃣ Blynk Setup
```bash
Create a project inside the Blynk mobile app.

Copy the Auth Token into your ESP32 firmware.

Use the app to monitor and control remotely.
```

### 📊 Example Logs
```bash
📥 Serial data received: Weight: 26.8 g | 0.94 oz
⚖️ Current weight: 26.8 g
🛑 Threshold (17 g) reached. Stopping motor...
📥 Serial data received: ⏹️ Weight STOPPED
🔎 ESP32: ⬅️ Servo moved RIGHT (0°)
```