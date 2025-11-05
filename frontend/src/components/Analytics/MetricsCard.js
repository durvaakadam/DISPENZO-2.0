import React from 'react';

const MetricsCard = ({ title, value, icon, trend, color = 'blue' }) => {
  const getTrendColor = () => {
    if (trend.startsWith('+')) return 'green';
    if (trend.startsWith('-')) return 'red';
    return 'gray';
  };

  return (
    <div className={`metrics-card ${color}`}>
      <div className="card-header">
        <span className="card-icon">{icon}</span>
        <span className={`trend ${getTrendColor()}`}>{trend}</span>
      </div>
      <div className="card-content">
        <h3 className="card-title">{title}</h3>
        <p className="card-value">{value}</p>
      </div>
    </div>
  );
};

export default MetricsCard;