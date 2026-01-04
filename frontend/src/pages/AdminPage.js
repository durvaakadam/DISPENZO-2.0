import React, { useState, useEffect } from "react";
import Analytics from "../components/Analytics/Analytics";
import "../styles/AdminPage.css";

const ADMIN_PASSWORD = "admin123"; // Change this or store in .env

function AdminPage({
  socket,
  users,
  temperatureValue,
  temperatureAlert,
  containerLevel,
  levelAlert,
  ultrasonicDistance,
  stockStatus,
  moisturePercent,
  moistureRaw,
  onBackToUser,
}) {
  // Admin authentication state
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const [adminView, setAdminView] = useState("users");
  const [tempActive, setTempActive] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMonitor, setSelectedMonitor] = useState("temperature");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [sortBy, setSortBy] = useState("name");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [ultraActive, setUltraActive] = useState(false);
  const [moistureActive, setMoistureActive] = useState(false);

  const handleLogin = () => {
    if (password === ADMIN_PASSWORD) {
      setAuthenticated(true);
      setError("");
      setPassword("");
    } else {
      setError("❌ Incorrect Password!");
      setPassword("");
    }
  };

  const handleLogout = () => {
    setAuthenticated(false);
    setPassword("");
    setError("");
    onBackToUser(); // Go back to user view
  };

  const handleCheckLevel = () => {
    socket.emit("checkLevel");
  };

  const handleSendAlert = () => {
    socket.emit("sendAlert");
  };

  const handleUltrasonic = () => {
    if (!ultraActive) {
      socket.emit("checkLevel"); // start ultrasonic on ESP32
      setUltraActive(true);
    } else {
      socket.emit("stopUltra"); // stop ultrasonic
      setUltraActive(false);
    }
  };

  const handleTemperature = () => {
    if (!tempActive) {
      socket.emit("checkTemperature");
      setTempActive(true);
    } else {
      socket.emit("stopTemperature");
      setTempActive(false);
    }
  };

  const handleMoisture = () => {
    if (!moistureActive) {
      socket.emit("startMoisture"); // ESP32 → MOIST
      setMoistureActive(true);
    } else {
      socket.emit("stopMoisture"); // ESP32 → MSTOP
      setMoistureActive(false);
    }
  };

  // Filter users based on search term
  const filteredUsers = users.filter(
    (user) =>
      (user.Name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(user.phone || "").includes(searchTerm) ||
      String(user.id || "").includes(searchTerm)
  );

  // Sort users
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    if (sortBy === "name") {
      return (a.Name || "").localeCompare(b.Name || "");
    } else if (sortBy === "recent") {
      return new Date(b.timestamp || 0) - new Date(a.timestamp || 0);
    }
    return 0;
  });

  // Get status indicator for monitoring
  const getStatusIndicator = (isAlert) => {
    return isAlert ? "🔴" : "";
  };

  // If not authenticated, show login popup
  if (!authenticated) {
    return (
      <div className="admin-login-overlay">
        <div className="admin-login-popup">
          <div className="admin-login-header">
            <h2>Authorized Personnel Access Only</h2>
            <p>This system is monitored and logged.</p>
            <button
              className="close-login-btn"
              onClick={onBackToUser}
              title="Close"
            >
              ✕
            </button>
          </div>

          <div className="admin-login-body">
            <div className="login-icon">🔐</div>

            <div className="input-group">
              <label className="input-label">Your password</label>
              <div className="password-input-wrapper">
                <input
                  type="password"
                  className="admin-password-input"
                  placeholder="e.g. ilovemangools123"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleLogin()}
                />
              </div>
            </div>

            {error && <p className="admin-error">{error}</p>}

            <button className="admin-login-btn" onClick={handleLogin}>
              Sign in
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If authenticated, show admin dashboard
  return (
    <div className={`admin-page ${isDarkMode ? "dark-mode" : "light-mode"}`}>
      {/* Header */}
      <div className="admin-header">
        <h1>DISPENZO Control Center
</h1>
        <div className="header-right">
          <button
            className="theme-toggle-btn"
            onClick={() => setIsDarkMode(!isDarkMode)}
            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDarkMode ? "☀️ Light" : "🌙 Dark"}
          </button>
          <button className="back-to-user-btn" onClick={handleLogout}>
            User View
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="quick-stats">
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <p className="stat-label">Total Beneficiaries</p>
            <p className="stat-value">{users.length}</p>
          </div>
        </div>
        
        <div className={`stat-card ${temperatureAlert ? "alert" : ""}`}>
          <div className="stat-icon">🌡️</div>
          <div className="stat-content">
            <p className="stat-label">Temperature</p>
            <p className="stat-value">{temperatureValue || "—"}°C</p>
          </div>
        </div>
        <div className={`stat-card ${levelAlert ? "alert" : ""}`}>
          <div className="stat-icon">📦</div>
          <div className="stat-content">
            <p className="stat-label">Container Level</p>
            <p className="stat-value">{containerLevel || "—"}%</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📍</div>
          <div className="stat-content">
            <p className="stat-label">Distance</p>
            <p className="stat-value">{ultrasonicDistance || "—"}cm</p>
          </div>
        </div>
        <div className="stat-card highlight">
  <div className="stat-icon">🏪</div>
  <div className="stat-content">
    <p className="stat-label">Fair Price Shop</p>
    <p className="stat-value">FPS 042</p>
    <p className="stat-sub">📍 Andheri East, Mumbai</p>
  </div>
</div>

      </div>

      <div className="admin-container">
        {/* Sidebar Navigation */}
        <div className={`admin-sidebar ${sidebarOpen ? "open" : "closed"}`}>
          <div className="sidebar-header">
            <h3>Menu</h3>
            <button
              className="sidebar-toggle-close"
              onClick={() => setSidebarOpen(false)}
              title="Close sidebar"
            >
              ✕
            </button>
          </div>
          <nav className="sidebar-nav">
            <button
              className={`nav-item ${adminView === "users" ? "active" : ""}`}
              onClick={() => {
                setAdminView("users");
                setSidebarOpen(false);
              }}
            >
              <span className="nav-icon">👥</span>
              <span className="nav-text">Beneficiaries</span>
              <span className="nav-badge">{users.length}</span>
            </button>
            <button
              className={`nav-item ${adminView === "monitoring" ? "active" : ""}`}
              onClick={() => {
                setAdminView("monitoring");
                setSidebarOpen(false);
              }}
            >
              <span className="nav-icon">📊</span>
              <span className="nav-text">Monitoring</span>
            </button>
            <button
              className={`nav-item ${adminView === "analytics" ? "active" : ""}`}
              onClick={() => {
                setAdminView("analytics");
                setSidebarOpen(false);
              }}
            >
              <span className="nav-icon">📈</span>
              <span className="nav-text">Analytics</span>
            </button>
          </nav>
        </div>

        {/* Sidebar Toggle Button */}
        {!sidebarOpen && (
          <button
            className="sidebar-toggle-open"
            onClick={() => setSidebarOpen(true)}
            title="Open sidebar"
          >
            ☰
          </button>
        )}

        {/* Main Content */}
        <div className="admin-content">
          {/* Users View */}
          {adminView === "users" && (
            <div className="users-section">
              <div className="section-header">
                <h2>System Beneficiaries ({filteredUsers.length})</h2>
                <div className="header-controls">
                  <input
                    type="text"
                    placeholder="🔍 Search by name, phone, or UID..."
                    className="search-input"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <select
                    className="filter-select"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                  >
                    <option value="name">📝 Sort by Name</option>
                    <option value="recent">🕐 Most Recent</option>
                  </select>
                </div>
              </div>
              {filteredUsers.length === 0 ? (
                <p className="no-data">
                  {searchTerm ? "No beneficiaries match your search" : "No beneficiaries found"}
                </p>
              ) : (
                <table className="users-table">
                  <thead>
                    <tr>
                      <th>UID</th>
                      <th>Name</th>
                      <th>Phone</th>
                      <th>Family Members</th>
                      <th>Weight Threshold</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedUsers.map((user) => (
                      <tr key={user.id}>
                        <td className="uid-cell">{user.id}</td>
                        <td>{user.Name}</td>
                        <td>{user.phone}</td>
                        <td>{user.family_members}</td>
                        <td>{user.weightThreshold}g</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Monitoring View */}
          {adminView === "monitoring" && (
            <div className="monitoring-section">
              <div className="monitoring-header">
                <h2>📊 Real-time Monitoring Dashboard</h2>
              </div>

              <div className="monitoring-layout">
                {/* Left Sidebar - Toggle Cards */}
                <div className="monitoring-sidebar">
                  <button
                    className={`monitor-toggle ${
                      selectedMonitor === "temperature" ? "active" : ""
                    }`}
                    onClick={() => setSelectedMonitor("temperature")}
                  >
                    <span className="toggle-icon">🌡️</span>
                    <span className="toggle-text">Temperature</span>
                    <span
                      className={`toggle-indicator ${
                        temperatureAlert ? "alert" : ""
                      }`}
                    >
                      {getStatusIndicator(temperatureAlert)}
                    </span>
                  </button>

                  <button
                    className={`monitor-toggle ${
                      selectedMonitor === "container" ? "active" : ""
                    }`}
                    onClick={() => setSelectedMonitor("container")}
                  >
                    <span className="toggle-icon">📦</span>
                    <span className="toggle-text">Container</span>
                    <span
                      className={`toggle-indicator ${
                        levelAlert ? "alert" : ""
                      }`}
                    >
                      {getStatusIndicator(levelAlert)}
                    </span>
                  </button>

                  <button
                    className={`monitor-toggle ${
                      selectedMonitor === "moisture" ? "active" : ""
                    }`}
                    onClick={() => setSelectedMonitor("moisture")}
                  >
                    <span className="toggle-icon">💧</span>
                    <span className="toggle-text">Moisture</span>
                    <span className="toggle-indicator">🟢</span>
                  </button>
                </div>
                

                {/* Right Main Content - Graph and Details */}
                <div className="monitoring-main">
                  {/* Temperature Details */}
                  {selectedMonitor === "temperature" && (
                    <div className="monitor-detail">
                      <div className="detail-graph">
                        <div className="graph-placeholder">
                          <div className="graph-title">Temperature Trend (24h)</div>
                          <div className="graph-chart">
                            <div className="temp-display">
                              <div className="temp-value-large">
                                {temperatureValue !== null ? temperatureValue : "—"}
                              </div>
                              <div className="temp-unit">°Celsius</div>
                              <div className="temp-trend">
                                <span className="trend-arrow">↑</span>
                                Increasing trend
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="detail-card">
                        <div className="detail-header">
                          <h3>🌡️ Temperature</h3>
                          <span className="detail-status">
                            {temperatureAlert ? "🔴 Alert" : "🟢 Normal"}
                          </span>
                        </div>
                        <div className="detail-card-main-value">
                          <div className="value-number">
                            {temperatureValue !== null ? temperatureValue : "—"}
                          </div>
                          <div className="value-unit">°Celsius</div>
                        </div>
                        <div className="detail-info">
                          <div className="detail-row">
                            <span className="detail-label">Status:</span>
                            <span className="detail-value">
                              {temperatureAlert ? "High Alert" : "Normal"}
                            </span>
                          </div>
                          <div className="detail-row">
                            <span className="detail-label">Monitoring:</span>
                            <span className="detail-value">
                              {tempActive ? "🟢 Active" : "⭕ Inactive"}
                            </span>
                          </div>
                          <div className="range-fields">
                            <div className="range-field">
                              <span className="range-label">Min Range</span>
                              <span className="range-value">15°C</span>
                            </div>
                            <div className="range-field">
                              <span className="range-label">Max Range</span>
                              <span className="range-value">35°C</span>
                            </div>
                          </div>
                          <button
                            className={`detail-btn detail-btn-sm ${
                              tempActive ? "active" : ""
                            }`}
                            onClick={handleTemperature}
                          >
                            {tempActive ? "⏹ Deactivate" : "▶ Activate"}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Container Details */}
                  {selectedMonitor === "container" && (
                    <div className="monitor-detail">
                      <div className="detail-graph">
                        <div className="graph-placeholder">
                          <div className="graph-title">Container Level Trend (24h)</div>
                          <div className="graph-chart">
                            <div className="circular-gauge">
                              <div
                                className="gauge-circle"
                                style={{
                                  "--percentage": `${(moisturePercent || 0) * 3.6}deg`,
                                }}
                              >
                                <div className="gauge-inner">
                                  <div>
                                    <div
                                      className="gauge-value"
                                      style={{ color: "#4CAF50" }}
                                    >
                                      {moisturePercent !== null ? moisturePercent : "—"}
                                    </div>
                                    <div className="gauge-unit">%</div>
                                  </div>
                                </div>
                              </div>
                              <div
                                className="temp-trend"
                                style={{
                                  color: levelAlert ? "#ff6b6b" : "#4CAF50",
                                }}
                              >
                                <span className="trend-arrow">
                                  {levelAlert ? "↓" : "→"}
                                </span>
                                {levelAlert ? "Stock decreasing" : "Stock stable"}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="detail-card">
                        <div className="detail-header">
                          <h3>📦 Container</h3>
                          <span className="detail-status">
                            {levelAlert ? "🔴 Low" : "🟢 Adequate"}
                          </span>
                        </div>
                        <div className="detail-card-main-value">
                          <div className="value-number">
                            {ultrasonicDistance !== null
                              ? ultrasonicDistance.toFixed(2)
                              : "—"}
                          </div>
                          <div className="value-unit">cm</div>
                        </div>

                        <div className="detail-info">
                          <div className="detail-row">
                            <span className="detail-label">Distance:</span>
                            <span className="detail-value">
                              {ultrasonicDistance !== null
                                ? `${ultrasonicDistance} cm`
                                : "—"}
                            </span>
                          </div>
                          <div className="detail-row">
                            <span className="detail-label">Status:</span>
                            <span className="detail-value">
                              {stockStatus !== null ? stockStatus : "—"}
                            </span>
                          </div>

                          <div className="detail-row">
                            <span className="detail-label">Raw Value:</span>
                            <span className="detail-value">
                              {moistureRaw !== null ? moistureRaw : "—"}
                            </span>
                          </div>

                          <div className="range-fields">
                            <div className="range-field">
                              <span className="range-label">Min Level</span>
                              <span className="range-value">20%</span>
                            </div>
                            <div className="range-field">
                              <span className="range-label">Max Level</span>
                              <span className="range-value">100%</span>
                            </div>
                          </div>

                          <button
                            className={`detail-btn detail-btn-sm ${
                              ultraActive ? "active" : ""
                            }`}
                            onClick={handleUltrasonic}
                          >
                            {ultraActive ? "⏹ Deactivate" : "▶ Activate"}
                          </button>

                          <div className="detail-buttons">
                            <button className="detail-btn alert" onClick={handleSendAlert}>
                              Issue Alert
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Moisture Details */}
                  {selectedMonitor === "moisture" && (
                    <div className="monitor-detail">
                      <div className="detail-graph">
                        <div className="graph-placeholder">
                          <div className="graph-title">Moisture Level Trend (24h)</div>
                          <div className="graph-chart">
                            <div className="circular-gauge">
                              <div
                                className="gauge-circle"
                                style={{
                                  "--percentage": `${(moisturePercent || 0) * 3.6}deg`,
                                  background: `conic-gradient(#4CAF50 0deg, #4CAF50 234deg, #3e3f5e 234deg, #3e3f5e 360deg)`,
                                }}
                              >
                                <div className="gauge-inner">
                                  <div></div>
                                </div>
                              </div>
                              <div className="temp-trend" style={{ color: "#4CAF50" }}>
                                <span className="trend-arrow">✓</span>
                                Optimal range
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="detail-card">
                        <div className="detail-header">
                          <h3>💧 Moisture</h3>
                          <span className="detail-status">🟢 Optimal</span>
                        </div>
                        <div className="detail-card-main-value">
                          <div className="value-number">
                            {moisturePercent !== null ? moisturePercent : "—"}
                          </div>
                          <div className="value-unit">%</div>
                        </div>
                        <div className="detail-info">
                          <div className="detail-row">
                            <span className="detail-label">Current Level:</span>
                            <span className="detail-value">
                              {moisturePercent !== null ? `${moisturePercent}%` : "—"}
                            </span>
                          </div>
                          <div className="detail-row">
                            <span className="detail-label">Status:</span>
                            <span className="detail-value">✓ Optimal</span>
                          </div>

                          <div className="detail-row">
                            <span className="detail-label">Monitoring:</span>
                            <span className="detail-value">
                              {moistureActive ? "🟢 Active" : "⭕ Inactive"}
                            </span>
                          </div>

                          <div className="range-fields">
                            <div className="range-field">
                              <span className="range-label">Min Range</span>
                              <span className="range-value">30%</span>
                            </div>
                            <div className="range-field">
                              <span className="range-label">Max Range</span>
                              <span className="range-value">70%</span>
                            </div>
                          </div>
                          <button
                            className={`detail-btn detail-btn-sm ${
                              moistureActive ? "active" : ""
                            }`}
                            onClick={handleMoisture}
                          >
                            {moistureActive ? "⏹ Deactivate" : "▶ Activate"}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Analytics View - Full Screen */}
          {adminView === "analytics" && (
            <div className="analytics-fullscreen">
              <div className="analytics-content">
                <Analytics />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminPage;
