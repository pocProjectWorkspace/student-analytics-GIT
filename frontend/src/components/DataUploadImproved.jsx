import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ImprovedDataProcessor from '../utils/ImprovedDataProcessor';
import '../styles/DataUpload.css';

function DataUploadImproved() {
  const [files, setFiles] = useState({
    pass: null,
    cat4: null,
    asset: null
  });
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState(null);
  const [progress, setProgress] = useState(0);
  const [debugInfo, setDebugInfo] = useState(null);
  const navigate = useNavigate();
  
  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      setFiles(prev => ({
        ...prev,
        [type]: file
      }));
      setMessage(null); // Clear any previous messages
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);
    setMessage({ type: 'info', text: 'Processing data, please wait...' });
    setProgress(10);
    setDebugInfo(null);
    
    try {
    if (!files.pass && !files.cat4 && !files.asset) {
      throw new Error('Please upload at least one file (PASS, CAT4, or ASSET)');
    }
    
    // Create data processor instance
    const dataProcessor = new ImprovedDataProcessor();
    setProgress(20);
    
    // Process the files
    console.log('Starting processing with:', files.pass, files.cat4, files.asset);
    setProgress(30);
    
    const processedData = await dataProcessor.processFiles(
      files.pass,
      files.cat4,
      files.asset
    );
    
    setProgress(80);
    
    // Log the processed data for debugging
    console.log('Processed student data:', processedData);
    
    if (processedData.length === 0) {
      // Show debugging information if no students were processed
      setDebugInfo({
        filesProvided: {
          pass: files.pass?.name || 'None',
          cat4: files.cat4?.name || 'None',
          asset: files.asset?.name || 'None'
        },
        message: 'No student data could be extracted from the files.'
      });
      throw new Error('No student data could be extracted from the files. Please check the file format and try again.');
    }
    
    // Show some stats for user
    const totalStudents = processedData.length;
    const fragileCount = processedData.filter(s => s.is_fragile_learner).length;
    const riskCount = processedData.filter(s => s.pass_analysis.available && s.pass_analysis.riskAreas.length > 0).length;
    
    // Store the processed data in localStorage
    localStorage.setItem('studentData', JSON.stringify(processedData));
    
    setProgress(100);
    setMessage({
      type: 'success',
      text: `Data processed successfully! ${totalStudents} students processed, ${fragileCount} fragile learners identified, ${riskCount} students with PASS risk factors.`
    });
    
    // Redirect to dashboard after successful upload
    setTimeout(() => {
      navigate('/dashboard');
    }, 2000);
    
  } catch (error) {
    console.error('Processing error:', error);
    setMessage({
      type: 'error',
      text: `Upload failed: ${error.message}`
    });
    
    if (!debugInfo) {
      setDebugInfo({
        error: error.toString(),
        message: 'There was an error processing your files. Please check the file format and try again.'
      });
    }
  } finally {
    setUploading(false);
  }
};

  
  return (
    <div className="data-upload">
      <div className="upload-header">
        <h1>Upload Student Data</h1>
        <p>Upload data files to identify fragile learners and generate intervention strategies</p>
      </div>
      
      <div className="upload-card">
        <h2>Upload Data Files</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="upload-section">
            <h3>PASS Data (.xlsx)</h3>
            <p className="file-description">
              Upload PASS (Pupil Attitudes to Self and School) data in Excel format.
              This file contains student attitudes across 9 factors that influence learning.
            </p>
            <div className="file-input">
              <label className={files.pass ? 'has-file' : ''}>
                <span className="file-label-text">
                  {files.pass ? 'File selected' : 'Choose PASS Excel file or drag and drop'}
                </span>
                <input 
                  type="file" 
                  accept=".xlsx,.xls" 
                  onChange={(e) => handleFileChange(e, 'pass')} 
                />
              </label>
              {files.pass && <div className="file-name">{files.pass.name}</div>}
            </div>
          </div>
          
          <div className="upload-section">
            <h3>CAT4 Data (.xlsx)</h3>
            <p className="file-description">
              Upload CAT4 (Cognitive Abilities Test) data in Excel format.
              This file contains student cognitive abilities across verbal, quantitative,
              non-verbal, and spatial domains.
            </p>
            <div className="file-input">
              <label className={files.cat4 ? 'has-file' : ''}>
                <span className="file-label-text">
                  {files.cat4 ? 'File selected' : 'Choose CAT4 Excel file or drag and drop'}
                </span>
                <input 
                  type="file" 
                  accept=".xlsx,.xls" 
                  onChange={(e) => handleFileChange(e, 'cat4')} 
                />
              </label>
              {files.cat4 && <div className="file-name">{files.cat4.name}</div>}
            </div>
          </div>
          
          <div className="upload-section">
            <h3>ASSET/Academic Data (.xlsx)</h3>
            <p className="file-description">
              Upload ASSET or internal academic data in Excel format.
              This file contains student academic performance across subjects.
            </p>
            <div className="file-input">
              <label className={files.asset ? 'has-file' : ''}>
                <span className="file-label-text">
                  {files.asset ? 'File selected' : 'Choose Academic Excel file or drag and drop'}
                </span>
                <input 
                  type="file" 
                  accept=".xlsx,.xls" 
                  onChange={(e) => handleFileChange(e, 'asset')} 
                />
              </label>
              {files.asset && <div className="file-name">{files.asset.name}</div>}
            </div>
          </div>
          
          {message && (
            <div className={`message ${message.type}`}>
              {message.text}
            </div>
          )}
          
          {uploading && (
            <div className="progress-container">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <div className="progress-text">{progress}% Complete</div>
            </div>
          )}
          
          <div className="buttons-row">
            <button 
              type="submit" 
              className="upload-btn" 
              disabled={uploading || (!files.pass && !files.cat4 && !files.asset)}
            >
              {uploading ? 'Processing...' : 'Process Data'}
            </button>
            
            <button 
              type="button" 
              className="clear-btn"
              onClick={() => {
                setFiles({ pass: null, cat4: null, asset: null });
                setMessage(null);
                setDebugInfo(null);
              }}
              disabled={uploading}
            >
              Clear Files
            </button>
          </div>
        </form>
      </div>
      
      {debugInfo && (
        <div className="debug-card">
          <h3>Debug Information</h3>
          <p>{debugInfo.message}</p>
          
          <div className="debug-details">
            <h4>Files Provided:</h4>
            <ul>
              <li>PASS: {debugInfo.filesProvided?.pass || 'None'}</li>
              <li>CAT4: {debugInfo.filesProvided?.cat4 || 'None'}</li>
              <li>ASSET: {debugInfo.filesProvided?.asset || 'None'}</li>
            </ul>
            
            {debugInfo.error && (
              <div className="error-details">
                <h4>Error Details:</h4>
                <pre>{debugInfo.error}</pre>
              </div>
            )}
          </div>
          
          <div className="help-tips">
            <h4>Troubleshooting Tips:</h4>
            <ul>
              <li>Make sure your Excel files contain student ID columns</li>
              <li>Check that the files use consistent student IDs across datasets</li>
              <li>Ensure PASS data contains percentile scores for attitude factors</li>
              <li>Verify CAT4 data includes stanine or SAS scores for cognitive domains</li>
              <li>Confirm academic data contains subject marks or stanines</li>
            </ul>
          </div>
        </div>
      )}
      
      <div className="info-section">
        <h2>Understanding Fragile Learners</h2>
        <div className="info-grid">
          <div className="info-card">
            <h3>What is a Fragile Learner?</h3>
            <p>
              Fragile learners are students who have adequate cognitive abilities (shown in CAT4) 
              but whose attitudes to self and school (shown in PASS) create barriers to achieving 
              their potential. They may be underperforming relative to their cognitive capacity.
            </p>
          </div>
          
          <div className="info-card">
            <h3>Data Triangulation</h3>
            <p>
              Our system identifies fragile learners by triangulating data from:
            </p>
            <ul>
              <li><strong>PASS</strong> - identifying attitudinal barriers to learning</li>
              <li><strong>CAT4</strong> - assessing cognitive potential</li>
              <li><strong>Academic data</strong> - comparing performance with potential</li>
            </ul>
          </div>
          
          <div className="info-card">
            <h3>File Requirements</h3>
            <p>For optimal analysis, your files should include:</p>
            <ul>
              <li>Student IDs that are consistent across all files</li>
              <li>PASS scores (percentiles) for attitudinal factors</li>
              <li>CAT4 stanine scores for cognitive domains</li>
              <li>Academic marks or stanines for key subjects</li>
            </ul>
          </div>
          
          <div className="info-card">
            <h3>Intervention Strategies</h3>
            <p>
              Based on the analysis, the system will suggest targeted intervention 
              strategies across several domains:
            </p>
            <ul>
              <li>Emotional & Behavioral support</li>
              <li>Cognitive development</li>
              <li>Academic scaffolding</li>
              <li>Comprehensive learning plans for fragile learners</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DataUploadImproved;