import React from 'react';
import { Line, Bar, Scatter } from 'react-chartjs-2';

const PerformanceDashboard = ({ data, timeRange }) => {
  // Dispense time analysis
  const getDispenseTimeData = () => {
    const timeData = data.map(item => item['Dispense_Time (s)']).filter(time => time > 0);
    const avgTime = timeData.reduce((sum, time) => sum + time, 0) / timeData.length;
    
    const hourlyAvg = {};
    data.forEach(item => {
      const hour = new Date(`2000-01-01 ${item.Time}`).getHours();
      if (!hourlyAvg[hour]) hourlyAvg[hour] = { total: 0, count: 0 };
      hourlyAvg[hour].total += item['Dispense_Time (s)'];
      hourlyAvg[hour].count++;
    });

    const labels = Array.from({length: 24}, (_, i) => `${i}:00`);
    const avgTimes = labels.map((_, hour) => 
      hourlyAvg[hour] ? (hourlyAvg[hour].total / hourlyAvg[hour].count).toFixed(2) : 0
    );

    return {
      labels,
      datasets: [{
        label: 'Average Dispense Time (s)',
        data: avgTimes,
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        tension: 0.1
      }]
    };
  };

  // Power consumption analysis
  const getPowerConsumptionData = () => {
    const sortedData = [...data].sort((a, b) => a.Date - b.Date);
    
    return {
      labels: sortedData.map(item => item.Date.toLocaleDateString()),
      datasets: [{
        label: 'Power Consumption (W)',
        data: sortedData.map(item => item['Power_Consumption (W)']),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.1
      }]
    };
  };

  // Efficiency scatter plot (quantity vs time)
  const getEfficiencyData = () => {
    const scatterData = data
      .filter(item => item.Transaction_Status === 'Completed')
      .map(item => ({
        x: item['Quantity_Dispensed (kg)'],
        y: item['Dispense_Time (s)']
      }));

    return {
      datasets: [{
        label: 'Quantity vs Dispense Time',
        data: scatterData,
        backgroundColor: 'rgba(255, 99, 132, 0.6)',
        borderColor: 'rgba(255, 99, 132, 1)'
      }]
    };
  };

  // System health metrics
  const getSystemHealthData = () => {
    const errorCounts = {};
    data.forEach(item => {
      errorCounts[item.Error_Code] = (errorCounts[item.Error_Code] || 0) + 1;
    });

    const healthScore = ((errorCounts['ERR_NONE'] || 0) / data.length * 100).toFixed(1);
    
    return {
      labels: Object.keys(errorCounts),
      datasets: [{
        label: 'Error Frequency',
        data: Object.values(errorCounts),
        backgroundColor: [
          'rgba(75, 192, 192, 0.6)', // ERR_NONE - green
          'rgba(255, 99, 132, 0.6)', // ERR_MOTOR - red
          'rgba(255, 205, 86, 0.6)'  // ERR_SENSOR - yellow
        ],
        borderColor: [
          'rgba(75, 192, 192, 1)',
          'rgba(255, 99, 132, 1)',
          'rgba(255, 205, 86, 1)'
        ],
        borderWidth: 1
      }]
    };
  };

  // Calculate performance metrics
  const avgDispenseTime = (data.reduce((sum, item) => sum + item['Dispense_Time (s)'], 0) / data.length).toFixed(2);
  const avgPowerConsumption = (data.reduce((sum, item) => sum + item['Power_Consumption (W)'], 0) / data.length).toFixed(1);
  const systemUptime = ((data.filter(item => item.Error_Code === 'ERR_NONE').length / data.length) * 100).toFixed(1);

  return (
    <div className="performance-dashboard">
      <div className="performance-metrics">
        <div className="metric-card">
          <h4>Avg Dispense Time</h4>
          <span className="metric-value">{avgDispenseTime}s</span>
        </div>
        <div className="metric-card">
          <h4>Avg Power Consumption</h4>
          <span className="metric-value">{avgPowerConsumption}W</span>
        </div>
        <div className="metric-card">
          <h4>System Uptime</h4>
          <span className="metric-value">{systemUptime}%</span>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-container">
          <h3>Hourly Dispense Time Performance</h3>
          <Line data={getDispenseTimeData()} options={{
            responsive: true,
            plugins: { legend: { position: 'top' } },
            scales: { y: { beginAtZero: true } }
          }} />
        </div>

        <div className="chart-container">
          <h3>Power Consumption Trend</h3>
          <Line data={getPowerConsumptionData()} options={{
            responsive: true,
            plugins: { legend: { position: 'top' } },
            scales: { y: { beginAtZero: true } }
          }} />
        </div>

        <div className="chart-container">
          <h3>Efficiency Analysis</h3>
          <Scatter data={getEfficiencyData()} options={{
            responsive: true,
            plugins: { 
              legend: { position: 'top' },
              tooltip: {
                callbacks: {
                  label: (context) => `Quantity: ${context.parsed.x}kg, Time: ${context.parsed.y}s`
                }
              }
            },
            scales: {
              x: { title: { display: true, text: 'Quantity Dispensed (kg)' } },
              y: { title: { display: true, text: 'Dispense Time (s)' } }
            }
          }} />
        </div>

        <div className="chart-container">
          <h3>System Health Status</h3>
          <Bar data={getSystemHealthData()} options={{
            responsive: true,
            plugins: { legend: { position: 'top' } },
            scales: { y: { beginAtZero: true } }
          }} />
        </div>
      </div>
    </div>
  );
};

export default PerformanceDashboard;