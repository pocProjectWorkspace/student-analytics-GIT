// frontend/src/components/StatsOverview.jsx
import React from 'react';

function StatsOverview({ data }) {
  if (!data) return null;
  
  return (
    <div className="stats-overview">
      <div className="stat-card">
        <h3>Total Students</h3>
        <div className="stat-value">{data.total_students || 0}</div>
      </div>
      
      <div className="stat-card">
        <h3>At Risk Students</h3>
        <div className="stat-value">{data.at_risk_count || 0}</div>
      </div>
      
      <div className="stat-card">
        <h3>Fragile Learners</h3>
        <div className="stat-value">{data.fragile_learners_count || 0}</div>
      </div>
      
      <div className="stat-card">
        <h3>Academic Concerns</h3>
        <div className="stat-value">{data.academic_concerns_count || 0}</div>
      </div>
    </div>
  );
}

export default StatsOverview;