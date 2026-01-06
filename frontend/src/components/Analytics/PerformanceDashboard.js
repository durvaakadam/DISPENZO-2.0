import React, { useState } from "react";
import { Bar, Line } from "react-chartjs-2";
import "chart.js/auto";
import { useSensorErrors } from "./useSensorErrors";
import "./Performance.css";

const PerformanceDashboard = () => {
  const [centerId, setCenterId] = useState("RDC-MH-GORAI-01");
  const { errors, loading } = useSensorErrors(centerId);

  if (loading) return <p>Loading system performance...</p>;
  if (!errors.length) return <p>No sensor errors recorded</p>;

  /* ================= SUMMARY ================= */
  const criticalErrors = errors.filter(e => e.severity === "HIGH").length;
  const resolvedErrors = errors.filter(e => e.resolved).length;
  const uptime =
    (((errors.length - criticalErrors) / errors.length) * 100).toFixed(1);

  /* ================= BAR: Errors by Sensor ================= */
  const sensorCounts = {};
  errors.forEach(e => {
    sensorCounts[e.sensorType] = (sensorCounts[e.sensorType] || 0) + 1;
  });

  const sensorErrorChart = {
    labels: Object.keys(sensorCounts),
    datasets: [{
      label: "Error Count",
      data: Object.values(sensorCounts),
      backgroundColor: "#f44336",
    }]
  };

  /* ================= LINE: Errors Over Time ================= */
  /* ================= LINE: Errors Per Month ================= */
const monthlyErrors = {};

errors.forEach(e => {
  monthlyErrors[e.month] = (monthlyErrors[e.month] || 0) + 1;
});

const sortedMonths = Object.keys(monthlyErrors).sort();

const errorTrendChart = {
  labels: sortedMonths,
  datasets: [{
    label: "Errors per Month",
    data: sortedMonths.map(m => monthlyErrors[m]),
    borderColor: "#ff9800",
    backgroundColor: "rgba(255,152,0,0.3)",
    fill: true,
    tension: 0.3,
  }]
};


  /* ================= BAR: Errors by Hour ================= */
  const hourly = new Array(24).fill(0);
  errors.forEach(e => {
    if (typeof e.hour === "number") hourly[e.hour]++;
  });

  const hourlyChart = {
    labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
    datasets: [{
      label: "Errors",
      data: hourly,
      backgroundColor: "#9c27b0",
    }]
  };

  /* ================= BAR: Severity Distribution ================= */
  const severityMap = { LOW: 0, MEDIUM: 0, HIGH: 0 };
  errors.forEach(e => severityMap[e.severity]++);

  const severityChart = {
    labels: ["LOW", "MEDIUM", "HIGH"],
    datasets: [{
      label: "Severity Count",
      data: Object.values(severityMap),
      backgroundColor: ["#4caf50", "#ff9800", "#f44336"],
    }]
  };

  return (
    <div className="performance-container">

      {/* HEADER */}
      <div className="performance-header">
        <h2>System Performance & Health</h2>

        <select
          value={centerId}
          onChange={(e) => setCenterId(e.target.value)}
        >
          <option value="RDC-MH-GORAI-01">Gorai Center</option>
          <option value="RDC-MH-BORIVALI-02">Borivali Center</option>
        </select>
      </div>

      {/* SUMMARY CARDS */}
      <div className="summary-cards">

        <div className="summary-card danger">
          <h4>Critical Errors</h4>
          <p>{criticalErrors}</p>
        </div>

        <div className="summary-card success">
          <h4>Resolved Errors</h4>
          <p>{resolvedErrors}</p>
        </div>

        <div className="summary-card">
          <h4>System Stability</h4>
          <p>{uptime}%</p>
        </div>

      </div>

      {/* CHARTS */}
      <div className="charts-grid">

        <div className="chart">
          <h3>Errors by Sensor Type</h3>
          <Bar data={sensorErrorChart} />
        </div>

        <div className="chart">
          <h3>Error Trend Over Time</h3>
          <Line data={errorTrendChart} />
        </div>

        <div className="chart">
          <h3>Errors by Hour</h3>
          <Bar data={hourlyChart} />
        </div>

        <div className="chart">
          <h3>Error Severity Distribution</h3>
          <Bar data={severityChart} />
        </div>

      </div>
    </div>
  );
};

export default PerformanceDashboard;