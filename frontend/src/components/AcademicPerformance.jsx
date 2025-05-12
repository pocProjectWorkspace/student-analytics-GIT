// frontend/src/components/AcademicPerformance.jsx
import React from 'react';

function AcademicPerformance({ data }) {
  if (!data || !data.subjects || Object.keys(data.subjects).length === 0) {
    return <div className="no-data">No academic data available.</div>;
  }
  
  return (
    <div className="academic-performance">
      <p>Academic Performance Chart Placeholder</p>
      <p>In the complete implementation, this would display academic performance charts and tables.</p>
    </div>
  );
}

export default AcademicPerformance;