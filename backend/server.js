const { SerialPort } = require("serialport");
const { ReadlineParser } = require("@serialport/parser-readline");
const express = require("express");
const http = require("http");
const cors = require("cors");
const socketIo = require("socket.io");
const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");
const rtdb = require("./firebaseRTDB");

// ✅ Disable Firebase logging completely
process.env.FIREBASE_AUTH_EMULATOR_HOST = undefined;
process.env.GOOGLE_APPLICATION_CREDENTIALS = undefined;

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*" } });

app.use(cors());

// ✅ Firebase init

const db = admin.firestore();

// ------------------- Comprehensive Firebase Error Suppression -------------------
let firebaseErrorShown = false;

// Override console methods
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleLog = console.log;

// Suppress console.error
console.error = (...args) => {
  const message = args.join(' ');
  if ((message.includes('FIREBASE WARNING') || message.includes('@firebase/database')) && message.includes('invalid_grant')) {
    if (!firebaseErrorShown) {
      originalConsoleError('🔥 FIREBASE: Invalid credentials detected (suppressing further warnings)');
      firebaseErrorShown = true;
    }
    return;
  }
  originalConsoleError(...args);
};

// Suppress console.warn
console.warn = (...args) => {
  const message = args.join(' ');
  if ((message.includes('FIREBASE WARNING') || message.includes('@firebase/database')) && message.includes('invalid_grant')) {
    return; // Suppress
  }
  originalConsoleWarn(...args);
};

// Suppress console.log for Firebase warnings
console.log = (...args) => {
  const message = args.join(' ');
  if ((message.includes('FIREBASE WARNING') || message.includes('@firebase/database')) && message.includes('invalid_grant')) {
    return; // Suppress
  }
  originalConsoleLog(...args);
};

// Catch unhandled warnings at process level
process.on('warning', (warning) => {
  if (warning.message && warning.message.includes('FIREBASE') && warning.message.includes('invalid_grant')) {
    return; // Suppress Firebase warnings
  }
  originalConsoleWarn('Process Warning:', warning.message);
});

// Override process.stderr.write to catch direct stderr writes
const originalStderrWrite = process.stderr.write;
process.stderr.write = function(chunk, encoding, callback) {
  const message = chunk.toString();
  if ((message.includes('FIREBASE WARNING') || message.includes('@firebase/database')) && message.includes('invalid_grant')) {
    if (!firebaseErrorShown) {
      originalStderrWrite.call(this, '🔥 FIREBASE: Credential error detected (further warnings suppressed)\n');
      firebaseErrorShown = true;
    }
    if (callback) callback();
    return true;
  }
  return originalStderrWrite.call(this, chunk, encoding, callback);
};

// ✅ ESP32 Serial Setup
const esp32 = new SerialPort({ path: "COM5", baudRate: 115200 });
const parser = esp32.pipe(new ReadlineParser({ delimiter: "\n" }));

esp32.on("open", () => console.log("✅ Serial Port Opened on COM5"));
esp32.on("error", (err) => console.error("❌ Serial Port Error:", err.message));

// ------------------- STATE -------------------
let latestWeight = 0;
let weightThreshold = 7; // Reduced from 50g to 15g for testing
let motorStopped = false;
let lastScannedUID = null;
let scannedUIDs = new Set();
let lastScanTime = 0;
const SCAN_DEBOUNCE_TIME = 500;

// Ultrasonic sensor state
let latestDistance = null;
let latestStockStatus = null;

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
  // More flexible distance parsing
  if (message.includes("Distance:") || message.includes("Distance from sensor:")) {
    // Extract distance value with multiple patterns
    const distanceMatch = message.match(/Distance.*?(\d+\.?\d*)\s*cm/i);
    if (distanceMatch) {
      const distance = parseFloat(distanceMatch[1]);
      latestDistance = distance; // Store latest distance
      console.log(`📏 Distance detected: ${distance} cm`);
      io.emit("ultrasonicUpdate", { 
        type: "distance", 
        value: distance, 
        unit: "cm",
        raw: message 
      });
      console.log(`📤 Emitted distance update: ${distance} cm`);
    } else {
      console.log(`⚠️ Distance message found but couldn't parse: "${message}"`);
    }
    return;
  }

  if (message.includes("Fill level:")) {
    console.log(`📊 Fill level detected: ${message}`);
    io.emit("ultrasonicUpdate", { 
      type: "fillLevel", 
      raw: message 
    });
    return;
  }

  // More flexible stock level parsing
  if (message.includes("Stock Level:")) {
    const status = message.split(":")[1].trim();
    latestStockStatus = status; // Store latest stock status
    console.log(`📦 Stock level detected: ${status}`);
    io.emit("ultrasonicUpdate", { 
      type: "stockLevel", 
      status: status,
      raw: message 
    });
    console.log(`📤 Emitted stock level update: ${status}`);
    return;
  }

  if (message.includes("⚠️ Low Stock Detected!") || message.includes("Low Stock Detected")) {
    latestStockStatus = "⚠️ Low Stock Detected!"; // Override status with warning
    console.log(`🚨 Low stock alert detected!`);
    io.emit("ultrasonicUpdate", { 
      type: "stockLevel", 
      status: "⚠️ Low Stock Detected!",
      raw: message 
    });
    io.emit("lowStockAlert", message);
    console.log(`📤 Emitted low stock alert`);
    return;
  }

  if (message.includes("Ultrasonic Monitoring STARTED")) {
    io.emit("ultrasonicUpdate", { 
      type: "status", 
      message: "Monitoring Started",
      raw: message 
    });
    console.log("📡 Ultrasonic monitoring started");
    return;
  }

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

      // Debug logging
      console.log(`🔍 Debug: Weight=${latestWeight}g, Threshold=${weightThreshold}g, MotorStopped=${motorStopped}`);
      
      if (latestWeight >= weightThreshold && !motorStopped) {
        console.log(`🛑 Threshold (${weightThreshold} g) reached. Stopping motor...`);
        esp32.write("STOP\n");   // stop weight logic
        esp32.write("RIGHT\n");  // move arm RIGHT
        motorStopped = true;
        console.log(`✅ Commands sent: STOP and RIGHT`);
      } else if (latestWeight >= weightThreshold && motorStopped) {
        console.log(`⚠️ Weight threshold reached but motor already stopped`);
      } else {
        console.log(`📊 Weight below threshold (${latestWeight}g < ${weightThreshold}g)`);
      }
    }
    return;
  }

  // ------------------- Temperature -------------------
  

  if (message.startsWith("Temperature:")) {
  try {
    const match = message.match(/Temperature:\s*([\d.]+)/);
    if (!match) return;

    const temperature = parseFloat(match[1]);

    // Log to console
    console.log("🌡 Temperature:", temperature);

    // Emit to frontend (optional if using Socket.IO)
    io.emit("temperatureUpdate", temperature);

    // ✅ Store under Dispenzo_Transactions/Live_Sensors/Temperature (with error suppression)
    try {
      const tempRef = rtdb.ref("Dispenzo_Transactions/Live_Sensors/Temperature");
      await tempRef.set({
        value: temperature,
        timestamp: Date.now(),
      });

      // Only log success once every 10 readings to reduce spam
      if (Math.random() < 0.1) {
        console.log("✅ Temperature data saved to Realtime DB");
      }
    } catch (dbError) {
      // Suppress Firebase credential errors, only show once
      if (!firebaseErrorShown && dbError.message.includes('invalid_grant')) {
        console.error('🔥 Firebase DB Error: Invalid credentials. Temperature data not saved.');
        firebaseErrorShown = true;
      } else if (!dbError.message.includes('invalid_grant')) {
        console.error("❌ Database error:", dbError.message);
      }
    }

    // Optional ThingSpeak push
    // const THINGSPEAK_KEY = "YOUR_WRITE_API_KEY";
    // await axios.get(`https://api.thingspeak.com/update?api_key=${THINGSPEAK_KEY}&field1=${temperature}`);
  } catch (err) {
    console.error("Error processing temperature:", err.message);
  }
}

  // ------------------- Generic Debug -------------------
  console.log("🔎 ESP32:", message);
  
  // Log current ultrasonic state every 10 messages
  if (Math.random() < 0.1) {
    console.log(`📊 Current ultrasonic state: Distance=${latestDistance}, Stock=${latestStockStatus}`);
  }
});



// ------------------- Socket.IO -------------------
io.on("connection", (socket) => {
  console.log("⚡ New client connected");
  socket.emit("helloMessage", "Hello from Node server to UI");

  // Send latest ultrasonic data to new client
  if (latestDistance !== null) {
    socket.emit("ultrasonicUpdate", { 
      type: "distance", 
      value: latestDistance, 
      unit: "cm",
      raw: `Distance: ${latestDistance} cm` 
    });
  }
  
  if (latestStockStatus !== null) {
    socket.emit("ultrasonicUpdate", { 
      type: "stockLevel", 
      status: latestStockStatus,
      raw: `Stock Level: ${latestStockStatus}` 
    });
  }

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
  esp32.write("LEFT\n");

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

socket.on("sendAlert", () => {
  console.log("🚨 Sending alert command to ESP32...");
  esp32.write("ALERT\n");  // ESP32 will handle alert functionality
  socket.emit("alertResponse", { success: true, message: "Alert sent!" });
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
