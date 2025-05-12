// components/DataUpload.jsx - Updated to include PASS data upload
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';

function DataUpload() {
  const [files, setFiles] = useState({
    asset: null,
    cat4: null,
    pass: null
  });
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);
  const navigate = useNavigate();
  
  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      setFiles(prev => ({
        ...prev,
        [type]: file
      }));
      setMessage(null); // Clear any previous error messages
    }
  };
  
  const processExcelFile = (file, sheetOptions = {}) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = e.target.result;
          const workbook = XLSX.read(data, { type: 'array' });
          
          // Process as requested in sheetOptions
          if (sheetOptions.processAllSheets) {
            // Process all sheets and combine data
            const allData = [];
            workbook.SheetNames.forEach(sheetName => {
              const worksheet = workbook.Sheets[sheetName];
              const sheetData = XLSX.utils.sheet_to_json(worksheet);
              
              // Add sheet name as a field to each row
              sheetData.forEach(row => {
                row._sheetName = sheetName;
              });
              
              allData.push(...sheetData);
            });
            resolve(allData);
          } else {
            // Just process the first sheet (default behavior)
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);
            resolve(jsonData);
          }
        } catch (error) {
          console.error("Error processing Excel file:", error);
          reject(error);
        }
      };
      
      reader.onerror = (error) => {
        console.error("FileReader error:", error);
        reject(error);
      };
      
      reader.readAsArrayBuffer(file);
    });
  };
  
  const processStudentData = (assetData, cat4Data, passData) => {
    console.log("Processing asset data:", assetData);
    console.log("Processing CAT4 data:", cat4Data);
    console.log("Processing PASS data:", passData);
    
    // Create a map to store student data by ID
    const studentMap = new Map();
    
    // Process Asset data if available
    if (assetData && assetData.length > 0) {
      assetData.forEach(row => {
        // Make sure we have a student ID
        const studentId = row['Student ID'] || row['UPM'] || row['studentId'];
        if (!studentId) return;
        
        // Create or get student object
        let student = studentMap.get(studentId.toString()) || {
          student_id: studentId.toString(),
          name: row['Name'] || row['Aaisha Khanam'] || 'Unknown',
          grade: row['Grade'] || row['Group']?.toString().substring(0, 1) || '',
          section: row['Section'] || row['Group']?.toString().substring(1) || '',
          academicData: { subjects: {} }
        };
        
        // Extract subject data
        const subjects = student.academicData.subjects;
        
        // Find English data
        if (row['ASSET Eng Score'] || row['ASSET Eng Percentile']) {
          subjects['English'] = subjects['English'] || {};
          Object.assign(subjects['English'], {
            asset_score: parseFloat(row['ASSET Eng Score'] || 0),
            asset_stanine: parseInt(row['ASSET Eng Percentile'] || 5),
            asset_percentile: parseInt(row['ASSET Eng Percentile'] || 50),
            level: getLevelFromStanine(parseInt(row['ASSET Eng Percentile'] || 5)),
            mark: parseFloat(row['Term1 2023-24'] || 0),
            stanine: calculateStanine(parseFloat(row['Term1 2023-24'] || 0)),
            comparison: comparePerformance(
              calculateStanine(parseFloat(row['Term1 2023-24'] || 0)),
              parseInt(row['ASSET Eng Percentile'] || 5)
            )
          });
        }
        
        // Find Math data
        if (row['ASSET Maths Score'] || row['ASSET Maths Percentile']) {
          subjects['Mathematics'] = subjects['Mathematics'] || {};
          Object.assign(subjects['Mathematics'], {
            asset_score: parseFloat(row['ASSET Maths Score'] || 0),
            asset_stanine: parseInt(row['ASSET Maths Percentile'] || 5),
            asset_percentile: parseInt(row['ASSET Maths Percentile'] || 50),
            level: getLevelFromStanine(parseInt(row['ASSET Maths Percentile'] || 5)),
            mark: parseFloat(row['Term1 2023-24'] || 0),
            stanine: calculateStanine(parseFloat(row['Term1 2023-24'] || 0)),
            comparison: comparePerformance(
              calculateStanine(parseFloat(row['Term1 2023-24'] || 0)),
              parseInt(row['ASSET Maths Percentile'] || 5)
            )
          });
        }
        
        // Find Science data
        if (row['ASSET Sci Score'] || row['ASSET Sci Percentile']) {
          subjects['Science'] = subjects['Science'] || {};
          Object.assign(subjects['Science'], {
            asset_score: parseFloat(row['ASSET Sci Score'] || 0),
            asset_stanine: parseInt(row['ASSET Sci Percentile'] || 5),
            asset_percentile: parseInt(row['ASSET Sci Percentile'] || 50),
            level: getLevelFromStanine(parseInt(row['ASSET Sci Percentile'] || 5)),
            mark: parseFloat(row['Term1 2023-24'] || 0),
            stanine: calculateStanine(parseFloat(row['Term1 2023-24'] || 0)),
            comparison: comparePerformance(
              calculateStanine(parseFloat(row['Term1 2023-24'] || 0)),
              parseInt(row['ASSET Sci Percentile'] || 5)
            )
          });
        }
        
        // Update student record
        studentMap.set(studentId.toString(), student);
      });
    }
    
    // Process CAT4 data if available
    if (cat4Data && cat4Data.length > 0) {
      cat4Data.forEach(row => {
        const studentId = row['Student ID'] || row['UPM'] || row['studentId'];
        if (!studentId) return;
        
        // Create or get student object
        let student = studentMap.get(studentId.toString()) || {
          student_id: studentId.toString(),
          name: row['Name'] || 'Unknown',
          grade: row['Grade'] || row['Group']?.toString().substring(0, 1) || '',
          section: row['Section'] || row['Group']?.toString().substring(1) || '',
          academicData: { subjects: {} }
        };
        
        // Extract CAT4 domain data
        const verbalReasoning = parseInt(row['Verbal'] || row['Verbal SAS'] || 
                                        row['Verbal Reasoning'] || 5);
        
        const quantReasoning = parseInt(row['Quantitative'] || row['Quantitative SAS'] || 
                                       row['Quantitative Reasoning'] || 5);
        
        const nonverbalReasoning = parseInt(row['Non-verbal'] || row['Non-verbal SAS'] || 
                                          row['Nonverbal Reasoning'] || 5);
        
        const spatialReasoning = parseInt(row['Spatial'] || row['Spatial SAS'] || 
                                         row['Spatial Ability'] || 5);
        
        // Convert SAS scores to stanines if present
        const verbalStanine = sasToStanine(verbalReasoning);
        const quantStanine = sasToStanine(quantReasoning);
        const nonverbalStanine = sasToStanine(nonverbalReasoning);
        const spatialStanine = sasToStanine(spatialReasoning);
        
        // Calculate if student is a fragile learner (stanine ≤ 3 in 2+ domains)
        const domainScores = [verbalStanine, quantStanine, nonverbalStanine, spatialStanine];
        const weakDomains = domainScores.filter(stanine => stanine <= 3).length;
        
        student.cat4Data = {
          isFragileLearner: weakDomains >= 2,
          domains: [
            {
              name: 'Verbal Reasoning',
              stanine: verbalStanine,
              sas: verbalReasoning,
              level: getLevelFromStanine(verbalStanine)
            },
            {
              name: 'Quantitative Reasoning',
              stanine: quantStanine,
              sas: quantReasoning,
              level: getLevelFromStanine(quantStanine)
            },
            {
              name: 'Nonverbal Reasoning',
              stanine: nonverbalStanine,
              sas: nonverbalReasoning,
              level: getLevelFromStanine(nonverbalStanine)
            },
            {
              name: 'Spatial Reasoning',
              stanine: spatialStanine,
              sas: spatialReasoning,
              level: getLevelFromStanine(spatialStanine)
            }
          ]
        };
        
        // Add mean SAS/stanine if available
        if (row['Mean SAS']) {
          student.cat4Data.meanSAS = parseInt(row['Mean SAS']);
          student.cat4Data.meanStanine = sasToStanine(parseInt(row['Mean SAS']));
        }
        
        // Add verbal profile if available
        if (row['Verbal Spatial Profile']) {
          student.cat4Data.verbalProfile = row['Verbal Spatial Profile'];
        }
        
        studentMap.set(studentId.toString(), student);
      });
    }
    
    // Process PASS data if available
    if (passData && passData.length > 0) {
      passData.forEach(row => {
        // Try to find student ID from various possible column names
        const studentId = row['Student ID'] || row['UPM'] || row['studentId'];
        if (!studentId) return;
        
        // Create or get student object
        let student = studentMap.get(studentId.toString()) || {
          student_id: studentId.toString(),
          name: row['Name'] || 'Unknown',
          grade: row['Grade'] || row['Group']?.toString().substring(0, 1) || '',
          section: row['Section'] || row['Group']?.toString().substring(1) || '',
          academicData: { subjects: {} }
        };
        
        // Extract PASS factor data - these are the 9 PASS factors
        const passFactors = {
          perceived_learning: parseFloat(row['Perceived learning capability'] || 0),
          self_regard: parseFloat(row['Self-regard as a learner'] || 0),
          preparedness: parseFloat(row['Preparedness for learning'] || 0),
          general_work_ethic: parseFloat(row['General work ethic'] || 0),
          confidence_learning: parseFloat(row['Confidence in learning'] || 0),
          attitude_teachers: parseFloat(row['Attitude to teachers'] || 0),
          attitude_attendance: parseFloat(row['Attitude to attendance'] || 0),
          response_curriculum: parseFloat(row['Response to curriculum demands'] || 0),
          feelings_school: parseFloat(row['Feelings about school'] || 0)
        };
        
        // Find risk areas (factors below 40th percentile)
        const riskAreas = [];
        for (const [factor, value] of Object.entries(passFactors)) {
          if (value < 40 && value > 0) {
            riskAreas.push({
              factor: factor.replace(/_/g, ' '),
              percentile: value,
              level: 'at-risk'
            });
          }
        }
        
        // Create PASS data structure
        student.passData = {
          factors: Object.entries(passFactors).filter(([_, value]) => value > 0).map(([factor, percentile]) => ({
            name: factor.replace(/_/g, ' '),
            percentile,
            level: percentile < 40 ? 'at-risk' : percentile >= 65 ? 'strength' : 'balanced'
          })),
          riskAreas: riskAreas
        };
        
        studentMap.set(studentId.toString(), student);
      });
    }
    
    // Extract student data from the map
    const students = Array.from(studentMap.values());
    
    // Generate interventions for each student
    students.forEach(student => {
      student.interventions = generateInterventions(student);
      
      // Ensure PASS data is initialized if not present
      if (!student.passData) {
        student.passData = {
          factors: [],
          riskAreas: []
        };
      }
    });
    
    return students;
  };
  
  // Helper function to convert SAS scores to stanines
  const sasToStanine = (sas) => {
    if (sas >= 126) return 9;
    if (sas >= 119) return 8;
    if (sas >= 112) return 7;
    if (sas >= 104) return 6;
    if (sas >= 97) return 5;
    if (sas >= 89) return 4;
    if (sas >= 82) return 3;
    if (sas >= 74) return 2;
    return 1;
  };
  
  // Helper function to calculate stanine from percentage
  const calculateStanine = (percentage) => {
    if (percentage >= 96) return 9;
    if (percentage >= 89) return 8;
    if (percentage >= 77) return 7;
    if (percentage >= 60) return 6;
    if (percentage >= 40) return 5;
    if (percentage >= 23) return 4;
    if (percentage >= 11) return 3;
    if (percentage >= 4) return 2;
    return 1;
  };
  
  // Helper function to compare performance with expected level
  const comparePerformance = (actualStanine, expectedStanine) => {
    if (actualStanine >= expectedStanine + 2) return 'Better Than Expected';
    if (actualStanine <= expectedStanine - 2) return 'Below Expected';
    return 'Meets Expectation';
  };
  
  // Helper function to find a value by partial key match
  const findValueByPartialKey = (obj, partialKey) => {
    const key = Object.keys(obj).find(k => 
      k.toLowerCase().includes(partialKey.toLowerCase())
    );
    return key ? obj[key] : null;
  };
  
  const getLevelFromStanine = (stanine) => {
    if (stanine <= 3) return 'weakness';
    if (stanine >= 7) return 'strength';
    return 'average';
  };
  
  const generateInterventions = (student) => {
    const interventions = [];
    
    // PASS-based interventions
    if (student.passData && student.passData.factors.length > 0) {
      student.passData.factors.forEach(factor => {
        if (factor.level === 'at-risk') {
          switch (factor.name) {
            case 'self regard as a learner':
              interventions.push({
                domain: 'emotional',
                factor: 'Self-Regard',
                title: 'Self-Esteem Building',
                description: 'Weekly sessions focusing on identifying and celebrating strengths. Include positive affirmation activities and reflective journaling.',
                priority: 'high'
              });
              break;
            case 'attitude to teachers':
              interventions.push({
                domain: 'emotional',
                factor: 'Attitude to Teachers',
                title: 'Teacher-Student Mediation',
                description: 'Facilitated discussion between student and teachers to address concerns and establish mutual respect and understanding.',
                priority: 'medium'
              });
              break;
            case 'general work ethic':
              interventions.push({
                domain: 'emotional',
                factor: 'Work Ethic',
                title: 'Academic Coaching',
                description: 'Weekly sessions to develop organizational skills, time management, and task prioritization strategies.',
                priority: 'high'
              });
              break;
            case 'feelings about school':
              interventions.push({
                domain: 'emotional',
                factor: 'School Engagement',
                title: 'School Connection Program',
                description: 'Regular check-ins and involvement in school activities to build positive associations with the school environment.',
                priority: 'medium'
              });
              break;
            case 'confidence in learning':
              interventions.push({
                domain: 'emotional',
                factor: 'Learning Confidence',
                title: 'Success Experiences',
                description: 'Structured learning activities designed to provide guaranteed success experiences and build confidence.',
                priority: 'medium'
              });
              break;
            case 'preparedness for learning':
              interventions.push({
                domain: 'academic',
                factor: 'Learning Preparedness',
                title: 'Study Skills Training',
                description: 'Focused instruction on study techniques, materials organization, and preparation routines.',
                priority: 'medium'
              });
              break;
          }
        }
      });
    }
    
    // CAT4-based interventions
    if (student.cat4Data) {
      // Fragile learner intervention
      if (student.cat4Data.isFragileLearner) {
        interventions.push({
          domain: 'cognitive',
          factor: 'Fragile Learner',
          title: 'Comprehensive Learning Support',
          description: 'Multi-faceted approach combining cognitive scaffolding, additional processing time, and alternative assessment options.',
          priority: 'high'
        });
      }
      
      // Domain-specific interventions
      student.cat4Data.domains.forEach(domain => {
        if (domain.level === 'weakness') {
          switch (domain.name) {
            case 'Verbal Reasoning':
              interventions.push({
                domain: 'cognitive',
                factor: 'Verbal Reasoning',
                title: 'Verbal Skills Development',
                description: 'Explicit instruction in vocabulary development, reading comprehension strategies, and verbal expression.',
                priority: 'medium'
              });
              break;
            case 'Quantitative Reasoning':
              interventions.push({
                domain: 'cognitive',
                factor: 'Quantitative Reasoning',
                title: 'Numeracy Intervention',
                description: 'Targeted support for numerical operations, mathematical vocabulary, and quantitative problem-solving.',
                priority: 'medium'
              });
              break;
            case 'Nonverbal Reasoning':
              interventions.push({
                domain: 'cognitive',
                factor: 'Nonverbal Reasoning',
                title: 'Pattern Recognition Training',
                description: 'Activities focused on identifying patterns, relationships, and solving abstract problems without language.',
                priority: 'medium'
              });
              break;
            case 'Spatial Reasoning':
              interventions.push({
                domain: 'cognitive',
                factor: 'Spatial Reasoning',
                title: 'Spatial Skills Activities',
                description: 'Structured practice with mental rotation, spatial visualization, and understanding 3D relationships.',
                priority: 'medium'
              });
              break;
          }
        }
      });
    }
    
    // Academic interventions based on comparison
    const subjects = student.academicData?.subjects || {};
    for (const [subject, data] of Object.entries(subjects)) {
      if (data.comparison && data.comparison.includes('Below Expected')) {
        interventions.push({
          domain: 'academic',
          factor: `${subject} Performance`,
          title: `${subject} Academic Support`,
          description: `Targeted tutoring focusing on foundational skills and knowledge gaps identified through assessment in ${subject}.`,
          priority: 'high'
        });
      }
    }
    
    return interventions;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);
    setMessage({ type: 'info', text: 'Processing data, please wait...' });
    setDebugInfo(null);
    
    try {
      if (!files.asset && !files.cat4 && !files.pass) {
        throw new Error('Please upload at least one file (Asset, CAT4, or PASS)');
      }
      
      // Process the Excel files
      let assetData = null;
      let cat4Data = null;
      let passData = null;
      
      if (files.asset) {
        assetData = await processExcelFile(files.asset);
        console.log('Processed Asset data:', assetData);
      }
      
      if (files.cat4) {
        cat4Data = await processExcelFile(files.cat4);
        console.log('Processed CAT4 data:', cat4Data);
      }
      
      if (files.pass) {
        // Process all sheets in the PASS file
        passData = await processExcelFile(files.pass, { processAllSheets: true });
        console.log('Processed PASS data:', passData);
      }
      
      // Process and merge the data
      const processedData = processStudentData(assetData, cat4Data, passData);
      console.log('Processed student data:', processedData);
      
      if (processedData.length === 0) {
        // Show debugging information if no students were processed
        setDebugInfo({
          assetData: assetData ? assetData.slice(0, 5) : null,
          cat4Data: cat4Data ? cat4Data.slice(0, 5) : null,
          passData: passData ? passData.slice(0, 5) : null
        });
        throw new Error('No student data could be extracted from the files. Please check the file format and try again.');
      }
      
      // Store the processed data in localStorage
      localStorage.setItem('studentData', JSON.stringify(processedData));
      
      setMessage({
        type: 'success',
        text: `Data processed successfully! ${processedData.length} students processed.`
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
    } finally {
      setUploading(false);
    }
  };
  
  return (
    <div className="data-upload">
      <h1>Upload Student Data</h1>
      
      <div className="upload-card">
        <h2>Upload Data Files</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="upload-section">
            <h3>Asset Data (.xlsx)</h3>
            <div className="file-input">
              <label>
                Select Asset Excel file
                <input 
                  type="file" 
                  accept=".xlsx,.xls" 
                  onChange={(e) => handleFileChange(e, 'asset')} 
                />
              </label>
              {files.asset && <div className="file-name">{files.asset.name}</div>}
            </div>
          </div>
          
          <div className="upload-section">
            <h3>CAT4 Data (.xlsx)</h3>
            <div className="file-input">
              <label>
                Select CAT4 Excel file
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
            <h3>PASS Data (.xlsx)</h3>
            <div className="file-input">
              <label>
                Select PASS Excel file
                <input 
                  type="file" 
                  accept=".xlsx,.xls" 
                  onChange={(e) => handleFileChange(e, 'pass')} 
                />
              </label>
              {files.pass && <div className="file-name">{files.pass.name}</div>}
            </div>
          </div>
          
          {message && (
            <div className={`message ${message.type}`}>
              {message.text}
            </div>
          )}
          
          <button 
            type="submit" 
            className="upload-btn" 
            disabled={uploading || (!files.asset && !files.cat4 && !files.pass)}
          >
            {uploading ? 'Processing...' : 'Process Data'}
          </button>
        </form>
      </div>
      
      {debugInfo && (
        <div className="debug-info">
          <h3>Debug Information</h3>
          <p>This information can help identify issues with your data format:</p>
          
          {debugInfo.assetData && (
            <div>
              <h4>Asset Data Sample (First 5 rows):</h4>
              <pre>{JSON.stringify(debugInfo.assetData, null, 2)}</pre>
            </div>
          )}
          
          {debugInfo.cat4Data && (
            <div>
              <h4>CAT4 Data Sample (First 5 rows):</h4>
              <pre>{JSON.stringify(debugInfo.cat4Data, null, 2)}</pre>
            </div>
          )}
          
          {debugInfo.passData && (
            <div>
              <h4>PASS Data Sample (First 5 rows):</h4>
              <pre>{JSON.stringify(debugInfo.passData, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
      
      <div className="sample-section">
        <h2>Expected Data Format</h2>
        
        <div className="format-info">
          <h3>Asset File Format:</h3>
          <p>Should contain student IDs and assessment scores:</p>
          <ul>
            <li>Student ID (or UPM)</li>
            <li>Subject scores and percentiles (ASSET Eng Score, ASSET Maths Score, etc.)</li>
            <li>Term marks (Term1 2023-24)</li>
          </ul>
        </div>
        
        <div className="format-info">
          <h3>CAT4 File Format:</h3>
          <p>Should contain cognitive abilities data:</p>
          <ul>
            <li>Student ID (or UPM)</li>
            <li>Verbal, Quantitative, Non-verbal, and Spatial SAS scores</li>
            <li>Mean SAS score</li>
            <li>Verbal Spatial Profile</li>
          </ul>
        </div>
        
        <div className="format-info">
          <h3>PASS File Format:</h3>
          <p>Should contain student attitudes data with multiple sheets (one per class):</p>
          <ul>
            <li>Student ID (or UPM)</li>
            <li>PASS factor percentiles: Perceived learning capability, Self-regard as a learner, etc.</li>
            <li>Each sheet represents a different class section (e.g., 7A, 7B, 7C)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default DataUpload;