/**
 * DataConverters.js
 * Utility functions for converting between different assessment scales and formats
 */

import { STANINE_TO_SAS_MAP, PERCENTILE_TO_STANINE_BOUNDARIES } from '../constants/AssessmentThresholds';

/**
 * Convert SAS (Standard Age Score) to stanine (1-9 scale)
 * @param {number} sas - SAS score (typically 70-140 range)
 * @returns {number} - Stanine score (1-9)
 */
export function sasToStanine(sas) {
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
 * Convert stanine (1-9 scale) to SAS (Standard Age Score)
 * @param {number} stanine - Stanine score (1-9)
 * @returns {number} - SAS score (typically 70-140 range)
 */
export function stanineToSas(stanine) {
  // Convert stanine (1-9) to SAS (60-140)
  const index = Math.min(Math.max(stanine - 1, 0), 8);
  return STANINE_TO_SAS_MAP[index];
}

/**
 * Convert percentile (0-100) to stanine (1-9 scale)
 * @param {number} percentile - Percentile score (0-100)
 * @returns {number} - Stanine score (1-9)
 */
export function percentileToStanine(percentile) {
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

/**
 * Convert stanine (1-9 scale) to percentile (approximate mid-point)
 * @param {number} stanine - Stanine score (1-9)
 * @returns {number} - Percentile score (0-100)
 */
export function stanineToPercentile(stanine) {
  // Approximate mid-points of percentile ranges for each stanine
  const percentiles = [2, 7, 16, 31, 50, 69, 84, 93, 98];
  return percentiles[Math.min(Math.max(stanine - 1, 0), 8)];
}

/**
 * Convert mark from standard percentage to stanine scale
 * @param {number} mark - Mark as percentage (0-100)
 * @param {number} minMark - Minimum possible mark (default: 0)
 * @param {number} maxMark - Maximum possible mark (default: 100)
 * @returns {number} - Stanine score (1-9)
 */
export function markToStanine(mark, minMark = 0, maxMark = 100) {
  // Handle null or undefined
  if (mark === null || mark === undefined) return 5;
  
  // Normalize to 0-100 scale if different scale provided
  const normalizedMark = ((mark - minMark) / (maxMark - minMark)) * 100;
  
  // Use percentile to stanine conversion
  return percentileToStanine(normalizedMark);
}

/**
 * Determine level based on stanine score
 * @param {number} stanine - Stanine score (1-9)
 * @returns {string} - Level ('weakness', 'average', or 'strength')
 */
export function getLevelFromStanine(stanine) {
  if (stanine <= 3) return 'weakness';
  if (stanine >= 7) return 'strength';
  return 'average';
}

/**
 * Determine level based on percentile score
 * @param {number} percentile - Percentile score (0-100)
 * @returns {string} - Level ('at-risk', 'balanced', or 'strength')
 */
export function getLevelFromPercentile(percentile) {
  if (percentile < 45) return 'at-risk';
  if (percentile >= 65) return 'strength';
  return 'balanced';
}

/**
 * Compare academic performance with cognitive potential
 * @param {number} academicStanine - Academic performance stanine
 * @param {number} cognitiveStanine - Cognitive potential stanine
 * @returns {string} - Comparison result ('Underperforming', 'As Expected', or 'Overperforming')
 */
export function comparePerformanceWithPotential(academicStanine, cognitiveStanine) {
  const difference = academicStanine - cognitiveStanine;
  
  if (difference <= -2) return 'Underperforming';
  if (difference >= 2) return 'Overperforming';
  return 'As Expected';
}

/**
 * Get change status based on threshold
 * @param {number} change - The amount of change
 * @param {number} threshold - The threshold for significant change
 * @returns {string} - Status description
 */
export function getChangeStatus(change, threshold) {
  if (change >= threshold) return "significant improvement";
  if (change > 0) return "slight improvement";
  if (change === 0) return "no change";
  if (change > -threshold) return "slight decline";
  return "significant decline";
}