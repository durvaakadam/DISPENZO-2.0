import React from 'react';

const MetricsCard = ({ title, value, icon, trend, color = 'blue' }) => {
  const getTrendColor = (trend) => {
  if (!trend) return "neutral";   // ✅ FIX
  if (trend.startsWith("+")) return "positive";
  if (trend.startsWith("-")) return "negative";
  return "neutral";
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