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
  Filler,
} from "chart.js";

// 🔹 REQUIRED for Chart.js v3+
ChartJS.register(
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const MAX_POINTS = 30;

const EnvironmentalDashboard = ({ temperatureValue }) => {
  const [labels, setLabels] = useState([]);
  const [values, setValues] = useState([]);

  // 🔁 Update graph whenever sensor value changes
  useEffect(() => {
    if (temperatureValue == null) return;

    const time = new Date().toLocaleTimeString();

    setLabels((prev) => [...prev, time].slice(-MAX_POINTS));
    setValues((prev) => [...prev, Number(temperatureValue)].slice(-MAX_POINTS));
  }, [temperatureValue]);

  const chartData = {
    labels,
    datasets: [
      {
        label: "Live Temperature (°C)",
        data: values,
        borderColor: "#ff3366",
        backgroundColor: "rgba(255, 51, 102, 0.2)",
        tension: 0.3,
        pointRadius: 3,
        fill: true,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      title: {
        display: true,
        text: "🌡 Live Temperature (Sensor)",
      },
      legend: {
        display: false,
      },
    },
    scales: {
      y: {
        suggestedMin: 15,
        suggestedMax: 45,
      },
    },
  };

  return (
    <div
      style={{
        maxWidth: "900px",
        height: "420px",
        margin: "20px auto",
      }}
    >
      <Line data={chartData} options={chartOptions} />
    </div>
  );
};

export default EnvironmentalDashboard;
