import React, { useEffect, useState } from "react";
import io from "socket.io-client";
import { db } from "./firebase";
import { doc, getDoc } from "firebase/firestore";
import { collection, getDocs } from "firebase/firestore";
import Analytics from "./components/Analytics/Analytics";
import AdminPage from "./pages/AdminPage";

import "./Rfid.css";

const razorpayApiKey = process.env.REACT_APP_RAZORPAY_API_KEY;
const socket = io("http://localhost:5000");

function Rfid() {
  const [showProceed, setShowProceed] = useState(false);
const [fingerprintError, setFingerprintError] = useState(false);

    const [fingerprintLogs, setFingerprintLogs] = useState([]);
  const [fingerprintStatus, setFingerprintStatus] = useState(null);
// null | "success" | "fail"

const [fingerprintId, setFingerprintId] = useState(null);

  const [currentView, setCurrentView] = useState("main");
  const [fingerprintPending, setFingerprintPending] = useState(false);


  const [rfidUID, setRfidUID] = useState("");
  const [enteredPassword, setEnteredPassword] = useState("");
  const [authSuccess, setAuthSuccess] = useState(false);
  const [error, setError] = useState("");
  const [userData, setUserData] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [dispenseMessage, setDispenseMessage] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [users, setUsers] = useState([]);
  const [temperatureValue, setTemperatureValue] = useState(null);
  const [temperatureAlert, setTemperatureAlert] = useState(false);
  const [tempActive, setTempActive] = useState(false);
  const [fillData, setFillData] = useState(null);

  const [containerLevel, setContainerLevel] = useState(null);
  const [levelAlert, setLevelAlert] = useState(false);
  const [ultrasonicDistance, setUltrasonicDistance] = useState(null);
  const [stockStatus, setStockStatus] = useState(null);
  const lowStockThreshold = 20; // % fill below which alert triggers
const [moisturePercent, setMoisturePercent] = useState(null);
const [moistureRaw, setMoistureRaw] = useState(null);
  
  // Payment success state
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentId, setPaymentId] = useState("");
useEffect(() => {
  socket.on("moistureData", (data) => {
    console.log("💧 Moisture data received:", data);
    setMoisturePercent(data.percent);
    setMoistureRaw(data.raw);
  });

  return () => socket.off("moistureData");
}, []);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
  }, []);

  const handleCheckLevel = () => {
    // Emit command to ESP
    socket.emit("checkLevel");

    // Subscribe to the response only once
    socket.once("containerLevelUpdate", (data) => {
      const level = parseFloat(data.percentage);
      setContainerLevel(level);

      // Trigger low stock alert
      setLevelAlert(level <= lowStockThreshold);
    });
  };

  useEffect(() => {
    socket.on("ultrasonicUpdate", (data) => {
      console.log("📡 Ultrasonic data received:", data);
      setFillData(data);
      
      // Store specific data types for single line display
      if (data.type === "distance") {
        console.log(`📏 Setting distance: ${data.value}`);
        setUltrasonicDistance(data.value);
      } else if (data.type === "stockLevel") {
        console.log(`📦 Setting stock status: ${data.status}`);
        setStockStatus(data.status);
      }
      
      // Debug current state
      console.log(`📊 Current state - Distance: ${ultrasonicDistance}, Stock: ${stockStatus}`);
    });

    return () => {
      socket.off("ultrasonicUpdate");
    };
  }, [ultrasonicDistance, stockStatus]);

  useEffect(() => {
    socket.on("temperatureUpdate", (temp) => {
      setTemperatureValue(temp);

      // optional alert logic
      if (temp !== null && temp > 35) {
        setTemperatureAlert(true);
      } else {
        setTemperatureAlert(false);
      }
    });
    return () => {
      socket.off("temperatureUpdate");
    };
  }, []);

  useEffect(() => {
    console.log("🔌 Connecting to Socket.IO server...");
    socket.on("connect", () => {
      console.log("✅ Socket connected with ID:", socket.id);
    });

    socket.on("disconnect", () => {
      console.log("❌ Socket disconnected");
    });

    socket.on("rfidData", (uid) => {
      if (uid) {
        setScanning(false);
        setRfidUID(uid);
        setAuthSuccess(false);
        setEnteredPassword("");
        setError("");
        setUserData(null);
        setDispenseMessage("");
        setFingerprintLogs([]); // Reset logs on new scan
      }
    });


    return () => {
      socket.off("rfidData");
    };
  }, []);

useEffect(() => {
  socket.on("fingerprintResult", async (data) => {
    if (data.log) {
      setFingerprintLogs((prev) => [...prev, data.log]);
    }

    if (data.success && data.fingerId !== null) {
      // ✅ Fingerprint matched in sensor, now verify against database
      const scannedFingerId = data.fingerId;
      
      try {
        // Fetch the user's registered fingerprintID from database
        const userRef = doc(db, "customer", rfidUID.trim());
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          const user = userSnap.data();
          const registeredFingerprintId = user.fingerprintID;
          
          // Compare scanned fingerprint ID with database fingerprint ID
          if (scannedFingerId === registeredFingerprintId) {
            // ✅ Fingerprint ID matches the user's registered ID
            setFingerprintStatus("success");
            setFingerprintId(scannedFingerId);
            setShowProceed(true);
            setFingerprintError(false);
            setFingerprintLogs((prev) => [...prev, `✅ Fingerprint ID ${scannedFingerId} matches user ${user.Name}`]);
          } else {
            // ❌ Fingerprint matched but doesn't belong to this user
            setFingerprintStatus("fail");
            setFingerprintError(true);
            setFingerprintLogs((prev) => [
              ...prev, 
              `❌ Fingerprint ID ${scannedFingerId} does not match user's registered ID ${registeredFingerprintId}`
            ]);
          }
        } else {
          // User not found in database
          setFingerprintStatus("fail");
          setFingerprintError(true);
          setFingerprintLogs((prev) => [...prev, "❌ User not found in database"]);
        }
      } catch (error) {
        console.error("Error verifying fingerprint ID:", error);
        setFingerprintStatus("fail");
        setFingerprintError(true);
        setFingerprintLogs((prev) => [...prev, "❌ Error verifying fingerprint"]);
      }
    } else {
      // No match found in sensor
      setFingerprintStatus("fail");
      setFingerprintError(true);
    }
  });

  return () => socket.off("fingerprintResult");
}, [rfidUID]);


  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "customer"));
        const usersData = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setUsers(usersData);
      } catch (error) {
        console.error("Error fetching users: ", error);
      }
    };
    fetchUsers();
  }, []);

  const verifyPassword = async () => {
    if (!rfidUID || !enteredPassword.trim()) {
      setError("Please scan your card and enter the password.");
      return;
    }

    try {
      const userRef = doc(db, "customer", rfidUID.trim()); // Use the scanned UID
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const user = userSnap.data();

        if (enteredPassword.trim() === user.password.trim()) {
  setAuthSuccess(true);
  setUserData(user);
  setError("");

  // 🔄 reset fingerprint UI state
  setFingerprintStatus(null);
  setFingerprintId(null);

  // 👉 move to fingerprint step
  setFingerprintPending(true);
  setCurrentView("fingerprint");
  socket.emit("startFingerprint");
}
else {
          setAuthSuccess(false);
          setUserData(null);
          setError("Incorrect Password! Please try again.");
        }
      } else {
        setAuthSuccess(false);
        setUserData(null);
        setError("No user found for this UID.");
      }
    } catch (error) {
      setError("Error fetching user data.");
    }
  };

  const scanCard = () => {
    setScanning(true); // Start scanning animation
    setRfidUID(""); // Clear previous UID

    socket.emit("scancard"); // Send command to Arduino via server

    setTimeout(() => {
      setScanning(false); // Stop scanning effect after 5s
    }, 5000);
  };

  const startCountdown = (message, callback) => {
    setCountdown(5);
    setDispenseMessage(`${message} in 5 seconds...`);

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev === 1) {
          clearInterval(interval);
          callback();
          setDispenseMessage(""); // Clear message after dispensing
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleDispenseWater = () => {
    if (countdown === 0) {
      startCountdown("Dispensing water", () => socket.emit("dispenseWater"));
    }
  };

  const handleDispenseGrains = () => {
    if (countdown === 0) {
      startCountdown("Dispensing grains", () => socket.emit("dispenseGrains"));
    }
  };

  const handlePayment = async () => {
    if (!window.Razorpay) {
      alert("Razorpay SDK not loaded! Please wait and try again.");
      return;
    }

    try {
      const userRef = doc(db, "customer", rfidUID);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const user = userSnap.data();
        const paymentAmount = user.amount;
        const razorpayAmount = paymentAmount * 100;

        const options = {
          key: razorpayApiKey,
          amount: razorpayAmount,
          currency: "INR",
          name: user.Name || "User",
          description: `RFID Payment - ₹${paymentAmount}`,
          handler: function (response) {
            console.log("✅ Payment Successful!", response.razorpay_payment_id);
            
            // Show payment success popup instead of redirecting
            setPaymentSuccess(true);
            setPaymentId(response.razorpay_payment_id);
          },
          prefill: {
            name: user.Name || "User",
            email: user.email || "user@example.com",
            contact: user.phone || "0000000000",
          },
          theme: {
            color: "#F37254",
          },
        };

        const rzp1 = new window.Razorpay(options);
        rzp1.open();
      } else {
        alert("❌ No user data found for payment.");
      }
    } catch (error) {
      console.error("⚠️ Error fetching user data for payment:", error);
      alert("⚠️ Something went wrong. Please try again.");
    }
  };

  const handleExitUser = () => {
    // Reset all states to initial values
    setPaymentSuccess(false);
    setPaymentId("");
    setRfidUID("");
    setEnteredPassword("");
    setAuthSuccess(false);
    setError("");
    setUserData(null);
    setDispenseMessage("");
    setCountdown(0);
    setFingerprintStatus(null);
    setFingerprintId(null);
    setFingerprintPending(false);
    setShowProceed(false);
    setFingerprintError(false);
    setFingerprintLogs([]);
    setCurrentView("main");
  };

 const renderCurrentView = () => {
  switch (currentView) {
    case "fingerprint":
      return renderFingerprintView();
    case "analytics":
      return <Analytics />;
    case "admin":
      return (
        <AdminPage
          socket={socket}
          users={users}
          temperatureValue={temperatureValue}
          temperatureAlert={temperatureAlert}
          containerLevel={containerLevel}
          levelAlert={levelAlert}
          ultrasonicDistance={ultrasonicDistance}
          stockStatus={stockStatus}
           moisturePercent={moisturePercent}
          moistureRaw={moistureRaw}
          onBackToUser={() => setCurrentView("main")}
        />
      );
    case "main":
    default:
      return renderMainView();
  }
};


  const renderMainView = () => (
    <>
      {/* Toggle to Admin Page */}
      <button className="admin-btn" onClick={() => setCurrentView("admin")}>
        🔧 Go to Admin Side
      </button>
      <button className="scan-btn" onClick={scanCard}>
        {scanning ? "📡 Reading the Card..." : "📡 Scan My Card"}
      </button>

      <div className="rfid-container">
        <>
            {/* User Side */}
            <div className="scanner-box">
              <div className={`dispenzo-text ${rfidUID ? "move-up" : ""}`}>
                DISPENZO
              </div>

              {scanning || !rfidUID ? (
                <div className="rotating-card">
                  <div className="card-chip"></div>
                  <div className="card-icon">📡</div>
                  <div className="card-text">SCAN YOUR RFID CARD</div>
                </div>
              ) : (
                <p className="uid-display">Scanned UID: {rfidUID}</p>
              )}
            </div>

            {rfidUID && !authSuccess && (
              <div className="input-container">
                <input
                  type="password"
                  placeholder="Enter Password"
                  value={enteredPassword}
                  onChange={(e) => setEnteredPassword(e.target.value)}
                />
                <button onClick={verifyPassword}>Submit</button>
              </div>
            )}

            {authSuccess && userData && (
              <div className="user-info">
                <h2>
                  <strong>
                    {dispenseMessage ? dispenseMessage : "✅ Access Granted!"}
                  </strong>
                </h2>
                {!dispenseMessage && (
                  <>
                    <p><strong>Name:</strong> {userData.Name}</p>
                    <p><strong>Phone:</strong> {userData.phone}</p>
                    <p><strong>Members in the family:</strong> {userData.family_members}</p>
                    <p><strong>Weight Allocated:</strong> {userData.weightThreshold}g</p>

                    <div className="button-container">
                      <button
                        className="dispense-btn water-btn"
                        onClick={handleDispenseWater}
                      >
                        🚰 Dispense Water
                      </button>
                      <button
                        className="dispense-btn grain-btn"
                        onClick={handleDispenseGrains}
                      >
                        🌾 Dispense Grains
                      </button>
                      <button className="payment-btn" onClick={handlePayment}>
                        💳 Pay Now
                      </button>
                      
                    </div>
                  </>
                )}
              </div>
            )}

            {dispenseMessage && (
              <p className="dispense-text">
                {dispenseMessage} ({countdown}s)
              </p>
            )}
          </>
      </div>
    </>
  );
const renderFingerprintView = () => (
  <div className="fingerprint-container">
    {/* ICON */}
    <div className="fingerprint-animation">🖐️</div>

    {/* TITLE */}
    <h2>Fingerprint Verification</h2>

    {/* Terminal logs from ESP32 */}
    {fingerprintLogs.length > 0 && (
      <div className="fingerprint-log-box">
        {fingerprintLogs.map((log, idx) => (
          <div key={idx}>{log}</div>
        ))}
      </div>
    )}

    {/* 🔁 CONDITIONAL UI */}
    {fingerprintStatus === null && (
      <p className="fingerprint-wait">
        Waiting for fingerprint match...
      </p>
    )}

    {fingerprintStatus === "success" && (
      <div style={{ color: 'lightgreen', textAlign: 'center' }}>
        <h3>✅ Fingerprint Matched</h3>
        <p>Fingerprint ID: <strong>{fingerprintId}</strong></p>
      </div>
    )}

    {fingerprintStatus === "fail" && (
      <div style={{ color: '#ff4d4d', textAlign: 'center' }}>
        <h3>❌ Fingerprint Not Matched</h3>
        <p>Please try again</p>
      </div>
    )}
    {/* 🔁 RETRY BUTTON */}
{fingerprintStatus === "fail" && (
  <button
    className="fingerprint-retry-btn"
    onClick={() => {
      setFingerprintStatus(null);
      setFingerprintError(false);
      setFingerprintLogs([]);
      socket.emit("startFingerprint"); // 🔁 SAME command as first scan
    }}
  >
    🔄 Retry Fingerprint
  </button>
)}

{/* ✅ PROCEED BUTTON */}
{showProceed && fingerprintStatus === "success" && (
  <button
    className="fingerprint-proceed-btn"
    onClick={() => {
      setCurrentView("main");
      setFingerprintPending(false);
      setShowProceed(false);
    }}
  >
    ➡️ Proceed
  </button>
)}


  </div>
);


  return (
    <>
      {/* Payment Success Popup */}
      {paymentSuccess && (
        <div className="payment-success-overlay">
          <div className="payment-success-popup">
            {/* Left Section - Success Icon & Title */}
            <div className="success-left">
              <div className="success-icon-large">✅</div>
              <h2>Payment Successful!</h2>
              <p className="success-subtitle">Transaction Completed</p>
            </div>

            {/* Right Section - Details & Actions */}
            <div className="success-right">
              <div className="transaction-details">
                <div className="detail-header">
                  <h3>Transaction Details</h3>
                  <p className="payment-id-small">{paymentId}</p>
                </div>

                <div className="details-grid">
                  <div className="detail-row">
                    <span className="detail-label">👤 Customer</span>
                    <span className="detail-value">{userData?.Name || "N/A"}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">💰 Amount Paid</span>
                    <span className="detail-value">₹{userData?.amount || "0"}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">🎫 RFID</span>
                    <span className="detail-value">{rfidUID || "N/A"}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">✓ Status</span>
                    <span className="detail-value status-success">Completed</span>
                  </div>
                </div>
              </div>

              <div className="popup-actions">
                <button 
                  className="popup-btn notify-btn"
                  onClick={() => {
                    socket.emit("sendNotification");
                    alert("📨 Notification sent to ESP32!");
                  }}
                >
                  📨 Send Notification
                </button>
                <button className="popup-btn exit-btn" onClick={handleExitUser}>
                  🚪 Exit & Return Home
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {currentView === "analytics" && (
        <button 
          className="back-btn" 
          onClick={() => setCurrentView("main")}
          style={{
            position: 'fixed',
            top: '20px',
            left: '20px',
            zIndex: 1000,
            padding: '10px 15px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold'
          }}
        >
          ← Back to Main
        </button>
      )}
      {renderCurrentView()}
    </>
  );
}

export default Rfid;