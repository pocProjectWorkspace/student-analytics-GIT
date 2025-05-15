/**
 * ProgressTracker.js
 * Module for tracking student progress over time and analyzing intervention effectiveness
 */

import { PROGRESS_THRESHOLDS } from '../constants/AssessmentThresholds.js';
import { getChangeStatus } from '../analytics/DataConverters.js';

class ProgressTracker {
  constructor() {
    // Initialize thresholds for significant change
    this.passChangeThreshold = PROGRESS_THRESHOLDS.PASS;
    this.cat4ChangeThreshold = PROGRESS_THRESHOLDS.CAT4;
    this.academicChangeThreshold = PROGRESS_THRESHOLDS.ACADEMIC;
  }

  /**
   * Compare current and previous assessment data to track progress
   * @param {Object} currentData - Current student assessment data
   * @param {Object} previousData - Previous student assessment data
   * @returns {Object} - Progress analysis
   */
  trackProgress(currentData, previousData) {
    if (!previousData) {
      return { hasBaseline: false };
    }

    // Analyze progress for each assessment type
    const passAnalysis = this.analyzePassProgress(currentData, previousData);
    const cat4Analysis = this.analyzeCat4Progress(currentData, previousData);
    const academicAnalysis = this.analyzeAcademicProgress(currentData, previousData);
    
    // Analyze intervention effectiveness
    const interventionEffectiveness = this.analyzeInterventionEffectiveness(
      currentData, 
      previousData,
      { passAnalysis, cat4Analysis, academicAnalysis }
    );
    
    // Identify improvement and concern areas
    const improvementAreas = this.identifyImprovementAreas(passAnalysis, cat4Analysis, academicAnalysis);
    const concernAreas = this.identifyConcernAreas(passAnalysis, cat4Analysis, academicAnalysis);
    
    // Generate summary
    const summary = this.generateProgressSummary(
      passAnalysis, 
      cat4Analysis, 
      academicAnalysis,
      interventionEffectiveness,
      improvementAreas,
      concernAreas
    );
    
    return {
      hasBaseline: true,
      pass_analysis: passAnalysis,
      cat4_analysis: cat4Analysis,
      academic_analysis: academicAnalysis,
      interventionEffectiveness: interventionEffectiveness,
      improvementAreas: improvementAreas,
      concernAreas: concernAreas,
      summary: summary,
      timestamp: new Date()
    };
  }

  /**
   * Analyze progress in PASS factors between assessments
   * @param {Object} currentData - Current student assessment data
   * @param {Object} previousData - Previous student assessment data
   * @returns {Object} - PASS progress analysis
   */
  analyzePassProgress(currentData, previousData) {
    if (!currentData.pass_analysis?.available || !previousData.pass_analysis?.available) {
      return {
        available: false,
        message: "Insufficient PASS data for progress analysis"
      };
    }
    
    const factorAnalysis = {};
    let totalChange = 0;
    let factorCount = 0;
    
    // Current PASS factors
    const currentFactors = {};
    currentData.pass_analysis.factors.forEach(factor => {
      currentFactors[factor.name] = factor.percentile;
    });
    
    // Previous PASS factors
    const previousFactors = {};
    previousData.pass_analysis.factors.forEach(factor => {
      previousFactors[factor.name] = factor.percentile;
    });
    
    // Compare each factor
    for (const factorName in currentFactors) {
      if (previousFactors[factorName]) {
        const current = currentFactors[factorName];
        const previous = previousFactors[factorName];
        const change = current - previous;
        const isSignificant = Math.abs(change) >= this.passChangeThreshold;
        const direction = change > 0 ? "improved" : change < 0 ? "declined" : "unchanged";
        const status = getChangeStatus(change, this.passChangeThreshold);
        
        factorAnalysis[factorName] = {
          current: current,
          previous: previous,
          change: change,
          isSignificant: isSignificant,
          direction: direction,
          status: status
        };
        
        totalChange += change;
        factorCount++;
      }
    }
    
    // Calculate average change
    const averageChange = factorCount > 0 ? totalChange / factorCount : 0;
    
    // Determine overall status
    let overallStatus = "No significant change";
    if (averageChange >= this.passChangeThreshold) {
      overallStatus = "Significant overall improvement";
    } else if (averageChange > 0) {
      overallStatus = "Slight overall improvement";
    } else if (averageChange <= -this.passChangeThreshold) {
      overallStatus = "Significant overall decline";
    } else if (averageChange < 0) {
      overallStatus = "Slight overall decline";
    }
    
    return {
      available: true,
      factorAnalysis: factorAnalysis,
      averageChange: averageChange,
      overallStatus: overallStatus
    };
  }

  /**
   * Analyze progress in CAT4 domains between assessments
   * @param {Object} currentData - Current student assessment data
   * @param {Object} previousData - Previous student assessment data
   * @returns {Object} - CAT4 progress analysis
   */
  analyzeCat4Progress(currentData, previousData) {
    if (!currentData.cat4_analysis?.available || !previousData.cat4_analysis?.available) {
      return {
        available: false,
        message: "Insufficient CAT4 data for progress analysis"
      };
    }
    
    const domainAnalysis = {};
    let totalChange = 0;
    let domainCount = 0;
    
    // Current CAT4 domains
    const currentDomains = {};
    currentData.cat4_analysis.domains.forEach(domain => {
      currentDomains[domain.name] = domain.stanine;
    });
    
    // Previous CAT4 domains
    const previousDomains = {};
    previousData.cat4_analysis.domains.forEach(domain => {
      previousDomains[domain.name] = domain.stanine;
    });
    
    // Compare each domain
    for (const domainName in currentDomains) {
      if (previousDomains[domainName]) {
        const current = currentDomains[domainName];
        const previous = previousDomains[domainName];
        const change = current - previous;
        const isSignificant = Math.abs(change) >= this.cat4ChangeThreshold;
        const direction = change > 0 ? "improved" : change < 0 ? "declined" : "unchanged";
        const status = getChangeStatus(change, this.cat4ChangeThreshold);
        
        domainAnalysis[domainName] = {
          current: current,
          previous: previous,
          change: change,
          isSignificant: isSignificant,
          direction: direction,
          status: status
        };
        
        totalChange += change;
        domainCount++;
      }
    }
    
    // Calculate average change
    const averageChange = domainCount > 0 ? totalChange / domainCount : 0;
    
    // Analyze fragile learner status change
    const fragileLearnerChange = {
      current: currentData.is_fragile_learner || currentData.cat4_analysis.is_fragile_learner,
      previous: previousData.is_fragile_learner || previousData.cat4_analysis.is_fragile_learner,
      hasChanged: false,
      direction: "unchanged"
    };
    
    if (fragileLearnerChange.current !== fragileLearnerChange.previous) {
      fragileLearnerChange.hasChanged = true;
      fragileLearnerChange.direction = fragileLearnerChange.current ? "negative" : "positive";
    }
    
    // Determine overall status
    let overallStatus = "No significant change";
    if (averageChange >= this.cat4ChangeThreshold) {
      overallStatus = "Significant cognitive improvement";
    } else if (averageChange > 0) {
      overallStatus = "Slight cognitive improvement";
    } else if (averageChange <= -this.cat4ChangeThreshold) {
      overallStatus = "Significant cognitive decline";
    } else if (averageChange < 0) {
      overallStatus = "Slight cognitive decline";
    }
    
    if (fragileLearnerChange.hasChanged) {
      if (fragileLearnerChange.direction === "positive") {
        overallStatus += "; No longer a fragile learner";
      } else {
        overallStatus += "; Now identified as a fragile learner";
      }
    }
    
    return {
      available: true,
      domainAnalysis: domainAnalysis,
      fragileLearnerChange: fragileLearnerChange,
      averageChange: averageChange,
      overallStatus: overallStatus
    };
  }

  /**
   * Analyze progress in academic performance between assessments
   * @param {Object} currentData - Current student assessment data
   * @param {Object} previousData - Previous student assessment data
   * @returns {Object} - Academic progress analysis
   */
  analyzeAcademicProgress(currentData, previousData) {
    if (!currentData.academic_analysis?.available || !previousData.academic_analysis?.available) {
      return {
        available: false,
        message: "Insufficient academic data for progress analysis"
      };
    }
    
    const subjectAnalysis = {};
    let totalChange = 0;
    let subjectCount = 0;
    
    // Current academic subjects
    const currentSubjects = {};
    currentData.academic_analysis.subjects.forEach(subject => {
      currentSubjects[subject.name] = subject.stanine;
    });
    
    // Previous academic subjects
    const previousSubjects = {};
    previousData.academic_analysis.subjects.forEach(subject => {
      previousSubjects[subject.name] = subject.stanine;
    });
    
    // Compare each subject
    for (const subjectName in currentSubjects) {
      if (previousSubjects[subjectName]) {
        const current = currentSubjects[subjectName];
        const previous = previousSubjects[subjectName];
        const change = current - previous;
        const isSignificant = Math.abs(change) >= this.academicChangeThreshold;
        const direction = change > 0 ? "improved" : change < 0 ? "declined" : "unchanged";
        const status = getChangeStatus(change, this.academicChangeThreshold);
        
        subjectAnalysis[subjectName] = {
          current: current,
          previous: previous,
          change: change,
          isSignificant: isSignificant,
          direction: direction,
          status: status
        };
        
        totalChange += change;
        subjectCount++;
      }
    }
    
    // Calculate average change
    const averageChange = subjectCount > 0 ? totalChange / subjectCount : 0;
    
    // Determine overall status
    let overallStatus = "No significant change";
    if (averageChange >= this.academicChangeThreshold) {
      overallStatus = "Significant academic improvement";
    } else if (averageChange > 0) {
      overallStatus = "Slight academic improvement";
    } else if (averageChange <= -this.academicChangeThreshold) {
      overallStatus = "Significant academic decline";
    } else if (averageChange < 0) {
      overallStatus = "Slight academic decline";
    }
    
    return {
      available: true,
      subjectAnalysis: subjectAnalysis,
      averageChange: averageChange,
      overallStatus: overallStatus
    };
  }

  /**
   * Analyze effectiveness of previous interventions based on progress
   * @param {Object} currentData - Current student assessment data
   * @param {Object} previousData - Previous student assessment data
   * @param {Object} progressData - Progress analysis data
   * @returns {Object} - Intervention effectiveness analysis
   */
  analyzeInterventionEffectiveness(currentData, previousData, progressData) {
    if (!previousData.interventions || previousData.interventions.length === 0) {
      return {
        available: false,
        message: "No previous interventions to analyze"
      };
    }
    
    const interventions = {};
    
    // Analyze each previous intervention
    previousData.interventions.forEach(intervention => {
      const domain = intervention.domain;
      const factor = intervention.factor;
      let effectiveness = "unknown";
      let evidence = "Insufficient data to determine effectiveness";
      
      // Check for progress in the relevant domain/factor
      if (domain === "emotional" || domain === "behavioral") {
        // Check PASS factors for emotional/behavioral interventions
        if (progressData.passAnalysis.available) {
          const factorName = factor.replace(/ /g, '_').toLowerCase();
          const passFactorProgress = progressData.passAnalysis.factorAnalysis[factorName];
          
          if (passFactorProgress) {
            if (passFactorProgress.direction === "improved" && passFactorProgress.isSignificant) {
              effectiveness = "effective";
              evidence = `Significant improvement in ${factor} from ${passFactorProgress.previous} to ${passFactorProgress.current}`;
            } else if (passFactorProgress.direction === "improved") {
              effectiveness = "partially effective";
              evidence = `Slight improvement in ${factor} from ${passFactorProgress.previous} to ${passFactorProgress.current}`;
            } else if (passFactorProgress.direction === "declined") {
              effectiveness = "not effective";
              evidence = `Decline in ${factor} from ${passFactorProgress.previous} to ${passFactorProgress.current}`;
            } else {
              effectiveness = "partially effective";
              evidence = `No significant change in ${factor}`;
            }
          }
        }
      } else if (domain === "cognitive") {
        // Check CAT4 domains for cognitive interventions
        if (progressData.cat4Analysis.available) {
          const domainName = factor;
          const cat4DomainProgress = progressData.cat4Analysis.domainAnalysis[domainName];
          
          if (cat4DomainProgress) {
            if (cat4DomainProgress.direction === "improved" && cat4DomainProgress.isSignificant) {
              effectiveness = "effective";
              evidence = `Significant improvement in ${factor} from ${cat4DomainProgress.previous} to ${cat4DomainProgress.current}`;
            } else if (cat4DomainProgress.direction === "improved") {
              effectiveness = "partially effective";
              evidence = `Slight improvement in ${factor} from ${cat4DomainProgress.previous} to ${cat4DomainProgress.current}`;
            } else if (cat4DomainProgress.direction === "declined") {
              effectiveness = "not effective";
              evidence = `Decline in ${factor} from ${cat4DomainProgress.previous} to ${cat4DomainProgress.current}`;
            } else {
              effectiveness = "partially effective";
              evidence = `No significant change in ${factor}`;
            }
          }
        }
      } else if (domain === "academic") {
        // Check academic subjects for academic interventions
        if (progressData.academicAnalysis.available) {
          const subjectName = factor.replace(" Performance", "");
          const academicProgress = progressData.academicAnalysis.subjectAnalysis[subjectName];
          
          if (academicProgress) {
            if (academicProgress.direction === "improved" && academicProgress.isSignificant) {
              effectiveness = "effective";
              evidence = `Significant improvement in ${subjectName} from ${academicProgress.previous} to ${academicProgress.current}`;
            } else if (academicProgress.direction === "improved") {
              effectiveness = "partially effective";
              evidence = `Slight improvement in ${subjectName} from ${academicProgress.previous} to ${academicProgress.current}`;
            } else if (academicProgress.direction === "declined") {
              effectiveness = "not effective";
              evidence = `Decline in ${subjectName} from ${academicProgress.previous} to ${academicProgress.current}`;
            } else {
              effectiveness = "partially effective";
              evidence = `No significant change in ${subjectName}`;
            }
          }
        }
      } else if (domain === "holistic" || domain === "integrated") {
        // For holistic interventions, check overall progress
        let passImproved = progressData.passAnalysis.available && progressData.passAnalysis.averageChange > 0;
        let cat4Improved = progressData.cat4Analysis.available && progressData.cat4Analysis.averageChange > 0;
        let academicImproved = progressData.academicAnalysis.available && progressData.academicAnalysis.averageChange > 0;
        
        let improvementCount = (passImproved ? 1 : 0) + (cat4Improved ? 1 : 0) + (academicImproved ? 1 : 0);
        let availableDomains = (progressData.passAnalysis.available ? 1 : 0) + 
                              (progressData.cat4Analysis.available ? 1 : 0) + 
                              (progressData.academicAnalysis.available ? 1 : 0);
        
        if (improvementCount >= availableDomains * 0.67) {
          effectiveness = "effective";
          evidence = "Improvement across multiple assessment domains";
        } else if (improvementCount > 0) {
          effectiveness = "partially effective";
          evidence = "Improvement in some assessment domains";
        } else {
          effectiveness = "not effective";
          evidence = "No improvement across assessment domains";
        }
      }
      
      interventions[`${domain}:${factor}`] = {
        domain,
        factor,
        effectiveness,
        evidence
      };
    });
    
    return {
      available: true,
      interventions: interventions
    };
  }

  /**
   * Identify areas of significant improvement
   * @param {Object} passAnalysis - PASS progress analysis
   * @param {Object} cat4Analysis - CAT4 progress analysis
   * @param {Object} academicAnalysis - Academic progress analysis
   * @returns {Array} - Areas of improvement
   */
  identifyImprovementAreas(passAnalysis, cat4Analysis, academicAnalysis) {
    const improvementAreas = [];
    
    // Check PASS factors
    if (passAnalysis.available) {
      for (const [factor, analysis] of Object.entries(passAnalysis.factorAnalysis)) {
        if (analysis.direction === "improved" && analysis.isSignificant) {
          improvementAreas.push({
            domain: "PASS",
            factor: factor,
            improvement: `${analysis.previous} to ${analysis.current} (${analysis.change > 0 ? '+' : ''}${analysis.change.toFixed(1)})`,
            significance: "significant"
          });
        } else if (analysis.direction === "improved") {
          improvementAreas.push({
            domain: "PASS",
            factor: factor,
            improvement: `${analysis.previous} to ${analysis.current} (${analysis.change > 0 ? '+' : ''}${analysis.change.toFixed(1)})`,
            significance: "slight"
          });
        }
      }
    }
    
    // Check CAT4 domains
    if (cat4Analysis.available) {
      for (const [domain, analysis] of Object.entries(cat4Analysis.domainAnalysis)) {
        if (analysis.direction === "improved" && analysis.isSignificant) {
          improvementAreas.push({
            domain: "CAT4",
            factor: domain,
            improvement: `${analysis.previous} to ${analysis.current} (${analysis.change > 0 ? '+' : ''}${analysis.change.toFixed(1)})`,
            significance: "significant"
          });
        } else if (analysis.direction === "improved") {
          improvementAreas.push({
            domain: "CAT4",
            factor: domain,
            improvement: `${analysis.previous} to ${analysis.current} (${analysis.change > 0 ? '+' : ''}${analysis.change.toFixed(1)})`,
            significance: "slight"
          });
        }
      }
      
      // Check fragile learner change
      if (cat4Analysis.fragileLearnerChange.hasChanged && cat4Analysis.fragileLearnerChange.direction === "positive") {
        improvementAreas.push({
          domain: "CAT4",
          factor: "Fragile Learner Status",
          improvement: "No longer identified as a fragile learner",
          significance: "significant"
        });
      }
    }
    
    // Check academic subjects
    if (academicAnalysis.available) {
      for (const [subject, analysis] of Object.entries(academicAnalysis.subjectAnalysis)) {
        if (analysis.direction === "improved" && analysis.isSignificant) {
          improvementAreas.push({
            domain: "Academic",
            factor: subject,
            improvement: `${analysis.previous} to ${analysis.current} (${analysis.change > 0 ? '+' : ''}${analysis.change.toFixed(1)})`,
            significance: "significant"
          });
        } else if (analysis.direction === "improved") {
          improvementAreas.push({
            domain: "Academic",
            factor: subject,
            improvement: `${analysis.previous} to ${analysis.current} (${analysis.change > 0 ? '+' : ''}${analysis.change.toFixed(1)})`,
            significance: "slight"
          });
        }
      }
    }
    
    // Sort by significance (significant first)
    return improvementAreas.sort((a, b) => {
      if (a.significance === "significant" && b.significance !== "significant") return -1;
      if (a.significance !== "significant" && b.significance === "significant") return 1;
      return 0;
    });
  }

  /**
   * Identify areas of concern (decline or persistent issues)
   * @param {Object} passAnalysis - PASS progress analysis
   * @param {Object} cat4Analysis - CAT4 progress analysis
   * @param {Object} academicAnalysis - Academic progress analysis
   * @returns {Array} - Areas of concern
   */
  identifyConcernAreas(passAnalysis, cat4Analysis, academicAnalysis) {
    const concernAreas = [];
    
    // Check PASS factors
    if (passAnalysis.available) {
      for (const [factor, analysis] of Object.entries(passAnalysis.factorAnalysis)) {
        if (analysis.direction === "declined" && analysis.isSignificant) {
          concernAreas.push({
            domain: "PASS",
            factor: factor,
            decline: `${analysis.previous} to ${analysis.current} (${analysis.change > 0 ? '+' : ''}${analysis.change.toFixed(1)})`,
            significance: "significant"
          });
        } else if (analysis.direction === "declined") {
          concernAreas.push({
            domain: "PASS",
            factor: factor,
            decline: `${analysis.previous} to ${analysis.current} (${analysis.change > 0 ? '+' : ''}${analysis.change.toFixed(1)})`,
            significance: "slight"
          });
        }
      }
    }
    
    // Check CAT4 domains
    if (cat4Analysis.available) {
      for (const [domain, analysis] of Object.entries(cat4Analysis.domainAnalysis)) {
        if (analysis.direction === "declined" && analysis.isSignificant) {
          concernAreas.push({
            domain: "CAT4",
            factor: domain,
            decline: `${analysis.previous} to ${analysis.current} (${analysis.change > 0 ? '+' : ''}${analysis.change.toFixed(1)})`,
            significance: "significant"
          });
        } else if (analysis.direction === "declined") {
          concernAreas.push({
            domain: "CAT4",
            factor: domain,
            decline: `${analysis.previous} to ${analysis.current} (${analysis.change > 0 ? '+' : ''}${analysis.change.toFixed(1)})`,
            significance: "slight"
          });
        }
      }
      
      // Check fragile learner change
      if (cat4Analysis.fragileLearnerChange.hasChanged && cat4Analysis.fragileLearnerChange.direction === "negative") {
        concernAreas.push({
          domain: "CAT4",
          factor: "Fragile Learner Status",
          decline: "Now identified as a fragile learner",
          significance: "significant"
        });
      }
    }
    
    // Check academic subjects
    if (academicAnalysis.available) {
      for (const [subject, analysis] of Object.entries(academicAnalysis.subjectAnalysis)) {
        if (analysis.direction === "declined" && analysis.isSignificant) {
          concernAreas.push({
            domain: "Academic",
            factor: subject,
            decline: `${analysis.previous} to ${analysis.current} (${analysis.change > 0 ? '+' : ''}${analysis.change.toFixed(1)})`,
            significance: "significant"
          });
        } else if (analysis.direction === "declined") {
          concernAreas.push({
            domain: "Academic",
            factor: subject,
            decline: `${analysis.previous} to ${analysis.current} (${analysis.change > 0 ? '+' : ''}${analysis.change.toFixed(1)})`,
            significance: "slight"
          });
        }
      }
    }
    
    // Sort by significance (significant first)
    return concernAreas.sort((a, b) => {
      if (a.significance === "significant" && b.significance !== "significant") return -1;
      if (a.significance !== "significant" && b.significance === "significant") return 1;
      return 0;
    });
  }

  /**
   * Generate a comprehensive summary of progress analysis
   * @param {Object} passAnalysis - PASS progress analysis
   * @param {Object} cat4Analysis - CAT4 progress analysis
   * @param {Object} academicAnalysis - Academic progress analysis
   * @param {Object} interventionEffectiveness - Intervention effectiveness analysis
   * @param {Array} improvementAreas - Areas of improvement
   * @param {Array} concernAreas - Areas of concern
   * @returns {string} - Summary text
   */
  generateProgressSummary(
    passAnalysis, 
    cat4Analysis, 
    academicAnalysis,
    interventionEffectiveness,
    improvementAreas,
    concernAreas
  ) {
    let summary = "";
    
    // Add overview of progress
    summary += "Progress Summary: ";
    
    const availableDomains = [];
    if (passAnalysis.available) availableDomains.push("PASS");
    if (cat4Analysis.available) availableDomains.push("CAT4");
    if (academicAnalysis.available) availableDomains.push("academic");
    
    if (availableDomains.length === 0) {
      return "Insufficient data to generate progress summary.";
    }
    
    // Overall assessment
    const totalImprovements = improvementAreas.length;
    const significantImprovements = improvementAreas.filter(area => area.significance === "significant").length;
    const totalConcerns = concernAreas.length;
    const significantConcerns = concernAreas.filter(area => area.significance === "significant").length;
    
    if (significantImprovements > significantConcerns && totalImprovements > totalConcerns) {
      summary += "Overall positive progress with significant improvements ";
    } else if (significantConcerns > significantImprovements && totalConcerns > totalImprovements) {
      summary += "Areas of concern identified with significant declines ";
    } else if (totalImprovements > 0 && totalConcerns > 0) {
      summary += "Mixed progress with both improvements and areas of concern ";
    } else if (totalImprovements === 0 && totalConcerns === 0) {
      summary += "Stable performance with no significant changes ";
    } else if (totalImprovements > 0) {
      summary += "Some improvements with no significant concerns ";
    } else {
      summary += "Some areas of concern with no significant improvements ";
    }
    
    summary += `across ${availableDomains.join(", ")} assessments.\n\n`;
    
    // Domain-specific summaries
    if (passAnalysis.available) {
      summary += `PASS: ${passAnalysis.overallStatus}. `;
      const passImprovements = improvementAreas.filter(area => area.domain === "PASS");
      const passConcerns = concernAreas.filter(area => area.domain === "PASS");
      
      if (passImprovements.length > 0) {
        summary += `Notable improvements in ${passImprovements.map(area => area.factor).join(", ")}. `;
      }
      
      if (passConcerns.length > 0) {
        summary += `Areas of concern include ${passConcerns.map(area => area.factor).join(", ")}. `;
      }
      
      summary += "\n\n";
    }
    
    if (cat4Analysis.available) {
      summary += `CAT4: ${cat4Analysis.overallStatus}. `;
      const cat4Improvements = improvementAreas.filter(area => area.domain === "CAT4");
      const cat4Concerns = concernAreas.filter(area => area.domain === "CAT4");
      
      if (cat4Improvements.length > 0) {
        summary += `Notable improvements in ${cat4Improvements.map(area => area.factor).join(", ")}. `;
      }
      
      if (cat4Concerns.length > 0) {
        summary += `Areas of concern include ${cat4Concerns.map(area => area.factor).join(", ")}. `;
      }
      
      if (cat4Analysis.fragileLearnerChange.hasChanged) {
        if (cat4Analysis.fragileLearnerChange.direction === "positive") {
          summary += "The student is no longer identified as a fragile learner. ";
        } else {
          summary += "The student is now identified as a fragile learner. ";
        }
      }
      
      summary += "\n\n";
    }
    
    if (academicAnalysis.available) {
      summary += `Academic: ${academicAnalysis.overallStatus}. `;
      const academicImprovements = improvementAreas.filter(area => area.domain === "Academic");
      const academicConcerns = concernAreas.filter(area => area.domain === "Academic");
      
      if (academicImprovements.length > 0) {
        summary += `Notable improvements in ${academicImprovements.map(area => area.factor).join(", ")}. `;
      }
      
      if (academicConcerns.length > 0) {
        summary += `Areas of concern include ${academicConcerns.map(area => area.factor).join(", ")}. `;
      }
      
      summary += "\n\n";
    }
    
    // Intervention effectiveness
    if (interventionEffectiveness.available) {
      summary += "Intervention Effectiveness: ";
      
      const effectiveCount = Object.values(interventionEffectiveness.interventions).filter(i => i.effectiveness === "effective").length;
      const partialCount = Object.values(interventionEffectiveness.interventions).filter(i => i.effectiveness === "partially effective").length;
      const ineffectiveCount = Object.values(interventionEffectiveness.interventions).filter(i => i.effectiveness === "not effective").length;
      const totalCount = Object.values(interventionEffectiveness.interventions).length;
      
      if (effectiveCount > 0) {
        summary += `${effectiveCount} of ${totalCount} interventions show clear effectiveness. `;
      }
      
      if (partialCount > 0) {
        summary += `${partialCount} show partial effectiveness. `;
      }
      
      if (ineffectiveCount > 0) {
        summary += `${ineffectiveCount} appear ineffective and may need adjustment. `;
      }
      
      // Add specific details for highly effective or ineffective interventions
      const mostEffective = Object.values(interventionEffectiveness.interventions)
        .filter(i => i.effectiveness === "effective")
        .slice(0, 2);
      
      const leastEffective = Object.values(interventionEffectiveness.interventions)
        .filter(i => i.effectiveness === "not effective")
        .slice(0, 2);
      
      if (mostEffective.length > 0) {
        summary += `Most effective intervention(s): ${mostEffective.map(i => `${i.factor} (${i.domain})`).join(", ")}. `;
      }
      
      if (leastEffective.length > 0) {
        summary += `Least effective intervention(s): ${leastEffective.map(i => `${i.factor} (${i.domain})`).join(", ")}. `;
      }
    }
    
    return summary;
  }
}

export default ProgressTracker;