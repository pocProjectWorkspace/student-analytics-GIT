/**
 * PassFactors.js
 * Defines PASS factor descriptions and mappings for student assessment
 */

// PASS factor to P-number mapping (based on the instruction set)
export const PASS_TO_P_NUMBER = {
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

// Detailed descriptions of PASS factors
export const PASS_FACTOR_DESCRIPTIONS = {
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

// Common column name mappings for PASS factors in spreadsheets
export const PASS_COLUMN_MAPPINGS = {
  self_regard: ['Self-regard as a learner', 'Self Regard', 'Self-Regard'],
  perceived_learning: ['Perceived learning capability', 'Perceived Learning', 'Perceived Learning Capability'],
  attitude_teachers: ['Attitude to teachers', 'Attitude Teachers', 'Attitude to Teachers'],
  general_work_ethic: ['General work ethic', 'Work Ethic', 'General Work Ethic'],
  confidence_learning: ['Confidence in learning', 'Learning Confidence', 'Confidence in Learning'],
  preparedness: ['Preparedness for learning', 'Preparedness', 'Preparedness for Learning'],
  attitude_attendance: ['Attitude to attendance', 'Attendance Attitude'],
  curriculum_demand: ['Response to curriculum demands', 'Curriculum Demand', 'Curriculum Demands'],
  feelings_school: ['Feelings about school', 'School Feelings']
};

// Risk group categories based on PASS factors
export const PASS_RISK_CATEGORIES = {
  SELF_PERCEPTION: ['self_regard', 'perceived_learning', 'confidence_learning'],
  ATTITUDES: ['attitude_teachers', 'attitude_attendance', 'feelings_school'],
  WORK_HABITS: ['general_work_ethic', 'preparedness', 'curriculum_demand'],
  EMOTIONAL: ['emotional_control', 'social_confidence']
};