// Enhanced Dashboard.jsx with cohort analysis functionality
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PredictiveAnalytics from '../utils/analytics/PredictiveAnalytics';

// Fix the imports for API services to match your implementation
import api from '../services/api';

// Define the functions that match the current usage in the component
const fetchStudentsData = async () => {
  return api.fetchStudents();
};

const fetchCohortStats = async () => {
  return api.fetchCohortStats();
};

function Dashboard() {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [cohortStats, setCohortStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentView, setCurrentView] = useState('students'); // students, cohorts, interventions
  const [filterOptions, setFilterOptions] = useState({
    grade: 'all',
    riskLevel: 'all',
    fragileStatus: 'all',
    passRisk: 'all',
    cat4Risk: 'all',
    academicRisk: 'all'
  });
  const [sortOption, setSortOption] = useState('risk-desc'); // risk-desc, name-asc, grade-asc
  const [selectedCohortFilter, setSelectedCohortFilter] = useState('grade');
  const [selectedSecondaryFilter, setSelectedSecondaryFilter] = useState('riskLevel');
  
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Load students data
        const response = await fetchStudentsData();
        const studentsData = response.students || [];
        
        // Calculate risk factors for each student
        const predictiveAnalytics = new PredictiveAnalytics();
        
        // Add risk predictions to each student
        const enrichedStudentsData = studentsData.map(student => {
          // First try to get historical data from localStorage
          let historicalData = [];
          try {
            const storedHistory = localStorage.getItem(`history_${student.student_id}`);
            if (storedHistory) {
              historicalData = JSON.parse(storedHistory);
            }
          } catch (e) {
            console.error('Error loading historical data:', e);
          }
          
          // Calculate risk using predictive analytics
          const riskPrediction = predictiveAnalytics.predictRisk(student, historicalData);
          
          return {
            ...student,
            riskPrediction
          };
        });
        
        setStudents(enrichedStudentsData);
        
        // Load cohort statistics
        const stats = await fetchCohortStats();
        setCohortStats(stats?.stats || stats);
      } catch (err) {
        console.error('Error loading dashboard data:', err);
        setError('Failed to load data. Please try again.');
        
        // Try to load data from localStorage as fallback
        try {
          const storedData = localStorage.getItem('studentData');
          if (storedData) {
            const parsedData = JSON.parse(storedData);
            
            // Calculate risk for each student
            const predictiveAnalytics = new PredictiveAnalytics();
            const enrichedData = parsedData.map(student => {
              let historicalData = [];
              try {
                const storedHistory = localStorage.getItem(`history_${student.student_id}`);
                if (storedHistory) {
                  historicalData = JSON.parse(storedHistory);
                }
              } catch (e) {
                console.error('Error loading historical data:', e);
              }
              
              const riskPrediction = predictiveAnalytics.predictRisk(student, historicalData);
              
              return {
                ...student,
                riskPrediction
              };
            });
            
            setStudents(enrichedData);
            
            // Generate basic cohort stats
            const basicStats = generateCohortStats(enrichedData);
            setCohortStats(basicStats);
          }
        } catch (localError) {
          console.error('Error loading from localStorage:', localError);
        }
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);
  
  // Filter students based on selected options
  const filteredStudents = students.filter(student => {
    // Filter by grade
    if (filterOptions.grade !== 'all' && student.grade !== parseInt(filterOptions.grade)) {
      return false;
    }
    
    // Filter by risk level
    if (filterOptions.riskLevel !== 'all' && 
        student.riskPrediction && 
        student.riskPrediction.risk_level !== filterOptions.riskLevel) {
      return false;
    }
    
    // Filter by fragile learner status
    const isFragileLearner = student.is_fragile_learner || 
      (student.cat4_analysis && 
       student.cat4_analysis.available && 
       student.cat4_analysis.is_fragile_learner);
       
    if (filterOptions.fragileStatus !== 'all') {
      if (filterOptions.fragileStatus === 'fragile' && !isFragileLearner) {
        return false;
      }
      if (filterOptions.fragileStatus === 'non-fragile' && isFragileLearner) {
        return false;
      }
    }
    
    // Filter by PASS risk areas
    if (filterOptions.passRisk !== 'all') {
      if (filterOptions.passRisk === 'at-risk' && 
          (!student.pass_analysis || 
           !student.pass_analysis.available || 
           !student.pass_analysis.riskAreas || 
           student.pass_analysis.riskAreas.length === 0)) {
        return false;
      }
      if (filterOptions.passRisk === 'no-risk' && 
          student.pass_analysis && 
          student.pass_analysis.available && 
          student.pass_analysis.riskAreas && 
          student.pass_analysis.riskAreas.length > 0) {
        return false;
      }
    }
    
    // Filter by CAT4 weaknesses
    if (filterOptions.cat4Risk !== 'all') {
      if (filterOptions.cat4Risk === 'at-risk' && 
          (!student.cat4_analysis || 
           !student.cat4_analysis.available || 
           !student.cat4_analysis.weaknessAreas || 
           student.cat4_analysis.weaknessAreas.length === 0)) {
        return false;
      }
      if (filterOptions.cat4Risk === 'no-risk' && 
          student.cat4_analysis && 
          student.cat4_analysis.available && 
          student.cat4_analysis.weaknessAreas && 
          student.cat4_analysis.weaknessAreas.length > 0) {
        return false;
      }
    }
    
    // Filter by academic weaknesses
    if (filterOptions.academicRisk !== 'all') {
      if (filterOptions.academicRisk === 'at-risk' && 
          (!student.academic_analysis || 
           !student.academic_analysis.available || 
           !student.academic_analysis.subjects || 
           student.academic_analysis.subjects.filter(s => s.level === 'weakness').length === 0)) {
        return false;
      }
      if (filterOptions.academicRisk === 'no-risk' && 
          student.academic_analysis && 
          student.academic_analysis.available && 
          student.academic_analysis.subjects && 
          student.academic_analysis.subjects.filter(s => s.level === 'weakness').length > 0) {
        return false;
      }
    }
    
    return true;
  });
  
  // Sort students based on selected option
  const sortedStudents = [...filteredStudents].sort((a, b) => {
    switch (sortOption) {
      case 'risk-desc':
        const aRiskScore = a.riskPrediction ? a.riskPrediction.overall_risk_score : 0;
        const bRiskScore = b.riskPrediction ? b.riskPrediction.overall_risk_score : 0;
        return bRiskScore - aRiskScore;
      case 'name-asc':
        return a.name.localeCompare(b.name);
      case 'grade-asc':
        return a.grade - b.grade || a.name.localeCompare(b.name);
      default:
        return 0;
    }
  });
  
  const handleStudentClick = (studentId) => {
    navigate(`/student/${studentId}`);
  };
  
  const handleFilterChange = (filterName, value) => {
    setFilterOptions({
      ...filterOptions,
      [filterName]: value
    });
  };
  
  const handleSortChange = (option) => {
    setSortOption(option);
  };
  
  const handleViewChange = (view) => {
    setCurrentView(view);
  };
  
  // Generate basic cohort statistics from student data
  const generateCohortStats = (studentsData) => {
    if (!studentsData || studentsData.length === 0) {
      return null;
    }
    
    const stats = {
      totalStudents: studentsData.length,
      grades: {},
      riskLevels: {
        high: 0,
        medium: 0,
        borderline: 0,
        low: 0
      },
      fragileLearnersCount: 0,
      passRiskFactors: {},
      cat4WeaknessAreas: {},
      academicWeaknesses: {},
      interventionsByDomain: {
        emotional: 0,
        behavioral: 0,
        cognitive: 0,
        academic: 0,
        holistic: 0,
        integrated: 0
      }
    };
    
    // Calculate counts for each statistic
    studentsData.forEach(student => {
      // Grade counts
      if (stats.grades[student.grade]) {
        stats.grades[student.grade]++;
      } else {
        stats.grades[student.grade] = 1;
      }
      
      // Risk level counts
      if (student.riskPrediction && student.riskPrediction.risk_level) {
        stats.riskLevels[student.riskPrediction.risk_level]++;
      }
      
      // Fragile learner count
      const isFragileLearner = student.is_fragile_learner || 
        (student.cat4_analysis && 
         student.cat4_analysis.available && 
         student.cat4_analysis.is_fragile_learner);
         
      if (isFragileLearner) {
        stats.fragileLearnersCount++;
      }
      
      // PASS risk factors
      if (student.pass_analysis && 
          student.pass_analysis.available && 
          student.pass_analysis.riskAreas) {
        student.pass_analysis.riskAreas.forEach(risk => {
          if (stats.passRiskFactors[risk.factor]) {
            stats.passRiskFactors[risk.factor]++;
          } else {
            stats.passRiskFactors[risk.factor] = 1;
          }
        });
      }
      
      // CAT4 weakness areas
      if (student.cat4_analysis && 
          student.cat4_analysis.available && 
          student.cat4_analysis.weaknessAreas) {
        student.cat4_analysis.weaknessAreas.forEach(weakness => {
          if (stats.cat4WeaknessAreas[weakness.domain]) {
            stats.cat4WeaknessAreas[weakness.domain]++;
          } else {
            stats.cat4WeaknessAreas[weakness.domain] = 1;
          }
        });
      }
      
      // Academic weaknesses
      if (student.academic_analysis && 
          student.academic_analysis.available && 
          student.academic_analysis.subjects) {
        student.academic_analysis.subjects
          .filter(subject => subject.level === 'weakness')
          .forEach(subject => {
            if (stats.academicWeaknesses[subject.name]) {
              stats.academicWeaknesses[subject.name]++;
            } else {
              stats.academicWeaknesses[subject.name] = 1;
            }
          });
      }
      
      // Intervention domain counts
      if (student.interventions && student.interventions.length > 0) {
        student.interventions.forEach(intervention => {
          if (stats.interventionsByDomain[intervention.domain]) {
            stats.interventionsByDomain[intervention.domain]++;
          }
        });
      }
    });
    
    return stats;
  };
  
  // Group students by selected cohort criteria
  const groupStudentsByCohort = () => {
    const cohorts = {};
    
    filteredStudents.forEach(student => {
      let cohortKey = 'Unknown';
      
      // Primary grouping
      switch (selectedCohortFilter) {
        case 'grade':
          cohortKey = `Grade ${student.grade}`;
          break;
        case 'riskLevel':
          cohortKey = student.riskPrediction ? 
            (student.riskPrediction.risk_level.charAt(0).toUpperCase() + student.riskPrediction.risk_level.slice(1)) : 
            'Unknown';
          break;
        case 'fragileStatus':
          const isFragileLearner = student.is_fragile_learner || 
            (student.cat4_analysis && 
             student.cat4_analysis.available && 
             student.cat4_analysis.is_fragile_learner);
          cohortKey = isFragileLearner ? 'Fragile Learner' : 'Non-Fragile Learner';
          break;
        case 'passRisk':
          cohortKey = (student.pass_analysis && 
                      student.pass_analysis.available && 
                      student.pass_analysis.riskAreas && 
                      student.pass_analysis.riskAreas.length > 0) ? 
                      'PASS Risk Factors' : 'No PASS Risk';
          break;
        case 'cat4Risk':
          cohortKey = (student.cat4_analysis && 
                      student.cat4_analysis.available && 
                      student.cat4_analysis.weaknessAreas && 
                      student.cat4_analysis.weaknessAreas.length > 0) ? 
                      'CAT4 Weaknesses' : 'No CAT4 Weakness';
          break;
        case 'academicRisk':
          cohortKey = (student.academic_analysis && 
                      student.academic_analysis.available && 
                      student.academic_analysis.subjects && 
                      student.academic_analysis.subjects.filter(s => s.level === 'weakness').length > 0) ? 
                      'Academic Weaknesses' : 'No Academic Weakness';
          break;
        default:
          cohortKey = 'All Students';
      }
      
      // Initialize cohort if it doesn't exist
      if (!cohorts[cohortKey]) {
        cohorts[cohortKey] = {
          students: [],
          subgroups: {}
        };
      }
      
      // Add student to the cohort
      cohorts[cohortKey].students.push(student);
      
      // Secondary grouping
      let secondaryKey = 'Unknown';
      
      switch (selectedSecondaryFilter) {
        case 'grade':
          secondaryKey = `Grade ${student.grade}`;
          break;
        case 'riskLevel':
          secondaryKey = student.riskPrediction ? 
            (student.riskPrediction.risk_level.charAt(0).toUpperCase() + student.riskPrediction.risk_level.slice(1)) : 
            'Unknown';
          break;
        case 'fragileStatus':
          const isFragileLearner = student.is_fragile_learner || 
            (student.cat4_analysis && 
             student.cat4_analysis.available && 
             student.cat4_analysis.is_fragile_learner);
          secondaryKey = isFragileLearner ? 'Fragile Learner' : 'Non-Fragile Learner';
          break;
        case 'passRisk':
          secondaryKey = (student.pass_analysis && 
                        student.pass_analysis.available && 
                        student.pass_analysis.riskAreas && 
                        student.pass_analysis.riskAreas.length > 0) ? 
                        'PASS Risk Factors' : 'No PASS Risk';
          break;
        case 'cat4Risk':
          secondaryKey = (student.cat4_analysis && 
                        student.cat4_analysis.available && 
                        student.cat4_analysis.weaknessAreas && 
                        student.cat4_analysis.weaknessAreas.length > 0) ? 
                        'CAT4 Weaknesses' : 'No CAT4 Weakness';
          break;
        case 'academicRisk':
          secondaryKey = (student.academic_analysis && 
                        student.academic_analysis.available && 
                        student.academic_analysis.subjects && 
                        student.academic_analysis.subjects.filter(s => s.level === 'weakness').length > 0) ? 
                        'Academic Weaknesses' : 'No Academic Weakness';
          break;
        default:
          secondaryKey = 'All Students';
      }
      
      // Skip secondary grouping if it's the same as primary
      if (selectedCohortFilter === selectedSecondaryFilter) {
        return;
      }
      
      // Initialize subgroup if it doesn't exist
      if (!cohorts[cohortKey].subgroups[secondaryKey]) {
        cohorts[cohortKey].subgroups[secondaryKey] = [];
      }
      
      // Add student to the subgroup
      cohorts[cohortKey].subgroups[secondaryKey].push(student);
    });
    
    return cohorts;
  };
  
  // Analyze intervention effectiveness across cohorts
  const analyzeInterventionEffectiveness = () => {
    const interventionStats = {
      byDomain: {},
      byRiskLevel: {},
      byFragileStatus: {}
    };
    
    // Initialize domains
    const domains = ['emotional', 'behavioral', 'cognitive', 'academic', 'holistic', 'integrated'];
    domains.forEach(domain => {
      interventionStats.byDomain[domain] = {
        totalCount: 0,
        effective: 0,
        partiallyEffective: 0,
        notEffective: 0,
        unknown: 0
      };
    });
    
    // Initialize risk levels
    const riskLevels = ['high', 'medium', 'borderline', 'low'];
    riskLevels.forEach(level => {
      interventionStats.byRiskLevel[level] = {
        totalCount: 0,
        effective: 0,
        partiallyEffective: 0,
        notEffective: 0,
        unknown: 0
      };
    });
    
    // Initialize fragile status
    interventionStats.byFragileStatus = {
      fragile: {
        totalCount: 0,
        effective: 0,
        partiallyEffective: 0,
        notEffective: 0,
        unknown: 0
      },
      nonFragile: {
        totalCount: 0,
        effective: 0,
        partiallyEffective: 0,
        notEffective: 0,
        unknown: 0
      }
    };
    
    // Analyze each student's intervention effectiveness
    filteredStudents.forEach(student => {
      // Skip if no interventions data
      if (!student.interventionEffectiveness) {
        return;
      }
      
      const isFragileLearner = student.is_fragile_learner || 
        (student.cat4_analysis && 
         student.cat4_analysis.available && 
         student.cat4_analysis.is_fragile_learner);
         
      const riskLevel = student.riskPrediction ? student.riskPrediction.risk_level : 'unknown';
      
      // Process each intervention
      Object.entries(student.interventionEffectiveness).forEach(([interventionName, data]) => {
        const domain = data.domain || 'unknown';
        const effectiveness = data.effectiveness || 'unknown';
        
        // Skip if domain is not recognized
        if (!interventionStats.byDomain[domain]) {
          return;
        }
        
        // Count by domain
        interventionStats.byDomain[domain].totalCount++;
        interventionStats.byDomain[domain][effectiveness]++;
        
        // Count by risk level
        if (interventionStats.byRiskLevel[riskLevel]) {
          interventionStats.byRiskLevel[riskLevel].totalCount++;
          interventionStats.byRiskLevel[riskLevel][effectiveness]++;
        }
        
        // Count by fragile status
        const statusKey = isFragileLearner ? 'fragile' : 'nonFragile';
        interventionStats.byFragileStatus[statusKey].totalCount++;
        interventionStats.byFragileStatus[statusKey][effectiveness]++;
      });
    });
    
    return interventionStats;
  };
  
  if (loading) {
    return <div className="loading">Loading dashboard data...</div>;
  }
  
  if (error) {
    return <div className="error-message">{error}</div>;
  }
  
  // Group students into cohorts
  const cohorts = groupStudentsByCohort();
  
  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Student Analytics Dashboard</h1>
        <div className="view-toggle">
          <button 
            className={`view-button ${currentView === 'students' ? 'active' : ''}`}
            onClick={() => handleViewChange('students')}
          >
            Student List
          </button>
          <button 
            className={`view-button ${currentView === 'cohorts' ? 'active' : ''}`}
            onClick={() => handleViewChange('cohorts')}
          >
            Cohort Analysis
          </button>
          <button 
            className={`view-button ${currentView === 'interventions' ? 'active' : ''}`}
            onClick={() => handleViewChange('interventions')}
          >
            Intervention Effectiveness
          </button>
        </div>
      </div>
      
      <div className="filter-bar">
        <div className="filter-group">
          <label htmlFor="grade-filter">Grade</label>
          <select 
            id="grade-filter" 
            value={filterOptions.grade}
            onChange={(e) => handleFilterChange('grade', e.target.value)}
          >
            <option value="all">All Grades</option>
            {cohortStats && cohortStats.grades && Object.keys(cohortStats.grades).sort().map(grade => (
              <option key={grade} value={grade}>Grade {grade}</option>
            ))}
          </select>
        </div>
        
        <div className="filter-group">
          <label htmlFor="risk-filter">Risk Level</label>
          <select 
            id="risk-filter" 
            value={filterOptions.riskLevel}
            onChange={(e) => handleFilterChange('riskLevel', e.target.value)}
          >
            <option value="all">All Risk Levels</option>
            <option value="high">High Risk</option>
            <option value="medium">Medium Risk</option>
            <option value="borderline">Borderline Risk</option>
            <option value="low">Low Risk</option>
          </select>
        </div>
        
        <div className="filter-group">
          <label htmlFor="fragile-filter">Fragile Learner</label>
          <select 
            id="fragile-filter" 
            value={filterOptions.fragileStatus}
            onChange={(e) => handleFilterChange('fragileStatus', e.target.value)}
          >
            <option value="all">All Students</option>
            <option value="fragile">Fragile Learners</option>
            <option value="non-fragile">Non-Fragile Learners</option>
          </select>
        </div>
        
        <div className="filter-group">
          <label htmlFor="pass-filter">PASS Risk</label>
          <select 
            id="pass-filter" 
            value={filterOptions.passRisk}
            onChange={(e) => handleFilterChange('passRisk', e.target.value)}
          >
            <option value="all">All Students</option>
            <option value="at-risk">With PASS Risk Factors</option>
            <option value="no-risk">No PASS Risk Factors</option>
          </select>
        </div>
        
        <div className="filter-group">
          <label htmlFor="cat4-filter">CAT4 Risk</label>
          <select 
            id="cat4-filter" 
            value={filterOptions.cat4Risk}
            onChange={(e) => handleFilterChange('cat4Risk', e.target.value)}
          >
            <option value="all">All Students</option>
            <option value="at-risk">With CAT4 Weaknesses</option>
            <option value="no-risk">No CAT4 Weaknesses</option>
          </select>
        </div>
        
        <div className="filter-group">
          <label htmlFor="academic-filter">Academic Risk</label>
          <select 
            id="academic-filter" 
            value={filterOptions.academicRisk}
            onChange={(e) => handleFilterChange('academicRisk', e.target.value)}
          >
            <option value="all">All Students</option>
            <option value="at-risk">With Academic Weaknesses</option>
            <option value="no-risk">No Academic Weaknesses</option>
          </select>
        </div>
        
        <div className="filter-group">
          <label htmlFor="sort-option">Sort By</label>
          <select 
            id="sort-option" 
            value={sortOption}
            onChange={(e) => handleSortChange(e.target.value)}
          >
            <option value="risk-desc">Highest Risk First</option>
            <option value="name-asc">Name (A-Z)</option>
            <option value="grade-asc">Grade (Ascending)</option>
          </select>
        </div>
      </div>
      
      <div className="dashboard-content">
        {/* Student List View */}
        {currentView === 'students' && (
          <div className="students-view">
            <div className="stats-summary">
              <div className="stat-card">
                <div className="stat-value">{filteredStudents.length}</div>
                <div className="stat-label">Students</div>
              </div>
              
              <div className="stat-card">
                <div className="stat-value">
                  {filteredStudents.filter(s => s.riskPrediction && s.riskPrediction.risk_level === 'high').length}
                </div>
                <div className="stat-label">High Risk</div>
              </div>
              
              <div className="stat-card">
                <div className="stat-value">
                  {filteredStudents.filter(s => 
                    s.is_fragile_learner || 
                    (s.cat4_analysis && s.cat4_analysis.available && s.cat4_analysis.is_fragile_learner)
                  ).length}
                </div>
                <div className="stat-label">Fragile Learners</div>
              </div>
              
              <div className="stat-card">
                <div className="stat-value">
                  {filteredStudents.filter(s => 
                    s.interventions && s.interventions.length > 0
                  ).length}
                </div>
                <div className="stat-label">Need Interventions</div>
              </div>
            </div>
            
            <div className="students-table">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Grade</th>
                    <th>Risk Level</th>
                    <th>Risk Score</th>
                    <th>Fragile Learner</th>
                    <th>PASS Risk Areas</th>
                    <th>CAT4 Weaknesses</th>
                    <th>Academic Issues</th>
                    <th>Interventions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedStudents.map(student => {
                    const isFragileLearner = student.is_fragile_learner || 
                      (student.cat4_analysis && 
                       student.cat4_analysis.available && 
                       student.cat4_analysis.is_fragile_learner);
                       
                    const passRiskCount = student.pass_analysis && 
                      student.pass_analysis.available && 
                      student.pass_analysis.riskAreas ? 
                      student.pass_analysis.riskAreas.length : 0;
                      
                    const cat4WeaknessCount = student.cat4_analysis && 
                      student.cat4_analysis.available && 
                      student.cat4_analysis.weaknessAreas ? 
                      student.cat4_analysis.weaknessAreas.length : 0;
                      
                    const academicWeaknessCount = student.academic_analysis && 
                      student.academic_analysis.available && 
                      student.academic_analysis.subjects ? 
                      student.academic_analysis.subjects.filter(s => s.level === 'weakness').length : 0;
                      
                    const interventionCount = student.interventions ? student.interventions.length : 0;
                    const highPriorityCount = student.interventions ? 
                      student.interventions.filter(i => i.priority === 'high').length : 0;
                    
                    return (
                      <tr 
                        key={student.student_id} 
                        className={`student-row ${student.riskPrediction ? student.riskPrediction.risk_level : ''}`}
                        onClick={() => handleStudentClick(student.student_id)}
                      >
                        <td>{student.name}</td>
                        <td>{student.grade}</td>
                        <td>
                          {student.riskPrediction ? (
                            <span className={`status-pill ${student.riskPrediction.risk_level}`}>
                              {student.riskPrediction.risk_level.charAt(0).toUpperCase() + student.riskPrediction.risk_level.slice(1)}
                            </span>
                          ) : 'Unknown'}
                        </td>
                        <td>
                          {student.riskPrediction ? (
                            <div className="risk-meter small">
                              <div 
                                className={`risk-fill ${student.riskPrediction.risk_level}`}
                                style={{ width: `${student.riskPrediction.overall_risk_score * 100}%` }}
                              ></div>
                              <span className="risk-value">
                                {(student.riskPrediction.overall_risk_score * 100).toFixed(0)}%
                              </span>
                            </div>
                          ) : 'N/A'}
                        </td>
                        <td>
                          <span className={`status-indicator ${isFragileLearner ? 'active' : 'inactive'}`}>
                            {isFragileLearner ? 'Yes' : 'No'}
                          </span>
                        </td>
                        <td>
                          <span className={`count-pill ${passRiskCount > 0 ? 'warning' : 'neutral'}`}>
                            {passRiskCount}
                          </span>
                        </td>
                        <td>
                          <span className={`count-pill ${cat4WeaknessCount > 0 ? 'warning' : 'neutral'}`}>
                            {cat4WeaknessCount}
                          </span>
                        </td>
                        <td>
                          <span className={`count-pill ${academicWeaknessCount > 0 ? 'warning' : 'neutral'}`}>
                            {academicWeaknessCount}
                          </span>
                        </td>
                        <td>
                          <span className="intervention-counts">
                            <span className={`count-pill high ${highPriorityCount > 0 ? 'active' : 'inactive'}`}>
                              {highPriorityCount}
                            </span>
                            /
                            <span className="total-count">
                              {interventionCount}
                            </span>
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {/* Cohort Analysis View */}
        {currentView === 'cohorts' && (
          <div className="cohorts-view">
            <div className="cohort-controls">
              <div className="control-group">
                <label htmlFor="primary-cohort">Primary Grouping</label>
                <select 
                  id="primary-cohort" 
                  value={selectedCohortFilter}
                  onChange={(e) => setSelectedCohortFilter(e.target.value)}
                >
                  <option value="grade">Grade</option>
                  <option value="riskLevel">Risk Level</option>
                  <option value="fragileStatus">Fragile Learner Status</option>
                  <option value="passRisk">PASS Risk Factors</option>
                  <option value="cat4Risk">CAT4 Weaknesses</option>
                  <option value="academicRisk">Academic Weaknesses</option>
                </select>
              </div>
              
              <div className="control-group">
                <label htmlFor="secondary-cohort">Secondary Grouping</label>
                <select 
                  id="secondary-cohort" 
                  value={selectedSecondaryFilter}
                  onChange={(e) => setSelectedSecondaryFilter(e.target.value)}
                >
                  <option value="grade">Grade</option>
                  <option value="riskLevel">Risk Level</option>
                  <option value="fragileStatus">Fragile Learner Status</option>
                  <option value="passRisk">PASS Risk Factors</option>
                  <option value="cat4Risk">CAT4 Weaknesses</option>
                  <option value="academicRisk">Academic Weaknesses</option>
                </select>
              </div>
            </div>

            <div className="cohort-list">
              <h3>Cohort Details</h3>
              
              {Object.entries(cohorts).map(([cohortName, cohortData]) => (
                <div key={cohortName} className="cohort-section">
                  <div className="cohort-header">
                    <h4>{cohortName}</h4>
                    <span className="student-count">{cohortData.students.length} students</span>
                  </div>
                  
                  <div className="cohort-stats">
                    <div className="stat-row">
                      <div className="stat-item">
                        <span className="stat-label">High Risk:</span>
                        <span className="stat-value">
                          {cohortData.students.filter(s => s.riskPrediction && s.riskPrediction.risk_level === 'high').length}
                        </span>
                      </div>
                      
                      <div className="stat-item">
                        <span className="stat-label">Fragile Learners:</span>
                        <span className="stat-value">
                          {cohortData.students.filter(s => 
                            s.is_fragile_learner || 
                            (s.cat4_analysis && s.cat4_analysis.available && s.cat4_analysis.is_fragile_learner)
                          ).length}
                        </span>
                      </div>
                      
                      <div className="stat-item">
                        <span className="stat-label">With Interventions:</span>
                        <span className="stat-value">
                          {cohortData.students.filter(s => 
                            s.interventions && s.interventions.length > 0
                          ).length}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Only show subgroups if there are any and if primary filter is different from secondary */}
                  {selectedCohortFilter !== selectedSecondaryFilter && 
                   Object.keys(cohortData.subgroups).length > 0 && (
                    <div className="subgroup-summary">
                      <h5>Subgroups</h5>
                      <div className="subgroup-grid">
                        {Object.entries(cohortData.subgroups).map(([subgroupName, students]) => (
                          <div key={subgroupName} className="subgroup-item">
                            <span className="subgroup-name">{subgroupName}</span>
                            <span className="subgroup-count">{students.length} students</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <button 
                    className="view-students-btn"
                    onClick={() => {
                      // Action to expand cohort and show students
                      // This would typically toggle a state to expand this section
                    }}
                  >
                    View Students
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Intervention Effectiveness View */}
        {currentView === 'interventions' && (
          <div className="interventions-view">
            <div className="interventions-summary">
              <div className="summary-stats">
                <div className="stat-card">
                  <div className="stat-value">
                    {filteredStudents.filter(s => s.interventions && s.interventions.length > 0).length}
                  </div>
                  <div className="stat-label">Students with Interventions</div>
                </div>
                
                <div className="stat-card">
                  <div className="stat-value">
                    {filteredStudents.reduce((sum, student) => 
                      sum + (student.interventions ? student.interventions.length : 0), 0
                    )}
                  </div>
                  <div className="stat-label">Total Interventions</div>
                </div>
                
                <div className="stat-card">
                  <div className="stat-value">
                    {filteredStudents.reduce((sum, student) => 
                      sum + (student.interventions ? 
                        student.interventions.filter(i => i.priority === 'high').length : 0), 0
                    )}
                  </div>
                  <div className="stat-label">High Priority Interventions</div>
                </div>
                
                <div className="stat-card">
                  <div className="stat-value">
                    {filteredStudents.reduce((sum, student) => 
                      sum + (student.compoundInterventions ? student.compoundInterventions.length : 0), 0
                    )}
                  </div>
                  <div className="stat-label">Compound Interventions</div>
                </div>
              </div>
              
              <div className="interventions-chart">
                <h3>Intervention Effectiveness</h3>
                {/* Comment out or dynamically import to avoid component reference errors */}
                {/* <InterventionEffectivenessChart 
                  data={analyzeInterventionEffectiveness()} 
                /> */}
                <div className="chart-placeholder">
                  {/* You can implement this component or show placeholder */}
                  Chart showing intervention effectiveness by domain
                </div>
              </div>
            </div>
            
            <div className="intervention-domains">
              <h3>Intervention Domains</h3>
              <div className="domains-grid">
                {Object.entries(cohortStats?.interventionsByDomain || {})
                  .filter(([_, count]) => count > 0)
                  .sort((a, b) => b[1] - a[1])
                  .map(([domain, count]) => (
                    <div key={domain} className={`domain-card ${domain}`}>
                      <div className="domain-name">{domain.charAt(0).toUpperCase() + domain.slice(1)}</div>
                      <div className="domain-count">{count}</div>
                      <div className="domain-percentage">
                        {Math.round((count / 
                          Object.values(cohortStats?.interventionsByDomain || {})
                            .reduce((sum, c) => sum + c, 0)
                        ) * 100)}%
                      </div>
                    </div>
                  ))}
              </div>
            </div>
            
            <div className="intervention-progress">
              <h3>Student Progress Tracking</h3>
              {/* Comment out or dynamically import to avoid component reference errors */}
              {/* <StudentProgressTracking 
                students={filteredStudents}
                showingStudents={filteredStudents.slice(0, 10)} // For performance, only show first 10
              /> */}
              <div className="progress-placeholder">
                {/* You can implement this component or show placeholder */}
                Progress tracking for selected students
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;