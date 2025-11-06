import React from 'react';
import { Bar, Line, Pie } from 'react-chartjs-2';

const TransactionAnalytics = ({ data, timeRange }) => {
  // Hourly transaction volume
  const getHourlyTransactionData = () => {
    const hourlyData = new Array(24).fill(0);
    data.forEach(item => {
      const hour = new Date(`2000-01-01 ${item.Time}`).getHours();
      hourlyData[hour]++;
    });

    return {
      labels: Array.from({length: 24}, (_, i) => `${i}:00`),
      datasets: [{
        label: 'Transactions',
        data: hourlyData,
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1
      }]
    };
  };

  // Authentication method distribution
  const getAuthMethodData = () => {
    const authCounts = {};
    data.forEach(item => {
      authCounts[item.Authentication_Method] = (authCounts[item.Authentication_Method] || 0) + 1;
    });

    return {
      labels: Object.keys(authCounts),
      datasets: [{
        data: Object.values(authCounts),
        backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56'],
      }]
    };
  };

  // Error analysis
  const getErrorAnalysisData = () => {
    const errorCounts = {};
    data.forEach(item => {
      if (item.Error_Code !== 'ERR_NONE') {
        errorCounts[item.Error_Code] = (errorCounts[item.Error_Code] || 0) + 1;
      }
    });

    return {
      labels: Object.keys(errorCounts),
      datasets: [{
        label: 'Error Count',
        data: Object.values(errorCounts),
        backgroundColor: 'rgba(255, 99, 132, 0.6)',
        borderColor: 'rgba(255, 99, 132, 1)',
        borderWidth: 1
      }]
    };
  };

  // Center-wise performance
  const getCenterPerformanceData = () => {
    const centerData = {};
    data.forEach(item => {
      if (!centerData[item.Center_ID]) {
        centerData[item.Center_ID] = { total: 0, successful: 0 };
      }
      centerData[item.Center_ID].total++;
      if (item.Transaction_Status === 'Completed') {
        centerData[item.Center_ID].successful++;
      }
    });

    const labels = Object.keys(centerData);
    const successRates = labels.map(center => 
      (centerData[center].successful / centerData[center].total * 100).toFixed(1)
    );

    return {
      labels,
      datasets: [{
        label: 'Success Rate (%)',
        data: successRates,
        backgroundColor: ['rgba(255, 99, 132, 0.6)', 'rgba(54, 162, 235, 0.6)', 'rgba(255, 205, 86, 0.6)'],
        borderColor: ['rgba(255, 99, 132, 1)', 'rgba(54, 162, 235, 1)', 'rgba(255, 205, 86, 1)'],
        borderWidth: 1
      }]
    };
  };

  return (
    <div className="transaction-analytics">
      <div className="charts-grid">
        <div className="chart-container">
          <h3>Hourly Transaction Volume</h3>
          <Bar data={getHourlyTransactionData()} options={{
            responsive: true,
            plugins: { legend: { position: 'top' } },
            scales: { y: { beginAtZero: true } }
          }} />
        </div>

        

        <div className="chart-container">
          <h3>Error Analysis</h3>
          <Bar data={getErrorAnalysisData()} options={{
            responsive: true,
            plugins: { legend: { position: 'top' } },
            scales: { y: { beginAtZero: true } }
          }} />
        </div>

        <div className="chart-container">
          <h3>Center Performance</h3>
          <Bar data={getCenterPerformanceData()} options={{
            responsive: true,
            plugins: { legend: { position: 'top' } },
            scales: { y: { beginAtZero: true, max: 100 } }
          }} />
        </div>
      </div>
    </div>
  );
};

export default TransactionAnalytics;