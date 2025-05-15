/**
 * CognitiveFactors.js
 * Defines CAT4 domain descriptions and mappings for cognitive assessment
 */

// Detailed descriptions of CAT4 domains
export const CAT4_DOMAIN_DESCRIPTIONS = {
  verbal_reasoning: 'The ability to understand and analyze words, verbal concepts, and extract information from text.',
  quantitative_reasoning: 'The ability to understand and solve problems using numbers and mathematical concepts.',
  nonverbal_reasoning: 'The ability to analyze visual information and solve problems using patterns and visual logic.',
  spatial_reasoning: 'The ability to manipulate shapes and understand spatial relationships in two and three dimensions.'
};

// Common column name mappings for CAT4 domains in spreadsheets
export const CAT4_COLUMN_MAPPINGS = {
  verbal_reasoning: ['Verbal Reasoning', 'Verbal SAS', 'Verbal'],
  quantitative_reasoning: ['Quantitative Reasoning', 'Quantitative SAS', 'Quantitative'],
  nonverbal_reasoning: ['Non-verbal Reasoning', 'Non-verbal SAS', 'Non-verbal', 'Nonverbal Reasoning'],
  spatial_reasoning: ['Spatial Ability', 'Spatial SAS', 'Spatial']
};

// Mapping between subjects and related cognitive domains
export const SUBJECT_TO_COGNITIVE_DOMAIN = {
  'English': 'verbal_reasoning',
  'English Language': 'verbal_reasoning',
  'Literature': 'verbal_reasoning',
  'Mathematics': 'quantitative_reasoning',
  'Math': 'quantitative_reasoning',
  'Science': ['nonverbal_reasoning', 'quantitative_reasoning'],
  'Physics': ['nonverbal_reasoning', 'quantitative_reasoning'],
  'Chemistry': ['nonverbal_reasoning', 'quantitative_reasoning'],
  'Biology': ['nonverbal_reasoning', 'verbal_reasoning'],
  'Geography': ['spatial_reasoning', 'nonverbal_reasoning'],
  'Art': 'spatial_reasoning',
  'Design': 'spatial_reasoning'
};

// Learning style characteristics based on CAT4 profile
export const LEARNING_STYLE_PROFILES = {
  VERBAL_STRONG: {
    name: 'Verbal Learner',
    characteristics: [
      'Learns effectively through reading and writing',
      'Prefers linguistic explanations',
      'Strong verbal memory',
      'Processes information through language'
    ],
    strategies: [
      'Provide written materials and instructions',
      'Encourage note-taking and written reflection',
      'Use discussion-based learning',
      'Allow verbal expression of ideas'
    ]
  },
  QUANTITATIVE_STRONG: {
    name: 'Logical-Mathematical Learner',
    characteristics: [
      'Strong numerical processing',
      'Analytical approach to problems',
      'Enjoys structured, logical tasks',
      'Looks for patterns and relationships'
    ],
    strategies: [
      'Use step-by-step instructions',
      'Include data, statistics and evidence',
      'Provide opportunities for problem-solving',
      'Allow time for analysis and logical thinking'
    ]
  },
  NONVERBAL_STRONG: {
    name: 'Abstract Thinker',
    characteristics: [
      'Sees patterns in information',
      'Strong conceptual thinking',
      'Process information holistically',
      'Recognizes underlying principles'
    ],
    strategies: [
      'Use diagrams and visual organizers',
      'Provide opportunities to identify patterns',
      'Present information in conceptual frameworks',
      'Allow time for abstract thinking'
    ]
  },
  SPATIAL_STRONG: {
    name: 'Visual-Spatial Learner',
    characteristics: [
      'Thinks in images and pictures',
      'Strong spatial awareness',
      'Visualizes concepts easily',
      'Good at interpreting diagrams and charts'
    ],
    strategies: [
      'Use diagrams, charts, and visual aids',
      'Provide opportunities for visual expression',
      'Include maps, 3D models and spatial tasks',
      'Use color-coding and visual organization'
    ]
  }
};