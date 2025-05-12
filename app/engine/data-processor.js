// app/engine/data-processor.js

/**
 * Utility functions for processing uploaded student data files
 */
const processAcademicData = (data) => {
  // Convert CSV or Excel data to structured format
  const students = [];
  
  // Skip header row
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    
    // Check if row has enough data and is not empty
    if (!row || row.length < 5) continue;
    
    // Extract student info
    const studentId = row['Student ID'] || row[0];
    const name = row['Name'] || row[1];
    const grade = row['Grade'] || row[2];
    const section = row['Section'] || row[3];
    
    // Initialize student object if not exists
    let student = students.find(s => s.student_id === studentId);
    if (!student) {
      student = {
        student_id: studentId,
        name: name,
        grade: grade,
        section: section,
        subjects: {}
      };
      students.push(student);
    }
    
    // Extract subject data - handle the multi-column format
    // Process English
    if (row['English.Internal Marks'] !== undefined || row['Internal Marks'] !== undefined) {
      const englishMarks = row['English.Internal Marks'] || row['Internal Marks'];
      const englishStanine = row['English.Internal Stanine'] || row['Internal Stanine'];
      const englishAssetStanine = row['English.Asset Stanine'] || row['Asset Stanine'];
      const englishCAT4Marks = row['English.CAT4 Marks'] || row['CAT4 Marks'];
      const englishCAT4Stanine = row['English.CAT4 Stanine'] || row['CAT4 Stanine'];
      const englishCompare = row['English.Compare'] || row['Compare'];
      
      student.subjects['English'] = {
        mark: parseFloat(englishMarks),
        stanine: parseInt(englishStanine),
        asset_stanine: englishAssetStanine ? parseInt(englishAssetStanine) : null,
        cat4_marks: englishCAT4Marks ? parseFloat(englishCAT4Marks) : null,
        cat4_stanine: englishCAT4Stanine ? parseInt(englishCAT4Stanine) : null,
        comparison: englishCompare
      };
    }
    
    // Process Mathematics
    if (row['MATHEMATICS.Internal Marks'] !== undefined) {
      const mathMarks = row['MATHEMATICS.Internal Marks'];
      const mathStanine = row['MATHEMATICS.Internal Stanine'];
      const mathAssetStanine = row['MATHEMATICS.Asset Stanine'];
      const mathCAT4Marks = row['MATHEMATICS.CAT4 Marks'];
      const mathCAT4Stanine = row['MATHEMATICS.CAT4 Stanine'];
      const mathCompare = row['MATHEMATICS.Compare'];
      
      student.subjects['Mathematics'] = {
        mark: parseFloat(mathMarks),
        stanine: parseInt(mathStanine),
        asset_stanine: mathAssetStanine ? parseInt(mathAssetStanine) : null,
        cat4_marks: mathCAT4Marks ? parseFloat(mathCAT4Marks) : null,
        cat4_stanine: mathCAT4Stanine ? parseInt(mathCAT4Stanine) : null,
        comparison: mathCompare
      };
    }
    
    // Process Science
    if (row['Science.Internal Marks'] !== undefined) {
      const scienceMarks = row['Science.Internal Marks'];
      const scienceStanine = row['Science.Internal Stanine'];
      const scienceAssetStanine = row['Science.Asset Stanine'];
      const scienceCAT4Marks = row['Science.CAT4 Marks'];
      const scienceCAT4Stanine = row['Science.CAT4 Stanine'];
      const scienceCompare = row['Science.Compare'];
      
      student.subjects['Science'] = {
        mark: parseFloat(scienceMarks),
        stanine: parseInt(scienceStanine),
        asset_stanine: scienceAssetStanine ? parseInt(scienceAssetStanine) : null,
        cat4_marks: scienceCAT4Marks ? parseFloat(scienceCAT4Marks) : null,
        cat4_stanine: scienceCAT4Stanine ? parseInt(scienceCAT4Stanine) : null,
        comparison: scienceCompare
      };
    }
  }
  
  return students;
};

const processCAT4Data = (data) => {
  // Convert CSV or Excel data to structured format
  const students = [];
  
  // Skip header row
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    
    // Check if row has enough data and is not empty
    if (!row || row.length < 5) continue;
    
    // Extract student info
    const studentId = row['Student ID'] || row[0];
    const name = row['Name'] || row[1];
    
    // Process CAT4 domains - we'll extract from the academic data
    // that already has CAT4 data embedded
    
    // Initialize cognitive data
    const catData = {
      verbal_reasoning: parseInt(row['Verbal Reasoning'] || 0),
      quantitative_reasoning: parseInt(row['Quantitative Reasoning'] || 0),
      nonverbal_reasoning: parseInt(row['Non-verbal Reasoning'] || 0),
      spatial_reasoning: parseInt(row['Spatial Ability'] || 0)
    };
    
    // Calculate if student is a fragile learner (stanine ≤ 3 in 2+ domains)
    const weakDomains = Object.values(catData).filter(val => val <= 3).length;
    const isFragileLearner = weakDomains >= 2;
    
    students.push({
      student_id: studentId,
      name: name,
      cat4_data: {
        ...catData,
        is_fragile_learner: isFragileLearner
      }
    });
  }
  
  return students;
};

const processPassData = (data) => {
  // Convert CSV or Excel data to structured format
  const students = [];
  
  // Skip header row
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    
    // Check if row has enough data and is not empty
    if (!row || row.length < 5) continue;
    
    // Extract student info
    const studentId = row['Student ID'] || row[0];
    const name = row['Name'] || row[1];
    
    // Extract PASS factors
    const passData = {
      self_regard: parseFloat(row['Self-Regard'] || 0),
      perceived_learning: parseFloat(row['Perceived Learning Capability'] || 0),
      attitude_teachers: parseFloat(row['Attitude to Teachers'] || 0),
      general_work_ethic: parseFloat(row['General Work Ethic'] || 0),
      confidence_learning: parseFloat(row['Confidence in Learning'] || 0),
      preparedness: parseFloat(row['Preparedness for Learning'] || 0),
      emotional_control: parseFloat(row['Emotional Control'] || 0),
      social_confidence: parseFloat(row['Social Confidence'] || 0),
      curriculum_demand: parseFloat(row['Response to Curriculum Demands'] || 0)
    };
    
    // Calculate risk areas (percentile < 40)
    const riskAreas = [];
    Object.entries(passData).forEach(([factor, percentile]) => {
      if (percentile < 40) {
        riskAreas.push({
          factor,
          percentile,
          level: 'At Risk'
        });
      }
    });
    
    students.push({
      student_id: studentId,
      name: name,
      pass_data: {
        factors: passData,
        risk_areas: riskAreas
      }
    });
  }
  
  return students;
};

const mergeStudentData = (academicData, cat4Data, passData) => {
  // Create a map of all students
  const studentMap = new Map();
  
  // Add academic data
  if (academicData) {
    academicData.forEach(student => {
      studentMap.set(student.student_id, {
        ...student,
        cat4_analysis: { available: false },
        pass_analysis: { available: false }
      });
    });
  }
  
  // Add or merge CAT4 data
  if (cat4Data) {
    cat4Data.forEach(student => {
      if (studentMap.has(student.student_id)) {
        // Merge with existing student
        const existingStudent = studentMap.get(student.student_id);
        studentMap.set(student.student_id, {
          ...existingStudent,
          cat4_analysis: {
            available: true,
            domains: {
              verbal_reasoning: {
                stanine: student.cat4_data.verbal_reasoning,
                level: getLevel(student.cat4_data.verbal_reasoning)
              },
              quantitative_reasoning: {
                stanine: student.cat4_data.quantitative_reasoning,
                level: getLevel(student.cat4_data.quantitative_reasoning)
              },
              nonverbal_reasoning: {
                stanine: student.cat4_data.nonverbal_reasoning,
                level: getLevel(student.cat4_data.nonverbal_reasoning)
              },
              spatial_reasoning: {
                stanine: student.cat4_data.spatial_reasoning,
                level: getLevel(student.cat4_data.spatial_reasoning)
              }
            },
            is_fragile_learner: student.cat4_data.is_fragile_learner
          }
        });
      } else {
        // Add new student
        studentMap.set(student.student_id, {
          student_id: student.student_id,
          name: student.name,
          cat4_analysis: {
            available: true,
            domains: {
              verbal_reasoning: {
                stanine: student.cat4_data.verbal_reasoning,
                level: getLevel(student.cat4_data.verbal_reasoning)
              },
              quantitative_reasoning: {
                stanine: student.cat4_data.quantitative_reasoning,
                level: getLevel(student.cat4_data.quantitative_reasoning)
              },
              nonverbal_reasoning: {
                stanine: student.cat4_data.nonverbal_reasoning,
                level: getLevel(student.cat4_data.nonverbal_reasoning)
              },
              spatial_reasoning: {
                stanine: student.cat4_data.spatial_reasoning,
                level: getLevel(student.cat4_data.spatial_reasoning)
              }
            },
            is_fragile_learner: student.cat4_data.is_fragile_learner
          },
          pass_analysis: { available: false },
          academic_analysis: { available: false }
        });
      }
    });
  }
  
  // Add or merge PASS data
  if (passData) {
    passData.forEach(student => {
      if (studentMap.has(student.student_id)) {
        // Merge with existing student
        const existingStudent = studentMap.get(student.student_id);
        studentMap.set(student.student_id, {
          ...existingStudent,
          pass_analysis: {
            available: true,
            factors: student.pass_data.factors,
            risk_areas: student.pass_data.risk_areas
          }
        });
      } else {
        // Add new student
        studentMap.set(student.student_id, {
          student_id: student.student_id,
          name: student.name,
          pass_analysis: {
            available: true,
            factors: student.pass_data.factors,
            risk_areas: student.pass_data.risk_areas
          },
          cat4_analysis: { available: false },
          academic_analysis: { available: false }
        });
      }
    });
  }
  
  // Extract CAT4 data from academic data if CAT4 wasn't provided
  if (academicData && (!cat4Data || cat4Data.length === 0)) {
    for (const [studentId, student] of studentMap.entries()) {
      // Skip if student already has CAT4 data
      if (student.cat4_analysis.available) continue;
      
      // Check if subjects have CAT4 data
      const subjects = student.subjects || {};
      const hasCat4Data = Object.values(subjects).some(
        subject => subject.cat4_stanine !== null && subject.cat4_stanine !== undefined
      );
      
      if (hasCat4Data) {
        // Extract CAT4 data from academic subjects
        const verbDomain = subjects['English']?.cat4_stanine || 5;
        const quantDomain = subjects['Mathematics']?.cat4_stanine || 5;
        const nonverbDomain = subjects['Science']?.cat4_stanine || 5;
        // Use average of other domains for spatial if not available
        const spatialDomain = Math.round((verbDomain + quantDomain + nonverbDomain) / 3);
        
        // Determine if student is a fragile learner
        const weakDomains = [verbDomain, quantDomain, nonverbDomain, spatialDomain]
          .filter(val => val <= 3).length;
        const isFragileLearner = weakDomains >= 2;
        
        // Update student with CAT4 data
        studentMap.set(studentId, {
          ...student,
          cat4_analysis: {
            available: true,
            domains: {
              verbal_reasoning: {
                stanine: verbDomain,
                level: getLevel(verbDomain)
              },
              quantitative_reasoning: {
                stanine: quantDomain,
                level: getLevel(quantDomain)
              },
              nonverbal_reasoning: {
                stanine: nonverbDomain,
                level: getLevel(nonverbDomain)
              },
              spatial_reasoning: {
                stanine: spatialDomain,
                level: getLevel(spatialDomain)
              }
            },
            is_fragile_learner: isFragileLearner
          }
        });
      }
    }
  }
  
  // Generate interventions for each student
  for (const [studentId, student] of studentMap.entries()) {
    const interventions = generateInterventions(student);
    studentMap.set(studentId, {
      ...student,
      interventions
    });
  }
  
  // Convert the map back to an array
  return Array.from(studentMap.values());
};

// Helper functions
const getLevel = (stanine) => {
  if (stanine <= 3) return 'Weakness';
  if (stanine >= 7) return 'Strength';
  return 'Average';
};

const generateInterventions = (student) => {
  const interventions = [];
  
  // PASS-based interventions
  if (student.pass_analysis && student.pass_analysis.available) {
    // Add interventions for risk areas
    student.pass_analysis.risk_areas.forEach(risk => {
      if (risk.factor === 'self_regard') {
        interventions.push({
          domain: 'emotional',
          factor: 'Self Regard',
          title: 'Self-Esteem Building',
          description: 'Weekly sessions focusing on identifying and celebrating strengths. Include positive affirmation activities and reflective journaling.',
          priority: 'high'
        });
      } else if (risk.factor === 'attitude_teachers') {
        interventions.push({
          domain: 'emotional',
          factor: 'Attitude to Teachers',
          title: 'Teacher-Student Mediation',
          description: 'Facilitated discussion between student and teachers to address concerns and establish mutual respect and understanding.',
          priority: 'medium'
        });
      } else if (risk.factor === 'emotional_control') {
        interventions.push({
          domain: 'emotional',
          factor: 'Emotional Control',
          title: 'Emotional Regulation Therapy',
          description: 'Sessions focused on identifying emotional triggers and developing healthy coping mechanisms.',
          priority: 'high'
        });
      }
      // Add more interventions for other factors
    });
  }
  
  // CAT4-based interventions
  if (student.cat4_analysis && student.cat4_analysis.available) {
    // Check for fragile learner
    if (student.cat4_analysis.is_fragile_learner) {
      interventions.push({
        domain: 'cognitive',
        factor: 'Fragile Learner',
        title: 'Comprehensive Learning Support',
        description: 'Multi-faceted approach combining cognitive scaffolding, additional processing time, and alternative assessment options.',
        priority: 'high'
      });
    }
    
    // Check for domain weaknesses
    if (student.cat4_analysis.domains.verbal_reasoning.level === 'Weakness') {
      interventions.push({
        domain: 'cognitive',
        factor: 'Verbal Reasoning',
        title: 'Verbal Skills Development',
        description: 'Explicit instruction in vocabulary development, reading comprehension strategies, and verbal expression.',
        priority: 'medium'
      });
    }
    
    if (student.cat4_analysis.domains.quantitative_reasoning.level === 'Weakness') {
      interventions.push({
        domain: 'cognitive',
        factor: 'Quantitative Reasoning',
        title: 'Numeracy Intervention',
        description: 'Targeted support for numerical operations, mathematical vocabulary, and quantitative problem-solving.',
        priority: 'medium'
      });
    }
    // Add interventions for other domains
  }
  
  // Academic-based interventions
  if (student.academic_analysis && student.academic_analysis.available) {
    // Look for underperforming subjects
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
  }
  
  return interventions;
};

module.exports = {
  processAcademicData,
  processCAT4Data,
  processPassData,
  mergeStudentData
};