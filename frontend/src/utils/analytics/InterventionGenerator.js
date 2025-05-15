/**
 * InterventionGenerator.js
 * Module for generating intervention recommendations based on assessment data
 */

import { PASS_TO_P_NUMBER } from './constants/PassFactors.js';

/**
 * Generate intervention recommendations based on triangulated data analysis
 * following the instruction set mapping logic:
 * - PASS P3/P7 at risk → Self-esteem/confidence building
 * - P4/P6 at risk → Time management / Organization skills
 * - P5/P8 at risk → Attendance and engagement mentoring
 * - CAT4 Verbal SAS < 90 → Verbal reasoning / reading boosters
 * - Fragile learner = Yes → Holistic learning support
 * - Academic subject = Weak → Subject-specific booster modules
 * 
 * @param {Object} passAnalysis - Analyzed PASS data
 * @param {Object} cat4Analysis - Analyzed CAT4 data
 * @param {Object} academicAnalysis - Analyzed academic data
 * @param {boolean} isFragileLearner - Whether the student is a fragile learner
 * @returns {Array} - Recommended interventions
 */
export function generateInterventions(passAnalysis, cat4Analysis, academicAnalysis, isFragileLearner) {
  const interventions = [];
  
  // PASS-based interventions
  if (passAnalysis.available) {
    passAnalysis.riskAreas.forEach(risk => {
      const factor = risk.factor.toLowerCase().replace(' ', '_');
      const pNumber = PASS_TO_P_NUMBER[factor];
      
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

/**
 * Generate compound interventions based on combinations of risk factors
 * This creates more sophisticated intervention strategies when multiple
 * risk factors are present across different assessment domains
 * 
 * @param {Object} passAnalysis - Analyzed PASS data
 * @param {Object} cat4Analysis - Analyzed CAT4 data
 * @param {Object} academicAnalysis - Analyzed academic data
 * @param {boolean} isFragileLearner - Whether the student is a fragile learner
 * @returns {Array} - Recommended compound interventions
 */
export function generateCompoundInterventions(passAnalysis, cat4Analysis, academicAnalysis, isFragileLearner) {
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
        title: 'Learning Community Mentorship',
        description: 'Structured social learning experiences combined with resilience coaching, designed to build social confidence in academic settings and develop supportive peer relationships.',
        priority: 'high',
        impact: 'high'
      });
    }
  }
  
  // Combination 5: Curriculum demands issues + Multiple academic weaknesses
  if (hasPassData && hasAcademicData) {
    const hasCurriculumIssue = passAnalysis.riskAreas.some(r => 
      r.factor.toLowerCase().includes('curriculum') || r.factor.toLowerCase().includes('learning'));
    
    const hasMultipleAcademicWeaknesses = academicAnalysis.subjects.filter(s => s.level === 'weakness').length >= 2;
    
    if (hasCurriculumIssue && hasMultipleAcademicWeaknesses) {
      compoundInterventions.push({
        domain: 'integrated',
        factor: 'Curriculum Response and Academic Performance',
        title: 'Personalized Learning Pathway',
        description: 'Comprehensive curriculum adaptation with individualized pacing, multi-modal instruction methods, and regular progress monitoring across academic subjects.',
        priority: 'high',
        impact: 'very high'
      });
    }
  }
  
  // Combination 6: Non-verbal reasoning issues + Preparedness issues
  if (hasCat4Data && hasPassData) {
    const hasNonverbalWeakness = cat4Analysis.weaknessAreas.some(w => 
      w.domain.toLowerCase().includes('nonverbal'));
    
    const hasPreparednessIssue = passAnalysis.riskAreas.some(r => 
      r.factor.toLowerCase().includes('preparedness'));
    
    if (hasNonverbalWeakness && hasPreparednessIssue) {
      compoundInterventions.push({
        domain: 'integrated',
        factor: 'Nonverbal Reasoning and Preparedness',
        title: 'Visual Organization System',
        description: 'Structured visual planning tools and graphic organizers to support both nonverbal problem-solving skills and academic preparedness.',
        priority: 'medium',
        impact: 'medium'
      });
    }
  }
  
  // If we have a holistic case (multiple factors across domains), add a comprehensive plan
  if (isFragileLearner && hasPassData && hasCat4Data && hasAcademicData) {
    if (passAnalysis.riskAreas.length >= 2 && cat4Analysis.weaknessAreas.length >= 1) {
      compoundInterventions.push({
        domain: 'holistic',
        factor: 'Multiple Factors',
        title: 'Comprehensive Development Plan',
        description: 'Whole-student approach integrating emotional support, cognitive development, and academic intervention through coordinated team of specialists with regular progress monitoring and adaptation.',
        priority: 'high',
        impact: 'very high'
      });
    }
  }
  
  return compoundInterventions;
}

export default {
  generateInterventions,
  generateCompoundInterventions
};