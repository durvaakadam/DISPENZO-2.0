import React, { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { rtdb } from "../../firebase2"; // ✅ your realtime DB config
import { ref, onValue } from "firebase/database";

// register chart components
ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Title, Tooltip, Legend);

const EnvironmentalDashboard = () => {
  const [temperatureData, setTemperatureData] = useState([]);
  const [latestTemp, setLatestTemp] = useState(null);

  useEffect(() => {
    const tempRef = ref(rtdb, "Dispenzo_Transactions/Live_Sensors/Temperature");

    const unsubscribe = onValue(tempRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const newEntry = {
          value: parseFloat(data.value),
          timestamp: new Date(data.timestamp),
        };

        setLatestTemp(newEntry.value);

        // append new data locally
        setTemperatureData((prev) => {
          if (prev.length > 0 && prev[prev.length - 1].timestamp.getTime() === newEntry.timestamp.getTime()) {
            return prev; // skip duplicate timestamp
          }
          const updated = [...prev, newEntry];
          return updated.slice(-30); // keep last 30 readings
        });
      }
    });

    return () => unsubscribe();
  }, []);

  const sortedData = [...temperatureData].sort((a, b) => a.timestamp - b.timestamp);

  const chartData = {
    labels: sortedData.map((d) =>
      d.timestamp.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" })
    ),
    datasets: [
      {
        label: "Temperature (°C)",
        data: sortedData.map((d) => d.value),
        borderColor: "#ff3366",
        backgroundColor: "rgba(255, 99, 132, 0.2)",
        tension: 0.3,
        fill: true,
        pointRadius: 2,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    animation: false,
    plugins: {
      legend: { position: "top" },
      title: { display: true, text: "🌡 Real-Time Temperature Monitoring" },
    },
    scales: {
      y: {
        beginAtZero: false,
        min: sortedData.length ? Math.min(...sortedData.map((d) => d.value)) - 1 : 0,
        max: sortedData.length ? Math.max(...sortedData.map((d) => d.value)) + 1 : 50,
        title: { display: true, text: "Temperature (°C)" },
      },
      x: {
        title: { display: true, text: "Time" },
        ticks: { maxTicksLimit: 10 },
      },
    },
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>🌡 Live Temperature Dashboard</h2>

      <div
        style={{
          marginBottom: "20px",
          padding: "10px 20px",
          background: "#f9f9f9",
          borderRadius: "10px",
          width: "fit-content",
          boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
        }}
      >
        <h4>Current Temperature</h4>
        <span style={{ fontSize: "1.8rem", fontWeight: "bold", color: "#ff3366" }}>
          {latestTemp !== null ? `${latestTemp.toFixed(2)}°C` : "Loading..."}
        </span>
      </div>

      <div style={{ width: "100%", maxWidth: "900px" }}>
        <Line data={chartData} options={chartOptions} />
      </div>
    </div>
  );
};

export default EnvironmentalDashboard;
