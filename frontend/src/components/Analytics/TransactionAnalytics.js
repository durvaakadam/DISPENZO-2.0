import React from "react";
import { Bar, Line } from "react-chartjs-2";
import "chart.js/auto";
import { useTransactions } from "./useTransactions";

const TransactionAnalytics = () => {
  const { transactions, loading } = useTransactions();

  console.log("🔥 Transactions from Firestore:", transactions);

  if (loading) return <p>Loading analytics...</p>;
  if (!transactions.length) return <p>No transaction data found</p>;

  /* =====================================================
     SUMMARY CALCULATIONS (FOR CARDS)
  ===================================================== */
  let success = 0;
  let failure = 0;

  const times = [];

  transactions.forEach(t => {
    if (t.status?.toUpperCase() === "SUCCESS") success++;
    else failure++;

    if (typeof t.transactionTimeMs === "number") {
      times.push(t.transactionTimeMs);
    }
  });

  const avgTime =
    times.reduce((a, b) => a + b, 0) / times.length;

  /* =====================================================
     1️⃣ LINE GRAPH – Daily Ration Dispensed
  ===================================================== */
  const dailyRationMap = {};

  transactions.forEach(t => {
    if (t.status?.toUpperCase() === "SUCCESS") {
      dailyRationMap[t.day] =
        (dailyRationMap[t.day] || 0) + (t.grainKg || 0);
    }
  });

  const dailyLabels = Object.keys(dailyRationMap).sort();

  const dailyRationChart = {
    labels: dailyLabels,
    datasets: [{
      label: "Grain Dispensed (kg)",
      data: dailyLabels.map(d => dailyRationMap[d]),
      borderColor: "#4CAF50",
      backgroundColor: "rgba(76,175,80,0.35)",
      fill: true,
      tension: 0.3,
    }]
  };

  /* =====================================================
     2️⃣ COLUMN – Hourly Transaction Volume
  ===================================================== */
  const hourlyCounts = new Array(24).fill(0);

  transactions.forEach(t => {
    if (typeof t.hour === "number") {
      hourlyCounts[t.hour]++;
    }
  });

  const hourlyChart = {
    labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
    datasets: [{
      label: "Transaction Attempts",
      data: hourlyCounts,
      backgroundColor: "#FF9800",
    }]
  };

  /* =====================================================
     3️⃣ BAR – Success vs Failure
  ===================================================== */
  const successFailureChart = {
    labels: ["Success", "Failure"],
    datasets: [{
      label: "Transaction Status",
      data: [success, failure],
      backgroundColor: ["#4CAF50", "#F44336"],
    }]
  };


  /* =====================================================
   BAR GRAPH – Monthly Successful Transactions
===================================================== */
const monthlyTransactionCount = {};

transactions.forEach(t => {
  if (t.status?.toUpperCase() === "SUCCESS" && t.month) {
    monthlyTransactionCount[t.month] =
      (monthlyTransactionCount[t.month] || 0) + 1;
  }
});

const sortedMonths = Object.keys(monthlyTransactionCount).sort();

const monthlyTransactionChart = {
  labels: sortedMonths,
  datasets: [{
    label: "Successful Transactions",
    data: sortedMonths.map(m => monthlyTransactionCount[m]),
    backgroundColor: "#03A9F4",
  }]
};


  return (
    <div>

      {/* 🔝 SUMMARY CARDS */}
      <div className="summary-cards">

        <div className="summary-card success-card">
          <h4>Cumulative Successful Transactions</h4>
          <p className="summary-value">{success}</p>
          <span className="summary-subtext">
            Total completed transactions
          </span>
        </div>

        <div className="summary-card time-card">
          <h4>Average Transaction Time</h4>
          <p className="summary-value">
            {Math.round(avgTime)} ms
          </p>
          <span className="summary-subtext">
            System efficiency
          </span>
        </div>

      </div>

      {/* 📊 CHARTS */}
      <div className="charts-grid">

        <div className="chart">
          <h3>Daily Ration Dispensed (kg)</h3>
          <Line data={dailyRationChart} />
        </div>

        <div className="chart">
          <h3>Hourly Transaction Volume</h3>
          <Bar data={hourlyChart} />
        </div>

        <div className="chart">
          <h3>Transaction Success vs Failure</h3>
          <Bar data={successFailureChart} />
        </div>

        <div className="chart">
  <h3>Monthly Successful Transactions</h3>
  <Bar data={monthlyTransactionChart} />
</div>


      </div>

    </div>
  );
};

export default TransactionAnalytics;