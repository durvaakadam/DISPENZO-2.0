import React from 'react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import MetricsCard from './MetricsCard';

const OverviewDashboard = ({ data, timeRange }) => {
  // Calculate key metrics
  const totalTransactions = data.length;
  const successfulTransactions = data.filter(item => item.Transaction_Status === 'Completed').length;
  const successRate = ((successfulTransactions / totalTransactions) * 100).toFixed(1);
  const totalDispensed = data.reduce((sum, item) => sum + (item['Quantity_Dispensed (kg)'] || 0), 0);
  const avgPowerConsumption = (data.reduce((sum, item) => sum + (item['Power_Consumption (W)'] || 0), 0) / data.length).toFixed(1);

  // Transaction success rate over time
  const getTransactionTrendData = () => {
    const groupedData = {};
    data.forEach(item => {
      const dateKey = item.Date.toLocaleDateString();
      if (!groupedData[dateKey]) {
        groupedData[dateKey] = { total: 0, successful: 0 };
      }
      groupedData[dateKey].total++;
      if (item.Transaction_Status === 'Completed') {
        groupedData[dateKey].successful++;
      }
    });

    const labels = Object.keys(groupedData).sort();
    const successRates = labels.map(date => 
      (groupedData[date].successful / groupedData[date].total * 100).toFixed(1)
    );

    return {
      labels,
      datasets: [{
        label: 'Success Rate (%)',
        data: successRates,
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.1,
      }]
    };
  };

  // Item distribution
  const getItemDistributionData = () => {
    const itemCounts = {};
    data.forEach(item => {
      if (item.Transaction_Status === 'Completed') {
        itemCounts[item.Item_Name] = (itemCounts[item.Item_Name] || 0) + 1;
      }
    });

    return {
      labels: Object.keys(itemCounts),
      datasets: [{
        data: Object.values(itemCounts),
        backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56'],
        hoverBackgroundColor: ['#FF6384', '#36A2EB', '#FFCE56']
      }]
    };
  };

  return (
    <div className="overview-dashboard">
      <div className="metrics-grid">
        <MetricsCard 
          title="Total Transactions" 
          value={totalTransactions} 
          icon="📊"
          trend="+12%"
        />
        <MetricsCard 
          title="Success Rate" 
          value={`${successRate}%`} 
          icon="✅"
          trend="+5%"
        />
        <MetricsCard 
          title="Total Dispensed" 
          value={`${totalDispensed.toFixed(1)} kg`} 
          icon="📦"
          trend="+8%"
        />
        <MetricsCard 
          title="Avg Power Consumption" 
          value={`${avgPowerConsumption} W`} 
          icon="⚡"
          trend="-3%"
        />
      </div>

      <div className="charts-grid">
        <div className="chart-container">
          <h3>Transaction Success Rate Trend</h3>
          <Line data={getTransactionTrendData()} options={{
            responsive: true,
            plugins: {
              legend: { position: 'top' }
            },
            scales: {
              y: { beginAtZero: true, max: 100 }
            }
          }} />
        </div>

        <div className="chart-container">
          <h3>Item Distribution</h3>
          <Doughnut data={getItemDistributionData()} options={{
            responsive: true,
            plugins: {
              legend: { position: 'right' }
            }
          }} />
        </div>
      </div>
    </div>
  );
};

export default OverviewDashboard;