// frontend/src/components/ClassriskHeatmap.jsx
import React from 'react';

function ClassriskHeatmap({ data }) {
  if (!data || data.length === 0) {
    return <div className="no-data">No student data available.</div>;
  }
  
  // Group students by section
  const sectionGroups = data.reduce((groups, student) => {
    const section = student.section || 'Unknown';
    if (!groups[section]) {
      groups[section] = [];
    }
    groups[section].push(student);
    return groups;
  }, {});
  
  // Get color for risk level
  const getRiskColor = (riskCount) => {
    if (riskCount >= 5) return '#ef5350'; // High risk - red
    if (riskCount >= 3) return '#ff9800'; // Medium risk - orange
    if (riskCount >= 1) return '#ffee58'; // Low risk - yellow
    return '#a5d6a7'; // No risk - green
  };
  
  return (
    <div className="class-heatmap">
      {Object.keys(sectionGroups).map(section => (
        <div key={section} className="section-container">
          <h3>{section}</h3>
          <div className="heatmap-grid">
            {sectionGroups[section].map(student => (
              <div 
                key={student.id}
                className="student-cell"
                style={{ backgroundColor: getRiskColor(student.riskCount) }}
                title={`${student.name}: ${student.riskCount} risk areas`}
              >
                <span className="student-initials">
                  {student.name.split(' ').map(part => part[0]).join('')}
                </span>
                {student.riskCount > 0 && (
                  <span className="risk-count">{student.riskCount}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default ClassriskHeatmap;