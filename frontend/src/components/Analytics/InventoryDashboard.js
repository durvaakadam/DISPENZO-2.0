import React, { useState } from "react";
import { Bar, Line } from "react-chartjs-2";
import "chart.js/auto";
import { useInventory } from "./useInventory";
import "./Inventory.css";

const InventoryAnalytics = () => {
  const [centerId, setCenterId] = useState("RDC-MH-GORAI-01");

  const { inventory, monthlyLogs, loading } = useInventory(centerId);

  if (loading) return <p>Loading inventory analytics...</p>;
  if (!inventory) return <p>No inventory data available</p>;

  /* ================= SORT MONTHLY LOGS (FIX) ================= */
  const sortedLogs = [...monthlyLogs].sort((a, b) =>
    a.month.localeCompare(b.month)
  );

  /* ================= SUMMARY VALUES ================= */
  const efficiency = (
    (inventory.totalGrainDistributedKg /
      inventory.totalGrainAllottedKg) *
    100
  ).toFixed(1);

  /* =====================================================
     BAR – Monthly Allotted vs Distributed (Grain)
  ===================================================== */
  const monthlyAllotDistChart = {
    labels: sortedLogs.map(l => l.month),
    datasets: [
      {
        label: "Grain Allotted (kg)",
        data: sortedLogs.map(l => l.grainAllottedKg),
        backgroundColor: "#1976d2",
      },
      {
        label: "Grain Distributed (kg)",
        data: sortedLogs.map(l => l.grainDistributedKg),
        backgroundColor: "#2e7d32",
      },
    ],
  };

  /* =====================================================
     LINE – Monthly Grain Distribution
  ===================================================== */
  const monthlyChart = {
    labels: sortedLogs.map(l => l.month),
    datasets: [
      {
        label: "Grain Distributed (kg)",
        data: sortedLogs.map(l => l.grainDistributedKg),
        borderColor: "#ff9800",
        backgroundColor: "rgba(255,152,0,0.3)",
        fill: true,
        tension: 0.3,
      },
    ],
  };

  return (
    <div className="inventory-container">

      {/* HEADER */}
      <div className="inventory-header">
        <h2>Inventory Analytics</h2>

        <select
          className="center-selector"
          value={centerId}
          onChange={(e) => setCenterId(e.target.value)}
        >
          <option value="RDC-MH-GORAI-01">Gorai Ration Center</option>
          <option value="RDC-MH-BORIVALI-02">Borivali Ration Center</option>
        </select>
      </div>

      {/* SUMMARY CARDS */}
      <div className="summary-cards">

        <div className="summary-card">
          <h4>Total Grain Allotted</h4>
          <p>{inventory.totalGrainAllottedKg} kg</p>
        </div>

        <div className="summary-card">
          <h4>Total Grain Distributed</h4>
          <p>{inventory.totalGrainDistributedKg} kg</p>
        </div>

        <div className="summary-card warning">
          <h4>Remaining Grain</h4>
          <p>{inventory.remainingGrainKg} kg</p>
        </div>

        <div className="summary-card success">
          <h4>Distribution Efficiency</h4>
          <p>{efficiency}%</p>
        </div>

      </div>

      {/* CHARTS */}
      <div className="charts-grid">

        <div className="chart">
          <h3>Monthly Grain: Allotted vs Distributed</h3>
          <Bar data={monthlyAllotDistChart} />
        </div>

        <div className="chart">
          <h3>Monthly Grain Distribution</h3>
          <Line data={monthlyChart} />
        </div>

      </div>
    </div>
  );
};

export default InventoryAnalytics;
