// frontend/src/components/InterventionsList.jsx
import React from 'react';

function InterventionsList({ interventions }) {
  if (!interventions || interventions.length === 0) {
    return <div className="no-data">No interventions recommended at this time.</div>;
  }
  
  return (
    <div className="interventions-list">
      {interventions.map((intervention, index) => (
        <div key={index} className={`intervention-card priority-${intervention.priority}`}>
          <h3>{intervention.title}</h3>
          <div className="intervention-meta">
            <span className="domain">{intervention.domain}</span>
            <span className="factor">{intervention.factor}</span>
            <span className={`priority ${intervention.priority}`}>
              Priority: {intervention.priority}
            </span>
          </div>
          <p className="description">{intervention.description}</p>
        </div>
      ))}
    </div>
  );
}

export default InterventionsList;