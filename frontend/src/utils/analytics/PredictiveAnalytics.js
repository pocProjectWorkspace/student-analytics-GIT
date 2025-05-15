/**
 * PredictiveAnalytics.js
 * Module for predictive risk analysis and early warning indicators
 */

import { RISK_THRESHOLDS, EARLY_WARNING_THRESHOLDS } from '../constants/AssessmentThresholds';

class PredictiveAnalytics {
  constructor() {
    // Initialize risk thresholds
    this.highRiskThreshold = RISK_THRESHOLDS.HIGH_RISK;
    this.mediumRiskThreshold = RISK_THRESHOLDS.MEDIUM_RISK;
    this.borderlineThreshold = RISK_THRESHOLDS.BORDERLINE;
    
    // Early warning thresholds
    this.earlyWarningThresholds = EARLY_WARNING_THRESHOLDS;
  }

  /**
   * Predict risk levels for a student
   * @param {Object} currentData - Current student data
   * @param {Array} historicalData - Historical student data
   * @returns {Object} - Risk prediction results
   */
  predictRisk(currentData, historicalData = []) {
    // Calculate risk score (0-1 scale)
    const riskScore = this.calculateRiskScore(currentData);
    
    // Determine risk level based on thresholds
    let riskLevel = "low";
    if (riskScore >= this.highRiskThreshold) {
      riskLevel = "high";
    } else if (riskScore >= this.mediumRiskThreshold) {
      riskLevel = "medium";
    } else if (riskScore >= this.borderlineThreshold) {
      riskLevel = "borderline";
    }
    
    // Identify risk factors
    const riskFactors = this.identifyRiskFactors(currentData);
    
    // Identify early warning indicators
    const earlyWarningIndicators = this.identifyEarlyWarningIndicators(currentData, historicalData);
    
    // Analyze trends if historical data available
    const trendAnalysis = this.analyzeTrends(currentData, historicalData);
    
    // Determine time to intervention
    const timeToIntervention = this.determineTimeToIntervention(
      riskScore, 
      riskFactors, 
      earlyWarningIndicators, 
      trendAnalysis
    );
    
    // Calculate confidence of prediction
    const confidence = this.calculateConfidence(
      currentData,
      riskFactors.length,
      earlyWarningIndicators.length, 
      historicalData.length
    );
    
    // Generate recommendations
    const recommendations = this.generatePreventiveRecommendations(
      riskLevel, 
      riskFactors, 
      earlyWarningIndicators, 
      trendAnalysis,
      timeToIntervention
    );
    
    return {
      overall_risk_score: riskScore,
      risk_level: riskLevel,
      risk_factors: riskFactors,
      early_indicators: earlyWarningIndicators,
      trend_analysis: trendAnalysis,
      time_to_intervention: timeToIntervention,
      confidence: confidence,
      recommendations: recommendations,
      timestamp: new Date()
    };
  }

  /**
   * Calculate overall risk score based on combined factors
   * @param {Object} studentData - Student assessment data
   * @returns {number} - Risk score (0-1 scale)
   */
  calculateRiskScore(studentData) {
    let passRiskScore = 0;
    let cat4RiskScore = 0; 
    let academicRiskScore = 0;
    let behavioralRiskScore = 0;
    
    // PASS risk score (0-0.4)
    if (studentData.pass_analysis?.available) {
      const riskAreasCount = studentData.pass_analysis.riskAreas.length;
      const totalFactors = studentData.pass_analysis.factors.length;
      
      if (totalFactors > 0) {
        // Calculate percentage of factors at risk
        passRiskScore = Math.min(0.4, (riskAreasCount / totalFactors) * 0.4);
        
        // Add extra weight for key risk factors
        studentData.pass_analysis.riskAreas.forEach(risk => {
          const factorName = risk.factor.toLowerCase();
          if (factorName.includes('self regard') || 
              factorName.includes('emotional') || 
              factorName.includes('work ethic')) {
            passRiskScore += 0.05;
          }
        });
        
        // Cap at 0.4
        passRiskScore = Math.min(0.4, passRiskScore);
      }
    }
    
    // CAT4 risk score (0-0.3)
    if (studentData.cat4_analysis?.available) {
      const weaknessAreasCount = studentData.cat4_analysis.weaknessAreas.length;
      const isFragileLearner = studentData.cat4_analysis.is_fragile_learner;
      
      // Base score from cognitive weaknesses
      cat4RiskScore = Math.min(0.2, weaknessAreasCount * 0.05);
      
      // Add for fragile learner
      if (isFragileLearner) {
        cat4RiskScore += 0.1;
      }
      
      // Cap at 0.3
      cat4RiskScore = Math.min(0.3, cat4RiskScore);
    }
    
    // Academic risk score (0-0.3)
    if (studentData.academic_analysis?.available) {
      let weakSubjectsCount = 0;
      let underperformingCount = 0;
      
      // Count weak subjects
      studentData.academic_analysis.subjects.forEach(subject => {
        if (subject.level === 'weakness') {
          weakSubjectsCount++;
        }
      });
      
      // Check performance vs. potential gap
      if (studentData.performance_comparison?.available) {
        underperformingCount = Object.values(studentData.performance_comparison.comparisons)
          .filter(comparison => comparison.status === 'Underperforming').length;
      }
      
      // Calculate score
      academicRiskScore = Math.min(0.2, weakSubjectsCount * 0.05);
      academicRiskScore += Math.min(0.1, underperformingCount * 0.03);
      
      // Cap at 0.3
      academicRiskScore = Math.min(0.3, academicRiskScore);
    }
    
    // Calculate combined risk score
    const combinedScore = passRiskScore + cat4RiskScore + academicRiskScore;
    
    // Check for concerning patterns that compound risk
    if (passRiskScore > 0.2 && academicRiskScore > 0.1) {
      // Emotional issues plus academic concerns
      behavioralRiskScore += 0.1;
    }
    
    if (studentData.is_fragile_learner && passRiskScore > 0.2) {
      // Fragile learner with PASS issues
      behavioralRiskScore += 0.1;
    }
    
    // Calculate final score (capped at 1.0)
    return Math.min(1.0, combinedScore + behavioralRiskScore);
  }

  /**
   * Identify specific risk factors and their levels
   * @param {Object} studentData - Student assessment data
   * @returns {Array} - Risk factors with details
   */
  identifyRiskFactors(studentData) {
    const riskFactors = [];
    
    // PASS risk factors
    if (studentData.pass_analysis?.available) {
      studentData.pass_analysis.riskAreas.forEach(risk => {
        // Calculate risk level based on percentile (lower = higher risk)
        const riskLevel = 1 - (risk.percentile / 100);
        
        riskFactors.push({
          domain: "PASS",
          factor: risk.factor,
          level: riskLevel,
          weighted_risk: riskLevel * 0.4, // PASS factors have 0.4 weight in total risk
          details: `${risk.factor} at ${risk.percentile}th percentile (below risk threshold)`
        });
      });
    }
    
    // CAT4 risk factors
    if (studentData.cat4_analysis?.available) {
      studentData.cat4_analysis.weaknessAreas.forEach(weakness => {
        // Calculate risk level based on stanine (lower = higher risk)
        const riskLevel = (4 - weakness.stanine) / 3; // Stanine 1 = 1.0, Stanine 3 = 0.33
        
        riskFactors.push({
          domain: "CAT4",
          factor: weakness.domain,
          level: riskLevel,
          weighted_risk: riskLevel * 0.3, // CAT4 factors have 0.3 weight in total risk
          details: `${weakness.domain} at stanine ${weakness.stanine} (below average)`
        });
      });
      
      // Fragile learner as risk factor
      if (studentData.cat4_analysis.is_fragile_learner) {
        riskFactors.push({
          domain: "CAT4",
          factor: "Fragile Learner",
          level: 0.8,
          weighted_risk: 0.24, // High weighting
          details: "Identified as a fragile learner (good cognitive ability but poor attitudes)"
        });
      }
    }
    
    // Academic risk factors
    if (studentData.academic_analysis?.available) {
      studentData.academic_analysis.subjects.forEach(subject => {
        if (subject.level === 'weakness') {
          // Calculate risk level based on stanine
          const riskLevel = (4 - subject.stanine) / 3;
          
          riskFactors.push({
            domain: "Academic",
            factor: subject.name,
            level: riskLevel,
            weighted_risk: riskLevel * 0.3, // Academic factors have 0.3 weight in total risk
            details: `${subject.name} at stanine ${subject.stanine} (below average)`
          });
        }
      });
    }
    
    // Performance gap risk factors
    if (studentData.performance_comparison?.available) {
      for (const [subject, comparison] of Object.entries(studentData.performance_comparison.comparisons)) {
        if (comparison.status === 'Underperforming') {
          const gap = comparison.academic_stanine - comparison.cat4_stanine;
          const riskLevel = Math.min(1.0, Math.abs(gap) / 3);
          
          riskFactors.push({
            domain: "Performance Gap",
            factor: `${subject} Underperformance`,
            level: riskLevel,
            weighted_risk: riskLevel * 0.2, // Gap factors have 0.2 weight
            details: `${subject} performance (stanine ${comparison.academic_stanine}) below potential (stanine ${comparison.cat4_stanine})`
          });
        }
      }
    }
    
    // Sort by weighted risk (highest first)
    return riskFactors.sort((a, b) => b.weighted_risk - a.weighted_risk);
  }

  /**
   * Identify early warning indicators that could predict future issues
   * @param {Object} currentData - Current student data
   * @param {Array} historicalData - Historical student data
   * @returns {Array} - Early warning indicators
   */
  identifyEarlyWarningIndicators(currentData, historicalData = []) {
    const earlyWarningIndicators = [];
    
    // PASS warnings - factors that are not yet in "risk" range but approaching it
    if (currentData.pass_analysis?.available) {
      currentData.pass_analysis.factors.forEach(factor => {
        const factorName = factor.name.toLowerCase();
        const percentile = factor.percentile;
        
        // Check specific key factors approaching risk threshold
        if (factorName.includes('self regard') && 
            percentile >= 40 && percentile <= this.earlyWarningThresholds.PASS_SELF_REGARD) {
          earlyWarningIndicators.push({
            domain: "PASS",
            indicator: "Self-Regard Approaching Risk",
            level: (this.earlyWarningThresholds.PASS_SELF_REGARD - percentile) / 10,
            details: `Self-regard at ${percentile}th percentile - approaching risk threshold`
          });
        }
        
        if (factorName.includes('work ethic') && 
            percentile >= 40 && percentile <= this.earlyWarningThresholds.PASS_WORK_ETHIC) {
          earlyWarningIndicators.push({
            domain: "PASS",
            indicator: "Work Ethic Approaching Risk",
            level: (this.earlyWarningThresholds.PASS_WORK_ETHIC - percentile) / 10,
            details: `Work ethic at ${percentile}th percentile - approaching risk threshold`
          });
        }
        
        if (factorName.includes('emotional') && 
            percentile >= 40 && percentile <= this.earlyWarningThresholds.PASS_EMOTIONAL_CONTROL) {
          earlyWarningIndicators.push({
            domain: "PASS",
            indicator: "Emotional Control Approaching Risk",
            level: (this.earlyWarningThresholds.PASS_EMOTIONAL_CONTROL - percentile) / 10,
            details: `Emotional control at ${percentile}th percentile - approaching risk threshold`
          });
        }
      });
    }
    
    // Academic warning - potential achievement gap
    if (currentData.academic_analysis?.available && currentData.cat4_analysis?.available) {
      // Get average CAT4 stanine
      const cat4Domains = currentData.cat4_analysis.domains || [];
      const cat4Stanines = cat4Domains.map(domain => domain.stanine);
      const avgCat4Stanine = cat4Stanines.length > 0 
        ? cat4Stanines.reduce((a, b) => a + b, 0) / cat4Stanines.length 
        : 0;
      
      // Check for small gaps that could widen
      currentData.academic_analysis.subjects.forEach(subject => {
        const gap = avgCat4Stanine - subject.stanine;
        
        if (gap >= this.earlyWarningThresholds.POTENTIAL_GAP && gap < 2) {
          earlyWarningIndicators.push({
            domain: "Academic",
            indicator: `${subject.name} Achievement Gap`,
            level: gap / 2,
            details: `${subject.name} performance (stanine ${subject.stanine}) slightly below cognitive potential (stanine ${avgCat4Stanine.toFixed(1)})`
          });
        }
      });
    }
    
    // Trend warnings - declining patterns in historical data
    if (historicalData.length > 0) {
      // Analyze PASS trends for volatility
      const volatileFactors = this.identifyVolatileFactors(currentData, historicalData);
      
      volatileFactors.forEach(factor => {
        earlyWarningIndicators.push({
          domain: "Trend",
          indicator: `${factor.name} Volatility`,
          level: factor.volatility,
          details: `${factor.name} shows inconsistent pattern with ${(factor.volatility * 100).toFixed(0)}% variation`
        });
      });
      
      // Check for declining trends that aren't yet in risk range
      const decliningTrends = this.identifyDecliningTrends(currentData, historicalData);
      
      decliningTrends.forEach(trend => {
        earlyWarningIndicators.push({
          domain: "Trend",
          indicator: `Declining ${trend.domain} - ${trend.factor}`,
          level: trend.strength,
          details: `${trend.factor} shows consistent decline over time (not yet in risk range)`
        });
      });
    }
    
    // Check for combinations of minor factors that together suggest risk
    const combinedRiskPatterns = this.identifyCombinedRiskPatterns(currentData, earlyWarningIndicators);
    
    combinedRiskPatterns.forEach(pattern => {
      earlyWarningIndicators.push({
        domain: "Combined",
        indicator: pattern.name,
        level: pattern.level,
        details: pattern.details
      });
    });
    
    // Sort by level (highest first)
    return earlyWarningIndicators.sort((a, b) => b.level - a.level);
  }

  /**
   * Identify volatile factors that show inconsistent patterns
   * @param {Object} currentData - Current student data
   * @param {Array} historicalData - Historical student data 
   * @returns {Array} - Volatile factors
   */
  identifyVolatileFactors(currentData, historicalData) {
    const volatileFactors = [];
    
    // Only analyze PASS factors currently
    if (!currentData.pass_analysis?.available || historicalData.length < 2) {
      return volatileFactors;
    }
    
    // Extract current PASS factors
    const currentFactors = {};
    currentData.pass_analysis.factors.forEach(factor => {
      currentFactors[factor.name] = factor.percentile;
    });
    
    // Track historical values for each factor
    const factorHistory = {};
    
    // Initialize with current values
    for (const [name, value] of Object.entries(currentFactors)) {
      factorHistory[name] = [value];
    }
    
    // Add historical values
    historicalData.forEach(data => {
      if (data.pass_analysis?.available) {
        data.pass_analysis.factors.forEach(factor => {
          if (factorHistory[factor.name]) {
            factorHistory[factor.name].push(factor.percentile);
          }
        });
      }
    });
    
    // Analyze volatility for each factor
    for (const [name, values] of Object.entries(factorHistory)) {
      if (values.length >= 3) {
        // Calculate standard deviation
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b, 0) / values.length;
        const stdDev = Math.sqrt(variance);
        
        // Calculate coefficient of variation (normalized volatility)
        const volatility = stdDev / mean;
        
        // Check if volatility exceeds threshold
        if (volatility > this.earlyWarningThresholds.VOLATILITY / 100) {
          volatileFactors.push({
            name: name,
            volatility: volatility,
            values: values
          });
        }
      }
    }
    
    return volatileFactors;
  }

  /**
   * Identify declining trends that aren't yet in risk range
   * @param {Object} currentData - Current student data
   * @param {Array} historicalData - Historical student data
   * @returns {Array} - Declining trends
   */
  identifyDecliningTrends(currentData, historicalData) {
    const decliningTrends = [];
    
    if (historicalData.length < 2) {
      return decliningTrends;
    }
    
    // Analyze PASS trends
    if (currentData.pass_analysis?.available) {
      currentData.pass_analysis.factors.forEach(factor => {
        // Skip factors already in risk range
        if (factor.level === 'at-risk') return;
        
        // Track historical values
        const values = [factor.percentile];
        const dates = [new Date()];
        
        // Add historical values
        historicalData.forEach(data => {
          if (data.pass_analysis?.available) {
            const historicalFactor = data.pass_analysis.factors.find(f => f.name === factor.name);
            if (historicalFactor) {
              values.push(historicalFactor.percentile);
              dates.push(new Date(data.timestamp || Date.now()));
            }
          }
        });
        
        // Check for declining trend
        if (values.length >= 3) {
          const trend = this.calculateTrendStrength(values, dates);
          
          if (trend.direction === 'declining' && trend.strength > 0.6) {
            decliningTrends.push({
              domain: 'PASS',
              factor: factor.name,
              strength: trend.strength,
              values: values
            });
          }
        }
      });
    }
    
    // Analyze CAT4 trends
    if (currentData.cat4_analysis?.available) {
      currentData.cat4_analysis.domains.forEach(domain => {
        // Skip domains already in weakness range
        if (domain.level === 'weakness') return;
        
        // Track historical values
        const values = [domain.stanine];
        const dates = [new Date()];
        
        // Add historical values
        historicalData.forEach(data => {
          if (data.cat4_analysis?.available) {
            const historicalDomain = data.cat4_analysis.domains.find(d => d.name === domain.name);
            if (historicalDomain) {
              values.push(historicalDomain.stanine);
              dates.push(new Date(data.timestamp || Date.now()));
            }
          }
        });
        
        // Check for declining trend
        if (values.length >= 3) {
          const trend = this.calculateTrendStrength(values, dates);
          
          if (trend.direction === 'declining' && trend.strength > 0.6) {
            decliningTrends.push({
              domain: 'CAT4',
              factor: domain.name,
              strength: trend.strength,
              values: values
            });
          }
        }
      });
    }
    
    // Analyze academic trends
    if (currentData.academic_analysis?.available) {
      currentData.academic_analysis.subjects.forEach(subject => {
        // Skip subjects already in weakness range
        if (subject.level === 'weakness') return;
        
        // Track historical values
        const values = [subject.stanine];
        const dates = [new Date()];
        
        // Add historical values
        historicalData.forEach(data => {
          if (data.academic_analysis?.available) {
            const historicalSubject = data.academic_analysis.subjects.find(s => s.name === subject.name);
            if (historicalSubject) {
              values.push(historicalSubject.stanine);
              dates.push(new Date(data.timestamp || Date.now()));
            }
          }
        });
        
        // Check for declining trend
        if (values.length >= 3) {
          const trend = this.calculateTrendStrength(values, dates);
          
          if (trend.direction === 'declining' && trend.strength > 0.6) {
            decliningTrends.push({
              domain: 'Academic',
              factor: subject.name,
              strength: trend.strength,
              values: values
            });
          }
        }
      });
    }
    
    return decliningTrends;
  }

  /**
   * Calculate trend strength and direction
   * @param {Array} values - Series of values
   * @param {Array} dates - Corresponding dates
   * @returns {Object} - Trend analysis
   */
  calculateTrendStrength(values, dates) {
    // Simple linear regression
    const n = values.length;
    
    // Convert dates to numerical x values (days since earliest date)
    const earliestDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const x = dates.map(date => Math.floor((date.getTime() - earliestDate.getTime()) / (1000 * 60 * 60 * 24)));
    const y = values;
    
    // Calculate means
    const meanX = x.reduce((a, b) => a + b, 0) / n;
    const meanY = y.reduce((a, b) => a + b, 0) / n;
    
    // Calculate slope
    let numerator = 0;
    let denominator = 0;
    
    for (let i = 0; i < n; i++) {
      numerator += (x[i] - meanX) * (y[i] - meanY);
      denominator += Math.pow(x[i] - meanX, 2);
    }
    
    const slope = denominator !== 0 ? numerator / denominator : 0;
    
    // Calculate correlation coefficient
    let sumXY = 0;
    let sumX2 = 0;
    let sumY2 = 0;
    
    for (let i = 0; i < n; i++) {
      sumXY += (x[i] - meanX) * (y[i] - meanY);
      sumX2 += Math.pow(x[i] - meanX, 2);
      sumY2 += Math.pow(y[i] - meanY, 2);
    }
    
    const r = Math.sqrt(sumX2 * sumY2) !== 0 ? sumXY / Math.sqrt(sumX2 * sumY2) : 0;
    
    // Determine direction
    let direction = 'stable';
    if (slope > 0.01) {
      direction = 'improving';
    } else if (slope < -0.01) {
      direction = 'declining';
    }
    
    // Calculate strength (absolute value of correlation)
    const strength = Math.abs(r);
    
    return {
      direction,
      strength,
      slope
    };
  }

  /**
   * Identify combined patterns of minor risk factors
   * @param {Object} currentData - Current student data
   * @param {Array} earlyWarningIndicators - Individual warning indicators
   * @returns {Array} - Combined risk patterns
   */
  identifyCombinedRiskPatterns(currentData, earlyWarningIndicators) {
    const combinedPatterns = [];
    
    // Check for emotional + academic pattern
    const hasEmotionalWarning = earlyWarningIndicators.some(indicator => 
      indicator.indicator.toLowerCase().includes('emotional') ||
      indicator.indicator.toLowerCase().includes('self-regard')
    );
    
    const hasAcademicWarning = earlyWarningIndicators.some(indicator => 
      indicator.domain === 'Academic'
    );
    
    if (hasEmotionalWarning && hasAcademicWarning) {
      combinedPatterns.push({
        name: 'Emotional-Academic Risk Pattern',
        level: this.earlyWarningThresholds.COMBINED,
        details: 'Combination of emotional factors and academic performance issues suggests increased risk'
      });
    }
    
    // Check for multiple declining trends
    const decliningTrends = earlyWarningIndicators.filter(indicator => 
      indicator.domain === 'Trend' && 
      indicator.indicator.toLowerCase().includes('declining')
    );
    
    if (decliningTrends.length >= 2) {
      combinedPatterns.push({
        name: 'Multiple Declining Trends',
        level: this.earlyWarningThresholds.COMBINED + 0.1,
        details: `${decliningTrends.length} factors showing consistent decline suggests systemic issue`
      });
    }
    
    return combinedPatterns;
  }

  /**
   * Analyze trends across all data sources
   * @param {Object} currentData - Current student data
   * @param {Array} historicalData - Historical student data
   * @returns {Object} - Trend analysis
   */
  analyzeTrends(currentData, historicalData) {
    // Default response for insufficient data
    if (historicalData.length < 2) {
      return {
        available: false,
        overall_direction: 'insufficient data',
        message: 'Not enough historical data for trend analysis'
      };
    }
    
    const trendAnalysis = {
      available: true,
      pass_trends: {},
      cat4_trends: {},
      academic_trends: {}
    };
    
    // Analyze PASS trends
    if (currentData.pass_analysis?.available) {
      currentData.pass_analysis.factors.forEach(factor => {
        const values = [];
        const timestamps = [];
        
        // Current value
        values.push(factor.percentile);
        timestamps.push(new Date());
        
        // Historical values
        historicalData.forEach(data => {
          if (data.pass_analysis?.available) {
            const historicalFactor = data.pass_analysis.factors.find(f => f.name === factor.name);
            if (historicalFactor) {
              values.push(historicalFactor.percentile);
              timestamps.push(new Date(data.timestamp || Date.now()));
            }
          }
        });
        
        // Create trend data points
        const trendValues = [];
        for (let i = 0; i < values.length; i++) {
          trendValues.push({
            timestamp: timestamps[i].toISOString(),
            value: values[i]
          });
        }
        
        // Calculate trend
        const trend = this.calculateTrendStrength(values, timestamps);
        
        trendAnalysis.pass_trends[factor.name] = {
          values: trendValues,
          direction: trend.direction,
          strength: trend.strength
        };
      });
    }
    
    // Analyze CAT4 trends
    if (currentData.cat4_analysis?.available) {
      currentData.cat4_analysis.domains.forEach(domain => {
        const values = [];
        const timestamps = [];
        
        // Current value
        values.push(domain.stanine);
        timestamps.push(new Date());
        
        // Historical values
        historicalData.forEach(data => {
          if (data.cat4_analysis?.available) {
            const historicalDomain = data.cat4_analysis.domains.find(d => d.name === domain.name);
            if (historicalDomain) {
              values.push(historicalDomain.stanine);
              timestamps.push(new Date(data.timestamp || Date.now()));
            }
          }
        });
        
        // Create trend data points
        const trendValues = [];
        for (let i = 0; i < values.length; i++) {
          trendValues.push({
            timestamp: timestamps[i].toISOString(),
            value: values[i]
          });
        }
        
        // Calculate trend
        const trend = this.calculateTrendStrength(values, timestamps);
        
        trendAnalysis.cat4_trends[domain.name] = {
          values: trendValues,
          direction: trend.direction,
          strength: trend.strength
        };
      });
    }
    
    // Analyze academic trends
    if (currentData.academic_analysis?.available) {
      currentData.academic_analysis.subjects.forEach(subject => {
        const values = [];
        const timestamps = [];
        
        // Current value
        values.push(subject.stanine);
        timestamps.push(new Date());
        
        // Historical values
        historicalData.forEach(data => {
          if (data.academic_analysis?.available) {
            const historicalSubject = data.academic_analysis.subjects.find(s => s.name === subject.name);
            if (historicalSubject) {
              values.push(historicalSubject.stanine);
              timestamps.push(new Date(data.timestamp || Date.now()));
            }
          }
        });
        
        // Create trend data points
        const trendValues = [];
        for (let i = 0; i < values.length; i++) {
          trendValues.push({
            timestamp: timestamps[i].toISOString(),
            value: values[i]
          });
        }
        
        // Calculate trend
        const trend = this.calculateTrendStrength(values, timestamps);
        
        trendAnalysis.academic_trends[subject.name] = {
          values: trendValues,
          direction: trend.direction,
          strength: trend.strength
        };
      });
    }
    
    // Determine overall direction
    let improvingCount = 0;
    let decliningCount = 0;
    let stableCount = 0;
    
    // Count PASS trends
    for (const trend of Object.values(trendAnalysis.pass_trends)) {
      if (trend.direction === 'improving') improvingCount++;
      else if (trend.direction === 'declining') decliningCount++;
      else stableCount++;
    }
    
    // Count CAT4 trends
    for (const trend of Object.values(trendAnalysis.cat4_trends)) {
      if (trend.direction === 'improving') improvingCount++;
      else if (trend.direction === 'declining') decliningCount++;
      else stableCount++;
    }
    
    // Count academic trends
    for (const trend of Object.values(trendAnalysis.academic_trends)) {
      if (trend.direction === 'improving') improvingCount++;
      else if (trend.direction === 'declining') decliningCount++;
      else stableCount++;
    }
    
    // Determine overall direction
    let overallDirection = 'stable';
    if (improvingCount > decliningCount && improvingCount > stableCount) {
      overallDirection = 'improving';
    } else if (decliningCount > improvingCount && decliningCount > stableCount) {
      overallDirection = 'declining';
    }
    
    trendAnalysis.overall_direction = overallDirection;
    
    return trendAnalysis;
  }

  /**
   * Determine how urgently interventions are needed
   * @param {number} riskScore - Overall risk score
   * @param {Array} riskFactors - Risk factors
   * @param {Array} earlyWarningIndicators - Early warning indicators
   * @param {Object} trendAnalysis - Trend analysis
   * @returns {string} - Time to intervention recommendation
   */
  determineTimeToIntervention(riskScore, riskFactors, earlyWarningIndicators, trendAnalysis) {
    // Default to "monitor" for low risk
    let timeToIntervention = "monitor";
    
    // High risk score requires urgent intervention
    if (riskScore >= this.highRiskThreshold) {
      timeToIntervention = "urgent";
    }
    // Medium risk score requires soon intervention
    else if (riskScore >= this.mediumRiskThreshold) {
      timeToIntervention = "soon";
    }
    // Borderline risk with declining trend requires soon intervention
    else if (riskScore >= this.borderlineThreshold && 
             trendAnalysis.available && 
             trendAnalysis.overall_direction === 'declining') {
      timeToIntervention = "soon";
    }
    // Borderline risk with multiple early warning indicators requires soon intervention
    else if (riskScore >= this.borderlineThreshold && earlyWarningIndicators.length >= 3) {
      timeToIntervention = "soon";
    }
    // Low risk with severe individual factor requires monitoring
    else if (riskFactors.some(factor => factor.level > 0.8)) {
      timeToIntervention = "monitor";
    }
    // Very low risk with no indicators
    else if (riskScore < this.borderlineThreshold / 2 && earlyWarningIndicators.length === 0) {
      timeToIntervention = "not urgent";
    }
    
    return timeToIntervention;
  }

  /**
   * Calculate confidence level in the prediction
   * @param {Object} currentData - Current student data
   * @param {number} riskFactorCount - Number of risk factors
   * @param {number} indicatorCount - Number of warning indicators
   * @param {number} historicalDataCount - Amount of historical data
   * @returns {number} - Confidence score (0-1)
   */
  calculateConfidence(currentData, riskFactorCount, indicatorCount, historicalDataCount) {
    let confidence = 0.5; // Base confidence
    
    // More risk factors increase confidence
    confidence += Math.min(0.2, riskFactorCount * 0.04);
    
    // More warning indicators increase confidence
    confidence += Math.min(0.1, indicatorCount * 0.02);
    
    // Historical data increases confidence
    confidence += Math.min(0.2, historicalDataCount * 0.05);
    
    // Complete data increases confidence
    let completenessScore = 0;
    if (currentData.pass_analysis?.available) completenessScore += 0.1;
    if (currentData.cat4_analysis?.available) completenessScore += 0.1;
    if (currentData.academic_analysis?.available) completenessScore += 0.1;
    
    confidence += completenessScore;
    
    // Cap confidence at 0.95 (never completely certain)
    return Math.min(0.95, confidence);
  }

  /**
   * Generate preventive recommendations based on risk analysis
   * @param {string} riskLevel - Overall risk level
   * @param {Array} riskFactors - Risk factors
   * @param {Array} earlyWarningIndicators - Early warning indicators
   * @param {Object} trendAnalysis - Trend analysis
   * @param {string} timeToIntervention - Time to intervention
   * @returns {Array} - Preventive recommendations
   */
  generatePreventiveRecommendations(riskLevel, riskFactors, earlyWarningIndicators, trendAnalysis, timeToIntervention) {
    const recommendations = [];
    
    // High priority recommendations for high risk
    if (riskLevel === "high") {
      // Focus on top risk factors
      const topRiskFactors = riskFactors.slice(0, 3);
      
      topRiskFactors.forEach(factor => {
        recommendations.push({
          priority: "high",
          type: "intervention",
          title: `${factor.domain} Intervention - ${factor.factor}`,
          description: `Implement targeted intervention for ${factor.factor.toLowerCase()} which shows significant risk (${Math.round(factor.level * 100)}% risk level).`,
          timeframe: "Immediate (within 1-2 weeks)"
        });
      });
      
      // Comprehensive plan
      recommendations.push({
        priority: "high",
        type: "intervention",
        title: "Comprehensive Support Plan",
        description: "Develop integrated support plan addressing multiple risk areas with regular monitoring and adjustment.",
        timeframe: "Implement within 2 weeks, review bi-weekly"
      });
    }
    
    // Medium priority recommendations for medium risk
    else if (riskLevel === "medium") {
      // Focus on top risk factor
      if (riskFactors.length > 0) {
        const topFactor = riskFactors[0];
        
        recommendations.push({
          priority: "high",
          type: "intervention",
          title: `${topFactor.domain} Focus Area - ${topFactor.factor}`,
          description: `Implement targeted support for ${topFactor.factor.toLowerCase()} which shows highest risk level.`,
          timeframe: "Within 2-3 weeks"
        });
      }
      
      // Early monitoring recommendations
      recommendations.push({
        priority: "medium",
        type: "monitoring",
        title: "Regular Progress Monitoring",
        description: "Establish regular check-ins to monitor progress in risk areas and early warning indicators.",
        timeframe: "Monthly assessments"
      });
      
      // Add preventive measures for declining trends
      if (trendAnalysis.available && trendAnalysis.overall_direction === 'declining') {
        recommendations.push({
          priority: "medium",
          type: "trend-response",
          title: "Declining Trend Intervention",
          description: "Address negative trends before they reach critical levels through targeted support.",
          timeframe: "Within 3-4 weeks"
        });
      }
    }
    
    // Preventive recommendations for borderline risk
    else if (riskLevel === "borderline") {
      // Focus on early warning indicators
      if (earlyWarningIndicators.length > 0) {
        const topIndicator = earlyWarningIndicators[0];
        
        recommendations.push({
          priority: "medium",
          type: "preventive",
          title: `Preventive Action - ${topIndicator.indicator}`,
          description: `Implement light-touch preventive strategies to address ${topIndicator.indicator.toLowerCase()} before it becomes a significant risk.`,
          timeframe: "Within 4-6 weeks"
        });
      }
      
      // Monitoring recommendation
      recommendations.push({
        priority: "medium",
        type: "monitoring",
        title: "Early Warning Monitoring",
        description: "Establish monitoring system for early warning indicators with trigger points for additional support.",
        timeframe: "Quarterly assessments"
      });
    }
    
    // Maintenance recommendations for low risk
    else {
      // Maintain strengths
      recommendations.push({
        priority: "low",
        type: "maintenance",
        title: "Strength Maintenance",
        description: "Continue supporting existing strengths and positive development areas.",
        timeframe: "Ongoing"
      });
      
      // Light monitoring
      recommendations.push({
        priority: "low",
        type: "monitoring",
        title: "Annual Assessment",
        description: "Conduct regular annual assessments to ensure continued positive trajectory.",
        timeframe: "Annual review"
      });
    }
    
    // Add common recommendation for all risk levels
    recommendations.push({
      priority: riskLevel === "high" ? "high" : "medium",
      type: "monitoring",
      title: "Data Collection Improvement",
      description: "Ensure comprehensive data collection across PASS, CAT4, and academic domains to improve prediction accuracy.",
      timeframe: "Ongoing"
    });
    
    return recommendations;
  }
}

export default PredictiveAnalytics;