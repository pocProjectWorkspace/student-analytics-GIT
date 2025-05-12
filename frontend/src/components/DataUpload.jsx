 // components/DataUpload.jsx - For importing student data
import React, { useState } from 'react';
import { uploadStudentData } from '../services/api';

function DataUpload() {
  const [files, setFiles] = useState({
    pass: null,
    cat4: null,
    academic: null
  });
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState(null);
  
  const handleFileChange = (e, type) => {
    setFiles(prev => ({
      ...prev,
      [type]: e.target.files[0]
    }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);
    setMessage(null);
    
    try {
      const formData = new FormData();
      Object.keys(files).forEach(key => {
        if (files[key]) {
          formData.append(key, files[key]);
        }
      });
      
      const result = await uploadStudentData(formData);
      setMessage({
        type: 'success',
        text: `Data uploaded successfully! ${result.studentsProcessed} students processed.`
      });
      
      // Reset form
      setFiles({
        pass: null,
        cat4: null,
        academic: null
      });
      
    } catch (error) {
      setMessage({
        type: 'error',
        text: `Upload failed: ${error.message}`
      });
    } finally {
      setUploading(false);
    }
  };
  
  return (
    <div className="data-upload">
      <h1>Upload Student Data</h1>
      
      <form onSubmit={handleSubmit}>
        <div className="upload-section">
          <h2>PASS Assessment Data</h2>
          <div className="file-input">
            <label>
              Select PASS CSV file
              <input 
                type="file" 
                accept=".csv" 
                onChange={(e) => handleFileChange(e, 'pass')} 
              />
            </label>
            {files.pass && <div className="file-name">{files.pass.name}</div>}
          </div>
        </div>
        
        <div className="upload-section">
          <h2>CAT4 Assessment Data</h2>
          <div className="file-input">
            <label>
              Select CAT4 CSV file
              <input 
                type="file" 
                accept=".csv" 
                onChange={(e) => handleFileChange(e, 'cat4')} 
              />
            </label>
            {files.cat4 && <div className="file-name">{files.cat4.name}</div>}
          </div>
        </div>
        
        <div className="upload-section">
          <h2>Academic Performance Data</h2>
          <div className="file-input">
            <label>
              Select Academic CSV file
              <input 
                type="file" 
                accept=".csv" 
                onChange={(e) => handleFileChange(e, 'academic')} 
              />
            </label>
            {files.academic && <div className="file-name">{files.academic.name}</div>}
          </div>
        </div>
        
        <button 
          type="submit" 
          className="upload-btn" 
          disabled={uploading || (!files.pass && !files.cat4 && !files.academic)}
        >
          {uploading ? 'Uploading...' : 'Process Data'}
        </button>
        
        {message && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}
      </form>
    </div>
  );
}

export default DataUpload;