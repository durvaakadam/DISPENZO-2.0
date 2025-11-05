import React from 'react';
import { Line, Area } from 'react-chartjs-2';

const EnvironmentalDashboard = ({ data, timeRange }) => {
  // Temperature trends
  const getTemperatureData = () => {
    const sortedData = [...data].sort((a, b) => a.Date - b.Date);
    
    return {
      labels: sortedData.map(item => `${item.Date.toLocaleDateString()} ${item.Time}`),
      datasets: [{
        label: 'Temperature (°C)',
        data: sortedData.map(item => item['Temperature (°C)']),
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        tension: 0.1,
        fill: true
      }]
    };
  };

  // Humidity trends
  const getHumidityData = () => {
    const sortedData = [...data].sort((a, b) => a.Date - b.Date);
    
    return {
      labels: sortedData.map(item => `${item.Date.toLocaleDateString()} ${item.Time}`),
      datasets: [{
        label: 'Humidity (%)',
        data: sortedData.map(item => item['Humidity (%)']),
        borderColor: 'rgb(54, 162, 235)',
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        tension: 0.1,
        fill: true
      }]
    };
  };

  // Combined environmental data
  const getCombinedEnvironmentalData = () => {
    const sortedData = [...data].sort((a, b) => a.Date - b.Date);
    
    return {
      labels: sortedData.map(item => item.Date.toLocaleDateString()),
      datasets: [
        {
          label: 'Temperature (°C)',
          data: sortedData.map(item => item['Temperature (°C)']),
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          yAxisID: 'y'
        },
        {
          label: 'Humidity (%)',
          data: sortedData.map(item => item['Humidity (%)']),
          borderColor: 'rgb(54, 162, 235)',
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          yAxisID: 'y1'
        }
      ]
    };
  };

  // Environmental alerts
  const getEnvironmentalAlerts = () => {
    const alerts = [];
    const highTempThreshold = 35;
    const lowHumidityThreshold = 40;
    const highHumidityThreshold = 70;

    data.forEach(item => {
      if (item['Temperature (°C)'] > highTempThreshold) {
        alerts.push({
          type: 'temperature',
          message: `High temperature detected: ${item['Temperature (°C)']}°C`,
          timestamp: `${item.Date.toLocaleDateString()} ${item.Time}`,
          severity: 'high'
        });
      }
      
      if (item['Humidity (%)'] < lowHumidityThreshold || item['Humidity (%)'] > highHumidityThreshold) {
        alerts.push({
          type: 'humidity',
          message: `Humidity out of range: ${item['Humidity (%)']}%`,
          timestamp: `${item.Date.toLocaleDateString()} ${item.Time}`,
          severity: item['Humidity (%)'] > highHumidityThreshold ? 'medium' : 'low'
        });
      }
    });

    return alerts.slice(-10); // Last 10 alerts
  };

  const environmentalAlerts = getEnvironmentalAlerts();
  
  // Calculate averages
  const avgTemperature = (data.reduce((sum, item) => sum + item['Temperature (°C)'], 0) / data.length).toFixed(1);
  const avgHumidity = (data.reduce((sum, item) => sum + item['Humidity (%)'], 0) / data.length).toFixed(1);
  const maxTemperature = Math.max(...data.map(item => item['Temperature (°C)'])).toFixed(1);
  const minTemperature = Math.min(...data.map(item => item['Temperature (°C)'])).toFixed(1);

  return (
    <div className="environmental-dashboard">
      <div className="environmental-metrics">
        <div className="metric-card">
          <h4>Avg Temperature</h4>
          <span className="metric-value">{avgTemperature}°C</span>
        </div>
        <div className="metric-card">
          <h4>Avg Humidity</h4>
          <span className="metric-value">{avgHumidity}%</span>
        </div>
        <div className="metric-card">
          <h4>Temp Range</h4>
          <span className="metric-value">{minTemperature}°C - {maxTemperature}°C</span>
        </div>
        <div className="metric-card">
          <h4>Active Alerts</h4>
          <span className="metric-value">{environmentalAlerts.length}</span>
        </div>
      </div>

      {environmentalAlerts.length > 0 && (
        <div className="alerts-section">
          <h3>🚨 Environmental Alerts</h3>
          <div className="alerts-list">
            {environmentalAlerts.map((alert, index) => (
              <div key={index} className={`alert-item ${alert.severity}`}>
                <span className="alert-message">{alert.message}</span>
                <span className="alert-timestamp">{alert.timestamp}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="charts-grid">
        <div className="chart-container full-width">
          <h3>Combined Environmental Conditions</h3>
          <Line data={getCombinedEnvironmentalData()} options={{
            responsive: true,
            interaction: { mode: 'index', intersect: false },
            plugins: { legend: { position: 'top' } },
            scales: {
              y: { type: 'linear', display: true, position: 'left', title: { display: true, text: 'Temperature (°C)' } },
              y1: { type: 'linear', display: true, position: 'right', title: { display: true, text: 'Humidity (%)' }, grid: { drawOnChartArea: false } }
            }
          }} />
        </div>

        <div className="chart-container">
          <h3>Temperature Trend</h3>
          <Line data={getTemperatureData()} options={{
            responsive: true,
            plugins: { legend: { position: 'top' } },
            scales: { y: { beginAtZero: true } }
          }} />
        </div>

        <div className="chart-container">
          <h3>Humidity Trend</h3>
          <Line data={getHumidityData()} options={{
            responsive: true,
            plugins: { legend: { position: 'top' } },
            scales: { y: { beginAtZero: true, max: 100 } }
          }} />
        </div>
      </div>
    </div>
  );
};

export default EnvironmentalDashboard;