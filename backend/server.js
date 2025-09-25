const { SerialPort } = require("serialport");
const { ReadlineParser } = require("@serialport/parser-readline");
const express = require("express");
const http = require("http");
const cors = require("cors");
const socketIo = require("socket.io");
const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*" } });

app.use(cors());

// ✅ Firebase init
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

// ✅ ESP32 Serial Setup
const esp32 = new SerialPort({ path: "COM6", baudRate: 115200 });
const parser = esp32.pipe(new ReadlineParser({ delimiter: "\n" }));

esp32.on("open", () => console.log("✅ Serial Port Opened on COM6"));
esp32.on("error", (err) => console.error("❌ Serial Port Error:", err.message));

// ------------------- STATE -------------------
let latestWeight = 0;
let weightThreshold = 50;
let motorStopped = false;
let lastScannedUID = null;
let scannedUIDs = new Set();
let lastScanTime = 0;
const SCAN_DEBOUNCE_TIME = 500;

// ------------------- Firestore -------------------
async function fetchWeightThreshold(uid) {
  try {
    const userRef = db.collection("customer").doc(uid);
    const userSnap = await userRef.get();
    weightThreshold = userSnap.exists ? userSnap.data().weightThreshold : 50;
    console.log(`Weight Threshold for UID ${uid}: ${weightThreshold}g`);
  } catch (error) {
    console.error("❌ Error fetching weight threshold:", error);
  }
}

// ------------------- Serial Data from ESP32 -------------------
parser.on("data", async (data) => {
  const message = data.trim();
  const currentTime = Date.now();
  console.log("📥 Serial data received:", message); // debug all serial messages
  // ULTRASONIC 

  // ------------------- Ultrasonic / Grain Level -------------------
// if (message.startsWith("Distance from sensor:")) {
//   io.emit("ultraData", message);  // send distance line to frontend
//   return;
// }

// if (message.startsWith("Fill level:")) {
//   io.emit("ultraData", message);  // send fill level line to frontend
//   return;
// }

// if (message.includes("⚠️ Low Stock Detected!")) {
//   io.emit("lowStockAlert", message); // low stock alert
//   return;
// }

  // ------------------- RFID -------------------
  // Match any UID format, including Default UID
  if (/Card UID:|UID:|Default UID:/.test(message)) {
    const uid = message.replace(/Card UID:|UID:|Default UID:/, "").trim();

    // Debounce duplicate scans
    if (scannedUIDs.has(uid) && currentTime - lastScanTime < SCAN_DEBOUNCE_TIME) {
      return;
    }

    scannedUIDs.add(uid);
    lastScanTime = currentTime;
    lastScannedUID = uid;

    console.log("✅ Scanned UID:", uid);
    await fetchWeightThreshold(uid);

    io.emit("rfidData", uid);
    console.log("📡 Emitted UID to client:", uid);
    return;
  }

  // ------------------- Weight -------------------
  if (message.startsWith("Weight:")) {
    const weightMatch = message.match(/Weight:\s*([\d.]+)/);
    if (weightMatch) {
      latestWeight = parseFloat(weightMatch[1]);
      console.log(`⚖️ Current weight: ${latestWeight} g`);
      io.emit("weightUpdate", latestWeight);

      if (latestWeight >= weightThreshold && !motorStopped) {
  console.log(`🛑 Threshold (${weightThreshold} g) reached. Stopping motor...`);
  esp32.write("STOP\n");   // stop weight logic
  esp32.write("LEFT\n");  // move arm RIGHT
  motorStopped = true;
}

    }
    return;
  }

  // ------------------- Temperature -------------------
  if (message.startsWith("Temperature:")) {
    console.log("🌡️ " + message);
    io.emit("temperatureUpdate", message);
    return;
  }

  // ------------------- Generic Debug -------------------
  console.log("🔎 ESP32:", message);
});



// ------------------- Socket.IO -------------------
io.on("connection", (socket) => {
  console.log("⚡ New client connected");
  socket.emit("helloMessage", "Hello from Node server to UI");

  // Dispense water
  socket.on("dispenseWater", () => {
    console.log("💧 Sending DISPENSE command to ESP32...");
    esp32.write("ON\n");
    socket.emit("dispenseResponse", { success: true, message: "Water dispensing started!" });
  });

  // Dispense grains
 socket.on("dispenseGrains", () => {
  console.log("🌾 Dispense grains requested...");

  // 1️⃣ Start weighing process
  esp32.write("START\n");

  // 2️⃣ Immediately move servo LEFT
  esp32.write("RIGHT\n");

  socket.emit("dispenseGrainResponse", {
    success: true,
    message: "Grains dispensing started and arm moved LEFT!"
  });
});

socket.on("sendNotification", () => {
  console.log("📨 Sending notification command to ESP32...");
  esp32.write("SEND\n");  // ESP32 will handle sending Blynk notification
  socket.emit("notificationResponse", { success: true, message: "Notification sent!" });
});

socket.on("stopTemperature", () => {
  console.log("Stopping temperature reading on ESP...");
  esp32.write("TSTOP\n"); // stop continuous reading on ESP
});


socket.on("checkTemperature", () => {
    console.log("Requesting temperature from ESP...");
    esp32.write("TEMP\n"); // command must match ESP Serial handler
  });

  socket.on("checkLevel", () => {
    console.log("Requesting container level from ESP...");
    esp32.write("ULTRA\n"); // command must match ESP Serial handler
  });


  socket.on("scancard", () => {
    console.log("🎫 Sending SCAN command...");
    esp32.write("SCAN\n");
    socket.emit("scancardResponse", { success: true, message: "Scanning started!" });
  });


  // Update threshold
  socket.on("updateWeightThreshold", async (newThreshold) => {
    weightThreshold = newThreshold;
    console.log(`🔄 Updating Weight Threshold to: ${newThreshold}g`);
    try {
      await db.collection("settings").doc("weightThreshold").set({ value: newThreshold });
      socket.emit("thresholdUpdateResponse", { success: true, message: "Threshold updated!" });
    } catch (error) {
      console.error("❌ Error updating threshold:", error);
      socket.emit("thresholdUpdateResponse", { success: false, message: "Failed to update threshold" });
    }
  });

  socket.on("disconnect", () => {
    console.log("❌ Client disconnected");
  });
});

// ✅ Start Server
server.listen(5000, () => console.log("🚀 Server running on http://localhost:5000"));
