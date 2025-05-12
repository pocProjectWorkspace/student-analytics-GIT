// components/StudentProfile.jsx - Updated to include the new chart components
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { fetchStudentData, downloadStudentReport } from '../services/api';
import RadarChart from './charts/RadarChart';
import AcademicChart from './charts/AcademicChart';
import CognitiveBarChart from './charts/CognitiveBarChart';
import InterventionsList from './InterventionsList';

function StudentProfile() {
  const { studentId } = useParams();
  const [studentData, setStudentData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const loadStudentData = async () => {
      setLoading(true);
      try {
        // First try to get data from API
        const data = await fetchStudentData(studentId);
        setStudentData(data);
      } catch (error) {
        console.error('Error loading student data from API:', error);
        
        // Fallback to localStorage if API fails
        try {
          const localData = localStorage.getItem('studentData');
          if (localData) {
            const parsedData = JSON.parse(localData);
            const student = parsedData.find(s => s.student_id === studentId);
            if (student) {
              setStudentData(student);
            } else {
              console.error('Student not found in local data');
            }
          }
        } catch (localError) {
          console.error('Error loading from localStorage:', localError);
        }
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
      alert('Error downloading report. Please try again later.');
    }
  };
  
  if (loading) {
    return <div className="loading">Loading student data...</div>;
  }
  
  if (!studentData) {
    return <div className="error-message">Student data not found. Please check the student ID or try uploading data again.</div>;
  }
  
  return (
    <div className="student-profile">
      <div className="profile-header">
        <div>
          <h1>{studentData.name}</h1>
          <p>Grade {studentData.grade} {studentData.section && `| Section ${studentData.section}`} | ID: {studentData.student_id}</p>
        </div>
        <button 
          className="download-report-btn" 
          onClick={handleDownloadReport}
        >
          Download Full Report
        </button>
      </div>
      
      <div className="profile-grid">
        {studentData.passData && studentData.passData.factors && studentData.passData.factors.length > 0 && (
          <div className="profile-card">
            <h2>PASS Profile</h2>
            <RadarChart data={studentData.passData} />
            {studentData.passData.riskAreas && studentData.passData.riskAreas.length > 0 && (
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
            )}
          </div>
        )}
        
        {studentData.cat4Data && studentData.cat4Data.domains && (
          <div className="profile-card">
            <h2>CAT4 Cognitive Profile</h2>
            <CognitiveBarChart data={studentData.cat4Data} />
            {studentData.cat4Data.isFragileLearner && (
              <div className="fragile-learner-alert">
                Fragile Learner: Requires cognitive support
              </div>
            )}
          </div>
        )}
        
        <div className="profile-card full-width">
          <h2>Academic Performance</h2>
          <AcademicChart data={studentData.academicData} />
          <div className="comparison-summary">
            <h3>Performance vs. Cognitive Potential</h3>
            <ul className="comparison-list">
              {Object.entries(studentData.academicData.subjects || {}).map(([subject, data]) => (
                <li key={subject} className={`comparison-item ${data.comparison?.includes('Below') ? 'underperforming' : data.comparison?.includes('Better') ? 'overperforming' : 'meets-expectation'}`}>
                  <span className="subject-name">{subject}:</span> {data.comparison || 'Not Available'}
                </li>
              ))}
            </ul>
          </div>
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