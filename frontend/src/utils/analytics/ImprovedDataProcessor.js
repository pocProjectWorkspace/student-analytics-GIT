/**
 * ImprovedDataProcessor.js
 * Core module for processing student assessment data
 * Handles file parsing, data integration, and triangulated analysis
 */

import * as XLSX from 'xlsx';
import { PASS_THRESHOLDS, CAT4_THRESHOLDS, ACADEMIC_THRESHOLDS } from './constants/AssessmentThresholds';
import { PASS_FACTOR_DESCRIPTIONS, PASS_COLUMN_MAPPINGS } from './constants/PassFactors';
import { CAT4_DOMAIN_DESCRIPTIONS, CAT4_COLUMN_MAPPINGS } from './constants/CognitiveFactors';
import { 
  sasToStanine, 
  percentileToStanine, 
  getLevelFromPercentile, 
  getLevelFromStanine 
} from './DataConverters';
import { generateInterventions, generateCompoundInterventions } from './InterventionGenerator.js';

class ImprovedDataProcessor {
  constructor() {
    // Store references to constants
    this.passRiskThreshold = PASS_THRESHOLDS.RISK;
    this.passStrengthThreshold = PASS_THRESHOLDS.STRENGTH;
    this.cat4WeaknessThreshold = CAT4_THRESHOLDS.WEAKNESS;
    this.cat4StrengthThreshold = CAT4_THRESHOLDS.STRENGTH;
    this.passFactorDescriptions = PASS_FACTOR_DESCRIPTIONS;
    this.cat4DomainDescriptions = CAT4_DOMAIN_DESCRIPTIONS;
  }

  /**
   * Process multiple data files and generate complete student analyses
   * @param {File} passFile - PASS assessment file
   * @param {File} cat4File - CAT4 assessment file
   * @param {File} assetFile - Academic/ASSET assessment file
   * @returns {Array} - Analyzed student data
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
   * @param {File} file - Excel file to process
   * @returns {Object} - Object containing data from all sheets
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
   * @param {File} file - PASS assessment file
   * @returns {Array} - Processed PASS data
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
        const factors = {};
        
        // Process each PASS factor using the column mappings
        for (const [factorKey, possibleNames] of Object.entries(PASS_COLUMN_MAPPINGS)) {
          // Find the first matching column name that exists in the data
          const matchingColumn = possibleNames.find(name => row[name] !== undefined);
          factors[factorKey] = matchingColumn ? parseFloat(row[matchingColumn] || 0) : 0;
        }
        
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
   * @param {File} file - CAT4 assessment file
   * @returns {Array} - Processed CAT4 data
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
        
        // Extract CAT4 domain scores using column mappings
        const domainScores = {};
        
        for (const [domainKey, possibleNames] of Object.entries(CAT4_COLUMN_MAPPINGS)) {
          // Find the first matching column name
          const matchingColumn = possibleNames.find(name => row[name] !== undefined);
          domainScores[domainKey] = matchingColumn ? parseFloat(row[matchingColumn] || 0) : 0;
        }
        
        // Check if scores are SAS format (typically 70-140 range) or stanine (1-9)
        const sampleScores = Object.values(domainScores).filter(score => score > 0);
        const isSASFormat = sampleScores.some(score => score > 9);
        
        // Convert to stanines if in SAS format
        const domainStanines = {};
        for (const [domain, score] of Object.entries(domainScores)) {
          domainStanines[domain] = isSASFormat ? sasToStanine(score) : parseInt(score || 0);
        }
        
        return {
          student_id: studentId.toString(),
          name: name,
          grade: grade,
          section: section,
          cat4_data: {
            verbal_reasoning: domainStanines.verbal_reasoning,
            quantitative_reasoning: domainStanines.quantitative_reasoning,
            nonverbal_reasoning: domainStanines.nonverbal_reasoning,
            spatial_reasoning: domainStanines.spatial_reasoning,
            mean_sas: row['Mean SAS'] || null,
            verbal_profile: row['Verbal Spatial Profile'] || null,
            score_format: isSASFormat ? 'SAS' : 'Stanine',
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
   * @param {File} file - Academic assessment file
   * @returns {Array} - Processed academic data
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
   * @private
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
      return percentileToStanine(parseFloat(percentileVal));
    }
    
    // If we have a mark (assuming 0-100 scale), convert to stanine
    const markVal = row[`${subjectPrefix} Marks`] || row[`${subjectPrefix}_Marks`] || 
                   row[`${subjectPrefix.toLowerCase()} marks`] || row[`ASSET ${subjectPrefix} Score`] || 
                   row[subjectPrefix];
    
    if (markVal !== undefined) {
      const mark = parseFloat(markVal);
      // Assuming marks are on scale 0-100, convert appropriately
      if (mark <= 100) {
        return percentileToStanine(mark);
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
   * @param {Array} passData - PASS assessment data
   * @param {Array} cat4Data - CAT4 assessment data
   * @param {Array} assetData - Academic assessment data
   * @returns {Array} - Merged student records
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
   * @param {Array} students - Merged student data
   * @returns {Array} - Analyzed student data with added insights
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
      const interventions = generateInterventions(passAnalysis, cat4Analysis, academicAnalysis, isFragileLearner);
      
      // Generate compound interventions
      const compoundInterventions = generateCompoundInterventions(passAnalysis, cat4Analysis, academicAnalysis, isFragileLearner);
      
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
        interventions: interventions,
        compoundInterventions: compoundInterventions
      };
    });
  }

  /**
   * Analyze PASS data to identify attitudinal factors affecting learning
   * @param {Object} student - Student data
   * @returns {Object} - Analyzed PASS data
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
        // Determine risk level based on thresholds
        let level = getLevelFromPercentile(value);
        
        if (level === 'at-risk') {
          riskAreas.push({
            factor: key.replace(/_/g, ' '),
            percentile: value,
            level: 'at-risk'
          });
        } else if (level === 'strength') {
          strengthAreas.push({
            factor: key.replace(/_/g, ' '),
            percentile: value,
            level: 'strength'
          });
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
   * @param {Object} student - Student data
   * @returns {Object} - Analyzed CAT4 data
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
    
    // Count domains with stanine <= 3 for fragile learner identification
    let weakDomainCount = 0;
    let stanineSum = 0;
    let domainCount = 0;
    
    cat4Domains.forEach(domain => {
      const stanine = student.cat4_data[domain.key] || 0;
      
      if (stanine > 0) {
        // Determine level based on stanine
        const level = getLevelFromStanine(stanine);
        
        if (level === 'weakness') {
          weakDomainCount++;
          weaknessAreas.push({
            domain: domain.name,
            stanine: stanine,
            level: 'weakness'
          });
        } else if (level === 'strength') {
          strengthAreas.push({
            domain: domain.name,
            stanine: stanine,
            level: 'strength'
          });
        }
        
        domains.push({
          name: domain.name,
          stanine: stanine,
          level: level,
          description: this.cat4DomainDescriptions[domain.key] || ''
        });
        
        stanineSum += stanine;
        domainCount++;
      }
    });
    
    // Determine fragile learner status based on weak domains
    const isFragileLearner = weakDomainCount >= 2;
    
    // Calculate average stanine
    const averageStanine = domainCount > 0 ? stanineSum / domainCount : 0;
    
    // Determine cognitive profile based on stanine distribution
    let cognitiveProfile = 'Balanced';
    if (weaknessAreas.length > strengthAreas.length) {
      cognitiveProfile = 'Challenging';
    } else if (strengthAreas.length > weaknessAreas.length) {
      cognitiveProfile = 'Strong';
    }
    
    return {
      available: domains.length > 0,
      domains: domains,
      weaknessAreas: weaknessAreas,
      strengthAreas: strengthAreas,
      is_fragile_learner: isFragileLearner,
      averageStanine: averageStanine,
      cognitiveProfile: cognitiveProfile
    };
  }

  /**
   * Analyze academic data to assess performance
   * @param {Object} student - Student data
   * @returns {Object} - Analyzed academic data
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
        stanine = percentileToStanine(data.mark);
      }
      
      // Determine level based on stanine
      const level = getLevelFromStanine(stanine);
      
      subjects.push({
        name: subject,
        mark: data.mark,
        stanine: stanine,
        level: level,
        percentile: data.percentile
      });
    }
    
    // Calculate average academic performance
    const totalStanine = subjects.reduce((sum, subject) => sum + subject.stanine, 0);
    const avgStanine = subjects.length > 0 ? totalStanine / subjects.length : 0;
    
    // Academic profile based on average stanine
    let academicProfile = 'Average';
    if (avgStanine <= 3.5) {
      academicProfile = 'Low';
    } else if (avgStanine >= 6.5) {
      academicProfile = 'High';
    }
    
    return {
      available: subjects.length > 0,
      subjects: subjects,
      averageStanine: avgStanine,
      academicProfile: academicProfile
    };
  }

  /**
   * Compare academic performance with cognitive potential
   * @param {Object} cat4Analysis - Analyzed CAT4 data
   * @param {Object} academicAnalysis - Analyzed academic data
   * @returns {Object} - Performance comparison results
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
    const underperformingCount = Object.values(comparisons)
      .filter(c => c.status === 'Underperforming').length;
    
    return {
      available: true,
      comparisons: comparisons,
      underperformingCount: underperformingCount
    };
  }

  /**
   * Identify fragile learners using triangulated data
   * @param {Object} passAnalysis - Analyzed PASS data
   * @param {Object} cat4Analysis - Analyzed CAT4 data
   * @param {Object} performanceComparison - Performance comparison results
   * @returns {boolean} - Whether the student is a fragile learner
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
    const hasGoodCognitive = cat4Analysis.domains.filter(d => 
      d.level === 'average' || d.level === 'strength').length >= 2;
    
    // Pattern 2: PASS issues + academic underperformance
    const showsUnderperformance = performanceComparison.available && 
      performanceComparison.underperformingCount > 0;
    
    return (hasGoodCognitive && hasPassRisks) || (hasPassRisks && showsUnderperformance);
  }
}

export default ImprovedDataProcessor;