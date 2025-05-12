// components/StudentProfile.jsx - Individual student view
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { fetchStudentData, downloadStudentReport } from '../services/api';
import RadarChart from './RadarChart';
import AcademicPerformance from './AcademicPerformance';
import InterventionsList from './InterventionsList';

function StudentProfile() {
  const { studentId } = useParams();
  const [studentData, setStudentData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const loadStudentData = async () => {
      setLoading(true);
      try {
        const data = await fetchStudentData(studentId);
        setStudentData(data);
      } catch (error) {
        console.error('Error loading student data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadStudentData();
  }, [studentId]);
  
  const handleDownloadReport = async () => {
    try {
      await downloadStudentReport(studentId);
    } catch (error) {
      console.error('Error downloading report:', error);
    }
  };
  
  if (loading) {
    return <div className="loading">Loading student data...</div>;
  }
  
  return (
    <div className="student-profile">
      <div className="profile-header">
        <div>
          <h1>{studentData.name}</h1>
          <p>Grade {studentData.grade} | ID: {studentData.id}</p>
        </div>
        <button 
          className="download-report-btn" 
          onClick={handleDownloadReport}
        >
          Download Full Report
        </button>
      </div>
      
      <div className="profile-grid">
        <div className="profile-card">
          <h2>PASS Profile</h2>
          <RadarChart data={studentData.passData} />
          <div className="risk-summary">
            <h3>Risk Areas:</h3>
            <ul>
              {studentData.passData.riskAreas.map(area => (
                <li key={area.factor}>
                  <span className={`risk-indicator ${area.level}`}></span>
                  {area.factor}: {area.percentile}%
                </li>
              ))}
            </ul>
          </div>
        </div>
        
        <div className="profile-card">
          <h2>CAT4 Cognitive Profile</h2>
          <div className="cat4-grid">
            {studentData.cat4Data.domains.map(domain => (
              <div className="cat4-domain" key={domain.name}>
                <h3>{domain.name}</h3>
                <div className={`cat4-score ${domain.level}`}>
                  {domain.stanine}
                </div>
                <p>{domain.description}</p>
              </div>
            ))}
          </div>
          {studentData.cat4Data.isFragileLearner && (
            <div className="fragile-learner-alert">
              Fragile Learner: Requires cognitive support
            </div>
          )}
        </div>
        
        <div className="profile-card full-width">
          <h2>Academic Performance</h2>
          <AcademicPerformance data={studentData.academicData} />
        </div>
        
        <div className="profile-card full-width">
          <h2>Recommended Interventions</h2>
          <InterventionsList interventions={studentData.interventions} />
        </div>
      </div>
    </div>
  );
}

export default StudentProfile;