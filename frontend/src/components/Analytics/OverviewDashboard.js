import React from "react";
import { Line, Doughnut } from "react-chartjs-2";
import "chart.js/auto";
import MetricsCard from "./MetricsCard";
import { useOverviewData } from "./useOverviewData";

const OverviewDashboard = () => {
  const { logs, loading } = useOverviewData();

  if (loading) return <p>Loading overview...</p>;
  if (!logs.length) return <p>No data available</p>;

  /* ================= METRICS ================= */
  const totalTransactions = logs.length;

  const successful = logs.filter(l => l.status === "SUCCESS");
  const successRate = ((successful.length / totalTransactions) * 100).toFixed(1);

  const totalDispensed = successful.reduce(
    (sum, l) => sum + (l.grainKg || 0),
    0
  );

  const avgTransactionTime = (
    logs.reduce((sum, l) => sum + (l.transactionTimeMs || 0), 0) /
    logs.length
  ).toFixed(1);

  /* ================= SUCCESS TREND (DAILY) ================= */
  const dailyMap = {};

  logs.forEach(l => {
    if (!dailyMap[l.day]) {
      dailyMap[l.day] = { total: 0, success: 0 };
    }
    dailyMap[l.day].total++;
    if (l.status === "SUCCESS") dailyMap[l.day].success++;
  });

  const sortedDays = Object.keys(dailyMap).sort();
  const successTrendData = {
    labels: sortedDays,
    datasets: [
      {
        label: "Success Rate (%)",
        data: sortedDays.map(
          d => (dailyMap[d].success / dailyMap[d].total) * 100
        ),
        borderColor: "#4bc0c0",
        backgroundColor: "rgba(75,192,192,0.3)",
        tension: 0.3,
      },
    ],
  };

  /* ================= ITEM DISTRIBUTION ================= */
  const totalGrain = successful.reduce((s, l) => s + (l.grainKg || 0), 0);
  const totalLiquid = successful.reduce((s, l) => s + (l.liquidL || 0), 0);

  const itemDistributionData = {
    labels: ["Grain", "Liquid"],
    datasets: [
      {
        data: [totalGrain, totalLiquid],
        backgroundColor: ["#FF6384", "#36A2EB"],
      },
    ],
  };

  return (
    <div className="overview-dashboard">

      {/* METRIC CARDS */}
      <div className="metrics-grid">
        <MetricsCard title="Total Transactions" value={totalTransactions} icon="📊" />
        <MetricsCard title="Success Rate" value={`${successRate}%`} icon="✅" />
        
        <MetricsCard
          title="Avg Transaction Time"
          value={`${avgTransactionTime} ms`}
          icon="⚡"
        />
      </div>

      {/* CHARTS */}
      <div className="charts-grid">
        <div className="chart-container">
          <h3>Transaction Success Rate Trend</h3>
          <Line
            data={successTrendData}
            options={{
              responsive: true,
              scales: { y: { beginAtZero: true, max: 100 } },
            }}
          />
        </div>

        <div className="chart-container">
          <h3>Item Distribution</h3>
          <Doughnut data={itemDistributionData} />
        </div>
      </div>
    </div>
  );
};

export default OverviewDashboard;