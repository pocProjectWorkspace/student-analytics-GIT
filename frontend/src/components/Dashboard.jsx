// components/Dashboard.jsx - Main dashboard view
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchGradeLevelData } from '../services/api';
import ClassriskHeatmap from './ClassriskHeatmap';
import StatsOverview from './StatsOverview';

function Dashboard() {
  const [gradeData, setGradeData] = useState(null);
  const [selectedGrade, setSelectedGrade] = useState('all');
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const data = await fetchGradeLevelData(selectedGrade);
        setGradeData(data);
      } catch (error) {
        console.error('Error loading grade data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [selectedGrade]);
  
  return (
    <div className="dashboard">
      <h1>Student Analytics Dashboard</h1>
      
      <div className="filters">
        <label htmlFor="grade-select">Select Grade Level:</label>
        <select 
          id="grade-select" 
          value={selectedGrade} 
          onChange={(e) => setSelectedGrade(e.target.value)}
        >
          <option value="all">All Grades</option>
          <option value="9">Grade 9</option>
          <option value="10">Grade 10</option>
          <option value="11">Grade 11</option>
          <option value="12">Grade 12</option>
        </select>
      </div>
      
      {loading ? (
        <div className="loading">Loading data...</div>
      ) : (
        <>
          <StatsOverview data={gradeData.summary} />
          
          <div className="dashboard-grid">
            <div className="dashboard-card">
              <h2>Class Risk Heatmap</h2>
              <ClassriskHeatmap data={gradeData.riskData} />
            </div>
            
            <div className="dashboard-card">
              <h2>Students Requiring Attention</h2>
              <div className="student-list">
                {gradeData.atRiskStudents.map(student => (
                  <Link 
                    to={`/student/${student.id}`} 
                    className="student-card" 
                    key={student.id}
                  >
                    <h3>{student.name}</h3>
                    <div className="risk-indicators">
                      {student.riskAreas.map(area => (
                        <span 
                          className={`risk-tag ${area.level}`} 
                          key={area.type}
                        >
                          {area.type}
                        </span>
                      ))}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default Dashboard;
