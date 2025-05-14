/**
 * ImprovedDataProcessor.js
 * A comprehensive data processing utility for student analytics
 * Handles integration of PASS, CAT4, and academic data to identify fragile learners
 * and generate appropriate intervention strategies
 */

import * as XLSX from 'xlsx';

class ImprovedDataProcessor {
  constructor() {
    // Thresholds for risk identification
    this.passRiskThreshold = 40; // Below 40 percentile is considered at risk
    this.passStrengthThreshold = 70; // Above 70 percentile is considered a strength
    this.cat4WeaknessThreshold = 3; // Stanine 3 or below is a weakness
    this.cat4StrengthThreshold = 7; // Stanine 7 or above is a strength
    
    // Define PASS factor descriptions for reference
    this.passFactorDescriptions = {
      self_regard: 'How positive a student feels about themselves as a learner and their ability to achieve.',
      perceived_learning: 'How the student perceives their learning capabilities and intelligence.',
      attitude_teachers: 'How the student perceives their relationships with teachers.',
      general_work_ethic: 'The student\'s approach to schoolwork and sense of responsibility for learning.',
      confidence_learning: 'How confident the student feels about handling the learning process.',
      preparedness: 'The extent to which a student feels prepared and organized for learning.',
      emotional_control: 'The student\'s ability to manage their emotional response to setbacks and challenges.',
      social_confidence: 'How comfortable the student feels in social interactions with peers.',
      curriculum_demand: 'The student\'s perception of whether they can cope with learning demands.'
    };
    
    // Define CAT4 domain descriptions
    this.cat4DomainDescriptions = {
      verbal_reasoning: 'The ability to understand and analyze words, verbal concepts, and extract information from text.',
      quantitative_reasoning: 'The ability to understand and solve problems using numbers and mathematical concepts.',
      nonverbal_reasoning: 'The ability to analyze visual information and solve problems using patterns and visual logic.',
      spatial_reasoning: 'The ability to manipulate shapes and understand spatial relationships in two and three dimensions.'
    };
  }

  /**
   * Process multiple data files and generate complete student analyses
   */
  async processFiles(passFile, cat4File, assetFile) {
    try {
      // Process each file if provided
      const passData = passFile ? await this.processPassFile(passFile) : [];
      const cat4Data = cat4File ? await this.processCat4File(cat4File) : [];
      const assetData = assetFile ? await this.processAssetFile(assetFile) : [];

      console.log(`Processed data counts: PASS=${passData.length}, CAT4=${cat4Data.length}, ASSET=${assetData.length}`);

      // Merge all data sources based on student ID
      const mergedData = this.mergeStudentRecords(passData, cat4Data, assetData);
      console.log(`Merged student count: ${mergedData.length}`);

      // Analyze and generate interventions
      const analyzedData = this.analyzeStudentData(mergedData);
      
      // Calculate some statistics for verification
      const fragileCount = analyzedData.filter(s => s.cat4_analysis.is_fragile_learner).length;
      const passRiskCount = analyzedData.filter(s => s.pass_analysis.available && s.pass_analysis.riskAreas.length > 0).length;
      const cat4WeaknessCount = analyzedData.filter(s => s.cat4_analysis.available && s.cat4_analysis.weaknessAreas.length > 0).length;
      
      console.log(`Analysis complete: Fragile learners=${fragileCount}, PASS risk=${passRiskCount}, CAT4 weakness=${cat4WeaknessCount}`);

      return analyzedData;
    } catch (error) {
      console.error("Error processing files:", error);
      throw error;
    }
  }

  /**
   * Process Excel files with support for multiple sheets
   */
  async processExcelFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = e.target.result;
          const workbook = XLSX.read(data, { type: 'array' });
          const sheets = {};
          
          // Process all sheets in the workbook
          workbook.SheetNames.forEach(sheetName => {
            const worksheet = workbook.Sheets[sheetName];
            const sheetData = XLSX.utils.sheet_to_json(worksheet);
            sheets[sheetName] = sheetData;
          });
          
          resolve(sheets);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Process PASS data file
   */
  async processPassFile(file) {
    const sheets = await this.processExcelFile(file);
    let allPassData = [];
    
    // Combine data from all sheets
    Object.values(sheets).forEach(sheetData => {
      const processedSheetData = sheetData.map(row => {
        // Extract student ID - handle different possible column names
        const studentId = row['Student ID'] || row['UPM'] || row['studentId'];
        if (!studentId) return null;
        
        // Extract student name and grade information
        const name = row['Name'] || row['Student Name'] || 'Unknown';
        const grade = row['Grade'] || row['Year Group'] || '';
        const section = row['Section'] || row['Class'] || row['Group'] || '';
        
        // Extract PASS factors - normalize column names
        // The key insight from the PASS document is identifying the 9 attitudinal factors
        const factors = {
          // Factor 1: Self-regard as a learner
          self_regard: parseFloat(row['Self-regard as a learner'] || row['Self Regard'] || row['Self-Regard'] || 0),
          
          // Factor 2: Perceived learning capability
          perceived_learning: parseFloat(row['Perceived learning capability'] || row['Perceived Learning'] || row['Perceived Learning Capability'] || 0),
          
          // Factor 3: Attitude to teachers
          attitude_teachers: parseFloat(row['Attitude to teachers'] || row['Attitude Teachers'] || row['Attitude to Teachers'] || 0),
          
          // Factor 4: General work ethic
          general_work_ethic: parseFloat(row['General work ethic'] || row['Work Ethic'] || row['General Work Ethic'] || 0),
          
          // Factor 5: Confidence in learning
          confidence_learning: parseFloat(row['Confidence in learning'] || row['Learning Confidence'] || row['Confidence in Learning'] || 0),
          
          // Factor 6: Preparedness for learning
          preparedness: parseFloat(row['Preparedness for learning'] || row['Preparedness'] || row['Preparedness for Learning'] || 0),
          
          // Factor 7: Attitude to attendance
          attitude_attendance: parseFloat(row['Attitude to attendance'] || row['Attendance Attitude'] || 0),
          
          // Factor 8: Response to curriculum demands
          curriculum_demand: parseFloat(row['Response to curriculum demands'] || row['Curriculum Demand'] || row['Curriculum Demands'] || 0),
          
          // Factor 9: Feelings about school
          feelings_school: parseFloat(row['Feelings about school'] || row['School Feelings'] || 0)
        };
        
        // Calculate total PASS score as an average of available factors
        const validFactors = Object.values(factors).filter(val => val > 0);
        const passTotal = validFactors.length ? validFactors.reduce((a, b) => a + b, 0) / validFactors.length : 0;
        
        // Create student record
        return {
          student_id: studentId.toString(),
          name: name,
          grade: grade,
          section: section,
          pass_data: {
            factors: factors,
            pass_total: passTotal,
            raw_data: row // Store original data for reference
          }
        };
      }).filter(item => item !== null);
      
      allPassData = [...allPassData, ...processedSheetData];
    });
    
    return allPassData;
  }

  /**
   * Process CAT4 data file
   */
  async processCat4File(file) {
    const sheets = await this.processExcelFile(file);
    let allCat4Data = [];
    
    // Process each sheet (might be multiple grade levels)
    Object.values(sheets).forEach(sheetData => {
      const processedData = sheetData.map(row => {
        // Extract student ID
        const studentId = row['Student ID'] || row['UPM'] || row['studentId'];
        if (!studentId) return null;
        
        // Extract student info
        const name = row['Name'] || row['Student Name'] || 'Unknown';
        const grade = row['Grade'] || row['Year Group'] || '';
        const section = row['Section'] || row['Class'] || row['Group'] || '';
        
        // Extract CAT4 domain scores
        // Handle possible different column names or formats
        const verbalScore = row['Verbal Reasoning'] || row['Verbal SAS'] || row['Verbal'] || 0;
        const quantScore = row['Quantitative Reasoning'] || row['Quantitative SAS'] || row['Quantitative'] || 0;
        const nonVerbalScore = row['Non-verbal Reasoning'] || row['Non-verbal SAS'] || row['Non-verbal'] || 0;
        const spatialScore = row['Spatial Ability'] || row['Spatial SAS'] || row['Spatial'] || 0;
        
        // Check if scores are SAS format (typically 70-140 range) or stanine (1-9)
        const isSASFormat = verbalScore > 9 || quantScore > 9 || nonVerbalScore > 9 || spatialScore > 9;
        
        // Convert to stanines if in SAS format
        const verbalStanine = isSASFormat ? this.sasToStanine(verbalScore) : parseInt(verbalScore);
        const quantStanine = isSASFormat ? this.sasToStanine(quantScore) : parseInt(quantScore);
        const nonVerbalStanine = isSASFormat ? this.sasToStanine(nonVerbalScore) : parseInt(nonVerbalScore);
        const spatialStanine = isSASFormat ? this.sasToStanine(spatialScore) : parseInt(spatialScore);
        
        // Record original format
        const scoreFormat = isSASFormat ? 'SAS' : 'Stanine';
        
        return {
          student_id: studentId.toString(),
          name: name,
          grade: grade,
          section: section,
          cat4_data: {
            verbal_reasoning: verbalStanine,
            quantitative_reasoning: quantStanine,
            nonverbal_reasoning: nonVerbalStanine,
            spatial_reasoning: spatialStanine,
            mean_sas: row['Mean SAS'] || null,
            verbal_profile: row['Verbal Spatial Profile'] || null,
            score_format: scoreFormat,
            raw_data: row // Store original data for reference
          }
        };
      }).filter(item => item !== null);
      
      allCat4Data = [...allCat4Data, ...processedData];
    });
    
    return allCat4Data;
  }

  /**
   * Process academic/ASSET data file
   */
  async processAssetFile(file) {
    const sheets = await this.processExcelFile(file);
    let allAssetData = [];
    
    // Process each sheet
    Object.values(sheets).forEach(sheetData => {
      const processedData = sheetData.map(row => {
        // Extract student ID
        const studentId = row['Student ID'] || row['UPM'] || row['studentId'];
        if (!studentId) return null;
        
        // Extract student info
        const name = row['Name'] || row['Student Name'] || 'Unknown';
        const grade = row['Grade'] || row['Year Group'] || '';
        const section = row['Section'] || row['Class'] || row['Group'] || '';
        
        // Extract academic data - handle different possible formats
        const subjects = {};
        
        // Process English
        if (row['ASSET Eng Score'] !== undefined || row['English_Marks'] !== undefined || 
            row['English Marks'] !== undefined || row['English'] !== undefined) {
          subjects['English'] = {
            mark: parseFloat(row['ASSET Eng Score'] || row['English_Marks'] || row['English Marks'] || row['English'] || 0),
            percentile: parseFloat(row['ASSET Eng Percentile'] || row['English Percentile'] || 0),
            stanine: this._getSubjectStanine(row, 'English')
          };
        }
        
        // Process Math
        if (row['ASSET Maths Score'] !== undefined || row['Math_Marks'] !== undefined || 
            row['Math Marks'] !== undefined || row['Mathematics'] !== undefined) {
          subjects['Mathematics'] = {
            mark: parseFloat(row['ASSET Maths Score'] || row['Math_Marks'] || row['Math Marks'] || row['Mathematics'] || 0),
            percentile: parseFloat(row['ASSET Maths Percentile'] || row['Math Percentile'] || 0),
            stanine: this._getSubjectStanine(row, 'Math')
          };
        }
        
        // Process Science
        if (row['ASSET Sci Score'] !== undefined || row['Science_Marks'] !== undefined || 
            row['Science Marks'] !== undefined || row['Science'] !== undefined) {
          subjects['Science'] = {
            mark: parseFloat(row['ASSET Sci Score'] || row['Science_Marks'] || row['Science Marks'] || row['Science'] || 0),
            percentile: parseFloat(row['ASSET Sci Percentile'] || row['Science Percentile'] || 0),
            stanine: this._getSubjectStanine(row, 'Science')
          };
        }
        
        // Process Humanities (if available)
        if (row['Humanities_Marks'] !== undefined || row['Humanities Marks'] !== undefined || 
            row['Humanities'] !== undefined) {
          subjects['Humanities'] = {
            mark: parseFloat(row['Humanities_Marks'] || row['Humanities Marks'] || row['Humanities'] || 0),
            percentile: parseFloat(row['Humanities Percentile'] || 0),
            stanine: this._getSubjectStanine(row, 'Humanities')
          };
        }
        
        return {
          student_id: studentId.toString(),
          name: name,
          grade: grade,
          section: section,
          asset_data: {
            subjects: subjects,
            raw_data: row // Store original data for reference
          }
        };
      }).filter(item => item !== null);
      
      allAssetData = [...allAssetData, ...processedData];
    });
    
    return allAssetData;
  }

  /**
   * Helper to extract or calculate subject stanine from various formats
   */
  _getSubjectStanine(row, subjectPrefix) {
    // Try different possible column formats for stanine
    const stanineVal = row[`${subjectPrefix} Stanine`] || row[`${subjectPrefix}_Stanine`] || 
                       row[`${subjectPrefix.toLowerCase()} stanine`];
    
    if (stanineVal !== undefined) {
      return parseInt(stanineVal);
    }
    
    // If we have a percentile, convert to stanine
    const percentileVal = row[`${subjectPrefix} Percentile`] || row[`${subjectPrefix}_Percentile`] || 
                         row[`${subjectPrefix.toLowerCase()} percentile`] || row[`ASSET ${subjectPrefix} Percentile`];
    
    if (percentileVal !== undefined) {
      return this.percentileToStanine(parseFloat(percentileVal));
    }
    
    // If we have a mark (assuming 0-100 scale), convert to stanine
    const markVal = row[`${subjectPrefix} Marks`] || row[`${subjectPrefix}_Marks`] || 
                   row[`${subjectPrefix.toLowerCase()} marks`] || row[`ASSET ${subjectPrefix} Score`] || 
                   row[subjectPrefix];
    
    if (markVal !== undefined) {
      const mark = parseFloat(markVal);
      // Assuming marks are on scale 0-100, convert appropriately
      if (mark <= 100) {
        return this.percentileToStanine(mark);
      } else {
        // For other scales, try to normalize
        return Math.min(9, Math.max(1, Math.round(mark / 20)));
      }
    }
    
    // Default stanine if no calculation possible
    return 5;
  }

  /**
   * Merge student records from different data sources based on ID
   */
  mergeStudentRecords(passData, cat4Data, assetData) {
    // Create a map to store merged student records
    const studentMap = new Map();
    
    // Helper function to add or merge a student record
    const addOrMergeStudent = (data) => {
      data.forEach(student => {
        const id = student.student_id;
        
        if (studentMap.has(id)) {
          // Merge with existing record
          const existingStudent = studentMap.get(id);
          
          // Handle name and grade consistently 
          const name = student.name !== 'Unknown' ? student.name : existingStudent.name;
          const grade = student.grade || existingStudent.grade;
          const section = student.section || existingStudent.section;
          
          studentMap.set(id, { 
            ...existingStudent, 
            ...student,
            name: name,
            grade: grade,
            section: section
          });
        } else {
          // Add new record
          studentMap.set(id, student);
        }
      });
    };
    
    // Merge all data sources
    addOrMergeStudent(passData);
    addOrMergeStudent(cat4Data);
    addOrMergeStudent(assetData);
    
    // Convert map to array
    return Array.from(studentMap.values());
  }

  /**
   * Analyze complete student dataset and generate insights
   */
  analyzeStudentData(students) {
    return students.map(student => {
      // Analyze PASS data
      const passAnalysis = this.analyzePassData(student);
      
      // Analyze CAT4 data
      const cat4Analysis = this.analyzeCat4Data(student);
      
      // Analyze academic data
      const academicAnalysis = this.analyzeAcademicData(student);
      
      // Compare CAT4 with academic performance
      const performanceComparison = this.comparePerformanceWithPotential(cat4Analysis, academicAnalysis);
      
      // Identify fragile learners using triangulated data
      const isFragileLearner = this.identifyFragileLearner(passAnalysis, cat4Analysis, performanceComparison);
      if (isFragileLearner && cat4Analysis.available) {
        cat4Analysis.is_fragile_learner = true;
      }
      
      // Generate intervention recommendations
      const interventions = this.generateInterventions(passAnalysis, cat4Analysis, academicAnalysis, isFragileLearner);
      
      return {
        student_id: student.student_id,
        name: student.name,
        grade: student.grade,
        section: student.section,
        pass_analysis: passAnalysis,
        cat4_analysis: cat4Analysis,
        academic_analysis: academicAnalysis,
        performance_comparison: performanceComparison,
        is_fragile_learner: isFragileLearner,
        interventions: interventions
      };
    });
  }

  /**
   * Analyze PASS data to identify attitudinal factors affecting learning
   */
  analyzePassData(student) {
    if (!student.pass_data) {
      return { available: false };
    }
    
    const factors = student.pass_data.factors;
    const formattedFactors = [];
    const riskAreas = [];
    const strengthAreas = [];
    
    // Process each PASS factor
    for (const [key, value] of Object.entries(factors)) {
    if (value && value > 0) {
      // Determine risk level based on the thresholds from instruction set
      let level;
      if (value < 45) {  // Updated threshold from 40 to 45
        level = 'at-risk';
        riskAreas.push({
          factor: key.replace(/_/g, ' '),
          percentile: value,
          level: 'at-risk'
        });
      } else if (value >= 65) {  // Updated threshold from 70 to 65
        level = 'strength';
        strengthAreas.push({
          factor: key.replace(/_/g, ' '),
          percentile: value,
          level: 'strength'
        });
      } else {
        level = 'balanced';
      }
      
      formattedFactors.push({
        name: key.replace(/_/g, ' '),
        percentile: value,
        level: level,
        description: this.passFactorDescriptions[key] || ''
      });
    }
  }
    
    // Sort factors by percentile (ascending) so risk areas appear first
    formattedFactors.sort((a, b) => a.percentile - b.percentile);
    
    // Calculate overall PASS status
    let overallStatus = 'Balanced';
    if (riskAreas.length >= 2) {
      overallStatus = 'At Risk';
    } else if (strengthAreas.length > riskAreas.length && strengthAreas.length >= 3) {
      overallStatus = 'Positive';
    }
    
    return {
      available: true,
      factors: formattedFactors,
      riskAreas: riskAreas,
      strengthAreas: strengthAreas,
      overallStatus: overallStatus
    };
  }

  /**
   * Analyze CAT4 data to assess cognitive abilities
   */
  analyzeCat4Data(student) {
    if (!student.cat4_data) {
      return { available: false };
    }
    
    const domains = [];
    const weaknessAreas = [];
    const strengthAreas = [];
    
    // Process each CAT4 domain
    const cat4Domains = [
      { key: 'verbal_reasoning', name: 'Verbal Reasoning' },
      { key: 'quantitative_reasoning', name: 'Quantitative Reasoning' },
      { key: 'nonverbal_reasoning', name: 'Nonverbal Reasoning' },
      { key: 'spatial_reasoning', name: 'Spatial Reasoning' }
    ];
    
    // Count domains with SAS < 90 for fragile learner identification
    let weakDomainCount = 0;
    
    cat4Domains.forEach(domain => {
      // Get SAS score (convert stanine to SAS if needed)
      let sas = student.cat4_data[domain.key];
      let stanine = this.sasToStanine(sas);
      
      // Convert to SAS scale if it's already in stanine (1-9)
      if (sas >= 1 && sas <= 9) {
        stanine = sas;
        sas = this.stanineToSas(stanine);
      }
      
      // Determine level based on SAS score using instruction set thresholds
      let level;
      if (sas < 90) {
        level = 'weakness';
        weakDomainCount++;
        weaknessAreas.push({
          domain: domain.name,
          sas: sas,
          stanine: stanine,
          level: 'weakness'
        });
      } else if (sas > 110) {
        level = 'strength';
        strengthAreas.push({
          domain: domain.name,
          sas: sas,
          stanine: stanine,
          level: 'strength'
        });
      } else {
        level = 'balanced';
      }
      
      domains.push({
        name: domain.name,
        sas: sas,
        stanine: stanine,
        level: level,
        description: this.cat4DomainDescriptions[domain.key] || ''
      });
    });
    
    // Determine fragile learner status based on instruction set
    const isFragileLearner = weakDomainCount >= 2;
    
    // Calculate cognitive profile based on relative stanine scores
    let cognitiveProfile = 'Balanced';
    if (weaknessAreas.length > strengthAreas.length) {
      cognitiveProfile = 'Challenging';
    } else if (strengthAreas.length > weaknessAreas.length) {
      cognitiveProfile = 'Strong';
    }
    
    return {
      available: true,
      domains: domains,
      weaknessAreas: weaknessAreas,
      strengthAreas: strengthAreas,
      is_fragile_learner: isFragileLearner,
      cognitiveProfile: cognitiveProfile
    };
  }

  // Helper functions for SAS/stanine conversion
  stanineToSas(stanine) {
    // Convert stanine (1-9) to SAS (60-140)
    const sasValues = [74, 81, 88, 96, 103, 112, 119, 127, 141];
    return sasValues[Math.min(Math.max(stanine - 1, 0), 8)];
  }

  sasToStanine(sas) {
    // Convert SAS (60-140) to stanine (1-9)
    if (sas >= 126) return 9;
    if (sas >= 119) return 8;
    if (sas >= 112) return 7;
    if (sas >= 104) return 6; 
    if (sas >= 97) return 5;
    if (sas >= 89) return 4;
    if (sas >= 82) return 3;
    if (sas >= 74) return 2;
    return 1;
  }

  /**
   * Analyze academic data to assess performance
   */
  analyzeAcademicData(student) {
  if (!student.asset_data) {
    return { available: false };
  }
  
  const subjects = [];
  
  // Process academic subjects
  for (const [subject, data] of Object.entries(student.asset_data.subjects)) {
    // Ensure we have a stanine value (1-9)
    let stanine = data.stanine;
    if (!stanine && data.mark) {
      // Convert percentage mark to stanine if stanine not provided
      stanine = this.percentileToStanine(data.mark);
    }
    
    // Determine level based on stanine using instruction set thresholds
    let level;
    if (stanine <= 3) {
      level = 'weakness';
    } else if (stanine >= 7) {
      level = 'strength';
    } else {
      level = 'balanced';
    }
    
    subjects.push({
      name: subject,
      mark: data.mark,
      stanine: stanine,
      level: level,
      percentile: data.percentile
    });
  }
  
  // Calculate average academic performance
  const avgStanine = subjects.length > 0 
    ? subjects.reduce((sum, subj) => sum + subj.stanine, 0) / subjects.length 
    : 0;
  
  // Academic profile based on average stanine
  let academicProfile = 'Average';
  if (avgStanine <= 3.5) {
    academicProfile = 'Low';
  } else if (avgStanine >= 6.5) {
    academicProfile = 'High';
  }
  
  return {
    available: true,
    subjects: subjects,
    averageStanine: avgStanine,
    academicProfile: academicProfile
  };
}

// Helper function to convert percentile to stanine
percentileToStanine(percentile) {
  // Convert percentage (0-100) to stanine (1-9)
  if (percentile >= 96) return 9;
  if (percentile >= 89) return 8;
  if (percentile >= 77) return 7;
  if (percentile >= 60) return 6;
  if (percentile >= 40) return 5;
  if (percentile >= 23) return 4;
  if (percentile >= 11) return 3;
  if (percentile >= 4) return 2;
  return 1;
}

  /**
   * Compare academic performance with cognitive potential
   */
  comparePerformanceWithPotential(cat4Analysis, academicAnalysis) {
    if (!cat4Analysis.available || !academicAnalysis.available) {
      return { available: false };
    }
    
    const comparisons = {};
    
    // Get average CAT4 stanine as baseline potential
    const cat4Stanines = cat4Analysis.domains.map(d => d.stanine);
    const avgCat4Stanine = cat4Stanines.reduce((a, b) => a + b, 0) / cat4Stanines.length;
    
    // Compare each subject with relevant CAT4 domain
    academicAnalysis.subjects.forEach(subject => {
      let relevantCat4 = 0;
      
      // Match subject to most relevant cognitive domain
      if (subject.name === 'English') {
        // English correlates with verbal reasoning
        relevantCat4 = cat4Analysis.domains.find(d => d.name === 'Verbal Reasoning')?.stanine || avgCat4Stanine;
      } else if (subject.name === 'Mathematics') {
        // Math correlates with quantitative reasoning
        relevantCat4 = cat4Analysis.domains.find(d => d.name === 'Quantitative Reasoning')?.stanine || avgCat4Stanine;
      } else if (subject.name === 'Science') {
        // Science correlates with nonverbal and quantitative
        const nonverbal = cat4Analysis.domains.find(d => d.name === 'Nonverbal Reasoning')?.stanine || 0;
        const quant = cat4Analysis.domains.find(d => d.name === 'Quantitative Reasoning')?.stanine || 0;
        relevantCat4 = (nonverbal + quant) / 2 || avgCat4Stanine;
      } else {
        // Default to average CAT4
        relevantCat4 = avgCat4Stanine;
      }
      
      // Compare performance with potential
      const difference = subject.stanine - relevantCat4;
      let status;
      
      if (difference <= -2) {
        status = 'Underperforming';
      } else if (difference >= 2) {
        status = 'Overperforming';
      } else {
        status = 'As Expected';
      }
      
      comparisons[subject.name] = {
        academic_stanine: subject.stanine,
        cat4_stanine: relevantCat4,
        difference: difference,
        status: status
      };
    });
    
    // Count underperforming subjects
    const underperformingCount = Object.values(comparisons).filter(c => c.status === 'Underperforming').length;
    
    return {
      available: true,
      comparisons: comparisons,
      underperformingCount: underperformingCount
    };
  }

  /**
   * Identify fragile learners using triangulated data
   * A key concept from the PASS intervention strategies PDF
   */
  identifyFragileLearner(passAnalysis, cat4Analysis, performanceComparison) {
    // From the PASS document, a fragile learner typically has:
    // 1. Good cognitive abilities (CAT4) but...
    // 2. Poor attitudes to self/school (PASS) that affect performance
    // 3. Often underperforming relative to their cognitive potential
    
    if (!passAnalysis.available || !cat4Analysis.available) {
      return false;
    }
    
    // Check for low PASS scores (key indicator of fragile learner)
    const hasPassRisks = passAnalysis.riskAreas.length >= 2;
    
    // Either of these patterns indicates a fragile learner:
    
    // Pattern 1: Average to good cognitive ability + poor PASS
    const hasGoodCognitive = cat4Analysis.domains.filter(d => d.level === 'average' || d.level === 'strength').length >= 2;
    
    // Pattern 2: PASS issues + academic underperformance
    const showsUnderperformance = performanceComparison.available && performanceComparison.underperformingCount > 0;
    
    return (hasGoodCognitive && hasPassRisks) || (hasPassRisks && showsUnderperformance);
  }

  /**
 * Generate compound interventions based on combinations of risk factors
 * This creates more sophisticated intervention strategies when multiple
 * risk factors are present across different assessment domains
 */
generateCompoundInterventions(passAnalysis, cat4Analysis, academicAnalysis, isFragileLearner) {
  const compoundInterventions = [];
  
  // Only proceed if we have data from multiple sources
  const hasPassData = passAnalysis.available && passAnalysis.riskAreas.length > 0;
  const hasCat4Data = cat4Analysis.available && cat4Analysis.weaknessAreas.length > 0;
  const hasAcademicData = academicAnalysis.available;
  
  // Check for specific factor combinations that warrant compound interventions
  
  // Combination 1: Self-regard issues + Verbal reasoning weakness
  if (hasPassData && hasCat4Data) {
    const hasSelfRegardIssue = passAnalysis.riskAreas.some(r => 
      r.factor.toLowerCase().includes('self regard') || r.factor.toLowerCase().includes('confidence'));
    
    const hasVerbalWeakness = cat4Analysis.weaknessAreas.some(w => 
      w.domain.toLowerCase().includes('verbal'));
    
    if (hasSelfRegardIssue && hasVerbalWeakness) {
      compoundInterventions.push({
        domain: 'integrated',
        factor: 'Self-Regard and Verbal Reasoning',
        title: 'Confidence Through Language',
        description: 'Integrated program combining self-esteem building with verbal skills development, using strengths-based literacy activities to build confidence through language mastery.',
        priority: 'high',
        impact: 'high'
      });
    }
  }
  
  // Combination 2: Emotional control issues + Academic underperformance
  if (hasPassData && hasAcademicData) {
    const hasEmotionalIssue = passAnalysis.riskAreas.some(r => 
      r.factor.toLowerCase().includes('emotional') || r.factor.toLowerCase().includes('attitude'));
    
    const hasAcademicUnderperformance = academicAnalysis.subjects.some(s => s.level === 'weakness');
    
    if (hasEmotionalIssue && hasAcademicUnderperformance) {
      compoundInterventions.push({
        domain: 'integrated',
        factor: 'Emotional Regulation and Academic Performance',
        title: 'Emotional Regulation for Academic Success',
        description: 'Program addressing how emotional states affect learning performance, teaching meta-cognitive strategies to manage emotions during academic challenges.',
        priority: 'high',
        impact: 'high'
      });
    }
  }
  
  // Combination 3: Work ethic issues + Quantitative reasoning weakness
  if (hasPassData && hasCat4Data) {
    const hasWorkEthicIssue = passAnalysis.riskAreas.some(r => 
      r.factor.toLowerCase().includes('work ethic') || r.factor.toLowerCase().includes('preparedness'));
    
    const hasQuantWeakness = cat4Analysis.weaknessAreas.some(w => 
      w.domain.toLowerCase().includes('quant'));
    
    if (hasWorkEthicIssue && hasQuantWeakness) {
      compoundInterventions.push({
        domain: 'integrated',
        factor: 'Work Ethic and Quantitative Reasoning',
        title: 'Structured Mathematics Mastery',
        description: 'Program combining organizational skills with mathematical concepts, using structured practice routines and progress tracking to develop both work ethic and quantitative abilities.',
        priority: 'high',
        impact: 'medium'
      });
    }
  }
  
  // Combination 4: Social confidence issues + Fragile learner status
  if (hasPassData && isFragileLearner) {
    const hasSocialIssue = passAnalysis.riskAreas.some(r => 
      r.factor.toLowerCase().includes('social') || r.factor.toLowerCase().includes('teacher'));
    
    if (hasSocialIssue) {
      compoundInterventions.push({
        domain: 'integrated',
        factor: 'Social Confidence and Learning Resilience',
        title: 'Collaborative Learning Community',
        description: 'Create structured collaborative learning opportunities with clear roles and scaffolded social interactions that build both academic confidence and social skills.',
        priority: 'high',
        impact: 'high'
      });
    }
  }
  
  // Combination 5: Curriculum demands issues + Multiple academic weaknesses
  if (hasPassData && hasAcademicData) {
    const hasCurriculumIssue = passAnalysis.riskAreas.some(r => 
      r.factor.toLowerCase().includes('curriculum') || r.factor.toLowerCase().includes('learning'));
    
    const multipleAcademicWeaknesses = academicAnalysis.subjects.filter(s => s.level === 'weakness').length >= 2;
    
    if (hasCurriculumIssue && multipleAcademicWeaknesses) {
      compoundInterventions.push({
        domain: 'integrated',
        factor: 'Curriculum Coping and Academic Skills',
        title: 'Learning Strategies Across Curriculum',
        description: 'Cross-curricular approach teaching transferable learning strategies that can be applied across multiple subjects, with scaffolded implementation and regular review.',
        priority: 'high',
        impact: 'high'
      });
    }
  }
  
  // Combination 6: Fragile learner + Multiple academic subject weaknesses
  if (isFragileLearner && hasAcademicData) {
    const multipleAcademicWeaknesses = academicAnalysis.subjects.filter(s => s.level === 'weakness').length >= 2;
    
    if (multipleAcademicWeaknesses) {
      compoundInterventions.push({
        domain: 'integrated',
        factor: 'Cognitive Potential and Academic Performance',
        title: 'Cognitive Apprenticeship Program',
        description: 'Structured metacognitive approach that makes thinking processes visible across subjects, explicitly connecting cognitive strategies to academic content mastery.',
        priority: 'high',
        impact: 'very high'
      });
    }
  }
  
  return compoundInterventions;
}

/**
 * ProgressTracker class for historical data tracking and intervention effectiveness
 * This module allows tracking student progress over time and assessing intervention impact
 */
class ProgressTracker {
  constructor() {
    this.assessmentTypes = {
      PASS: 'PASS',
      CAT4: 'CAT4',
      ACADEMIC: 'ACADEMIC'
    };
    
    // Define expected improvement thresholds for different assessment types
    this.improvementThresholds = {
      PASS: 5, // 5 percentile points improvement considered significant
      CAT4: 0.5, // 0.5 stanine improvement considered significant
      ACADEMIC: 0.5 // 0.5 stanine improvement considered significant
    };
  }
  
  /**
   * Track progress between two assessment periods
   * @param {Object} currentData - Current student analysis data
   * @param {Object} previousData - Previous student analysis data
   * @returns {Object} Progress analysis results
   */
  trackProgress(currentData, previousData) {
    if (!previousData) {
      return {
        hasBaseline: false,
        message: "No previous assessment data available for comparison."
      };
    }
    
    const progress = {
      hasBaseline: true,
      pass: this._analyzePassProgress(currentData.pass_analysis, previousData.pass_analysis),
      cat4: this._analyzeCat4Progress(currentData.cat4_analysis, previousData.cat4_analysis),
      academic: this._analyzeAcademicProgress(currentData.academic_analysis, previousData.academic_analysis),
      interventionEffectiveness: this._analyzeInterventionEffectiveness(
        currentData, 
        previousData
      ),
      improvementAreas: [],
      concernAreas: [],
      summary: ""
    };
    
    // Compile improvement and concern areas
    this._compileImprovementAreas(progress);
    this._compileConcernAreas(progress);
    
    // Generate summary
    progress.summary = this._generateProgressSummary(progress);
    
    return progress;
  }
  
  /**
   * Analyze progress in PASS factors
   */
  _analyzePassProgress(currentPass, previousPass) {
    if (!currentPass.available || !previousPass.available) {
      return {
        available: false,
        message: "PASS comparison not available."
      };
    }
    
    const factorAnalysis = {};
    const currentFactors = currentPass.factors;
    const previousFactors = previousPass.factors;
    
    // Compare each factor
    for (const factor of currentFactors) {
      const prevFactor = previousFactors.find(f => f.name === factor.name);
      
      if (prevFactor) {
        const change = factor.percentile - prevFactor.percentile;
        const isSignificant = Math.abs(change) >= this.improvementThresholds.PASS;
        const direction = change > 0 ? "improved" : "declined";
        
        factorAnalysis[factor.name] = {
          current: factor.percentile,
          previous: prevFactor.percentile,
          change: change,
          isSignificant: isSignificant,
          direction: direction,
          status: this._getChangeStatus(change, this.improvementThresholds.PASS)
        };
      }
    }
    
    // Calculate overall PASS progress
    const changes = Object.values(factorAnalysis).map(a => a.change);
    const averageChange = changes.length > 0 ? 
      changes.reduce((sum, change) => sum + change, 0) / changes.length : 0;
      
    return {
      available: true,
      factorAnalysis: factorAnalysis,
      averageChange: averageChange,
      overallStatus: this._getChangeStatus(averageChange, this.improvementThresholds.PASS)
    };
  }
  
  /**
   * Analyze progress in CAT4 domains
   */
  _analyzeCat4Progress(currentCat4, previousCat4) {
    if (!currentCat4.available || !previousCat4.available) {
      return {
        available: false,
        message: "CAT4 comparison not available."
      };
    }
    
    const domainAnalysis = {};
    const currentDomains = currentCat4.domains;
    const previousDomains = previousCat4.domains;
    
    // Compare each domain
    for (const domain of currentDomains) {
      const prevDomain = previousDomains.find(d => d.name === domain.name);
      
      if (prevDomain) {
        const change = domain.stanine - prevDomain.stanine;
        const isSignificant = Math.abs(change) >= this.improvementThresholds.CAT4;
        const direction = change > 0 ? "improved" : "declined";
        
        domainAnalysis[domain.name] = {
          current: domain.stanine,
          previous: prevDomain.stanine,
          change: change,
          isSignificant: isSignificant,
          direction: direction,
          status: this._getChangeStatus(change, this.improvementThresholds.CAT4)
        };
      }
    }
    
    // Check for change in fragile learner status
    const fragileLearnerChange = {
      current: currentCat4.is_fragile_learner,
      previous: previousCat4.is_fragile_learner,
      hasChanged: currentCat4.is_fragile_learner !== previousCat4.is_fragile_learner,
      direction: currentCat4.is_fragile_learner ? 
        (previousCat4.is_fragile_learner ? "unchanged" : "negative") : 
        (previousCat4.is_fragile_learner ? "positive" : "unchanged")
    };
    
    // Calculate overall CAT4 progress
    const changes = Object.values(domainAnalysis).map(a => a.change);
    const averageChange = changes.length > 0 ? 
      changes.reduce((sum, change) => sum + change, 0) / changes.length : 0;
      
    return {
      available: true,
      domainAnalysis: domainAnalysis,
      fragileLearnerChange: fragileLearnerChange,
      averageChange: averageChange,
      overallStatus: this._getChangeStatus(averageChange, this.improvementThresholds.CAT4)
    };
  }
  
  /**
   * Analyze progress in academic performance
   */
  _analyzeAcademicProgress(currentAcademic, previousAcademic) {
    if (!currentAcademic.available || !previousAcademic.available) {
      return {
        available: false,
        message: "Academic comparison not available."
      };
    }
    
    const subjectAnalysis = {};
    const currentSubjects = currentAcademic.subjects;
    const previousSubjects = previousAcademic.subjects;
    
    // Compare each subject
    for (const subject of currentSubjects) {
      const prevSubject = previousSubjects.find(s => s.name === subject.name);
      
      if (prevSubject) {
        const change = subject.stanine - prevSubject.stanine;
        const isSignificant = Math.abs(change) >= this.improvementThresholds.ACADEMIC;
        const direction = change > 0 ? "improved" : "declined";
        
        subjectAnalysis[subject.name] = {
          current: subject.stanine,
          previous: prevSubject.stanine,
          change: change,
          isSignificant: isSignificant,
          direction: direction,
          status: this._getChangeStatus(change, this.improvementThresholds.ACADEMIC)
        };
      }
    }
    
    // Calculate overall academic progress
    const changes = Object.values(subjectAnalysis).map(a => a.change);
    const averageChange = changes.length > 0 ? 
      changes.reduce((sum, change) => sum + change, 0) / changes.length : 0;
      
    return {
      available: true,
      subjectAnalysis: subjectAnalysis,
      averageChange: averageChange,
      overallStatus: this._getChangeStatus(averageChange, this.improvementThresholds.ACADEMIC)
    };
  }
  
  /**
   * Analyze intervention effectiveness
   */
  _analyzeInterventionEffectiveness(currentData, previousData) {
    // Get previous interventions
    const previousInterventions = previousData.interventions || [];
    
    if (previousInterventions.length === 0) {
      return {
        available: false,
        message: "No previous interventions to evaluate."
      };
    }
    
    const interventionEffectiveness = {};
    
    // Analyze each previous intervention
    for (const intervention of previousInterventions) {
      const domain = intervention.domain;
      const factor = intervention.factor;
      
      // Find related improvement
      let effectiveness = "unknown";
      let evidence = "";
      
      // Check PASS improvements for emotional/behavioral interventions
      if (domain === 'emotional' || domain === 'behavioral') {
        if (currentData.pass_analysis.available && previousData.pass_analysis.available) {
          const passFactors = currentData.pass_analysis.factors;
          const prevPassFactors = previousData.pass_analysis.factors;
          
          // Find factors related to this intervention
          const relatedFactors = passFactors.filter(f => 
            f.name.toLowerCase().includes(factor.toLowerCase()));
            
          if (relatedFactors.length > 0) {
            // Check for improvement in related factors
            let totalChange = 0;
            let factorCount = 0;
            
            for (const relatedFactor of relatedFactors) {
              const prevFactor = prevPassFactors.find(f => f.name === relatedFactor.name);
              if (prevFactor) {
                const change = relatedFactor.percentile - prevFactor.percentile;
                totalChange += change;
                factorCount++;
                evidence += `${relatedFactor.name}: ${change > 0 ? '+' : ''}${change.toFixed(1)} percentile points. `;
              }
            }
            
            if (factorCount > 0) {
              const avgChange = totalChange / factorCount;
              if (avgChange >= this.improvementThresholds.PASS) {
                effectiveness = "effective";
              } else if (avgChange <= -this.improvementThresholds.PASS) {
                effectiveness = "not effective";
              } else {
                effectiveness = "partially effective";
              }
            }
          }
        }
      }
      // Check CAT4 improvements for cognitive interventions
      else if (domain === 'cognitive') {
        if (currentData.cat4_analysis.available && previousData.cat4_analysis.available) {
          const cat4Domains = currentData.cat4_analysis.domains;
          const prevCat4Domains = previousData.cat4_analysis.domains;
          
          // Find domains related to this intervention
          const relatedDomains = cat4Domains.filter(d => 
            d.name.toLowerCase().includes(factor.toLowerCase()));
            
          if (relatedDomains.length > 0) {
            // Check for improvement in related domains
            let totalChange = 0;
            let domainCount = 0;
            
            for (const relatedDomain of relatedDomains) {
              const prevDomain = prevCat4Domains.find(d => d.name === relatedDomain.name);
              if (prevDomain) {
                const change = relatedDomain.stanine - prevDomain.stanine;
                totalChange += change;
                domainCount++;
                evidence += `${relatedDomain.name}: ${change > 0 ? '+' : ''}${change.toFixed(1)} stanine points. `;
              }
            }
            
            if (domainCount > 0) {
              const avgChange = totalChange / domainCount;
              if (avgChange >= this.improvementThresholds.CAT4) {
                effectiveness = "effective";
              } else if (avgChange <= -this.improvementThresholds.CAT4) {
                effectiveness = "not effective";
              } else {
                effectiveness = "partially effective";
              }
            }
          }
        }
      }
      // Check academic improvements for academic interventions
      else if (domain === 'academic') {
        if (currentData.academic_analysis.available && previousData.academic_analysis.available) {
          const subjects = currentData.academic_analysis.subjects;
          const prevSubjects = previousData.academic_analysis.subjects;
          
          // Find subjects related to this intervention
          const relatedSubjects = subjects.filter(s => 
            s.name.toLowerCase().includes(factor.toLowerCase().replace(' performance', '')));
            
          if (relatedSubjects.length > 0) {
            // Check for improvement in related subjects
            let totalChange = 0;
            let subjectCount = 0;
            
            for (const relatedSubject of relatedSubjects) {
              const prevSubject = prevSubjects.find(s => s.name === relatedSubject.name);
              if (prevSubject) {
                const change = relatedSubject.stanine - prevSubject.stanine;
                totalChange += change;
                subjectCount++;
                evidence += `${relatedSubject.name}: ${change > 0 ? '+' : ''}${change.toFixed(1)} stanine points. `;
              }
            }
            
            if (subjectCount > 0) {
              const avgChange = totalChange / subjectCount;
              if (avgChange >= this.improvementThresholds.ACADEMIC) {
                effectiveness = "effective";
              } else if (avgChange <= -this.improvementThresholds.ACADEMIC) {
                effectiveness = "not effective";
              } else {
                effectiveness = "partially effective";
              }
            }
          }
        }
      }
      // Check holistic/integrated interventions through overall changes
      else if (domain === 'holistic' || domain === 'integrated') {
        // Calculate overall change across all domains
        let totalChanges = [];
        
        // Include PASS changes
        if (currentData.pass_analysis.available && previousData.pass_analysis.available) {
          const passFactors = currentData.pass_analysis.factors;
          const prevPassFactors = previousData.pass_analysis.factors;
          
          for (const factor of passFactors) {
            const prevFactor = prevPassFactors.find(f => f.name === factor.name);
            if (prevFactor) {
              const normalizedChange = (factor.percentile - prevFactor.percentile) / this.improvementThresholds.PASS;
              totalChanges.push(normalizedChange);
            }
          }
        }
        
        // Include CAT4 changes
        if (currentData.cat4_analysis.available && previousData.cat4_analysis.available) {
          const cat4Domains = currentData.cat4_analysis.domains;
          const prevCat4Domains = previousData.cat4_analysis.domains;
          
          for (const domain of cat4Domains) {
            const prevDomain = prevCat4Domains.find(d => d.name === domain.name);
            if (prevDomain) {
              const normalizedChange = (domain.stanine - prevDomain.stanine) / this.improvementThresholds.CAT4;
              totalChanges.push(normalizedChange);
            }
          }
        }
        
        // Include academic changes
        if (currentData.academic_analysis.available && previousData.academic_analysis.available) {
          const subjects = currentData.academic_analysis.subjects;
          const prevSubjects = previousData.academic_analysis.subjects;
          
          for (const subject of subjects) {
            const prevSubject = prevSubjects.find(s => s.name === subject.name);
            if (prevSubject) {
              const normalizedChange = (subject.stanine - prevSubject.stanine) / this.improvementThresholds.ACADEMIC;
              totalChanges.push(normalizedChange);
            }
          }
        }
        
        // Calculate average normalized change
        if (totalChanges.length > 0) {
          const avgNormalizedChange = totalChanges.reduce((sum, change) => sum + change, 0) / totalChanges.length;
          
          if (avgNormalizedChange >= 1.0) {
            effectiveness = "effective";
            evidence = `Overall improvement across multiple assessment areas.`;
          } else if (avgNormalizedChange <= -1.0) {
            effectiveness = "not effective";
            evidence = `Overall decline across multiple assessment areas.`;
          } else {
            effectiveness = "partially effective";
            evidence = `Mixed results across assessment areas.`;
          }
        }
      }
      
      interventionEffectiveness[intervention.title] = {
        domain: domain,
        factor: factor,
        effectiveness: effectiveness,
        evidence: evidence
      };
    }
    
    return {
      available: true,
      interventions: interventionEffectiveness
    };
  }
  
  /**
   * Get status of change based on threshold
   */
  _getChangeStatus(change, threshold) {
    if (change >= threshold) return "significant improvement";
    if (change > 0) return "slight improvement";
    if (change === 0) return "no change";
    if (change > -threshold) return "slight decline";
    return "significant decline";
  }
  
  /**
   * Compile improvement areas based on progress analysis
   */
  _compileImprovementAreas(progress) {
    // PASS improvements
    if (progress.pass.available) {
      for (const [factor, analysis] of Object.entries(progress.pass.factorAnalysis)) {
        if (analysis.status === "significant improvement") {
          progress.improvementAreas.push({
            domain: "PASS",
            factor: factor,
            improvement: analysis.change.toFixed(1) + " percentile points",
            significance: "significant"
          });
        }
      }
    }
    
    // CAT4 improvements
    if (progress.cat4.available) {
      for (const [domain, analysis] of Object.entries(progress.cat4.domainAnalysis)) {
        if (analysis.status === "significant improvement") {
          progress.improvementAreas.push({
            domain: "CAT4",
            factor: domain,
            improvement: analysis.change.toFixed(1) + " stanine points",
            significance: "significant"
          });
        }
      }
      
      // Include fragile learner improvement
      if (progress.cat4.fragileLearnerChange.direction === "positive") {
        progress.improvementAreas.push({
          domain: "CAT4",
          factor: "Fragile Learner Status",
          improvement: "No longer classified as a fragile learner",
          significance: "significant"
        });
      }
    }
    
    // Academic improvements
    if (progress.academic.available) {
      for (const [subject, analysis] of Object.entries(progress.academic.subjectAnalysis)) {
        if (analysis.status === "significant improvement") {
          progress.improvementAreas.push({
            domain: "Academic",
            factor: subject,
            improvement: analysis.change.toFixed(1) + " stanine points",
            significance: "significant"
          });
        }
      }
    }
    
    // Sort improvements by significance
    progress.improvementAreas.sort((a, b) => 
      a.significance === "significant" ? -1 : 1);
  }
  
  /**
   * Compile concern areas based on progress analysis
   */
  _compileConcernAreas(progress) {
    // PASS concerns
    if (progress.pass.available) {
      for (const [factor, analysis] of Object.entries(progress.pass.factorAnalysis)) {
        if (analysis.status === "significant decline") {
          progress.concernAreas.push({
            domain: "PASS",
            factor: factor,
            decline: analysis.change.toFixed(1) + " percentile points",
            significance: "significant"
          });
        }
      }
    }
    
    // CAT4 concerns
    if (progress.cat4.available) {
      for (const [domain, analysis] of Object.entries(progress.cat4.domainAnalysis)) {
        if (analysis.status === "significant decline") {
          progress.concernAreas.push({
            domain: "CAT4",
            factor: domain,
            decline: analysis.change.toFixed(1) + " stanine points",
            significance: "significant"
          });
        }
      }
      
      // Include fragile learner decline
      if (progress.cat4.fragileLearnerChange.direction === "negative") {
        progress.concernAreas.push({
          domain: "CAT4",
          factor: "Fragile Learner Status",
          decline: "Now classified as a fragile learner",
          significance: "significant"
        });
      }
    }
    
    // Academic concerns
    if (progress.academic.available) {
      for (const [subject, analysis] of Object.entries(progress.academic.subjectAnalysis)) {
        if (analysis.status === "significant decline") {
          progress.concernAreas.push({
            domain: "Academic",
            factor: subject,
            decline: analysis.change.toFixed(1) + " stanine points",
            significance: "significant"
          });
        }
      }
    }
    
    // Sort concerns by significance
    progress.concernAreas.sort((a, b) => 
      a.significance === "significant" ? -1 : 1);
  }
  
  /**
   * Generate summary of progress
   */
  _generateProgressSummary(progress) {
    let summary = "";
    
    // Add overall assessment
    const assessmentsAvailable = [
      progress.pass.available ? "PASS" : null,
      progress.cat4.available ? "CAT4" : null,
      progress.academic.available ? "Academic" : null
    ].filter(Boolean);
    
    if (assessmentsAvailable.length === 0) {
      return "No comparable assessment data available.";
    }
    
    summary += `Progress summary based on ${assessmentsAvailable.join(", ")} data: `;
    
    // Calculate overall direction
    const overallChanges = [];
    if (progress.pass.available) overallChanges.push(progress.pass.averageChange);
    if (progress.cat4.available) overallChanges.push(progress.cat4.averageChange);
    if (progress.academic.available) overallChanges.push(progress.academic.averageChange);
    
    const avgOverallChange = overallChanges.reduce((sum, change) => sum + change, 0) / overallChanges.length;
    
    if (avgOverallChange > 0.5) {
      summary += "The student has shown overall improvement across assessment areas. ";
    } else if (avgOverallChange < -0.5) {
      summary += "The student has shown overall decline across assessment areas. ";
    } else {
      summary += "The student has shown mixed results or minimal change across assessment areas. ";
    }
    
    // Add highlights of key improvements
    if (progress.improvementAreas.length > 0) {
      summary += `Notable improvements in ${progress.improvementAreas.slice(0, 2).map(area => area.factor).join(", ")}. `;
    }
    
    // Add highlights of key concerns
    if (progress.concernAreas.length > 0) {
      summary += `Areas of concern include ${progress.concernAreas.slice(0, 2).map(area => area.factor).join(", ")}. `;
    }
    
    // Add intervention effectiveness summary
    if (progress.interventionEffectiveness.available) {
      const interventions = progress.interventionEffectiveness.interventions;
      const effectiveCount = Object.values(interventions).filter(i => i.effectiveness === "effective").length;
      const partialCount = Object.values(interventions).filter(i => i.effectiveness === "partially effective").length;
      const ineffectiveCount = Object.values(interventions).filter(i => i.effectiveness === "not effective").length;
      
      if (Object.keys(interventions).length > 0) {
        summary += `Of the previous interventions, ${effectiveCount} were effective, ${partialCount} were partially effective, and ${ineffectiveCount} were not effective. `;
        
        // Add most effective intervention
        const mostEffective = Object.entries(interventions).find(([_, i]) => i.effectiveness === "effective");
        if (mostEffective) {
          summary += `The "${mostEffective[0]}" intervention showed the most positive impact. `;
        }
      }
    }
    
    return summary;
  }
}

export default ProgressTracker;

/**
 * PredictiveAnalytics class for early warning system
 * This module helps identify students who may become at risk before issues manifest
 */
class PredictiveAnalytics {
  constructor() {
    // Define risk factor weights for predictive model
    this.riskFactorWeights = {
      // PASS factors
      'self_regard': 0.8,
      'perceived_learning': 0.6,
      'attitude_teachers': 0.7,
      'general_work_ethic': 0.9,
      'confidence_learning': 0.7,
      'preparedness': 0.6,
      'emotional_control': 0.8,
      'social_confidence': 0.5,
      'curriculum_demand': 0.6,
      
      // CAT4 domains
      'verbal_reasoning': 0.7,
      'quantitative_reasoning': 0.7,
      'nonverbal_reasoning': 0.6,
      'spatial_reasoning': 0.5,
      
      // Combined factors
      'fragile_learner': 0.9,
      'academic_underperformance': 0.8,
      'declining_trends': 0.9,
      'attendance_issues': 0.7
    };
    
    // Define threshold values for risk prediction
    this.thresholds = {
      high_risk: 0.7,
      medium_risk: 0.4,
      borderline: 0.3
    };
    
    // Define early indicators of potential future risks
    this.earlyIndicators = {
      // Minor PASS declines that might predict future issues
      pass_early_warnings: {
        self_regard_threshold: 50,
        work_ethic_threshold: 55,
        emotional_control_threshold: 50
      },
      
      // Small gaps between cognitive potential and performance
      potential_gap_threshold: 1, // 1 stanine difference
      
      // Patterns in assessment fluctuations
      volatility_threshold: 10, // 10% variability in PASS scores
      
      // Combined risk patterns
      combined_threshold: 0.25
    };
  }
  
  /**
   * Analyze student data to predict future risk
   * @param {Object} studentData - Current student data 
   * @param {Array} historicalData - Array of previous student analyses
   * @returns {Object} Risk prediction results
   */
  predictRisk(studentData, historicalData = []) {
    // Initialize prediction results
    const prediction = {
      overall_risk_score: 0,
      risk_level: 'low',
      risk_factors: [],
      early_indicators: [],
      trend_analysis: this._analyzeTrends(studentData, historicalData),
      time_to_intervention: 'not urgent',
      confidence: 0.0,
      recommendations: []
    };
    
    // Calculate current risk factors
    const currentRiskFactors = this._calculateCurrentRiskFactors(studentData);
    prediction.risk_factors = currentRiskFactors.factors;
    
    // Calculate early warning indicators
    const earlyWarnings = this._identifyEarlyWarnings(studentData, historicalData);
    prediction.early_indicators = earlyWarnings.indicators;
    
    // Calculate overall risk score
    const weightedCurrentRisk = currentRiskFactors.score * 0.7;
    const weightedEarlyRisk = earlyWarnings.score * 0.3;
    prediction.overall_risk_score = weightedCurrentRisk + weightedEarlyRisk;
    
    // Determine risk level
    if (prediction.overall_risk_score >= this.thresholds.high_risk) {
      prediction.risk_level = 'high';
      prediction.time_to_intervention = 'urgent';
    } else if (prediction.overall_risk_score >= this.thresholds.medium_risk) {
      prediction.risk_level = 'medium';
      prediction.time_to_intervention = 'soon';
    } else if (prediction.overall_risk_score >= this.thresholds.borderline) {
      prediction.risk_level = 'borderline';
      prediction.time_to_intervention = 'monitor';
    } else {
      prediction.risk_level = 'low';
      prediction.time_to_intervention = 'not urgent';
    }
    
    // Calculate confidence based on data completeness
    prediction.confidence = this._calculatePredictionConfidence(studentData, historicalData);
    
    // Generate preventive recommendations
    prediction.recommendations = this._generatePreventiveRecommendations(
      prediction.risk_level,
      prediction.risk_factors,
      prediction.early_indicators,
      prediction.trend_analysis
    );
    
    return prediction;
  }
  
  /**
   * Calculate current risk factors from student data
   */
  _calculateCurrentRiskFactors(studentData) {
    const riskFactors = [];
    let totalScore = 0;
    let factorCount = 0;
    
    // Check PASS factors
    if (studentData.pass_analysis && studentData.pass_analysis.available) {
      const passFactors = studentData.pass_analysis.factors;
      
      for (const factor of passFactors) {
        // Calculate risk level for this factor (lower percentile = higher risk)
        const normalizedRisk = Math.max(0, (45 - factor.percentile) / 45);
        if (normalizedRisk > 0) {
          const weight = this.riskFactorWeights[factor.name.toLowerCase().replace(' ', '_')] || 0.5;
          const weightedRisk = normalizedRisk * weight;
          
          // Only include as a risk factor if it exceeds a minimal threshold
          if (normalizedRisk >= 0.2) {
            riskFactors.push({
              domain: 'PASS',
              factor: factor.name,
              level: normalizedRisk,
              weighted_risk: weightedRisk,
              details: `${factor.name} score (${factor.percentile}%) is below threshold.`
            });
          }
          
          totalScore += weightedRisk;
          factorCount++;
        }
      }
    }
    
    // Check CAT4 factors
    if (studentData.cat4_analysis && studentData.cat4_analysis.available) {
      const cat4Domains = studentData.cat4_analysis.domains;
      
      for (const domain of cat4Domains) {
        // Calculate risk level for this domain (lower stanine = higher risk)
        const normalizedRisk = Math.max(0, (4 - domain.stanine) / 3);
        if (normalizedRisk > 0) {
          const weight = this.riskFactorWeights[domain.name.toLowerCase().replace(' ', '_')] || 0.5;
          const weightedRisk = normalizedRisk * weight;
          
          // Only include as a risk factor if it exceeds a minimal threshold
          if (normalizedRisk >= 0.2) {
            riskFactors.push({
              domain: 'CAT4',
              factor: domain.name,
              level: normalizedRisk,
              weighted_risk: weightedRisk,
              details: `${domain.name} stanine (${domain.stanine}) is below threshold.`
            });
          }
          
          totalScore += weightedRisk;
          factorCount++;
        }
      }
      
      // Check fragile learner status
      if (studentData.cat4_analysis.is_fragile_learner) {
        const weight = this.riskFactorWeights.fragile_learner;
        const weightedRisk = 1.0 * weight; // Full weight for fragile learner
        
        riskFactors.push({
          domain: 'CAT4',
          factor: 'Fragile Learner',
          level: 1.0,
          weighted_risk: weightedRisk,
          details: 'Student is classified as a fragile learner based on CAT4 profile.'
        });
        
        totalScore += weightedRisk;
        factorCount++;
      }
    }
    
    // Check academic performance
    if (studentData.academic_analysis && studentData.academic_analysis.available) {
      const subjects = studentData.academic_analysis.subjects;
      
      for (const subject of subjects) {
        // Calculate risk level for this subject (lower stanine = higher risk)
        const normalizedRisk = Math.max(0, (4 - subject.stanine) / 3);
        if (normalizedRisk > 0) {
          const weight = 0.6; // Standard weight for academic subjects
          const weightedRisk = normalizedRisk * weight;
          
          // Only include as a risk factor if it exceeds a minimal threshold
          if (normalizedRisk >= 0.3) {
            riskFactors.push({
              domain: 'Academic',
              factor: subject.name,
              level: normalizedRisk,
              weighted_risk: weightedRisk,
              details: `${subject.name} performance (stanine ${subject.stanine}) is below threshold.`
            });
          }
          
          totalScore += weightedRisk;
          factorCount++;
        }
      }
      
      // Check for academic underperformance compared to cognitive potential
      if (studentData.cat4_analysis && studentData.cat4_analysis.available) {
        const avgCat4 = studentData.cat4_analysis.domains.reduce((sum, d) => sum + d.stanine, 0) / 
                        studentData.cat4_analysis.domains.length;
        
        const avgAcademic = subjects.reduce((sum, s) => sum + s.stanine, 0) / subjects.length;
        
        const underperformance = Math.max(0, avgCat4 - avgAcademic - 0.5);
        if (underperformance > 0) {
          const weight = this.riskFactorWeights.academic_underperformance;
          const weightedRisk = Math.min(1.0, underperformance / 2.0) * weight;
          
          riskFactors.push({
            domain: 'Academic',
            factor: 'Underperformance',
            level: Math.min(1.0, underperformance / 2.0),
            weighted_risk: weightedRisk,
            details: `Student is performing below cognitive potential (${avgAcademic.toFixed(1)} vs ${avgCat4.toFixed(1)}).`
          });
          
          totalScore += weightedRisk;
          factorCount++;
        }
      }
    }
    
    // Calculate average risk score
    const avgScore = factorCount > 0 ? (totalScore / factorCount) : 0;
    
    // Sort risk factors by weighted risk
    riskFactors.sort((a, b) => b.weighted_risk - a.weighted_risk);
    
    return {
      factors: riskFactors,
      score: avgScore
    };
  }
  
  /**
   * Identify early warning indicators
   */
  _identifyEarlyWarnings(studentData, historicalData) {
    const earlyWarnings = [];
    let totalWarningScore = 0;
    let warningCount = 0;
    
    // Check for borderline PASS scores (not yet at risk but approaching threshold)
    if (studentData.pass_analysis && studentData.pass_analysis.available) {
      const passFactors = studentData.pass_analysis.factors;
      const earlyThresholds = this.earlyIndicators.pass_early_warnings;
      
      for (const factor of passFactors) {
        const factorName = factor.name.toLowerCase().replace(' ', '_');
        const threshold = earlyThresholds[`${factorName}_threshold`] || 50;
        
        // Check if score is in the borderline range (not at risk yet, but approaching)
        if (factor.percentile >= 45 && factor.percentile <= threshold) {
          const warningLevel = (threshold - factor.percentile) / (threshold - 45);
          
          earlyWarnings.push({
            domain: 'PASS',
            indicator: `Borderline ${factor.name}`,
            level: warningLevel,
            details: `${factor.name} score (${factor.percentile}%) is approaching risk threshold.`
          });
          
          totalWarningScore += warningLevel;
          warningCount++;
        }
      }
    }
    
    // Check for minor cognitive-performance gaps
    if (studentData.cat4_analysis && studentData.cat4_analysis.available && 
        studentData.academic_analysis && studentData.academic_analysis.available) {
      
      // Compare verbal reasoning with English performance
      const verbalDomain = studentData.cat4_analysis.domains.find(d => 
        d.name.toLowerCase().includes('verbal'));
        
      const englishSubject = studentData.academic_analysis.subjects.find(s => 
        s.name.toLowerCase().includes('english'));
        
      if (verbalDomain && englishSubject) {
        const gap = verbalDomain.stanine - englishSubject.stanine;
        if (gap >= this.earlyIndicators.potential_gap_threshold && 
            gap < this.earlyIndicators.potential_gap_threshold + 1) {
          const warningLevel = Math.min(1.0, (gap - this.earlyIndicators.potential_gap_threshold) + 0.3);
          
          earlyWarnings.push({
            domain: 'Academic',
            indicator: 'Emerging Verbal-English Gap',
            level: warningLevel,
            details: `Student's verbal reasoning (${verbalDomain.stanine}) is higher than English performance (${englishSubject.stanine}).`
          });
          
          totalWarningScore += warningLevel;
          warningCount++;
        }
      }
      
      // Compare quantitative reasoning with Math performance
      const quantDomain = studentData.cat4_analysis.domains.find(d => 
        d.name.toLowerCase().includes('quant'));
        
      const mathSubject = studentData.academic_analysis.subjects.find(s => 
        s.name.toLowerCase().includes('math'));
        
      if (quantDomain && mathSubject) {
        const gap = quantDomain.stanine - mathSubject.stanine;
        if (gap >= this.earlyIndicators.potential_gap_threshold && 
            gap < this.earlyIndicators.potential_gap_threshold + 1) {
          const warningLevel = Math.min(1.0, (gap - this.earlyIndicators.potential_gap_threshold) + 0.3);
          
          earlyWarnings.push({
            domain: 'Academic',
            indicator: 'Emerging Quantitative-Math Gap',
            level: warningLevel,
            details: `Student's quantitative reasoning (${quantDomain.stanine}) is higher than Math performance (${mathSubject.stanine}).`
          });
          
          totalWarningScore += warningLevel;
          warningCount++;
        }
      }
    }
    
    // Check for minor volatility in historical data
    if (historicalData && historicalData.length >= 2) {
      const latestHistory = historicalData[historicalData.length - 1];
      
      // Check PASS volatility
      if (studentData.pass_analysis && studentData.pass_analysis.available && 
          latestHistory.pass_analysis && latestHistory.pass_analysis.available) {
        
        let volatilityCount = 0;
        let totalVolatility = 0;
        
        for (const factor of studentData.pass_analysis.factors) {
          const prevFactor = latestHistory.pass_analysis.factors.find(f => f.name === factor.name);
          if (prevFactor) {
            const changePercent = Math.abs(factor.percentile - prevFactor.percentile);
            if (changePercent >= 5 && changePercent <= this.earlyIndicators.volatility_threshold) {
              volatilityCount++;
              totalVolatility += changePercent;
            }
          }
        }
        
        if (volatilityCount >= 2) {
          const avgVolatility = totalVolatility / volatilityCount;
          const warningLevel = Math.min(1.0, avgVolatility / this.earlyIndicators.volatility_threshold);
          
          earlyWarnings.push({
            domain: 'Trend',
            indicator: 'PASS Score Volatility',
            level: warningLevel,
            details: `Student shows fluctuating PASS scores across ${volatilityCount} factors.`
          });
          
          totalWarningScore += warningLevel;
          warningCount++;
        }
      }
    }
    
    // Combined indicators (patterns across different assessment types)
    let combinedWarningCount = 0;
    
    // Pattern 1: Slight PASS decline + borderline CAT4 domain
    if (historicalData && historicalData.length > 0) {
      const latestHistory = historicalData[historicalData.length - 1];
      
      if (studentData.pass_analysis && studentData.pass_analysis.available && 
          latestHistory.pass_analysis && latestHistory.pass_analysis.available &&
          studentData.cat4_analysis && studentData.cat4_analysis.available) {
        
        // Check for slight PASS decline
        let hasPassDecline = false;
        let decliningFactors = [];
        
        for (const factor of studentData.pass_analysis.factors) {
          const prevFactor = latestHistory.pass_analysis.factors.find(f => f.name === factor.name);
          if (prevFactor && factor.percentile < prevFactor.percentile && 
              factor.percentile >= 45 && prevFactor.percentile >= 45) {
            decliningFactors.push(factor.name);
            hasPassDecline = true;
          }
        }
        
        // Check for borderline CAT4 domain
        let hasBorderlineCat4 = false;
        let borderlineDomains = [];
        
        for (const domain of studentData.cat4_analysis.domains) {
          if (domain.stanine === 4) {
            borderlineDomains.push(domain.name);
            hasBorderlineCat4 = true;
          }
        }
        
        if (hasPassDecline && hasBorderlineCat4) {
          combinedWarningCount++;
          const warningLevel = 0.5;
          
          earlyWarnings.push({
            domain: 'Combined',
            indicator: 'Early Fragile Learner Pattern',
            level: warningLevel,
            details: `Declining PASS scores (${decliningFactors.join(', ')}) combined with borderline CAT4 domains (${borderlineDomains.join(', ')}).`
          });
          
          totalWarningScore += warningLevel;
          warningCount++;
        }
      }
    }
    
    // Pattern 2: Good CAT4 + Declining academic trajectory
    if (historicalData && historicalData.length > 0) {
      const latestHistory = historicalData[historicalData.length - 1];
      
      if (studentData.cat4_analysis && studentData.cat4_analysis.available &&
          studentData.academic_analysis && studentData.academic_analysis.available && 
          latestHistory.academic_analysis && latestHistory.academic_analysis.available) {
        
        // Check for good CAT4 scores
        const avgCat4 = studentData.cat4_analysis.domains.reduce((sum, d) => sum + d.stanine, 0) / 
                        studentData.cat4_analysis.domains.length;
        
        // Check for declining academic trajectory
        let hasAcademicDecline = false;
        let decliningSubjects = [];
        
        for (const subject of studentData.academic_analysis.subjects) {
          const prevSubject = latestHistory.academic_analysis.subjects.find(s => s.name === subject.name);
          if (prevSubject && subject.stanine < prevSubject.stanine) {
            decliningSubjects.push(subject.name);
            hasAcademicDecline = true;
          }
        }
        
        if (avgCat4 >= 5 && hasAcademicDecline) {
          combinedWarningCount++;
          const warningLevel = 0.6;
          
          earlyWarnings.push({
            domain: 'Combined',
            indicator: 'Emerging Underperformance Pattern',
            level: warningLevel,
            details: `Student has good cognitive ability (avg. stanine ${avgCat4.toFixed(1)}) but declining academic performance in ${decliningSubjects.join(', ')}.`
          });
          
          totalWarningScore += warningLevel;
          warningCount++;
        }
      }
    }
    
    // Add combined warning bonus if multiple patterns detected
    if (combinedWarningCount >= 2) {
      totalWarningScore += 0.3;
      warningCount++;
    }
    
    // Calculate average warning score
    const avgWarningScore = warningCount > 0 ? (totalWarningScore / warningCount) : 0;
    
    // Sort warnings by level
    earlyWarnings.sort((a, b) => b.level - a.level);
    
    return {
      indicators: earlyWarnings,
      score: avgWarningScore
    };
  }
  
  /**
   * Analyze trends in student data over time
   */
  _analyzeTrends(studentData, historicalData) {
    if (!historicalData || historicalData.length === 0) {
      return {
        available: false,
        message: "No historical data available for trend analysis."
      };
    }
    
    const trendAnalysis = {
      available: true,
      pass_trends: {},
      cat4_trends: {},
      academic_trends: {},
      overall_direction: "stable"
    };
    
    // Analyze PASS trends
    if (studentData.pass_analysis && studentData.pass_analysis.available) {
      const passFactors = studentData.pass_analysis.factors;
      const factorTrends = {};
      
      for (const factor of passFactors) {
        const factorName = factor.name;
        const historicalValues = [];
        
        // Collect historical values for this factor
        for (const history of historicalData) {
          if (history.pass_analysis && history.pass_analysis.available) {
            const historyFactor = history.pass_analysis.factors.find(f => f.name === factorName);
            if (historyFactor) {
              historicalValues.push({
                timestamp: history.timestamp || 'unknown',
                value: historyFactor.percentile
              });
            }
          }
        }
        
        // Add current value
        historicalValues.push({
          timestamp: studentData.timestamp || 'current',
          value: factor.percentile
        });
        
        // Calculate trend direction
        let trendDirection = "stable";
        let trendStrength = 0;
        
        if (historicalValues.length >= 2) {
          const sortedValues = [...historicalValues].sort((a, b) => {
            if (a.timestamp === 'current') return 1;
            if (b.timestamp === 'current') return -1;
            return a.timestamp - b.timestamp;
          });
          
          // Calculate linear regression
          const n = sortedValues.length;
          const indices = Array.from({ length: n }, (_, i) => i);
          const sumX = indices.reduce((sum, x) => sum + x, 0);
          const sumY = sortedValues.reduce((sum, point) => sum + point.value, 0);
          const sumXY = indices.reduce((sum, x, i) => sum + x * sortedValues[i].value, 0);
          const sumXX = indices.reduce((sum, x) => sum + x * x, 0);
          
          const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
          
          // Normalize slope to determine trend strength
          const maxChange = 20 * (n - 1); // Maximum possible change over the time period
          const normalizedSlope = Math.abs(slope) / maxChange;
          trendStrength = Math.min(1.0, normalizedSlope * 2);
          
          if (slope > 2) {
            trendDirection = "improving";
          } else if (slope < -2) {
            trendDirection = "declining";
          } else {
            trendDirection = "stable";
          }
        }
        
        factorTrends[factorName] = {
          values: historicalValues,
          direction: trendDirection,
          strength: trendStrength
        };
      }
      
      trendAnalysis.pass_trends = factorTrends;
    }
    
    // Analyze CAT4 trends (similar approach as PASS trends)
    // These change less frequently but can still be tracked
    if (studentData.cat4_analysis && studentData.cat4_analysis.available) {
      const cat4Domains = studentData.cat4_analysis.domains;
      const domainTrends = {};
      
      for (const domain of cat4Domains) {
        const domainName = domain.name;
        const historicalValues = [];
        
        // Collect historical values for this domain
        for (const history of historicalData) {
          if (history.cat4_analysis && history.cat4_analysis.available) {
            const historyDomain = history.cat4_analysis.domains.find(d => d.name === domainName);
            if (historyDomain) {
              historicalValues.push({
                timestamp: history.timestamp || 'unknown',
                value: historyDomain.stanine
              });
            }
          }
        }
        
        // Add current value
        historicalValues.push({
          timestamp: studentData.timestamp || 'current',
          value: domain.stanine
        });
        
        // CAT4 trends typically have fewer data points and smaller changes
        let trendDirection = "stable";
        let trendStrength = 0;
        
        if (historicalValues.length >= 2) {
          const oldest = historicalValues[0];
          const current = historicalValues[historicalValues.length - 1];
          const change = current.value - oldest.value;
          
          // Smaller changes are significant for stanine scores
          if (change >= 1) {
            trendDirection = "improving";
            trendStrength = Math.min(1.0, change / 2);
          } else if (change <= -1) {
            trendDirection = "declining";
            trendStrength = Math.min(1.0, Math.abs(change) / 2);
          } else {
            trendDirection = "stable";
            trendStrength = 0;
          }
        }
        
        domainTrends[domainName] = {
          values: historicalValues,
          direction: trendDirection,
          strength: trendStrength
        };
      }
      
      trendAnalysis.cat4_trends = domainTrends;
    }
    
    // Analyze academic trends
    if (studentData.academic_analysis && studentData.academic_analysis.available) {
      const subjects = studentData.academic_analysis.subjects;
      const subjectTrends = {};
      
      for (const subject of subjects) {
        const subjectName = subject.name;
        const historicalValues = [];
        
        // Collect historical values for this subject
        for (const history of historicalData) {
          if (history.academic_analysis && history.academic_analysis.available) {
            const historySubject = history.academic_analysis.subjects.find(s => s.name === subjectName);
            if (historySubject) {
              historicalValues.push({
                timestamp: history.timestamp || 'unknown',
                value: historySubject.stanine
              });
            }
          }
        }
        
        // Add current value
        historicalValues.push({
          timestamp: studentData.timestamp || 'current',
          value: subject.stanine
        });
        
        // Calculate trend similar to CAT4
        let trendDirection = "stable";
        let trendStrength = 0;
        
        if (historicalValues.length >= 2) {
          const oldest = historicalValues[0];
          const current = historicalValues[historicalValues.length - 1];
          const change = current.value - oldest.value;
          
          if (change >= 1) {
            trendDirection = "improving";
            trendStrength = Math.min(1.0, change / 2);
          } else if (change <= -1) {
            trendDirection = "declining";
            trendStrength = Math.min(1.0, Math.abs(change) / 2);
          } else {
            trendDirection = "stable";
            trendStrength = 0;
          }
        }
        
        subjectTrends[subjectName] = {
          values: historicalValues,
          direction: trendDirection,
          strength: trendStrength
        };
      }
      
      trendAnalysis.academic_trends = subjectTrends;
    }
    
    // Calculate overall trend direction
    const allTrends = [
      ...Object.values(trendAnalysis.pass_trends),
      ...Object.values(trendAnalysis.cat4_trends),
      ...Object.values(trendAnalysis.academic_trends)
    ];
    
    if (allTrends.length > 0) {
      const improvingCount = allTrends.filter(t => t.direction === "improving").length;
      const decliningCount = allTrends.filter(t => t.direction === "declining").length;
      
      if (improvingCount > decliningCount * 2) {
        trendAnalysis.overall_direction = "strongly improving";
      } else if (improvingCount > decliningCount) {
        trendAnalysis.overall_direction = "moderately improving";
      } else if (decliningCount > improvingCount * 2) {
        trendAnalysis.overall_direction = "strongly declining";
      } else if (decliningCount > improvingCount) {
        trendAnalysis.overall_direction = "moderately declining";
      } else {
        trendAnalysis.overall_direction = "mixed or stable";
      }
    }
    
    return trendAnalysis;
  }
  
  /**
   * Calculate confidence in prediction based on data completeness
   */
  _calculatePredictionConfidence(studentData, historicalData) {
    let confidence = 0.5; // Base confidence
    
    // Adjust based on data completeness
    const hasPass = studentData.pass_analysis && studentData.pass_analysis.available;
    const hasCat4 = studentData.cat4_analysis && studentData.cat4_analysis.available;
    const hasAcademic = studentData.academic_analysis && studentData.academic_analysis.available;
    
    // Complete data gives higher confidence
    if (hasPass && hasCat4 && hasAcademic) {
      confidence += 0.3;
    } else if ((hasPass && hasCat4) || (hasPass && hasAcademic) || (hasCat4 && hasAcademic)) {
      confidence += 0.15;
    }
    
    // Historical data gives higher confidence
    if (historicalData && historicalData.length > 0) {
      // More historical points = higher confidence
      confidence += Math.min(0.2, historicalData.length * 0.05);
    }
    
    // Cap confidence at 95%
    return Math.min(0.95, confidence);
  }
  
  /**
   * Generate preventive recommendations based on risk analysis
   */
  _generatePreventiveRecommendations(riskLevel, riskFactors, earlyWarnings, trendAnalysis) {
    const recommendations = [];
    
    // High priority recommendations for high risk
    if (riskLevel === 'high') {
      recommendations.push({
        priority: 'high',
        type: 'intervention',
        title: 'Immediate Comprehensive Intervention',
        description: 'Implement a multi-faceted intervention plan addressing all risk areas immediately. Schedule weekly progress monitoring.',
        timeframe: 'Within 1 week'
      });
      
      // Add specific recommendations for top risk factors
      const topRiskFactors = riskFactors.slice(0, 3);
      for (const risk of topRiskFactors) {
        recommendations.push({
          priority: 'high',
          type: 'targeted',
          title: `Address ${risk.factor}`,
          description: `Implement targeted intervention for ${risk.factor} which is a significant risk area (${risk.details})`,
          timeframe: 'Within 2 weeks'
        });
      }
    }
    // Medium priority recommendations for medium risk
    else if (riskLevel === 'medium') {
      recommendations.push({
        priority: 'medium',
        type: 'intervention',
        title: 'Coordinated Intervention Plan',
        description: 'Develop an intervention plan targeting the identified risk areas. Schedule bi-weekly progress monitoring.',
        timeframe: 'Within 2 weeks'
      });
      
      // Add specific recommendations for top risk factors
      const topRiskFactors = riskFactors.slice(0, 2);
      for (const risk of topRiskFactors) {
        recommendations.push({
          priority: 'medium',
          type: 'targeted',
          title: `Address ${risk.factor}`,
          description: `Implement targeted support for ${risk.factor} which shows elevated risk (${risk.details})`,
          timeframe: 'Within 3 weeks'
        });
      }
    }
    // Lower priority recommendations for borderline risk
    else if (riskLevel === 'borderline') {
      recommendations.push({
        priority: 'medium',
        type: 'monitoring',
        title: 'Enhanced Monitoring Plan',
        description: 'Implement closer monitoring of the identified early warning indicators. Schedule monthly check-ins.',
        timeframe: 'Within 1 month'
      });
    }
    
    // Add preventive recommendations based on early warnings
    if (earlyWarnings && earlyWarnings.length > 0) {
      const significantWarnings = earlyWarnings.filter(w => w.level >= 0.5);
      
      if (significantWarnings.length > 0) {
        const warningDomains = [...new Set(significantWarnings.map(w => w.domain))];
        const warningDescription = significantWarnings.slice(0, 2).map(w => w.indicator).join(', ');
        
        recommendations.push({
          priority: riskLevel === 'low' ? 'medium' : 'high',
          type: 'preventive',
          title: `Preventive Action for ${warningDomains.join('/')} Indicators`,
          description: `Implement preventive strategies to address early warning signs in ${warningDescription}`,
          timeframe: riskLevel === 'low' ? 'Within 6 weeks' : 'Within 3 weeks'
        });
      }
    }
    
    // Add trend-based recommendations
    if (trendAnalysis && trendAnalysis.available) {
      if (trendAnalysis.overall_direction.includes('declining')) {
        recommendations.push({
          priority: riskLevel === 'low' ? 'low' : 'medium',
          type: 'trend-response',
          title: 'Address Declining Trends',
          description: 'Implement strategies to reverse the declining trends observed across multiple assessment areas.',
          timeframe: riskLevel === 'low' ? 'Within 2 months' : 'Within 1 month'
        });
      }
    }
    
    // Add general preventive recommendation for low risk
    if (riskLevel === 'low' && recommendations.length === 0) {
      recommendations.push({
        priority: 'low',
        type: 'maintenance',
        title: 'Maintain Current Support',
        description: 'Continue current support strategies and regular monitoring to maintain positive trajectory.',
        timeframe: 'Ongoing'
      });
    }
    
    return recommendations;
  }
}

export default PredictiveAnalytics;

  /**
   * Generate intervention recommendations
   */
  /**
 * Generate intervention recommendations based on triangulated data analysis
 * following the instruction set mapping logic:
 * - PASS P3/P7 at risk → Self-esteem/confidence building
 * - P4/P6 at risk → Time management / Organization skills
 * - P5/P8 at risk → Attendance and engagement mentoring
 * - CAT4 Verbal SAS < 90 → Verbal reasoning / reading boosters
 * - Fragile learner = Yes → Holistic learning support
 * - Academic subject = Weak → Subject-specific booster modules
 */
generateInterventions(passAnalysis, cat4Analysis, academicAnalysis, isFragileLearner) {
  const interventions = [];
  
  // PASS factor to P-number mapping (based on the instruction set)
  const passToP = {
    'self_regard': 'P3',
    'perceived_learning': 'P1',
    'attitude_teachers': 'P4',
    'general_work_ethic': 'P6',
    'confidence_learning': 'P2',
    'preparedness': 'P8',
    'emotional_control': 'P7',
    'social_confidence': 'P9',
    'curriculum_demand': 'P5'
  };
  
  // PASS-based interventions
  if (passAnalysis.available) {
    passAnalysis.riskAreas.forEach(risk => {
      const factor = risk.factor.toLowerCase().replace(' ', '_');
      const pNumber = passToP[factor];
      
      // Apply intervention mapping based on P-number groups
      if (pNumber === 'P3' || pNumber === 'P7') {
        // Self-esteem/confidence building interventions
        interventions.push({
          domain: 'emotional',
          factor: risk.factor,
          title: 'Self-Esteem Building',
          description: 'Weekly sessions focusing on identifying and celebrating strengths. Include positive affirmation activities and reflective journaling.',
          priority: 'high'
        });
        
        interventions.push({
          domain: 'emotional',
          factor: risk.factor,
          title: 'Success Experiences Program',
          description: 'Create structured opportunities for the student to experience success with increasing levels of challenge to build confidence.',
          priority: 'medium'
        });
      } else if (pNumber === 'P4' || pNumber === 'P6') {
        // Time management / Organization skills interventions
        interventions.push({
          domain: 'behavioral',
          factor: risk.factor,
          title: 'Organization Skills Coaching',
          description: 'Weekly sessions to develop organizational systems for materials, assignments, and time management.',
          priority: 'high'
        });
        
        interventions.push({
          domain: 'behavioral',
          factor: risk.factor,
          title: 'Goal Setting Framework',
          description: 'Implement SMART goal system with regular progress monitoring and incentives for completion.',
          priority: 'medium'
        });
      } else if (pNumber === 'P5' || pNumber === 'P8') {
        // Attendance and engagement mentoring
        interventions.push({
          domain: 'behavioral',
          factor: risk.factor,
          title: 'Engagement Mentoring',
          description: 'Regular check-ins with a mentor to discuss attendance, engagement challenges, and develop strategies for improvement.',
          priority: 'high'
        });
        
        interventions.push({
          domain: 'behavioral',
          factor: risk.factor,
          title: 'Interest-Based Learning',
          description: 'Identify student interests and incorporate them into learning activities to increase engagement and connection to curriculum.',
          priority: 'medium'
        });
      } else {
        // Default intervention for other P-numbers
        interventions.push({
          domain: 'emotional',
          factor: risk.factor,
          title: `${risk.factor} Support`,
          description: `Targeted support for improving ${risk.factor.toLowerCase()} through structured activities and regular feedback.`,
          priority: 'medium'
        });
      }
    });
  }
  
  // CAT4-based interventions
  if (cat4Analysis.available) {
    // Verbal reasoning support
    const verbalDomain = cat4Analysis.domains.find(d => d.name.toLowerCase().includes('verbal'));
    if (verbalDomain && verbalDomain.stanine <= 3) {
      interventions.push({
        domain: 'cognitive',
        factor: 'Verbal Reasoning',
        title: 'Verbal Skills Development',
        description: 'Explicit instruction in vocabulary development, reading comprehension strategies, and verbal expression.',
        priority: 'high'
      });
      
      interventions.push({
        domain: 'cognitive',
        factor: 'Verbal Reasoning',
        title: 'Reading Comprehension Boosters',
        description: 'Targeted practice with increasingly complex texts using scaffolded comprehension techniques.',
        priority: 'high'
      });
    }
    
    // Add interventions for other cognitive domains with weaknesses
    cat4Analysis.weaknessAreas.forEach(weakness => {
      if (!weakness.domain.toLowerCase().includes('verbal')) { // Avoid duplication with verbal already handled
        interventions.push({
          domain: 'cognitive',
          factor: weakness.domain,
          title: `${weakness.domain} Development`,
          description: `Targeted activities to strengthen ${weakness.domain.toLowerCase()} through explicit teaching and guided practice.`,
          priority: 'medium'
        });
      }
    });
  }
  
  // Fragile learner intervention (high priority)
  if (isFragileLearner) {
    interventions.push({
      domain: 'holistic',
      factor: 'Fragile Learner',
      title: 'Comprehensive Learning Support',
      description: 'Multi-faceted approach combining cognitive scaffolding, additional processing time, and alternative assessment options.',
      priority: 'high'
    });
    
    interventions.push({
      domain: 'holistic',
      factor: 'Fragile Learner',
      title: 'Confidence Building Program',
      description: 'Integrated approach to building academic confidence through metacognitive strategies and celebrating incremental progress.',
      priority: 'high'
    });
  }
  
  // Academic interventions based on subject weaknesses
  if (academicAnalysis.available) {
    academicAnalysis.subjects.forEach(subject => {
      if (subject.level === 'weakness') {
        interventions.push({
          domain: 'academic',
          factor: `${subject.name} Performance`,
          title: `${subject.name} Booster Module`,
          description: `Subject-specific tutoring focusing on foundational skills and knowledge gaps identified through assessment in ${subject.name}.`,
          priority: 'high'
        });
      }
    });
  }
  
  // Add performance-gap interventions (comparing CAT4 potential with academic performance)
  if (cat4Analysis.available && academicAnalysis.available) {
    // For underperforming subjects (performing below cognitive potential)
    const underperformingSubjects = academicAnalysis.subjects.filter(subject => {
      if (subject.name.toLowerCase().includes('english')) {
        // Compare English with Verbal Reasoning
        const verbalDomain = cat4Analysis.domains.find(d => d.name.toLowerCase().includes('verbal'));
        return verbalDomain && subject.stanine < verbalDomain.stanine - 1;
      } else if (subject.name.toLowerCase().includes('math')) {
        // Compare Math with Quantitative Reasoning
        const quantDomain = cat4Analysis.domains.find(d => d.name.toLowerCase().includes('quant'));
        return quantDomain && subject.stanine < quantDomain.stanine - 1;
      }
      // For other subjects, compare with average CAT4
      const avgCat4 = cat4Analysis.domains.reduce((sum, d) => sum + d.stanine, 0) / cat4Analysis.domains.length;
      return subject.stanine < avgCat4 - 1;
    });
    
    underperformingSubjects.forEach(subject => {
      interventions.push({
        domain: 'academic',
        factor: `${subject.name} Underperformance`,
        title: 'Potential Achievement Plan',
        description: `Targeted strategies to help student achieve their cognitive potential in ${subject.name} through motivational techniques and personalized learning approaches.`,
        priority: 'high'
      });
    });
  }
  
  // Filter out duplicate interventions
  const uniqueInterventions = [];
  const interventionKeys = new Set();
  
  interventions.forEach(intervention => {
    const key = `${intervention.domain}:${intervention.title}`;
    if (!interventionKeys.has(key)) {
      interventionKeys.add(key);
      uniqueInterventions.push(intervention);
    }
  });
  
  // Sort by priority
  const priorityOrder = { 'high': 0, 'medium': 1, 'low': 2 };
  uniqueInterventions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  
  return uniqueInterventions;
}

  // Helper conversion functions

  /**
   * Convert SAS (Standard Age Score) to stanine (1-9 scale)
   */
  sasToStanine(sas) {
    // Handle null or undefined
    if (!sas) return 5;
    
    // Handle if it's already a stanine
    if (sas >= 1 && sas <= 9) return parseInt(sas);
    
    // Convert SAS scores to stanines (standard conversion)
    if (sas >= 126) return 9;
    if (sas >= 119) return 8;
    if (sas >= 112) return 7;
    if (sas >= 104) return 6;
    if (sas >= 97) return 5;
    if (sas >= 89) return 4;
    if (sas >= 82) return 3;
    if (sas >= 74) return 2;
    return 1;
  }
  
  /**
   * Convert percentile (0-100) to stanine (1-9 scale)
   */
  percentileToStanine(percentile) {
    // Handle null or undefined
    if (!percentile) return 5;
    
    // Handle if it's already a stanine
    if (percentile >= 1 && percentile <= 9) return parseInt(percentile);
    
    // Convert percentile to stanine (standard conversion)
    if (percentile >= 96) return 9;
    if (percentile >= 89) return 8;
    if (percentile >= 77) return 7;
    if (percentile >= 60) return 6;
    if (percentile >= 40) return 5;
    if (percentile >= 23) return 4;
    if (percentile >= 11) return 3;
    if (percentile >= 4) return 2;
    return 1;
  }
}

export default ImprovedDataProcessor;