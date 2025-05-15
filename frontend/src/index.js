/**
 * index.js
 * Central export file for the student analytics modules
 */

import ImprovedDataProcessor from './ImprovedDataProcessor.js';
import ProgressTracker from './ProgressTracker.js';
import PredictiveAnalytics from './PredictiveAnalytics.js';
import { generateInterventions, generateCompoundInterventions } from './InterventionGenerator.js';
import * as DataConverters from './DataConverters.js';

// Export constants
import * as AssessmentThresholds from './constants/AssessmentThresholds.js';
import * as PassFactors from './constants/PassFactors.js';
import * as CognitiveFactors from './constants/CognitiveFactors.js';

// Export all components
export {
  ImprovedDataProcessor,
  ProgressTracker,
  PredictiveAnalytics,
  generateInterventions,
  generateCompoundInterventions,
  DataConverters,
  AssessmentThresholds,
  PassFactors,
  CognitiveFactors
};

// Default export for easy importing
export default {
  ImprovedDataProcessor,
  ProgressTracker,
  PredictiveAnalytics,
  generateInterventions,
  generateCompoundInterventions,
  DataConverters,
  AssessmentThresholds,
  PassFactors,
  CognitiveFactors
};