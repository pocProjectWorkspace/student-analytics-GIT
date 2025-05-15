/**
 * AssessmentThresholds.js
 * Defines thresholds and boundaries for student assessment data
 */

// PASS assessment thresholds
export const PASS_THRESHOLDS = {
  RISK: 45,         // Below 45 percentile is considered at risk (updated from 40)
  STRENGTH: 65,     // Above 65 percentile is considered a strength (updated from 70)
};

// CAT4 assessment thresholds
export const CAT4_THRESHOLDS = {
  WEAKNESS: 3,      // Stanine 3 or below is a weakness
  STRENGTH: 7,      // Stanine 7 or above is a strength
  SAS_RISK: 90,     // SAS below 90 is considered a risk
  SAS_STRENGTH: 110 // SAS above 110 is considered a strength
};

// Academic performance thresholds
export const ACADEMIC_THRESHOLDS = {
  WEAKNESS: 3,      // Stanine 3 or below is a weakness
  STRENGTH: 7,      // Stanine 7 or above is a strength
};

// Thresholds for progress tracking
export const PROGRESS_THRESHOLDS = {
  PASS: 5,          // 5 percentile points improvement considered significant
  CAT4: 0.5,        // 0.5 stanine improvement considered significant
  ACADEMIC: 0.5     // 0.5 stanine improvement considered significant
};

// Risk prediction thresholds
export const RISK_THRESHOLDS = {
  HIGH_RISK: 0.7,   // 0.7 and above is high risk
  MEDIUM_RISK: 0.4, // 0.4-0.7 is medium risk
  BORDERLINE: 0.3   // 0.3-0.4 is borderline risk
};

// Early warning indicator thresholds
export const EARLY_WARNING_THRESHOLDS = {
  PASS_SELF_REGARD: 50,     // Below this but above risk threshold is a warning
  PASS_WORK_ETHIC: 55,      // Below this but above risk threshold is a warning
  PASS_EMOTIONAL_CONTROL: 50, // Below this but above risk threshold is a warning
  POTENTIAL_GAP: 1,         // 1 stanine difference is a warning
  VOLATILITY: 10,           // 10% variability in PASS scores is a warning
  COMBINED: 0.25            // Combined risk patterns threshold
};

// Stanine to SAS conversion table
export const STANINE_TO_SAS_MAP = [74, 81, 88, 96, 103, 112, 119, 127, 141];

// Percentile to stanine conversion boundaries
export const PERCENTILE_TO_STANINE_BOUNDARIES = [4, 11, 23, 40, 60, 77, 89, 96, 100];