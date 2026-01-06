import React, { useState, useEffect } from 'react';
import { Line, Bar, Pie, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import Papa from 'papaparse';
import OverviewDashboard from './OverviewDashboard';
import TransactionAnalytics from './TransactionAnalytics';
import InventoryAnalytics from './InventoryDashboard';
import PerformanceDashboard from './PerformanceDashboard';

import './Analytics.css';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const Analytics = () => {
  const [adminView, setAdminView] = useState("monitoring");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');
  const [selectedView, setSelectedView] = useState('overview');
  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setLoading(true);
    // Load CSV data
    fetch('/data/Dispenzo_2.0_Variation_Dataset.csv')
      .then(response => response.text())
      .then(csv => {
        Papa.parse(csv, {
          header: true,
          complete: (result) => {
            const formattedData = result.data
              .filter(row => row.Transaction_ID)
              .map(row => ({
                ...row,
                Date: new Date(row.Date),
                'Quantity_Dispensed (kg)': parseFloat(row['Quantity_Dispensed (kg)']) || 0,
                'Authorized_Quota (kg)': parseFloat(row['Authorized_Quota (kg)']) || 0,
                'Remaining_Quota (kg)': parseFloat(row['Remaining_Quota (kg)']) || 0,
                'Stock_Remaining (kg)': parseFloat(row['Stock_Remaining (kg)']) || 0,
                'Temperature (°C)': parseFloat(row['Temperature (°C)']) || 0,
                'Humidity (%)': parseFloat(row['Humidity (%)']) || 0,
                'Power_Consumption (W)': parseFloat(row['Power_Consumption (W)']) || 0,
                'Dispense_Time (s)': parseFloat(row['Dispense_Time (s)']) || 0
              }));
            setData(formattedData);
            setLoading(false);
          },
          error: (error) => {
            console.error('Error parsing CSV:', error);
            setLoading(false);
          }
        });
      })
      .catch(error => {
        console.error('Error loading CSV:', error);
        setLoading(false);
      });
  };

  const handleBackClick = () => {
    // Refresh the page
    window.location.reload();
  };

  const renderView = () => {
    switch (selectedView) {
      case 'overview':
        return <OverviewDashboard data={data} timeRange={timeRange} />;
      case 'transactions':
        return <TransactionAnalytics data={data} timeRange={timeRange} />;
      case 'inventory':
        return <InventoryAnalytics data={data} timeRange={timeRange} />;
      case 'performance':
        return <PerformanceDashboard data={data} timeRange={timeRange} />;
      default:
        return <OverviewDashboard data={data} timeRange={timeRange} />;
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading analytics data...</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="error-container">
        <h2>No Data Available</h2>
        <p>Please check if the CSV file is properly placed in the public/data folder.</p>
      </div>
    );
  }

  return (
    <div className={`analytics-container ${isDarkMode ? 'dark-mode' : 'light-mode'}`}>
      {/* Theme Toggle Button */}
     

      <div className="analytics-header">
        <h1>DISPENZO 2.0 Analytics</h1>
        
        <div className="controls">
          <div className="view-selector">
            <button 
              className={selectedView === 'overview' ? 'active' : ''}
              onClick={() => setSelectedView('overview')}
            >
              Overview
            </button>
            <button 
              className={selectedView === 'transactions' ? 'active' : ''}
              onClick={() => setSelectedView('transactions')}
            >
              Transactions
            </button>
            <button 
              className={selectedView === 'inventory' ? 'active' : ''}
              onClick={() => setSelectedView('inventory')}
            >
              Inventory
            </button>
            <button 
              className={selectedView === 'performance' ? 'active' : ''}
              onClick={() => setSelectedView('performance')}
            >
              Performance
            </button>

            <button 
              className="analytics-close" 
              onClick={handleBackClick}
              title="Refresh and go back"
            >
              🔄 BACK
            </button>
          </div>
        </div>
      </div>

      {renderView()}
    </div>
  );
};

export default Analytics;