const { SerialPort } = require("serialport");
const { ReadlineParser } = require("@serialport/parser-readline");
const express = require("express");
const http = require("http");
const cors = require("cors");
const socketIo = require("socket.io");
const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");
const rtdb = require("./firebaseRTDB");
const { spawn } = require("child_process"); // ADD THIS

// ✅ Disable Firebase logging completely
process.env.FIREBASE_AUTH_EMULATOR_HOST = undefined;
process.env.GOOGLE_APPLICATION_CREDENTIALS = undefined;

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json()); // ADD THIS for JSON parsing

// ✅ Firebase init
const db = admin.firestore();

// ================= GRAIN QUALITY DETECTION VARIABLES =================
let pythonProcess = null;
let grainQualityClients = new Set(); // Track WebSocket clients for grain quality

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
const esp32 = new SerialPort({ path: "COM3", baudRate: 115200 });
const parser = esp32.pipe(new ReadlineParser({ delimiter: "\n" }));

esp32.on("open", () => console.log("✅ Serial Port Opened on COM3"));
esp32.on("error", (err) => console.error("❌ Serial Port Error:", err.message));

// ------------------- STATE -------------------
let latestWeight = 0;
let weightThreshold = 7;
let motorStopped = false;
let lastScannedUID = null;
let scannedUIDs = new Set();
let lastScanTime = 0;
const SCAN_DEBOUNCE_TIME = 500;

// Ultrasonic sensor state
let latestDistance = null;
let latestStockStatus = null;

// Moisture state
let latestMoisturePercent = null;
let latestMoistureRaw = null;
let moistureAlert = false;

// ================= GRAIN QUALITY API ENDPOINTS =================

// Start grain quality detection
// ================= GRAIN QUALITY DETECTION WITH BUFFERING =================
let frameBuffer = '';
let dataBuffer = '';

// Start grain quality detection
app.post('/api/grain-quality/start', (req, res) => {
  if (pythonProcess) {
    return res.status(400).json({ error: 'Detection already running' });
  }

  console.log('🌾 Starting grain quality detection...');
  
  const pythonScriptPath = 'C:/Users/shruti/OneDrive/Desktop/PROJECTs/DISPENZO/DISPENZO-2.0/backend/try.py';
  
  pythonProcess = spawn('python', [pythonScriptPath]);

  // Reset buffers
  frameBuffer = '';
  dataBuffer = '';

  pythonProcess.stdout.on('data', (chunk) => {
    const output = chunk.toString();
    
    // Process FRAME data with buffering
    if (output.includes('FRAME:') || frameBuffer.length > 0) {
      frameBuffer += output;
      
      // Check if we have a complete frame (base64 typically ends with == or =)
      // Also check if next line starts (has \n after base64)
      if (frameBuffer.includes('\n') && frameBuffer.includes('FRAME:')) {
        try {
          const lines = frameBuffer.split('\n');
          
          for (let i = 0; i < lines.length - 1; i++) {
            const line = lines[i];
            
            if (line.startsWith('FRAME:')) {
              const frameBase64 = line.substring(6).trim();
              
              if (frameBase64.length > 1000) { // Valid frame should be large
                console.log(`📸 Frame received: ${frameBase64.length} chars`);
                
                // Broadcast frame to all clients
                io.emit('grainQualityFrame', {
                  frame: frameBase64,
                  timestamp: Date.now()
                });
              }
            }
          }
          
          // Keep the last incomplete line in buffer
          frameBuffer = lines[lines.length - 1];
        } catch (error) {
          console.error('❌ Error processing frame:', error);
          frameBuffer = '';
        }
      }
      return;
    }
    
    // Process DATA with buffering
    if (output.includes('DATA:') || dataBuffer.length > 0) {
      dataBuffer += output;
      
      if (dataBuffer.includes('\n') && dataBuffer.includes('DATA:')) {
        try {
          const lines = dataBuffer.split('\n');
          
          for (let i = 0; i < lines.length - 1; i++) {
            const line = lines[i];
            
            if (line.startsWith('DATA:')) {
              const jsonStr = line.substring(5).trim();
              const grainData = JSON.parse(jsonStr);
              
              console.log(`📊 Data: ${grainData.impurities_count} stones, Score: ${grainData.quality_score}`);
              
              io.emit('grainQualityData', {
                parsed_data: grainData
              });
            }
          }
          
          dataBuffer = lines[lines.length - 1];
        } catch (error) {
          console.error('❌ Error parsing data:', error);
          dataBuffer = '';
        }
      }
      return;
    }
    
    // Log other output
    if (output.trim() && !output.startsWith('FRAME:') && !output.startsWith('DATA:')) {
      console.log(`Python: ${output.trim()}`);
    }
  });

  pythonProcess.stderr.on('data', (data) => {
    const errorMsg = data.toString();
    if (!errorMsg.includes('DEBUG:')) {
      console.error(`Python Error: ${errorMsg}`);
    }
  });

  pythonProcess.on('close', (code) => {
    console.log(`🛑 Python process exited with code ${code}`);
    pythonProcess = null;
    frameBuffer = '';
    dataBuffer = '';
    
    io.emit('grainQualityData', {
      status: 'stopped',
      message: 'Detection process ended'
    });
  });

  res.json({ success: true, message: 'Grain quality detection started successfully' });
});

// Stop grain quality detection
app.post('/api/grain-quality/stop', (req, res) => {
  if (pythonProcess) {
    console.log('🛑 Stopping grain quality detection...');
    pythonProcess.kill();
    pythonProcess = null;
    frameBuffer = '';
    dataBuffer = '';
    res.json({ success: true, message: 'Detection stopped successfully' });
  } else {
    res.status(400).json({ error: 'No detection process running' });
  }
});

// Recalibrate background
app.post('/api/grain-quality/recalibrate', (req, res) => {
  if (pythonProcess && pythonProcess.stdin) {
    console.log('🔄 Sending recalibrate command to Python...');
    pythonProcess.stdin.write('r\n');
    res.json({ success: true, message: 'Recalibration command sent' });
  } else {
    res.status(400).json({ error: 'No detection process running' });
  }
});

// Get grain quality status
app.get('/api/grain-quality/status', (req, res) => {
  res.json({
    running: pythonProcess !== null,
    connected_clients: grainQualityClients.size
  });
});

// ================= END GRAIN QUALITY API ENDPOINTS =================

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
  console.log("📥 Serial data received:", message);

  // ULTRASONIC 
  if (message.includes("Distance:") || message.includes("Distance from sensor:")) {
    const distanceMatch = message.match(/Distance.*?(\d+\.?\d*)\s*cm/i);
    if (distanceMatch) {
      const distance = parseFloat(distanceMatch[1]);
      latestDistance = distance;
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

  // ------------------- Fingerprint -------------------
  if (message.includes("Fingerprint matching started")) {
    io.emit("fingerprintLog", "🔍 Fingerprint matching started");
    return;
  }

  if (message.includes("Fingerprint MATCHED")) {
    const match = message.match(/ID:\s*(\d+)/);
    const fingerId = match ? Number(match[1]) : null;

    io.emit("fingerprintResult", {
      success: true,
      fingerId,
      log: `✅ Fingerprint MATCHED → ID: ${fingerId}`
    });

    return;
  }

  if (
    message.includes("Fingerprint NOT matched") ||
    message.includes("Fingerprint NOT MATCHED")
  ) {
    io.emit("fingerprintResult", {
      success: false,
      fingerId: null,
      log: "❌ Fingerprint NOT matched"
    });

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

  if (message.includes("Stock Level:")) {
    const status = message.split(":")[1].trim();
    latestStockStatus = status;
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
    latestStockStatus = "⚠️ Low Stock Detected!";
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
  if (/Card UID:|UID:|Default UID:/.test(message)) {
    const uid = message.replace(/Card UID:|UID:|Default UID:/, "").trim();

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

      console.log(`🔍 Debug: Weight=${latestWeight}g, Threshold=${weightThreshold}g, MotorStopped=${motorStopped}`);
      
      if (latestWeight >= weightThreshold && !motorStopped) {
        console.log(`🛑 Threshold (${weightThreshold} g) reached. Stopping motor...`);
        esp32.write("STOP\n");
        esp32.write("RIGHT\n");
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

      console.log("🌡 Temperature:", temperature);
      io.emit("temperatureUpdate", temperature);

      try {
        const tempRef = rtdb.ref("Dispenzo_Transactions/Live_Sensors/Temperature");
        await tempRef.set({
          value: temperature,
          timestamp: Date.now(),
        });

        if (Math.random() < 0.1) {
          console.log("✅ Temperature data saved to Realtime DB");
        }
      } catch (dbError) {
        if (!firebaseErrorShown && dbError.message.includes('invalid_grant')) {
          console.error('🔥 Firebase DB Error: Invalid credentials. Temperature data not saved.');
          firebaseErrorShown = true;
        } else if (!dbError.message.includes('invalid_grant')) {
          console.error("❌ Database error:", dbError.message);
        }
      }
    } catch (err) {
      console.error("Error processing temperature:", err.message);
    }
  }

  // ------------------- Moisture -------------------
  if (message.includes("Moisture Raw")) {
    const rawMatch = message.match(/Moisture Raw:\s*(\d+)/i);
    const percentMatch = message.match(/Moisture:\s*(\d+)\s*%/i);

    if (rawMatch && percentMatch) {
      latestMoistureRaw = parseInt(rawMatch[1]);
      latestMoisturePercent = parseInt(percentMatch[1]);

      console.log(`💧 Moisture → Raw: ${latestMoistureRaw} | ${latestMoisturePercent}%`);

      io.emit("moistureData", {
        raw: latestMoistureRaw,
        percent: latestMoisturePercent
      });

      if (latestMoisturePercent > 80) {
        moistureAlert = true;
        io.emit("moistureAlert", {
          value: latestMoisturePercent,
          message: "⚠️ High Moisture Detected"
        });
      } else {
        moistureAlert = false;
      }
    } else {
      console.log("⚠️ Moisture message received but parsing failed:", message);
    }

    return;
  }

  // ------------------- Generic Debug -------------------
  console.log("🔎 ESP32:", message);
});

// ------------------- Socket.IO -------------------
io.on("connection", (socket) => {
  console.log("⚡ New client connected");
  socket.emit("helloMessage", "Hello from Node server to UI");

  // Track grain quality clients
  grainQualityClients.add(socket.id);

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

  if (latestMoisturePercent !== null && latestMoistureRaw !== null) {
    socket.emit("moistureData", {
      raw: latestMoistureRaw,
      percent: latestMoisturePercent
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
    esp32.write("START\n");
    esp32.write("LEFT\n");
    socket.emit("dispenseGrainResponse", {
      success: true,
      message: "Grains dispensing started and arm moved LEFT!"
    });
  });

  socket.on("sendNotification", () => {
    console.log("📨 Sending notification command to ESP32...");
    esp32.write("SEND\n");
    socket.emit("notificationResponse", { success: true, message: "Notification sent!" });
  });

  socket.on("sendAlert", () => {
    console.log("🚨 Sending alert command to ESP32...");
    esp32.write("ALERT\n");
    socket.emit("alertResponse", { success: true, message: "Alert sent!" });
  });

  socket.on("stopTemperature", () => {
    console.log("Stopping temperature reading on ESP...");
    esp32.write("TSTOP\n");
  });

  socket.on("startFingerprint", () => {
    console.log("🔍 Starting fingerprint scan on ESP32");
    esp32.write("FP_MATCH\n");
  });

  socket.on("checkTemperature", () => {
    console.log("Requesting temperature from ESP...");
    esp32.write("TEMP\n");
  });

  socket.on("checkLevel", () => {
    console.log("Requesting container level from ESP...");
    esp32.write("ULTRA\n");
  });

  socket.on("stopUltra", () => {
    console.log("Stopping ultrasonic reading on ESP...");
    esp32.write("USTOP\n");
  });

  socket.on("scancard", () => {
    console.log("🎫 Sending SCAN command...");
    esp32.write("SCAN\n");
    socket.emit("scancardResponse", { success: true, message: "Scanning started!" });
  });

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

  socket.on("startMoisture", () => {
    console.log("💧 Starting moisture monitoring");
    esp32.write("MOIST\n");
  });

  socket.on("stopMoisture", () => {
    console.log("💧 Stopping moisture monitoring");
    esp32.write("MSTOP\n");
  });

  socket.on("disconnect", () => {
    console.log("❌ Client disconnected");
    grainQualityClients.delete(socket.id);
  });
});

// ✅ Start Server
server.listen(5000, () => {
  console.log("🚀 Server running on http://localhost:5000");
  console.log("📊 Grain Quality API endpoints:");
  console.log("   POST /api/grain-quality/start");
  console.log("   POST /api/grain-quality/stop");
  console.log("   POST /api/grain-quality/recalibrate");
  console.log("   GET  /api/grain-quality/status");
});