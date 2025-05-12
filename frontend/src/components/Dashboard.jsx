// components/Dashboard.jsx - Updated to use local data
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ClassriskHeatmap from './ClassriskHeatmap';
import StatsOverview from './StatsOverview';

function Dashboard() {
  const [gradeData, setGradeData] = useState(null);
  const [selectedGrade, setSelectedGrade] = useState('all');
  const [loading, setLoading] = useState(true);
  const [availableGrades, setAvailableGrades] = useState([]);
  const navigate = useNavigate();
  
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Try to get data from localStorage
        const storedData = localStorage.getItem('studentData');
        if (!storedData) {
          // Redirect to upload page if no data is available
          navigate('/upload');
          return;
        }
        
        const allStudents = JSON.parse(storedData);
        
        // Get all available grades
        const grades = [...new Set(allStudents.map(student => student.grade))].filter(Boolean);
        setAvailableGrades(grades);
        
        // Filter students by selected grade
        const filteredStudents = selectedGrade === 'all' 
          ? allStudents 
          : allStudents.filter(student => student.grade === selectedGrade);
        
        // Process the data for dashboard display
        const processedData = processGradeData(filteredStudents);
        setGradeData(processedData);
      } catch (error) {
        console.error('Error loading grade data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [selectedGrade, navigate]);
  
  const processGradeData = (students) => {
    // Extract summary statistics
    const totalStudents = students.length;
    
    // Count at-risk students (CAT4 weakness or academic underperformance)
    const atRiskCount = students.filter(student => {
      // Check if student has any CAT4 weaknesses
      const hasCat4Weakness = student.cat4Data?.domains?.some(
        domain => domain.level === 'weakness'
      ) || false;
      
      // Check if student is underperforming in any subject
      const isUnderperforming = Object.values(student.academicData?.subjects || {}).some(
        subject => subject.comparison?.includes('Below Expected')
      );
      
      return hasCat4Weakness || isUnderperforming;
    }).length;
    
    // Count fragile learners
    const fragileLearnersCount = students.filter(
      student => student.cat4Data?.isFragileLearner
    ).length;
    
    // Count students with academic concerns
    const academicConcernsCount = students.filter(student => 
      Object.values(student.academicData?.subjects || {}).some(
        subject => subject.level === 'weakness'
      )
    ).length;
    
    // Create risk data for heatmap
    const riskData = students.map(student => {
      // Count risk areas
      const cat4RiskCount = student.cat4Data?.domains?.filter(
        domain => domain.level === 'weakness'
      ).length || 0;
      
      const academicRiskCount = Object.values(student.academicData?.subjects || {}).filter(
        subject => subject.level === 'weakness' || subject.comparison?.includes('Below Expected')
      ).length;
      
      const isFragileLearner = student.cat4Data?.isFragileLearner ? 1 : 0;
      
      const totalRiskCount = cat4RiskCount + academicRiskCount + isFragileLearner;
      
      return {
        id: student.student_id,
        name: student.name,
        section: student.section || 'Unassigned',
        riskCount: totalRiskCount
      };
    });
    
    // Create at-risk students list (filtered and sorted)
    const atRiskStudents = students
      .filter(student => {
        // Count risk areas
        const cat4RiskCount = student.cat4Data?.domains?.filter(
          domain => domain.level === 'weakness'
        ).length || 0;
        
        const academicRiskCount = Object.values(student.academicData?.subjects || {}).filter(
          subject => subject.level === 'weakness' || subject.comparison?.includes('Below Expected')
        ).length;
        
        const isFragileLearner = student.cat4Data?.isFragileLearner ? 1 : 0;
        
        const totalRiskCount = cat4RiskCount + academicRiskCount + isFragileLearner;
        
        return totalRiskCount > 0;
      })
      .map(student => {
        // Create risk areas list
        const riskAreas = [];
        
        // Add CAT4 weaknesses
        student.cat4Data?.domains?.forEach(domain => {
          if (domain.level === 'weakness') {
            riskAreas.push({
              type: domain.name,
              level: 'weakness'
            });
          }
        });
        
        // Add fragile learner if applicable
        if (student.cat4Data?.isFragileLearner) {
          riskAreas.push({
            type: 'Fragile Learner',
            level: 'high'
          });
        }
        
        // Add academic concerns
        Object.entries(student.academicData?.subjects || {}).forEach(([subject, data]) => {
          if (data.level === 'weakness' || data.comparison?.includes('Below Expected')) {
            riskAreas.push({
              type: `${subject} ${data.comparison?.includes('Below Expected') ? '(Below Expected)' : ''}`,
              level: 'at-risk'
            });
          }
        });
        
        return {
          id: student.student_id,
          name: student.name,
          risk_count: riskAreas.length,
          riskAreas: riskAreas,
          intervention_count: student.interventions?.length || 0
        };
      })
      .sort((a, b) => b.risk_count - a.risk_count);
    
    return {
      summary: {
        total_students: totalStudents,
        at_risk_count: atRiskCount,
        fragile_learners_count: fragileLearnersCount,
        academic_concerns_count: academicConcernsCount
      },
      riskData: riskData,
      atRiskStudents: atRiskStudents
    };
  };
  
  return (
    <div className="dashboard">
      <h1>Student Analytics Dashboard</h1>
      
      <div className="filters">
        <label htmlFor="grade-select">Grade Level:</label>
        <select 
          id="grade-select" 
          value={selectedGrade} 
          onChange={(e) => setSelectedGrade(e.target.value)}
        >
          <option value="all">All Grades</option>
          {availableGrades.map(grade => (
            <option key={grade} value={grade}>Grade {grade}</option>
          ))}
        </select>
      </div>
      
      {loading ? (
        <div className="loading">Loading data...</div>
      ) : !gradeData ? (
        <div className="no-data">
          <p>No student data available. Please upload data first.</p>
          <Link to="/upload" className="upload-link">Upload Data</Link>
        </div>
      ) : (
        <>
          <StatsOverview data={gradeData.summary} />
          
          <div className="dashboard-grid">
            <div className="dashboard-card">
              <h2>Class Risk Heatmap</h2>
              {gradeData.riskData.length > 0 ? (
                <ClassriskHeatmap data={gradeData.riskData} />
              ) : (
                <div className="no-data">No risk data available</div>
              )}
            </div>
            
            <div className="dashboard-card">
              <h2>Students Requiring Attention</h2>
              {gradeData.atRiskStudents.length > 0 ? (
                <div className="student-list">
                  {gradeData.atRiskStudents.map(student => (
                    <Link 
                      to={`/student/${student.id}`} 
                      className="student-card" 
                      key={student.id}
                    >
                      <h3>{student.name}</h3>
                      <div className="risk-indicators">
                        {student.riskAreas.map((area, index) => (
                          <span 
                            className={`risk-tag ${area.level}`} 
                            key={`${area.type}-${index}`}
                          >
                            {area.type}
                          </span>
                        ))}
                      </div>
                      <div className="intervention-count">
                        {student.intervention_count} intervention{student.intervention_count !== 1 ? 's' : ''}
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="no-data">No students requiring attention</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default Dashboard;