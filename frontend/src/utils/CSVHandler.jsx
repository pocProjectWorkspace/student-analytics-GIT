// frontend/src/utils/CSVHandler.jsx
import Papa from 'papaparse';

class CSVHandler {
  static async parseUploadedFile(file) {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          console.log('Parsed CSV data:', results);
          resolve(results.data);
        },
        error: (error) => {
          console.error('Error parsing CSV:', error);
          reject(error);
        }
      });
    });
  }
  
  static processAcademicData(data) {
    // Process the academic data with mixed stanine scores
    const students = [];
    
    data.forEach(row => {
      // Skip empty rows
      if (!row || Object.keys(row).length === 0) return;
      
      // Extract student info
      const studentId = row['Student ID'];
      const name = row['Name'];
      const grade = row['Grade'];
      const section = row['Section'];
      
      if (!studentId) return; // Skip rows without student ID
      
      // Create student object
      const student = {
        student_id: studentId,
        name: name,
        grade: grade,
        section: section,
        subjects: {}
      };
      
      // Extract subject data based on the column headers (which may vary)
      const columns = Object.keys(row);
      
      // Process English
      this.extractSubjectData(row, columns, 'English', student);
      
      // Process Mathematics
      this.extractSubjectData(row, columns, 'MATHEMATICS', student);
      
      // Process Science
      this.extractSubjectData(row, columns, 'Science', student);
      
      students.push(student);
    });
    
    return students;
  }
  
  static extractSubjectData(row, columns, subjectKey, student) {
    // Find all columns related to this subject
    const subjectColumns = columns.filter(col => col.startsWith(subjectKey) || col === 'Internal Marks');
    
    // If no relevant columns, skip
    if (subjectColumns.length === 0) return;
    
    // Extract marks and stanines
    let mark = null;
    let stanine = null;
    let assetStanine = null;
    let cat4Marks = null;
    let cat4Stanine = null;
    let comparison = null;
    
    // Try specific column formats first
    if (row[`${subjectKey}.Internal Marks`] !== undefined) {
      mark = row[`${subjectKey}.Internal Marks`];
    } else if (row['Internal Marks'] !== undefined) {
      mark = row['Internal Marks'];
    }
    
    if (row[`${subjectKey}.Internal Stanine`] !== undefined) {
      stanine = row[`${subjectKey}.Internal Stanine`];
    } else if (row['Internal Stanine'] !== undefined) {
      stanine = row['Internal Stanine'];
    }
    
    if (row[`${subjectKey}.Asset Stanine`] !== undefined) {
      assetStanine = row[`${subjectKey}.Asset Stanine`];
    } else if (row['Asset Stanine'] !== undefined) {
      assetStanine = row['Asset Stanine'];
    }
    
    if (row[`${subjectKey}.CAT4 Marks`] !== undefined) {
      cat4Marks = row[`${subjectKey}.CAT4 Marks`];
    } else if (row['CAT4 Marks'] !== undefined) {
      cat4Marks = row['CAT4 Marks'];
    }
    
    if (row[`${subjectKey}.CAT4 Stanine`] !== undefined) {
      cat4Stanine = row[`${subjectKey}.CAT4 Stanine`];
    } else if (row['CAT4 Stanine'] !== undefined) {
      cat4Stanine = row['CAT4 Stanine'];
    }
    
    if (row[`${subjectKey}.Compare`] !== undefined) {
      comparison = row[`${subjectKey}.Compare`];
    } else if (row['Compare'] !== undefined) {
      comparison = row['Compare'];
    }
    
    // Only add subject if we have some data
    if (mark !== null || stanine !== null) {
      student.subjects[subjectKey] = {
        mark: mark !== null ? parseFloat(mark) : null,
        stanine: stanine !== null ? parseInt(stanine) : null,
        asset_stanine: assetStanine !== null ? parseInt(assetStanine) : null,
        cat4_marks: cat4Marks !== null ? parseFloat(cat4Marks) : null,
        cat4_stanine: cat4Stanine !== null ? parseInt(cat4Stanine) : null,
        comparison: comparison || 'Not Available'
      };
    }
  }
  
  static extractCognitiveData(students) {
    // Extract CAT4 data from the academic data that includes CAT4 scores
    return students.map(student => {
      const subjects = student.subjects || {};
      
      // Use English CAT4 as verbal reasoning
      const verbalReasoning = subjects['English']?.cat4_stanine || 5;
      
      // Use Math CAT4 as quantitative reasoning
      const quantitativeReasoning = subjects['MATHEMATICS']?.cat4_stanine || 5;
      
      // Use Science CAT4 as nonverbal reasoning
      const nonverbalReasoning = subjects['Science']?.cat4_stanine || 5;
      
      // Calculate spatial reasoning as average of other domains if not available
      const spatialReasoning = Math.round((verbalReasoning + quantitativeReasoning + nonverbalReasoning) / 3);
      
      // Determine if student is a fragile learner (stanine ≤ 3 in 2+ domains)
      const domainScores = [verbalReasoning, quantitativeReasoning, nonverbalReasoning, spatialReasoning];
      const weakDomains = domainScores.filter(score => score <= 3).length;
      const isFragileLearner = weakDomains >= 2;
      
      return {
        ...student,
        cat4_data: {
          verbal_reasoning: verbalReasoning,
          quantitative_reasoning: quantitativeReasoning,
          nonverbal_reasoning: nonverbalReasoning,
          spatial_reasoning: spatialReasoning,
          is_fragile_learner: isFragileLearner
        }
      };
    });
  }
  
  static processData(data) {
    // Main entry point for processing uploaded CSV files
    const academicData = this.processAcademicData(data);
    const cognitiveData = this.extractCognitiveData(academicData);
    
    // Merge the processed data
    const mergedData = cognitiveData.map(student => {
      // Convert to our expected format for UI components
      return {
        student_id: student.student_id,
        name: student.name,
        grade: student.grade,
        section: student.section,
        passData: {
          factors: [], // Empty for now, could be filled from another file
          riskAreas: []
        },
        cat4Data: {
          isFragileLearner: student.cat4_data?.is_fragile_learner || false,
          domains: [
            {
              name: 'Verbal Reasoning',
              stanine: student.cat4_data?.verbal_reasoning || 5,
              level: this.getLevelFromStanine(student.cat4_data?.verbal_reasoning || 5)
            },
            {
              name: 'Quantitative Reasoning',
              stanine: student.cat4_data?.quantitative_reasoning || 5,
              level: this.getLevelFromStanine(student.cat4_data?.quantitative_reasoning || 5)
            },
            {
              name: 'Nonverbal Reasoning',
              stanine: student.cat4_data?.nonverbal_reasoning || 5,
              level: this.getLevelFromStanine(student.cat4_data?.nonverbal_reasoning || 5)
            },
            {
              name: 'Spatial Reasoning',
              stanine: student.cat4_data?.spatial_reasoning || 5,
              level: this.getLevelFromStanine(student.cat4_data?.spatial_reasoning || 5)
            }
          ]
        },
        academicData: {
          subjects: Object.entries(student.subjects || {}).reduce((acc, [subjectName, subjectData]) => {
            acc[subjectName] = {
              mark: subjectData.mark,
              stanine: subjectData.stanine,
              level: this.getLevelFromStanine(subjectData.stanine),
              comparison: subjectData.comparison,
              cat4_stanine: subjectData.cat4_stanine,
              asset_stanine: subjectData.asset_stanine
            };
            return acc;
          }, {})
        },
        interventions: this.generateInterventions(student)
      };
    });
    
    return mergedData;
  }
  
  static getLevelFromStanine(stanine) {
    if (stanine <= 3) return 'weakness';
    if (stanine >= 7) return 'strength';
    return 'average';
  }
  
  static generateInterventions(student) {
    const interventions = [];
    
    // CAT4-based interventions
    if (student.cat4_data) {
      // Fragile learner intervention
      if (student.cat4_data.is_fragile_learner) {
        interventions.push({
          domain: 'cognitive',
          factor: 'Fragile Learner',
          title: 'Comprehensive Learning Support',
          description: 'Multi-faceted approach combining cognitive scaffolding, additional processing time, and alternative assessment options.',
          priority: 'high'
        });
      }
      
      // Domain-specific interventions
      if (student.cat4_data.verbal_reasoning <= 3) {
        interventions.push({
          domain: 'cognitive',
          factor: 'Verbal Reasoning',
          title: 'Verbal Skills Development',
          description: 'Explicit instruction in vocabulary development, reading comprehension strategies, and verbal expression.',
          priority: 'medium'
        });
      }
      
      if (student.cat4_data.quantitative_reasoning <= 3) {
        interventions.push({
          domain: 'cognitive',
          factor: 'Quantitative Reasoning',
          title: 'Numeracy Intervention',
          description: 'Targeted support for numerical operations, mathematical vocabulary, and quantitative problem-solving.',
          priority: 'medium'
        });
      }
    }
    
    // Academic interventions based on comparison
    for (const [subject, data] of Object.entries(student.subjects || {})) {
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
  }
}

export default CSVHandler;