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
        // Determine risk level
        let level;
        if (value < this.passRiskThreshold) {
          level = 'at-risk';
          riskAreas.push({
            factor: key.replace(/_/g, ' '),
            percentile: value,
            level: 'at-risk'
          });
        } else if (value >= this.passStrengthThreshold) {
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
    
    cat4Domains.forEach(domain => {
      const stanine = student.cat4_data[domain.key];
      if (stanine && stanine > 0) {
        // Determine level
        let level;
        if (stanine <= this.cat4WeaknessThreshold) {
          level = 'weakness';
          weaknessAreas.push({
            domain: domain.name,
            stanine: stanine,
            level: 'weakness'
          });
        } else if (stanine >= this.cat4StrengthThreshold) {
          level = 'strength';
          strengthAreas.push({
            domain: domain.name,
            stanine: stanine,
            level: 'strength'
          });
        } else {
          level = 'average';
        }
        
        domains.push({
          name: domain.name,
          stanine: stanine,
          level: level,
          description: this.cat4DomainDescriptions[domain.key] || ''
        });
      }
    });
    
    // Sort domains by stanine to put weaknesses first
    domains.sort((a, b) => a.stanine - b.stanine);
    
    // Initially set fragile learner status based on CAT4 weaknesses only
    // This might be updated later based on triangulation with PASS data
    const isFragileLearner = weaknessAreas.length >= 2;
    
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
      // Determine level based on stanine
      let level;
      if (data.stanine <= this.cat4WeaknessThreshold) {
        level = 'weakness';
      } else if (data.stanine >= this.cat4StrengthThreshold) {
        level = 'strength';
      } else {
        level = 'average';
      }
      
      subjects.push({
        name: subject,
        mark: data.mark,
        stanine: data.stanine,
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
   * Generate intervention recommendations
   */
  generateInterventions(passAnalysis, cat4Analysis, academicAnalysis, isFragileLearner) {
    const interventions = [];
    
    // PASS-based interventions
    if (passAnalysis.available) {
      passAnalysis.riskAreas.forEach(risk => {
        const factor = risk.factor.toLowerCase();
        
        if (factor.includes('self regard')) {
          interventions.push({
            domain: 'emotional',
            factor: 'Self Regard',
            title: 'Self-Esteem Building',
            description: 'Weekly sessions focusing on identifying and celebrating strengths. Include positive affirmation activities and reflective journaling.',
            priority: 'high'
          });
          
          interventions.push({
            domain: 'emotional',
            factor: 'Self Regard',
            title: 'Success Portfolio',
            description: 'Create a digital or physical portfolio where student can document and reflect on achievements, no matter how small.',
            priority: 'medium'
          });
        }
        else if (factor.includes('attitude to teacher')) {
          interventions.push({
            domain: 'emotional',
            factor: 'Attitude to Teachers',
            title: 'Teacher-Student Mediation',
            description: 'Facilitated discussion between student and teachers to address concerns and establish mutual respect and understanding.',
            priority: 'medium'
          });
          
          interventions.push({
            domain: 'emotional',
            factor: 'Attitude to Teachers',
            title: 'Mentorship Assignment',
            description: 'Pair student with a staff member who can serve as a mentor and demonstrate positive teacher relationships.',
            priority: 'medium'
          });
        }
        else if (factor.includes('work ethic')) {
          interventions.push({
            domain: 'emotional',
            factor: 'Work Ethic',
            title: 'Academic Coaching',
            description: 'Weekly sessions to develop organizational skills, time management, and task prioritization strategies.',
            priority: 'high'
          });
          
          interventions.push({
            domain: 'behavioral',
            factor: 'Work Ethic',
            title: 'Goal Setting Framework',
            description: 'Implement SMART goal system with regular progress monitoring and incentives for completion.',
            priority: 'high'
          });
        }
        else if (factor.includes('emotional control')) {
          interventions.push({
            domain: 'emotional',
            factor: 'Emotional Control',
            title: 'Emotional Regulation Therapy',
            description: 'Sessions focused on identifying emotional triggers and developing healthy coping mechanisms.',
            priority: 'high'
          });
          
          interventions.push({
            domain: 'behavioral',
            factor: 'Emotional Control',
            title: 'Safe Space Protocol',
            description: 'Establish procedure for student to access quiet space or trusted adult when feeling overwhelmed.',
            priority: 'high'
          });
        }
        else if (factor.includes('social confidence')) {
          interventions.push({
            domain: 'emotional',
            factor: 'Social Confidence',
            title: 'Social Skills Group',
            description: 'Small group sessions focusing on conversational skills, friendship building, and navigating social situations.',
            priority: 'medium'
          });
          
          interventions.push({
            domain: 'emotional',
            factor: 'Social Confidence',
            title: 'Structured Social Opportunities',
            description: 'Create low-pressure opportunities for positive peer interaction through structured activities matching student interests.',
            priority: 'medium'
          });
        }
        else if (factor.includes('curriculum demand')) {
          interventions.push({
            domain: 'academic',
            factor: 'Curriculum Demands',
            title: 'Curriculum Scaffolding',
            description: 'Provide additional supports through modified assignments, extended deadlines, or supplementary resources.',
            priority: 'high'
          });
          
          interventions.push({
            domain: 'academic',
            factor: 'Curriculum Demands',
            title: 'Study Skills Training',
            description: 'Direct instruction in subject-specific study strategies, note-taking techniques, and test preparation.',
            priority: 'high'
          });
        }
        else if (factor.includes('perceived learning')) {
          interventions.push({
            domain: 'cognitive',
            factor: 'Perceived Learning Capability',
            title: 'Growth Mindset Intervention',
            description: 'Structured activities to shift from fixed to growth mindset, emphasizing that abilities can be developed through dedication and hard work.',
            priority: 'high'
          });
        }
        else if (factor.includes('confidence in learning')) {
          interventions.push({
            domain: 'cognitive',
            factor: 'Learning Confidence',
            title: 'Scaffolded Success Experiences',
            description: 'Carefully designed learning tasks that ensure success while gradually increasing difficulty to build confidence.',
            priority: 'medium'
          });
        }
        else if (factor.includes('preparedness')) {
          interventions.push({
            domain: 'behavioral',
            factor: 'Preparedness for Learning',
            title: 'Organization System',
            description: 'Implementation of structured organization system for materials, assignments, and study schedule with regular check-ins.',
            priority: 'medium'
          });
        }
      });
    }
    
    // CAT4-based interventions
    if (cat4Analysis.available) {
      // Fragile learner interventions have high priority
      if (cat4Analysis.is_fragile_learner || isFragileLearner) {
        interventions.push({
          domain: 'cognitive',
          factor: 'Fragile Learner',
          title: 'Comprehensive Learning Support',
          description: 'Multi-faceted approach combining cognitive scaffolding, additional processing time, and alternative assessment options.',
          priority: 'high'
        });
        
        interventions.push({
          domain: 'emotional',
          factor: 'Fragile Learner',
          title: 'Learning Skills Integration',
          description: 'Explicit teaching of learning strategies across curriculum areas with regular monitoring and reinforcement.',
          priority: 'high'
        });
        
        interventions.push({
          domain: 'cognitive',
          factor: 'Fragile Learner',
          title: 'Multimodal Instruction',
          description: 'Ensure teaching incorporates visual, auditory, and kinesthetic elements to support cognitive processing.',
          priority: 'medium'
        });
      }
      
      // Domain-specific interventions
      cat4Analysis.weaknessAreas.forEach(weakness => {
        const domain = weakness.domain.toLowerCase();
        
        if (domain.includes('verbal')) {
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
            title: 'Language Scaffolding',
            description: 'Provide word banks, sentence starters, and structured discussion frameworks to support verbal processing.',
            priority: 'medium'
          });
        }
        else if (domain.includes('quantitative')) {
          interventions.push({
            domain: 'cognitive',
            factor: 'Quantitative Reasoning',
            title: 'Numeracy Intervention',
            description: 'Targeted support for numerical operations, mathematical vocabulary, and quantitative problem-solving.',
            priority: 'high'
          });
          
          interventions.push({
            domain: 'cognitive',
            factor: 'Quantitative Reasoning',
            title: 'Visual Math Strategies',
            description: 'Incorporate visual representations, manipulatives, and real-world applications to strengthen quantitative understanding.',
            priority: 'medium'
          });
        }
        else if (domain.includes('nonverbal')) {
          interventions.push({
            domain: 'cognitive',
            factor: 'Nonverbal Reasoning',
            title: 'Pattern Recognition Training',
            description: 'Activities focused on identifying patterns, relationships, and solving abstract problems without language.',
            priority: 'high'
          });
          
          interventions.push({
            domain: 'cognitive',
            factor: 'Nonverbal Reasoning',
            title: 'Visual Thinking Tools',
            description: 'Teach use of mind maps, graphic organizers, and visual planning tools to leverage nonverbal thinking.',
            priority: 'medium'
          });
        }
        else if (domain.includes('spatial')) {
          interventions.push({
            domain: 'cognitive',
            factor: 'Spatial Reasoning',
            title: 'Spatial Skills Activities',
            description: 'Structured practice with mental rotation, spatial visualization, and understanding 3D relationships.',
            priority: 'high'
          });
          
          interventions.push({
            domain: 'cognitive',
            factor: 'Spatial Reasoning',
            title: 'Hands-on Construction Tasks',
            description: 'Regular opportunities to build, manipulate, and create using blocks, models, or digital design tools.',
            priority: 'medium'
          });
        }
      });
    }
    
    // Academic interventions based on performance
    if (academicAnalysis.available) {
      academicAnalysis.subjects.forEach(subject => {
        if (subject.level === 'weakness') {
          interventions.push({
            domain: 'academic',
            factor: `${subject.name} Performance`,
            title: `Targeted ${subject.name} Tutoring`,
            description: `Subject-specific tutoring focusing on foundational skills and knowledge gaps identified through assessment.`,
            priority: 'high'
          });
        }
      });
    }
    
    // Add performance-comparison based interventions
    if (academicAnalysis.available && cat4Analysis.available) {
      const comparisons = academicAnalysis.subjects.map(subject => {
        // Find relevant CAT4 domain
        let relevantDomain;
        if (subject.name === 'English') {
          relevantDomain = 'Verbal Reasoning';
        } else if (subject.name === 'Mathematics') {
          relevantDomain = 'Quantitative Reasoning';
        } else if (subject.name === 'Science') {
          relevantDomain = 'Nonverbal Reasoning';
        } else {
          relevantDomain = 'General';
        }
        
        // Compare stanines (subject vs. CAT4)
        const subjectStanine = subject.stanine;
        const domainStanine = cat4Analysis.domains.find(d => d.name === relevantDomain)?.stanine || 5;
        
        if (subjectStanine < domainStanine - 1) {
          return {
            subject: subject.name,
            underperforming: true,
            domain: relevantDomain
          };
        }
        
        return null;
      }).filter(Boolean);
      
      // Add interventions for underperforming subjects
      comparisons.forEach(comparison => {
        if (comparison.underperforming) {
          interventions.push({
            domain: 'academic',
            factor: `${comparison.subject} Underperformance`,
            title: 'Motivation Strategy',
            description: `Implement interest-based learning opportunities and meaningful goal-setting to increase engagement with ${comparison.subject}.`,
            priority: 'high'
          });
          
          interventions.push({
            domain: 'academic',
            factor: `${comparison.subject} Underperformance`,
            title: 'Success Coaching',
            description: `Regular check-ins to address barriers to achievement and develop strategies for maximizing cognitive potential in ${comparison.subject}.`,
            priority: 'medium'
          });
        }
      });
    }
    
    // Remove duplicates (same title and domain)
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