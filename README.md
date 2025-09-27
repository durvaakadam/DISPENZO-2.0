# 🚀 Dispenzo 2.0 – Smart Dispensing & Monitoring System  

[![Made with ESP32](https://img.shields.io/badge/ESP32-IoT-blue)](https://www.espressif.com/en/products/socs/esp32)  
[![Frontend-React](https://img.shields.io/badge/Frontend-React-green)](https://reactjs.org/)  
[![Backend-Node.js](https://img.shields.io/badge/Backend-Node.js-yellow)](https://nodejs.org/)  
[![License: MIT](https://img.shields.io/badge/License-MIT-red)](LICENSE)  

**Dispenzo 2.0** is an IoT-based automated dispensing and monitoring system built using **ESP32, smart sensors, and a modern React dashboard**.  
It’s designed for **smart food dispensers, inventory tracking, and container management** with **real-time monitoring and alerts**.  

---

## ⚙️ Features  

- 📡 **ESP32 Brain** → Wi-Fi enabled microcontroller for IoT.  
- ⚖️ **Weight Sensor (HX711 + Load Cell)** → Real-time dispensing measurement.  
- 🌡️ **Temperature Sensor** → Environmental monitoring.  
- 🛢️ **Container Level Detection** → Stock tracking.  
- 🔄 **Servo Motor Control** → Automated dispensing.  
- 💡 **Threshold Alerts** → High temp / low stock notifications.  
- 📲 **Blynk App Integration** for IoT mobile control.  
- 🖥️ **Custom React Dashboard** with **Socket.IO** for live updates.  

---

## 🏗️ System Architecture  

```mermaid
flowchart TD
    User[User Dashboard] -->|Commands| Backend
    Backend -->|Socket.IO| ESP32
    ESP32 -->|Sensor Data| Backend
    Backend -->|Real-time Events| User
    ESP32 --> Sensors
    Sensors -->|Readings| ESP32
    ESP32 --> Actuators
    Actuators -->|Dispensing/LEDs| ESP32
