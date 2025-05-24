import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
// Import API module as default import only
import api from '../services/api';
import RadarChart from './charts/RadarChart';
import CognitiveBarChart from './charts/CognitiveBarChart';
import AcademicChart from './charts/AcademicChart';
import InterventionsList from './InterventionsList';
import ProgressTracker from "../utils/analytics/ProgressTracker";
import PredictiveAnalytics from "../utils/analytics/PredictiveAnalytics";
import HistoricalTrendChart from './charts/HistoricalTrendChart';
import RiskIndicatorChart from './charts/RiskIndicatorChart';

// Create wrapper functions to maintain compatibility with existing code
const fetchStudentData = (studentId) => {
  return api.fetchStudentDetails(studentId);
};

const downloadStudentReport = (studentId) => {
  return api.downloadStudentReport(studentId);
};

// Tab enumeration for better readability
const TABS = {
  OVERVIEW: 'overview',
  PASS: 'pass',
  CAT4: 'cat4',
  ACADEMIC: 'academic', 
  INTERVENTIONS: 'interventions',
  HISTORY: 'history',
  PREDICTION: 'prediction'
};

// Use destructuring at top level for functions not defined as wrappers above
const { 
  fetchStudentDetails, 
  fetchStudentProgress,
  fetchRiskPrediction,
  saveStudentNotes,
  addIntervention,
  updateIntervention,
  shareStudentReport
} = api;


function StudentProfile() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const [studentData, setStudentData] = useState(null);
  const [historicalData, setHistoricalData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(TABS.OVERVIEW);
  const [progressAnalysis, setProgressAnalysis] = useState(null);
  const [riskPrediction, setRiskPrediction] = useState(null);
  
  useEffect(() => {
  const loadStudentData = async () => {
    setLoading(true);
    try {
        // Load current student data
        const data = await fetchStudentDetails(studentId);
        setStudentData(data.student); // Make sure to extract .student from the response
        
        // Try to load historical data (would come from API in production)
      try {
        const historicalResponse = await fetchStudentProgress(studentId);
        if (historicalResponse) {
          setHistoricalData(historicalResponse.history || []);
          setProgressAnalysis(historicalResponse);
        }
      } catch (historyError) {
        console.warn('Could not load historical data:', historyError);
        // Fallback to empty history
        setHistoricalData([]);
      }
      
      // Try to load risk prediction
      try {
        const predictionResponse = await fetchRiskPrediction(studentId);
        if (predictionResponse) {
          setRiskPrediction(predictionResponse);
        }
      } catch (predictionError) {
        console.warn('Could not load risk prediction:', predictionError);
      }
      
    } catch (error) {
      console.error('Error loading student data:', error);
      
      // Fallback to localStorage if API fails
      try {
        // Check if we have any demo data in localStorage
        const localData = localStorage.getItem('demoStudentData');
        if (localData) {
          const parsedData = JSON.parse(localData);
          const student = parsedData.find(s => s.student_id === studentId) || 
                        parsedData[0]; // Fallback to first student if ID not found
          
          if (student) {
            setStudentData(student);
            console.log('Using demo data from localStorage');
          } else {
            // No matching student found
            console.error('No matching student found in localStorage');
          }
        } else {
          // Create and save demo data
          const demoData = createDemoStudentData();
          localStorage.setItem('demoStudentData', JSON.stringify(demoData));
          
          const demoStudent = demoData.find(s => s.student_id === studentId) || demoData[0];
          setStudentData(demoStudent);
          console.log('Created and using demo data');
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
    return (
      <div className="error-container">
        <h2>Student data not found</h2>
        <p>The requested student profile could not be loaded. Please check the student ID or try uploading data again.</p>
        <button className="back-button" onClick={() => navigate('/dashboard')}>
          Return to Dashboard
        </button>
      </div>
    );
  }
  
  // Determine if the student is a fragile learner based on triangulated data
  const isFragileLearner = studentData.is_fragile_learner || 
                          (studentData.cat4_analysis && 
                           studentData.cat4_analysis.available && 
                           studentData.cat4_analysis.is_fragile_learner);
  
  return (
    <div className="student-profile">
      <div className="profile-header">
        <div className="header-content">
          <div className="student-info">
            <h1>{studentData.name}</h1>
            <div className="student-details">
              <span>Grade {studentData.grade}</span>
              {studentData.section && <span>• Section {studentData.section}</span>}
              <span>• ID: {studentData.student_id}</span>
            </div>
          </div>
          
          {isFragileLearner && (
            <div className="fragile-learner-tag">
              <span className="tag-icon">!</span>
              Fragile Learner
            </div>
          )}
        </div>
        
        <button 
          className="download-report-btn" 
          onClick={handleDownloadReport}
        >
          Download Full Report
        </button>
      </div>
      
      {/* Risk prediction summary (if high risk) */}
      {riskPrediction && riskPrediction.risk_level === 'high' && (
        <div className="risk-alert">
          <h3>High Risk Alert</h3>
          <p>This student has been identified as high risk. Urgent intervention recommended.</p>
          <p><strong>Risk Score:</strong> {(riskPrediction.overall_risk_score * 100).toFixed(0)}% 
            <span className="confidence-label">(Confidence: {(riskPrediction.confidence * 100).toFixed(0)}%)</span>
          </p>
          <button 
            className="view-prediction-btn" 
            onClick={() => setActiveTab(TABS.PREDICTION)}
          >
            View Full Risk Assessment
          </button>
        </div>
      )}
      
      {/* Progress highlights (if available) */}
      {progressAnalysis && progressAnalysis.hasBaseline && (
        <div className={`progress-summary ${progressAnalysis.improvementAreas.length > progressAnalysis.concernAreas.length ? 'positive' : 'neutral'}`}>
          <h3>Progress Summary</h3>
          <p>{progressAnalysis.summary}</p>
        </div>
      )}
      
      {/* Summary cards */}
      <div className="profile-summary-cards">
        <div className="summary-card">
          <div className="card-heading">PASS Risk Areas</div>
          <div className="card-value">{studentData.pass_analysis?.riskAreas?.length || 0}</div>
          <div className="card-subtext">Attitudinal factors below threshold</div>
        </div>
        
        <div className="summary-card">
          <div className="card-heading">CAT4 Weakness Areas</div>
          <div className="card-value">{studentData.cat4_analysis?.weaknessAreas?.length || 0}</div>
          <div className="card-subtext">Cognitive domains below threshold</div>
        </div>
        
        <div className="summary-card">
          <div className="card-heading">Academic Performance</div>
          {studentData.academic_analysis && studentData.academic_analysis.available ? (
            <>
              <div className="card-value">
                {studentData.academic_analysis.subjects.filter(s => s.level === 'weakness').length} / {studentData.academic_analysis.subjects.length}
              </div>
              <div className="card-subtext">Subjects below expected level</div>
            </>
          ) : (
            <>
              <div className="card-value">N/A</div>
              <div className="card-subtext">No academic data available</div>
            </>
          )}
        </div>
        
        <div className="summary-card interventions">
          <div className="card-heading">Interventions</div>
          <div className="card-value">{studentData.interventions?.length || 0}</div>
          <div className="card-subtext">Recommended strategies</div>
        </div>
      </div>
      
      {/* Tab Navigation */}
      <div className="profile-tabs">
        <button 
          className={`tab-button ${activeTab === TABS.OVERVIEW ? 'active' : ''}`}
          onClick={() => setActiveTab(TABS.OVERVIEW)}
        >
          Overview
        </button>
        <button 
          className={`tab-button ${activeTab === TABS.PASS ? 'active' : ''}`}
          onClick={() => setActiveTab(TABS.PASS)}
        >
          PASS Analysis
        </button>
        <button 
          className={`tab-button ${activeTab === TABS.CAT4 ? 'active' : ''}`}
          onClick={() => setActiveTab(TABS.CAT4)}
        >
          CAT4 Analysis
        </button>
        <button 
          className={`tab-button ${activeTab === TABS.ACADEMIC ? 'active' : ''}`}
          onClick={() => setActiveTab(TABS.ACADEMIC)}
        >
          Academic
        </button>
        <button 
          className={`tab-button ${activeTab === TABS.INTERVENTIONS ? 'active' : ''}`}
          onClick={() => setActiveTab(TABS.INTERVENTIONS)}
        >
          Interventions
        </button>
        {progressAnalysis && progressAnalysis.hasBaseline && (
          <button 
            className={`tab-button ${activeTab === TABS.HISTORY ? 'active' : ''}`}
            onClick={() => setActiveTab(TABS.HISTORY)}
          >
            Progress
          </button>
        )}
        {riskPrediction && (
          <button 
            className={`tab-button ${activeTab === TABS.PREDICTION ? 'active' : ''}`}
            onClick={() => setActiveTab(TABS.PREDICTION)}
          >
            Risk Assessment
          </button>
        )}
      </div>
      
      {/* Tab Content */}
      <div className="tab-content">
        {/* Overview Tab */}
        {activeTab === TABS.OVERVIEW && (
          <OverviewTab 
            studentData={studentData} 
            isFragileLearner={isFragileLearner}
            progressAnalysis={progressAnalysis}
            riskPrediction={riskPrediction}
          />
        )}
        
        {/* PASS Analysis Tab */}
        {activeTab === TABS.PASS && (
          <PassAnalysisTab studentData={studentData} />
        )}
        
        {/* CAT4 Analysis Tab */}
        {activeTab === TABS.CAT4 && (
          <CAT4AnalysisTab 
            studentData={studentData}
            isFragileLearner={isFragileLearner}
          />
        )}
        
        {/* Academic Analysis Tab */}
        {activeTab === TABS.ACADEMIC && (
          <AcademicAnalysisTab studentData={studentData} />
        )}
        
        {/* Interventions Tab */}
        {activeTab === TABS.INTERVENTIONS && (
          <InterventionsTab 
            studentData={studentData}
            progressAnalysis={progressAnalysis}
          />
        )}
        
        {/* Progress History Tab */}
        {activeTab === TABS.HISTORY && progressAnalysis && (
          <ProgressHistoryTab 
            studentData={studentData}
            historicalData={historicalData}
            progressAnalysis={progressAnalysis}
          />
        )}
        
        {/* Risk Prediction Tab */}
        {activeTab === TABS.PREDICTION && riskPrediction && (
          <RiskPredictionTab 
            studentData={studentData}
            riskPrediction={riskPrediction}
          />
        )}
      </div>
    </div>
  );
}

// Overview Tab Component
function OverviewTab({ studentData, isFragileLearner, progressAnalysis, riskPrediction }) {
  return (
    <>
      <h2>Student Overview</h2>
      
      {/* Fragile Learner Alert */}
      {isFragileLearner && (
        <div className="fragile-learner-alert">
          <h3>Fragile Learner Identified</h3>
          <p>
            This student has been identified as a fragile learner based on triangulated assessment data. 
            Fragile learners have adequate cognitive abilities but show attitudinal barriers to learning 
            that may prevent them from achieving their potential.
          </p>
          <ul>
            <li>CAT4 cognitive profile indicates potential not being fully realized</li>
            <li>PASS assessment shows attitudinal barriers to learning</li>
            <li>Targeted interventions recommended to address attitudinal factors</li>
          </ul>
        </div>
      )}
      
      <div className="overview-grid">
        {/* PASS Overview */}
        <div className="overview-card">
          <h3>PASS Profile</h3>
          {studentData.pass_analysis && studentData.pass_analysis.available ? (
            <>
              <div className="small-visualization">
                <RadarChart data={studentData.passData} />
              </div>
              
              {studentData.pass_analysis.riskAreas && studentData.pass_analysis.riskAreas.length > 0 ? (
                <div className="risk-summary">
                  <h4>Key Risk Areas:</h4>
                  <ul className="risk-list">
                    {studentData.pass_analysis.riskAreas.slice(0, 3).map((risk, index) => (
                      <li key={index} className="risk-item">
                        <span className="risk-indicator at-risk"></span>
                        <span className="risk-name">{risk.factor}</span>
                        <span className="risk-value">{risk.percentile}%</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p>No attitudinal risk areas identified.</p>
              )}
            </>
          ) : (
            <div className="no-data-message">No PASS data available</div>
          )}
        </div>
        
        {/* CAT4 Overview */}
        <div className="overview-card">
          <h3>Cognitive Profile</h3>
          {studentData.cat4_analysis && studentData.cat4_analysis.available ? (
            <>
              <div className="small-visualization">
                <CognitiveBarChart data={studentData.cat4Data} />
              </div>
              
              {studentData.cat4_analysis.weaknessAreas && studentData.cat4_analysis.weaknessAreas.length > 0 ? (
                <div className="weakness-summary">
                  <h4>Cognitive Weaknesses:</h4>
                  <ul className="weakness-list">
                    {studentData.cat4_analysis.weaknessAreas.slice(0, 3).map((weakness, index) => (
                      <li key={index} className="weakness-item">
                        <span className="weakness-indicator"></span>
                        <span className="weakness-name">{weakness.domain}</span>
                        <span className="weakness-value">Stanine {weakness.stanine}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p>No cognitive weaknesses identified.</p>
              )}
            </>
          ) : (
            <div className="no-data-message">No CAT4 data available</div>
          )}
        </div>
        
        {/* Academic Overview */}
        <div className="overview-card">
          <h3>Academic Performance</h3>
          {studentData.academic_analysis && studentData.academic_analysis.available ? (
            <>
              <div className="small-visualization">
                <AcademicChart data={studentData.academicData} />
              </div>
              
              <div className="performance-summary">
                <h4>Subject Performance vs. Potential:</h4>
                <ul className="performance-list">
                  {studentData.academic_analysis.subjects.slice(0, 3).map((subject, index) => (
                    <li 
                      key={index} 
                      className={`performance-item ${subject.comparison ? subject.comparison.toLowerCase().replace(/\s+/g, '-') : ''}`}
                    >
                      <span className="subject-name">{subject.name}</span>
                      <span className="performance-status">{subject.comparison || 'No comparison available'}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : (
            <div className="no-data-message">No academic data available</div>
          )}
        </div>
        
        {/* Interventions Overview */}
        <div className="overview-card">
          <h3>Intervention Summary</h3>
          {studentData.interventions && studentData.interventions.length > 0 ? (
            <div className="interventions-summary">
              <div className="intervention-counts">
                <div className={`count-item ${studentData.interventions.filter(i => i.priority === 'high').length > 0 ? 'high' : ''}`}>
                  <span className="count-value">
                    {studentData.interventions.filter(i => i.priority === 'high').length}
                  </span>
                  <span className="count-label">High Priority</span>
                </div>
                <div className={`count-item ${studentData.interventions.filter(i => i.priority === 'medium').length > 0 ? 'medium' : ''}`}>
                  <span className="count-value">
                    {studentData.interventions.filter(i => i.priority === 'medium').length}
                  </span>
                  <span className="count-label">Medium Priority</span>
                </div>
              </div>
              
              <div className="intervention-types">
                <h4>Intervention Domains:</h4>
                <div className="type-tags">
                  {[...new Set(studentData.interventions.map(i => i.domain))].map((domain, index) => (
                    <span key={index} className={`domain-tag ${domain}`}>{domain}</span>
                  ))}
                </div>
              </div>
              
              <div className="top-interventions">
                <h4>Top Priority Interventions:</h4>
                <ul className="top-interventions-list">
                  {studentData.interventions
                    .filter(i => i.priority === 'high')
                    .slice(0, 2)
                    .map((intervention, index) => (
                      <li key={index} className="top-intervention-item">
                        <span className={`intervention-domain ${intervention.domain}`}>{intervention.domain}</span>
                        <span className="intervention-title">{intervention.title}</span>
                      </li>
                    ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="no-data-message">No interventions recommended</div>
          )}
        </div>
      </div>
      
      {/* Progress Overview */}
      {progressAnalysis && progressAnalysis.hasBaseline && (
        <div className="progress-overview">
          <h3>Progress Highlights</h3>
          
          <div className="progress-grid">
            {progressAnalysis.improvementAreas.length > 0 && (
              <div className="progress-card improvements">
                <h4>Improvements</h4>
                <ul className="progress-list">
                  {progressAnalysis.improvementAreas.slice(0, 3).map((area, index) => (
                    <li key={index} className="progress-item">
                      <span className="progress-domain">{area.domain}</span>
                      <span className="progress-factor">{area.factor}</span>
                      <span className="progress-value positive">{area.improvement}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {progressAnalysis.concernAreas.length > 0 && (
              <div className="progress-card concerns">
                <h4>Concerns</h4>
                <ul className="progress-list">
                  {progressAnalysis.concernAreas.slice(0, 3).map((area, index) => (
                    <li key={index} className="progress-item">
                      <span className="progress-domain">{area.domain}</span>
                      <span className="progress-factor">{area.factor}</span>
                      <span className="progress-value negative">{area.decline}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Risk Overview */}
      {riskPrediction && (
        <div className={`risk-overview ${riskPrediction.risk_level}`}>
          <h3>Risk Assessment</h3>
          <div className="risk-level-indicator">
            <div className="risk-meter">
              <div 
                className={`risk-fill ${riskPrediction.risk_level}`}
                style={{ width: `${riskPrediction.overall_risk_score * 100}%` }}
              ></div>
            </div>
            <div className="risk-labels">
              <span>Low</span>
              <span>Borderline</span>
              <span>Medium</span>
              <span>High</span>
            </div>
          </div>
          
          {riskPrediction.early_indicators.length > 0 && (
            <div className="early-warnings">
              <h4>Early Warning Indicators:</h4>
              <ul className="warning-list">
                {riskPrediction.early_indicators.slice(0, 2).map((warning, index) => (
                  <li key={index} className="warning-item">
                    <span className="warning-indicator"></span>
                    <span className="warning-text">{warning.indicator}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </>
  );
}

// PASS Analysis Tab Component
function PassAnalysisTab({ studentData }) {
  if (!studentData.pass_analysis || !studentData.pass_analysis.available) {
    return (
      <div className="no-data-container">
        <h3>No PASS Data Available</h3>
        <p>This student does not have PASS assessment data available. PASS (Pupil Attitudes to Self and School) data provides insights into attitudinal factors that may affect learning outcomes.</p>
      </div>
    );
  }
  
  return (
    <>
      <h2>PASS Analysis</h2>
      
      <div className="full-width-chart">
        <RadarChart data={studentData.passData} />
      </div>
      
      <div className="pass-factors-table">
        <h3>PASS Factor Analysis</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Factor</th>
              <th>Percentile</th>
              <th>Level</th>
              <th>Implications</th>
            </tr>
          </thead>
          <tbody>
            {studentData.pass_analysis.factors.map((factor, index) => (
              <tr key={index} className={factor.level}>
                <td>{factor.name}</td>
                <td>{factor.percentile}%</td>
                <td>
                  <span className={`status-pill ${factor.level}`}>
                    {factor.level === 'at-risk' ? 'At Risk' : 
                     factor.level === 'strength' ? 'Strength' : 'Balanced'}
                  </span>
                </td>
                <td>{factor.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Risk Areas Section */}
      {studentData.pass_analysis.riskAreas && studentData.pass_analysis.riskAreas.length > 0 && (
        <div className="pass-implications">
          <h3>Risk Areas and Implications</h3>
          <div className="implications-section">
            <h4>Attitudinal Barriers to Learning</h4>
            <p>
              The following PASS factors were identified as areas of concern. These attitudinal
              factors may be creating barriers to this student's learning and achievement:
            </p>
            <ul className="implications-list">
              {studentData.pass_analysis.riskAreas.map((risk, index) => (
                <li key={index}>
                  <strong>{risk.factor}:</strong> Score of {risk.percentile}% indicates potential
                  issues with {risk.factor.toLowerCase()}. This may impact learning through
                  {risk.factor.toLowerCase().includes('self') ? ' reduced academic self-concept and confidence.' : 
                   risk.factor.toLowerCase().includes('teacher') ? ' challenging relationships with teaching staff.' :
                   risk.factor.toLowerCase().includes('work') ? ' diminished effort and persistence with tasks.' :
                   risk.factor.toLowerCase().includes('emotional') ? ' difficulty managing emotions during challenges.' :
                   risk.factor.toLowerCase().includes('social') ? ' social anxiety or peer relationship challenges.' :
                   risk.factor.toLowerCase().includes('curriculum') ? ' feeling overwhelmed by academic demands.' :
                   ' attitudinal barriers to learning.'}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      
      {/* Strength Areas Section */}
      {studentData.pass_analysis.strengthAreas && studentData.pass_analysis.strengthAreas.length > 0 && (
        <div className="pass-implications">
          <div className="implications-section strengths">
            <h4>Attitudinal Strengths</h4>
            <p>
              The following PASS factors were identified as strengths. These positive attitudes
              can be leveraged to support learning and development:
            </p>
            <ul className="implications-list">
              {studentData.pass_analysis.strengthAreas.map((strength, index) => (
                <li key={index}>
                  <strong>{strength.factor}:</strong> Score of {strength.percentile}% indicates a 
                  positive disposition toward {strength.factor.toLowerCase()}. This can be leveraged to support
                  overall learning and engagement.
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}

// CAT4 Analysis Tab Component
function CAT4AnalysisTab({ studentData, isFragileLearner }) {
  if (!studentData.cat4_analysis || !studentData.cat4_analysis.available) {
    return (
      <div className="no-data-container">
        <h3>No CAT4 Data Available</h3>
        <p>This student does not have CAT4 assessment data available. CAT4 (Cognitive Abilities Test) data provides insights into cognitive abilities and potential.</p>
      </div>
    );
  }
  
  return (
    <>
      <h2>CAT4 Analysis</h2>
      
      <div className="full-width-chart">
        <CognitiveBarChart data={studentData.cat4Data} showLabels={true} />
      </div>
      
      {isFragileLearner && (
        <div className="fragile-learner-details">
          <h3>Fragile Learner Identification</h3>
          <p>
            This student has been identified as a <strong>fragile learner</strong> based on their cognitive profile. 
            Fragile learners typically show adequate cognitive abilities but demonstrate barriers to learning that 
            prevent them from achieving their full potential.
          </p>
          <div className="fragile-learner-indicators">
            <h4>Indicators:</h4>
            <ul>
              <li>
                <strong>Cognitive Potential:</strong> CAT4 indicates the student has adequate cognitive abilities 
                (average stanine of {studentData.cat4_analysis.averageStanine.toFixed(1)}).
              </li>
              <li>
                <strong>Attitudinal Barriers:</strong> PASS factors show significant attitudinal barriers to learning, 
                particularly in {studentData.pass_analysis?.riskAreas?.[0]?.factor} and 
                {studentData.pass_analysis?.riskAreas?.[1]?.factor}.
              </li>
              <li>
                <strong>Performance Gap:</strong> The disparity between cognitive ability and academic performance 
                suggests the student is not achieving their potential.
              </li>
            </ul>
          </div>
        </div>
      )}
      
      <div className="cat4-domains-table">
        <h3>CAT4 Domains Analysis</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Domain</th>
              <th>Stanine</th>
              <th>Level</th>
              <th>Implications</th>
            </tr>
          </thead>
          <tbody>
            {studentData.cat4_analysis.domains.map((domain, index) => (
              <tr key={index} className={domain.level}>
                <td>{domain.name}</td>
                <td>{domain.stanine}</td>
                <td>
                  <span className={`status-pill ${domain.level}`}>
                    {domain.level === 'weakness' ? 'Weakness' : 
                     domain.level === 'strength' ? 'Strength' : 'Balanced'}
                  </span>
                </td>
                <td>{domain.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="cat4-learning-preferences">
        <h3>Learning Preferences</h3>
        <p>
          Based on the CAT4 profile, this student is likely to prefer learning through:
        </p>
        <div className="preferences-grid">
          {studentData.cat4_analysis.learningPreferences.map((preference, index) => (
            <div key={index} className="preference-card">
              <h4>{preference.type}</h4>
              <p>{preference.description}</p>
              <div className="preference-strength">
                <span>Strength:</span>
                <div className="strength-bar">
                  <div 
                    className="strength-fill"
                    style={{ width: `${preference.strength * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// Academic Analysis Tab Component
function AcademicAnalysisTab({ studentData }) {
  if (!studentData.academic_analysis || !studentData.academic_analysis.available) {
    return (
      <div className="no-data-container">
        <h3>No Academic Data Available</h3>
        <p>This student does not have academic performance data available. Academic data provides insights into subject-specific achievement and can be compared with cognitive potential.</p>
      </div>
    );
  }
  
  return (
    <>
      <h2>Academic Analysis</h2>
      
      <div className="full-width-chart">
        <AcademicChart data={studentData.academicData} showLabels={true} />
      </div>
      
      <div className="academic-comparison">
        <h3>Academic Performance vs. Cognitive Potential</h3>
        <p>
          This analysis compares the student's academic performance with their cognitive potential 
          as measured by CAT4. This helps identify whether the student is achieving in line with 
          their cognitive abilities.
        </p>
        
        <div className="comparison-table">
          <table className="data-table">
            <thead>
              <tr>
                <th>Subject</th>
                <th>Performance (Stanine)</th>
                <th>Relevant CAT4 Domain</th>
                <th>Comparison</th>
                <th>Gap</th>
              </tr>
            </thead>
            <tbody>
              {studentData.academic_analysis.subjects.map((subject, index) => {
                // Determine the relevant CAT4 domain for this subject
                const relevantDomain = studentData.cat4_analysis?.domains?.find(domain => 
                  subject.name.toLowerCase().includes('english') && domain.name.toLowerCase().includes('verbal') ||
                  subject.name.toLowerCase().includes('math') && domain.name.toLowerCase().includes('quant') ||
                  subject.name.toLowerCase().includes('science') && domain.name.toLowerCase().includes('nonverbal')
                );
                
                const comparison = subject.comparison || 
                  (relevantDomain ? 
                    (subject.stanine > relevantDomain.stanine + 1 ? 'Exceeding Potential' :
                     subject.stanine < relevantDomain.stanine - 1 ? 'Below Potential' : 
                     'Meeting Potential') : 
                    'No comparison available');
                
                const gap = relevantDomain ? 
                  (subject.stanine - relevantDomain.stanine) : null;
                
                return (
                  <tr key={index} className={comparison.toLowerCase().replace(/\s+/g, '-')}>
                    <td>{subject.name}</td>
                    <td>{subject.stanine}</td>
                    <td>{relevantDomain?.name || 'N/A'}</td>
                    <td>
                      <span className={`status-pill ${comparison.toLowerCase().replace(/\s+/g, '-')}`}>
                        {comparison}
                      </span>
                    </td>
                    <td>
                      {gap !== null ? (
                        <span className={gap > 0 ? 'positive' : gap < 0 ? 'negative' : 'neutral'}>
                          {gap > 0 ? '+' : ''}{gap.toFixed(1)}
                        </span>
                      ) : 'N/A'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="academic-implications">
        <h3>Academic Implications</h3>
        
        {/* Strengths */}
        {studentData.academic_analysis.subjects.filter(s => s.level === 'strength').length > 0 && (
          <div className="implications-section strengths">
            <h4>Academic Strengths</h4>
            <ul className="implications-list">
              {studentData.academic_analysis.subjects
                .filter(s => s.level === 'strength')
                .map((subject, index) => (
                  <li key={index}>
                    <strong>{subject.name}:</strong> Stanine {subject.stanine} performance indicates a strong 
                    understanding and proficiency in this subject. This strength can be leveraged to build 
                    confidence and support learning in other areas.
                  </li>
                ))}
            </ul>
          </div>
        )}
        
        {/* Weaknesses */}
        {studentData.academic_analysis.subjects.filter(s => s.level === 'weakness').length > 0 && (
          <div className="implications-section weaknesses">
            <h4>Academic Areas for Support</h4>
            <ul className="implications-list">
              {studentData.academic_analysis.subjects
                .filter(s => s.level === 'weakness')
                .map((subject, index) => (
                  <li key={index}>
                    <strong>{subject.name}:</strong> Stanine {subject.stanine} performance suggests this 
                    subject requires additional support and targeted intervention. 
                    {subject.comparison && subject.comparison.includes('Below Potential') ? 
                      ' This subject shows an underperformance compared to cognitive potential, suggesting attitudinal or learning barriers may be present.' : 
                      ''}
                  </li>
                ))}
            </ul>
          </div>
        )}
      </div>
    </>
  );
}

// Interventions Tab Component
function InterventionsTab({ studentData, progressAnalysis }) {
  if (!studentData.interventions || studentData.interventions.length === 0) {
    return (
      <div className="no-data-container">
        <h3>No Interventions Recommended</h3>
        <p>No interventions have been recommended for this student based on current analysis.</p>
      </div>
    );
  }
  
  // Organize interventions by priority
  const highPriorityInterventions = studentData.interventions.filter(i => i.priority === 'high');
  const mediumPriorityInterventions = studentData.interventions.filter(i => i.priority === 'medium');
  const lowPriorityInterventions = studentData.interventions.filter(i => i.priority === 'low');
  
  return (
    <>
      <h2>Recommended Interventions</h2>
      
      <div className="interventions-summary-header">
        <p>
          The following interventions have been automatically generated based on triangulated analysis 
          of this student's PASS, CAT4, and academic performance data. These recommendations are designed 
          to address specific barriers to learning and support academic progress.
        </p>
        
        <div className="intervention-domain-legend">
          <h4>Intervention Domains:</h4>
          <div className="domain-tags">
            <span className="domain-tag emotional">Emotional</span>
            <span className="domain-tag behavioral">Behavioral</span>
            <span className="domain-tag cognitive">Cognitive</span>
            <span className="domain-tag academic">Academic</span>
            <span className="domain-tag holistic">Holistic</span>
            <span className="domain-tag integrated">Integrated</span>
          </div>
        </div>
      </div>
      
      {/* Intervention Effectiveness (if available) */}
      {progressAnalysis && progressAnalysis.hasBaseline && 
       progressAnalysis.interventionEffectiveness && 
       progressAnalysis.interventionEffectiveness.available && (
        <div className="intervention-effectiveness">
          <h3>Previous Intervention Effectiveness</h3>
          <div className="effectiveness-table">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Intervention</th>
                  <th>Domain</th>
                  <th>Effectiveness</th>
                  <th>Evidence</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(progressAnalysis.interventionEffectiveness.interventions).map(([title, data], index) => (
                  <tr key={index} className={data.effectiveness}>
                    <td>{title}</td>
                    <td>
                      <span className={`domain-tag ${data.domain}`}>{data.domain}</span>
                    </td>
                    <td>
                      <span className={`status-pill ${data.effectiveness.replace(/\s+/g, '-')}`}>
                        {data.effectiveness === 'effective' ? 'Effective' : 
                         data.effectiveness === 'partially effective' ? 'Partially Effective' : 
                         data.effectiveness === 'not effective' ? 'Not Effective' : 'Unknown'}
                      </span>
                    </td>
                    <td>{data.evidence}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* High Priority Interventions */}
      {highPriorityInterventions.length > 0 && (
        <div className="intervention-section high-priority">
          <h3>High Priority Interventions</h3>
          <div className="interventions-list">
            {highPriorityInterventions.map((intervention, index) => (
              <div key={index} className={`intervention-card ${intervention.domain}`}>
                <div className="intervention-header">
                  <span className={`intervention-domain ${intervention.domain}`}>{intervention.domain}</span>
                  <span className="intervention-priority">High Priority</span>
                </div>
                <h4 className="intervention-title">{intervention.title}</h4>
                <p className="intervention-factor">Target: {intervention.factor}</p>
                <p className="intervention-description">{intervention.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Medium Priority Interventions */}
      {mediumPriorityInterventions.length > 0 && (
        <div className="intervention-section medium-priority">
          <h3>Medium Priority Interventions</h3>
          <div className="interventions-list">
            {mediumPriorityInterventions.map((intervention, index) => (
              <div key={index} className={`intervention-card ${intervention.domain}`}>
                <div className="intervention-header">
                  <span className={`intervention-domain ${intervention.domain}`}>{intervention.domain}</span>
                  <span className="intervention-priority">Medium Priority</span>
                </div>
                <h4 className="intervention-title">{intervention.title}</h4>
                <p className="intervention-factor">Target: {intervention.factor}</p>
                <p className="intervention-description">{intervention.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Low Priority Interventions */}
      {lowPriorityInterventions.length > 0 && (
        <div className="intervention-section low-priority">
          <h3>Low Priority Interventions</h3>
          <div className="interventions-list">
            {lowPriorityInterventions.map((intervention, index) => (
              <div key={index} className={`intervention-card ${intervention.domain}`}>
                <div className="intervention-header">
                  <span className={`intervention-domain ${intervention.domain}`}>{intervention.domain}</span>
                  <span className="intervention-priority">Low Priority</span>
                </div>
                <h4 className="intervention-title">{intervention.title}</h4>
                <p className="intervention-factor">Target: {intervention.factor}</p>
                <p className="intervention-description">{intervention.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Compound Interventions */}
      {studentData.compoundInterventions && studentData.compoundInterventions.length > 0 && (
        <div className="intervention-section compound">
          <h3>Compound Interventions</h3>
          <p>
            These interventions target multiple risk factors across different assessment domains and 
            are designed to address complex learning needs through integrated approaches.
          </p>
          <div className="interventions-list">
            {studentData.compoundInterventions.map((intervention, index) => (
              <div key={index} className={`intervention-card ${intervention.domain}`}>
                <div className="intervention-header">
                  <span className={`intervention-domain ${intervention.domain}`}>{intervention.domain}</span>
                  <span className="intervention-priority">
                    {intervention.impact === 'very high' ? 'Very High Impact' : 
                     intervention.impact === 'high' ? 'High Impact' : 
                     intervention.impact === 'medium' ? 'Medium Impact' : 'Standard Impact'}
                  </span>
                </div>
                <h4 className="intervention-title">{intervention.title}</h4>
                <p className="intervention-factor">Target: {intervention.factor}</p>
                <p className="intervention-description">{intervention.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

// Progress History Tab Component
function ProgressHistoryTab({ studentData, historicalData, progressAnalysis }) {
  const prepareTrendData = () => {
    if (!historicalData || historicalData.length === 0) return [];
    
    const trendData = [];
    
    // Process PASS trends
    historicalData.forEach(snapshot => {
      const timestamp = new Date(snapshot.timestamp);
      
      // Add PASS factor trends
      if (snapshot.pass_analysis?.available) {
        snapshot.pass_analysis.factors.forEach(factor => {
          trendData.push({
            factor: factor.name,
            value: factor.percentile,
            timestamp: timestamp,
            domain: 'PASS'
          });
        });
      }
      
      // Add CAT4 domain trends
      if (snapshot.cat4_analysis?.available) {
        snapshot.cat4_analysis.domains.forEach(domain => {
          trendData.push({
            factor: domain.name,
            value: domain.stanine,
            timestamp: timestamp,
            domain: 'CAT4'
          });
        });
      }
      
      // Add academic subject trends
      if (snapshot.academic_analysis?.available) {
        snapshot.academic_analysis.subjects.forEach(subject => {
          trendData.push({
            factor: subject.name,
            value: subject.stanine,
            timestamp: timestamp,
            domain: 'Academic'
          });
        });
      }
    });
    
    return trendData;
  };

  return (
    <>
      <h2>Progress Analysis</h2>
      
      <div className="progress-summary-panel">
        <h3>Progress Summary</h3>
        <p>{progressAnalysis.summary}</p>
      </div>
      
      <div className="progress-trends">
        <h3>Progress Over Time</h3>
        
        {/* PASS Trends */}
        <div className="chart-card">
          <HistoricalTrendChart 
            trendData={prepareTrendData().filter(d => d.domain === 'PASS')} 
            title="PASS Factors Trends" 
            domain="PASS"
            metric="percentile"
            thresholdValue={45} // Risk threshold
            formatValue={(val) => `${val}%`}
          />
        </div>
        
        {/* CAT4 Trends */}
        <div className="chart-card">
          <HistoricalTrendChart 
            trendData={prepareTrendData().filter(d => d.domain === 'CAT4')} 
            title="CAT4 Domains Trends" 
            domain="CAT4"
            metric="stanine"
            thresholdValue={3.5} // Weakness threshold
            formatValue={(val) => `Stanine ${val}`}
          />
        </div>
        
        {/* Academic Trends */}
        <div className="chart-card">
          <HistoricalTrendChart 
            trendData={prepareTrendData().filter(d => d.domain === 'Academic')} 
            title="Academic Performance Trends" 
            domain="Academic"
            metric="stanine"
            thresholdValue={3.5} // Weakness threshold
            formatValue={(val) => `Stanine ${val}`}
          />
        </div>
      </div>
      
      {/* PASS Progress */}
      {progressAnalysis.pass.available && (
        <div className="progress-section">
          <h3>PASS Factors Progress</h3>
          <p>
            Overall PASS change: <span className={progressAnalysis.pass.overallStatus.includes('improvement') ? 'positive' : 
                                     progressAnalysis.pass.overallStatus.includes('decline') ? 'negative' : 'neutral'}>
              {progressAnalysis.pass.overallStatus}
            </span>
          </p>
          <div className="progress-table">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Factor</th>
                  <th>Previous</th>
                  <th>Current</th>
                  <th>Change</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(progressAnalysis.pass.factorAnalysis).map(([factor, analysis], index) => (
                  <tr key={index} className={analysis.direction}>
                    <td>{factor}</td>
                    <td>{analysis.previous}%</td>
                    <td>{analysis.current}%</td>
                    <td>
                      <span className={analysis.change > 0 ? 'positive' : analysis.change < 0 ? 'negative' : 'neutral'}>
                        {analysis.change > 0 ? '+' : ''}{analysis.change.toFixed(1)}%
                      </span>
                    </td>
                    <td>
                      <span className={`status-pill ${analysis.status.replace(/\s+/g, '-')}`}>
                        {analysis.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* CAT4 Progress */}
      {progressAnalysis.cat4.available && (
        <div className="progress-section">
          <h3>CAT4 Domains Progress</h3>
          <p>
            Overall CAT4 change: <span className={progressAnalysis.cat4.overallStatus.includes('improvement') ? 'positive' : 
                                    progressAnalysis.cat4.overallStatus.includes('decline') ? 'negative' : 'neutral'}>
              {progressAnalysis.cat4.overallStatus}
            </span>
          </p>
          <div className="progress-table">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Domain</th>
                  <th>Previous</th>
                  <th>Current</th>
                  <th>Change</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(progressAnalysis.cat4.domainAnalysis).map(([domain, analysis], index) => (
                  <tr key={index} className={analysis.direction}>
                    <td>{domain}</td>
                    <td>Stanine {analysis.previous}</td>
                    <td>Stanine {analysis.current}</td>
                    <td>
                      <span className={analysis.change > 0 ? 'positive' : analysis.change < 0 ? 'negative' : 'neutral'}>
                        {analysis.change > 0 ? '+' : ''}{analysis.change.toFixed(1)}
                      </span>
                    </td>
                    <td>
                      <span className={`status-pill ${analysis.status.replace(/\s+/g, '-')}`}>
                        {analysis.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Fragile Learner Change */}
          {progressAnalysis.cat4.fragileLearnerChange.hasChanged && (
            <div className="fragile-status-change">
              <h4>Fragile Learner Status Change</h4>
              <p>
                The student's fragile learner status has changed from 
                <strong>{progressAnalysis.cat4.fragileLearnerChange.previous ? ' fragile learner' : ' not fragile learner'}</strong> to
                <strong>{progressAnalysis.cat4.fragileLearnerChange.current ? ' fragile learner' : ' not fragile learner'}</strong>.
              </p>
              <p>
                This represents a <span className={progressAnalysis.cat4.fragileLearnerChange.direction === 'positive' ? 'positive' : 'negative'}>
                  {progressAnalysis.cat4.fragileLearnerChange.direction === 'positive' ? 'positive' : 'negative'} change
                </span> in the student's learning profile.
              </p>
            </div>
          )}
        </div>
      )}
      
      {/* Academic Progress */}
      {progressAnalysis.academic.available && (
        <div className="progress-section">
          <h3>Academic Progress</h3>
          <p>
            Overall academic change: <span className={progressAnalysis.academic.overallStatus.includes('improvement') ? 'positive' : 
                                       progressAnalysis.academic.overallStatus.includes('decline') ? 'negative' : 'neutral'}>
              {progressAnalysis.academic.overallStatus}
            </span>
          </p>
          <div className="progress-table">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Previous</th>
                  <th>Current</th>
                  <th>Change</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(progressAnalysis.academic.subjectAnalysis).map(([subject, analysis], index) => (
                  <tr key={index} className={analysis.direction}>
                    <td>{subject}</td>
                    <td>Stanine {analysis.previous}</td>
                    <td>Stanine {analysis.current}</td>
                    <td>
                      <span className={analysis.change > 0 ? 'positive' : analysis.change < 0 ? 'negative' : 'neutral'}>
                        {analysis.change > 0 ? '+' : ''}{analysis.change.toFixed(1)}
                      </span>
                    </td>
                    <td>
                      <span className={`status-pill ${analysis.status.replace(/\s+/g, '-')}`}>
                        {analysis.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

// Risk Prediction Tab Component
function RiskPredictionTab({ studentData, riskPrediction }) {
  const prepareRiskFactors = () => {
    if (!riskPrediction || !riskPrediction.risk_factors) return [];
    return riskPrediction.risk_factors;
  };

  const prepareWarningIndicators = () => {
    if (!riskPrediction || !riskPrediction.early_indicators) return [];
    return riskPrediction.early_indicators;
  };
  
  return (
    <>
      <h2>Risk Assessment</h2>
      
      <div className={`risk-assessment-summary ${riskPrediction.risk_level}`}>
        <div className="risk-header">
          <h3>Overall Risk Assessment</h3>
          <div className="risk-score">
            <div className="score-value">{(riskPrediction.overall_risk_score * 100).toFixed(0)}%</div>
            <div className="score-label">Risk Score</div>
          </div>
        </div>
        
        <div className="risk-details">
          <div className="risk-level">
            <span className="detail-label">Risk Level:</span>
            <span className={`detail-value ${riskPrediction.risk_level}`}>
              {riskPrediction.risk_level.charAt(0).toUpperCase() + riskPrediction.risk_level.slice(1)}
            </span>
          </div>
          <div className="risk-timing">
            <span className="detail-label">Time to Intervention:</span>
            <span className={`detail-value ${riskPrediction.time_to_intervention.replace(/\s+/g, '-')}`}>
              {riskPrediction.time_to_intervention.charAt(0).toUpperCase() + riskPrediction.time_to_intervention.slice(1)}
            </span>
          </div>
          <div className="risk-confidence">
            <span className="detail-label">Prediction Confidence:</span>
            <span className="detail-value">
              {(riskPrediction.confidence * 100).toFixed(0)}%
            </span>
          </div>
        </div>
      </div>
      
      <div className="risk-visualization">
        <div className="chart-card">
          <RiskIndicatorChart 
            riskFactors={prepareRiskFactors()} 
            title="Risk Factor Analysis"
            thresholds={{ high: 0.7, medium: 0.4, low: 0.2 }}
          />
        </div>
        
        {prepareWarningIndicators().length > 0 && (
          <div className="chart-card">
            <RiskIndicatorChart 
              riskFactors={prepareWarningIndicators()} 
              title="Early Warning Indicators" 
              thresholds={{ high: 0.5, medium: 0.3, low: 0.1 }}
            />
          </div>
        )}
      </div>
      
      {/* Risk Factors */}
      {riskPrediction.risk_factors.length > 0 && (
        <div className="risk-section">
          <h3>Current Risk Factors</h3>
          <div className="risk-factors-table">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Domain</th>
                  <th>Factor</th>
                  <th>Risk Level</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {riskPrediction.risk_factors.map((factor, index) => (
                  <tr key={index}>
                    <td>{factor.domain}</td>
                    <td>{factor.factor}</td>
                    <td>
                      <div className="risk-meter small">
                        <div 
                          className="risk-fill"
                          style={{ width: `${factor.level * 100}%` }}
                        ></div>
                        <span className="risk-value">{(factor.level * 100).toFixed(0)}%</span>
                      </div>
                    </td>
                    <td>{factor.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* Early Warning Indicators */}
      {riskPrediction.early_indicators.length > 0 && (
        <div className="risk-section">
          <h3>Early Warning Indicators</h3>
          <p>
            These indicators suggest potential future risks that may develop if not addressed. They represent
            emerging patterns or borderline factors that don't yet qualify as full risk factors but warrant monitoring.
          </p>
          <div className="early-warnings-table">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Domain</th>
                  <th>Indicator</th>
                  <th>Warning Level</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {riskPrediction.early_indicators.map((warning, index) => (
                  <tr key={index}>
                    <td>{warning.domain}</td>
                    <td>{warning.indicator}</td>
                    <td>
                      <div className="warning-meter small">
                        <div 
                          className="warning-fill"
                          style={{ width: `${warning.level * 100}%` }}
                        ></div>
                        <span className="warning-value">{(warning.level * 100).toFixed(0)}%</span>
                      </div>
                    </td>
                    <td>{warning.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* Trend Analysis */}
      {riskPrediction.trend_analysis && riskPrediction.trend_analysis.available && (
        <div className="risk-section">
          <h3>Trend Analysis</h3>
          <p>
            Overall trend direction: <strong>{riskPrediction.trend_analysis.overall_direction}</strong>
          </p>
          <div className="trends-summary">
            <div className="trend-column">
              <h4>PASS Trends</h4>
              <ul className="trend-list">
                {Object.entries(riskPrediction.trend_analysis.pass_trends)
                  .filter(([_, trend]) => trend.direction !== "stable")
                  .map(([factor, trend], index) => (
                    <li key={index} className={trend.direction}>
                      <span className="trend-name">{factor}</span>
                      <span className="trend-direction">
                        {trend.direction.charAt(0).toUpperCase() + trend.direction.slice(1)}
                        {trend.strength > 0.7 ? ' (Strong)' : 
                         trend.strength > 0.3 ? ' (Moderate)' : ' (Slight)'}
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
            
            <div className="trend-column">
              <h4>Academic Trends</h4>
              <ul className="trend-list">
                {Object.entries(riskPrediction.trend_analysis.academic_trends)
                  .filter(([_, trend]) => trend.direction !== "stable")
                  .map(([subject, trend], index) => (
                    <li key={index} className={trend.direction}>
                      <span className="trend-name">{subject}</span>
                      <span className="trend-direction">
                        {trend.direction.charAt(0).toUpperCase() + trend.direction.slice(1)}
                        {trend.strength > 0.7 ? ' (Strong)' : 
                         trend.strength > 0.3 ? ' (Moderate)' : ' (Slight)'}
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          </div>
        </div>
      )}
      
      {/* Recommendations */}
      {riskPrediction.recommendations.length > 0 && (
        <div className="risk-section">
          <h3>Preventive Recommendations</h3>
          <div className="recommendations-list">
            {riskPrediction.recommendations
              .sort((a, b) => {
                const priorityOrder = { high: 0, medium: 1, low: 2 };
                return priorityOrder[a.priority] - priorityOrder[b.priority];
              })
              .map((recommendation, index) => (
                <div key={index} className={`recommendation-card ${recommendation.priority}`}>
                  <div className="recommendation-header">
                    <span className={`recommendation-type ${recommendation.type}`}>{recommendation.type}</span>
                    <span className="recommendation-priority">{recommendation.priority.charAt(0).toUpperCase() + recommendation.priority.slice(1)} Priority</span>
                  </div>
                  <h4 className="recommendation-title">{recommendation.title}</h4>
                  <p className="recommendation-description">{recommendation.description}</p>
                  <p className="recommendation-timeframe">
                    <strong>Timeframe:</strong> {recommendation.timeframe}
                  </p>
                </div>
              ))}
          </div>
        </div>
      )}
    </>
  );
}

export default StudentProfile;