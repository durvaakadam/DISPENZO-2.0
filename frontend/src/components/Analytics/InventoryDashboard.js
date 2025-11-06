import React from 'react';
import { Line, Bar, Area } from 'react-chartjs-2';

const InventoryDashboard = ({ data, timeRange }) => {
  // Stock levels over time
  const getStockTrendData = () => {
    const sortedData = [...data].sort((a, b) => a.Date - b.Date);
    
    return {
      labels: sortedData.map(item => item.Date.toLocaleDateString()),
      datasets: [{
        label: 'Stock Remaining (kg)',
        data: sortedData.map(item => item['Stock_Remaining (kg)']),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.1,
        fill: true
      }]
    };
  };

  // Quantity dispensed vs remaining quota
  const getQuantityVsQuotaData = () => {
    const recentData = data.slice(-20); // Last 20 transactions
    
    return {
      labels: recentData.map((_, index) => `T${index + 1}`),
      datasets: [
        {
          label: 'Quantity Dispensed (kg)',
          data: recentData.map(item => item['Quantity_Dispensed (kg)']),
          backgroundColor: 'rgba(255, 99, 132, 0.6)',
          borderColor: 'rgba(255, 99, 132, 1)',
          borderWidth: 1,
          yAxisID: 'y'
        },
        {
          label: 'Remaining Quota (kg)',
          data: recentData.map(item => item['Remaining_Quota (kg)']),
          backgroundColor: 'rgba(54, 162, 235, 0.6)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1,
          yAxisID: 'y1'
        }
      ]
    };
  };

  // Item-wise stock depletion
  const getItemStockData = () => {
    const itemStock = {};
    const itemDispensed = {};

    data.forEach(item => {
      if (!itemStock[item.Item_Name]) {
        itemStock[item.Item_Name] = item['Stock_Remaining (kg)'];
        itemDispensed[item.Item_Name] = 0;
      }
      if (item.Transaction_Status === 'Completed') {
        itemDispensed[item.Item_Name] += item['Quantity_Dispensed (kg)'];
      }
    });

    return {
      labels: Object.keys(itemStock),
      datasets: [
        {
          label: 'Stock Remaining (kg)',
          data: Object.values(itemStock),
          backgroundColor: 'rgba(75, 192, 192, 0.6)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1
        },
        {
          label: 'Total Dispensed (kg)',
          data: Object.values(itemDispensed),
          backgroundColor: 'rgba(255, 99, 132, 0.6)',
          borderColor: 'rgba(255, 99, 132, 1)',
          borderWidth: 1
        }
      ]
    };
  };

  // Low stock alerts
  const getLowStockAlerts = () => {
    const lowStockThreshold = 100; // kg
    const lowStockItems = {};
    
    data.forEach(item => {
      if (item['Stock_Remaining (kg)'] < lowStockThreshold) {
        lowStockItems[item.Item_Name] = Math.min(
          lowStockItems[item.Item_Name] || Infinity,
          item['Stock_Remaining (kg)']
        );
      }
    });

    return Object.entries(lowStockItems);
  };

  const lowStockAlerts = getLowStockAlerts();

  return (
    <div className="inventory-dashboard">
      

      <div className="charts-grid">
        <div className="chart-container full-width">
          <h3>Stock Levels Over Time</h3>
          <Line data={getStockTrendData()} options={{
            responsive: true,
            plugins: { legend: { position: 'top' } },
            scales: { y: { beginAtZero: true } }
          }} />
        </div>

        <div className="chart-container">
          <h3>Quantity Dispensed vs Remaining Quota</h3>
          <Bar data={getQuantityVsQuotaData()} options={{
            responsive: true,
            interaction: { mode: 'index', intersect: false },
            plugins: { legend: { position: 'top' } },
            scales: {
              y: { type: 'linear', display: true, position: 'left' },
              y1: { type: 'linear', display: true, position: 'right', grid: { drawOnChartArea: false } }
            }
          }} />
        </div>

        <div className="chart-container">
          <h3>Item-wise Stock Analysis</h3>
          <Bar data={getItemStockData()} options={{
            responsive: true,
            plugins: { legend: { position: 'top' } },
            scales: { y: { beginAtZero: true } }
          }} />
        </div>
      </div>
    </div>
  );
};

export default InventoryDashboard;