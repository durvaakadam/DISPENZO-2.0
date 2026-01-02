import React, { useEffect, useState } from "react";
import io from "socket.io-client";
import { db } from "./firebase";
import { doc, getDoc } from "firebase/firestore";
import { collection, getDocs } from "firebase/firestore";
import Analytics from "./components/Analytics/Analytics"; 

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
  const [isAdmin, setIsAdmin] = useState(false);
  const [users, setUsers] = useState([]);
  const [temperatureValue, setTemperatureValue] = useState(null);
  const [temperatureAlert, setTemperatureAlert] = useState(false);
  const [tempActive, setTempActive] = useState(false);
  const [fillData, setFillData] = useState(null);

  const [adminView, setAdminView] = useState("users"); // "users" or "monitoring"
  const [containerLevel, setContainerLevel] = useState(null);
  const [levelAlert, setLevelAlert] = useState(false);
  const [ultrasonicDistance, setUltrasonicDistance] = useState(null);
  const [stockStatus, setStockStatus] = useState(null);
  const lowStockThreshold = 20; // % fill below which alert triggers

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
  socket.on("fingerprintResult", (data) => {
    if (data.log) {
      setFingerprintLogs((prev) => [...prev, data.log]);
    }

    if (data.success) {
      setFingerprintStatus("success");
      setFingerprintId(data.fingerId);
      setShowProceed(true);     // 👈 show proceed button
      setFingerprintError(false);
    } else {
      setFingerprintStatus("fail");
      setFingerprintError(true); // 👈 enable retry
    }
  });

  return () => socket.off("fingerprintResult");
}, []);


  useEffect(() => {
    if (isAdmin) {
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
    }
  }, [isAdmin]);

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
            alert("✅ Payment Successful! Redirecting...");

            setTimeout(() => {
              window.location.href = "/"; // Redirect to home page
            }, 2000);
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

 const renderCurrentView = () => {
  switch (currentView) {
    case "fingerprint":
      return renderFingerprintView();
    case "analytics":
      return <Analytics />;
    case "main":
    default:
      return renderMainView();
  }
};


  const renderMainView = () => (
    <>
      {/* Toggle between Admin/User */}
      <button className="admin-btn" onClick={() => setIsAdmin(!isAdmin)}>
        {isAdmin ? "🔙 Go to User Side" : "🔧 Go to Admin Side"}
      </button>
      <button className="scan-btn" onClick={scanCard}>
        {scanning ? "📡 Reading the Card..." : "📡 Scan My Card"}
      </button>

      <div className="rfid-container">
        {!isAdmin ? (
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
                      <button
                        className="notify-btn"
                        onClick={() => {
                          socket.emit("sendNotification");
                          alert("Notification command sent to ESP32!");
                        }}
                      >
                        📨 Send Notification
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
        ) : (
          <>
            {/* Admin Side */}
            <div className="admin-panel">
              <h1>🔧 Admin Panel</h1>

              {/* Admin Toggle Buttons */}
              <div className="admin-toggle">
                <button
                  className={adminView === "users" ? "active" : ""}
                  onClick={() => setAdminView("users")}
                >
                  Users
                </button>
                <button
                  className={adminView === "monitoring" ? "active" : ""}
                  onClick={() => setAdminView("monitoring")}
                >
                  Quality Monitoring
                </button>
                <button
                  className="analytics-btn" // 👈 ADD SPECIAL CLASS
                  onClick={() => setCurrentView("analytics")} // 👈 ADD THIS BUTTON
                >
                  📊 Analytics Dashboard
                </button>
              </div>

              {/* Users Table */}
              {adminView === "users" && (
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>UID</th>
                      <th>Name</th>
                      <th>Phone</th>
                      <th>Family Members</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td>{user.id}</td>
                        <td>{user.Name}</td>
                        <td>{user.phone}</td>
                        <td>{user.family_members}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* Monitoring Section */}
              {/* Monitoring Section */}
              {adminView === "monitoring" && (
                <div className="monitoring-section" style={{ marginTop: '2rem' }}>
                  <h2 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#fff', marginBottom: '2rem', textShadow: '0 2px 8px rgba(0,0,0,0.12)' }}>🌡️ Temperature & 📦 Inventory Monitoring</h2>
                  <div className="monitoring-cards" style={{ display: 'flex', gap: '2rem', justifyContent: 'center' }}>

                    {/* Temperature Card */}
                    <div className={`monitor-card ${temperatureAlert ? "alert" : ""}`} style={{ background: 'linear-gradient(135deg, #e0eafc 0%, #cfdef3 100%)', borderRadius: '18px', boxShadow: '0 4px 24px rgba(0,0,0,0.10)', padding: '2rem 2rem', minWidth: '260px', textAlign: 'center', position: 'relative' }}>
                      <h3 style={{ fontSize: '1.5rem', color: '#007bff', marginBottom: '1rem' }}>Temperature</h3>
                      <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: temperatureAlert ? '#dc3545' : '#28a745', marginBottom: '0.5rem' }}>
                        {temperatureValue !== null ? `${temperatureValue} °C` : "—"}
                      </div>
                      {temperatureAlert && <p className="alert-text" style={{ color: '#dc3545', fontWeight: 'bold', fontSize: '1.1rem' }}>⚠️ High Temperature!</p>}
                      <button
                        onClick={() => {
                          if (!tempActive) {
                            socket.emit("checkTemperature"); // start reading
                            setTempActive(true);
                          } else {
                            socket.emit("stopTemperature"); // stop reading
                            setTempActive(false);
                          }
                        }}
                        className="check-btn"
                        style={{ marginTop: '1rem', padding: '0.7rem 2rem', fontSize: '1.1rem', borderRadius: '8px', background: tempActive ? '#dc3545' : '#007bff', color: '#fff', border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
                      >
                        {tempActive ? "Stop Temperature" : "Check Temperature"}
                      </button>
                    </div>

                    {/* Container Level Card */}
                    <div className={`monitor-card ${levelAlert ? "alert" : ""}`} style={{ background: 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)', borderRadius: '18px', boxShadow: '0 4px 24px rgba(0,0,0,0.10)', padding: '2rem 2rem', minWidth: '260px', textAlign: 'center', position: 'relative' }}>
                      <h3 style={{ fontSize: '1.5rem', color: '#fd7e14', marginBottom: '1rem' }}>📦 Container Level</h3>
                      <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: levelAlert ? '#dc3545' : '#007bff', marginBottom: '0.5rem' }}>
                        {containerLevel !== null ? `${containerLevel}%` : "—"}
                      </div>
                      {levelAlert && <p className="alert-text" style={{ color: '#dc3545', fontWeight: 'bold', fontSize: '1.1rem' }}>⚠️ Low Inventory!</p>}
                      <div style={{ fontSize: '1.2rem', color: '#333', margin: '0.5rem 0' }}>
                        📡 Distance: <span style={{ fontWeight: 'bold', color: '#007bff' }}>{ultrasonicDistance !== null ? `${ultrasonicDistance} cm` : "—"}</span>
                      </div>
                      <div style={{ fontSize: '1.2rem', color: stockStatus && stockStatus.includes("Low Stock") ? '#dc3545' : '#28a745', fontWeight: 'bold', margin: '0.5rem 0' }}>
                        {stockStatus !== null ? stockStatus : "—"}
                      </div>
                      <button onClick={handleCheckLevel} className="check-btn" style={{ marginTop: '1rem', padding: '0.7rem 2rem', fontSize: '1.1rem', borderRadius: '8px', background: '#007bff', color: '#fff', border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                        Check Level
                      </button>
                      <button
                        className="alert-btn"
                        style={{ marginTop: '1rem', padding: '0.7rem 2rem', fontSize: '1.1rem', borderRadius: '8px', background: '#dc3545', color: '#fff', border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
                        onClick={() => {
                          socket.emit("sendAlert");
                        }}
                      >
                        🚨 Send Alert
                      </button>
                    </div>

                  </div>
                </div>
              )}

              {/* Analytics Section */}
              {adminView === "analytics" && <Analytics />}
            </div>
          </>
        )}
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