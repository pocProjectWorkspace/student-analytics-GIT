# app/api/models.py
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any, Union
from datetime import datetime

# Assessment Models
class PassFactor(BaseModel):
    name: str
    percentile: float
    level: str  # "at-risk", "balanced", "strength"
    description: Optional[str] = None

class PassRiskArea(BaseModel):
    factor: str
    percentile: float
    threshold: Optional[float] = None

class PassStrengthArea(BaseModel):
    factor: str
    percentile: float

class Cat4Domain(BaseModel):
    name: str
    stanine: float
    percentile: Optional[float] = None
    level: str  # "weakness", "balanced", "strength"
    description: Optional[str] = None

class Cat4WeaknessArea(BaseModel):
    domain: str
    stanine: float
    description: Optional[str] = None

class Cat4LearningPreference(BaseModel):
    type: str
    strength: float  # 0.0 to 1.0
    description: str

class AcademicSubject(BaseModel):
    name: str
    stanine: float
    percentile: Optional[float] = None
    level: str  # "weakness", "balanced", "strength" 
    comparison: Optional[str] = None  # e.g., "Meeting Potential", "Below Potential"

# Analysis Models
class PassAnalysis(BaseModel):
    available: bool
    factors: List[PassFactor] = []
    riskAreas: List[PassRiskArea] = []
    strengthAreas: List[PassStrengthArea] = []
    averagePercentile: Optional[float] = None

class Cat4Analysis(BaseModel):
    available: bool
    domains: List[Cat4Domain] = []
    weaknessAreas: List[Cat4WeaknessArea] = []
    learningPreferences: List[Cat4LearningPreference] = []
    is_fragile_learner: bool = False
    averageStanine: Optional[float] = None

class AcademicAnalysis(BaseModel):
    available: bool
    subjects: List[AcademicSubject] = []
    averageStanine: Optional[float] = None

# Intervention Models
class Intervention(BaseModel):
    domain: str  # "emotional", "behavioral", "cognitive", "academic", "holistic", "integrated"
    factor: str  # What factor is being targeted (e.g., "Self Regard", "Verbal Reasoning")
    title: str
    description: str
    priority: str  # "high", "medium", "low"

class CompoundIntervention(BaseModel):
    domain: str  # Usually "integrated"
    factor: str  # Combined factors (e.g., "Self-Regard and Verbal Reasoning")
    title: str
    description: str
    priority: str  # "high", "medium", "low"
    impact: str  # "very high", "high", "medium", "low"

# Historical Analysis Models
class FactorProgress(BaseModel):
    current: float
    previous: float
    change: float
    isSignificant: bool
    direction: str  # "improved", "declined", "unchanged"
    status: str  # "significant improvement", "slight improvement", etc.

class ProgressArea(BaseModel):
    domain: str  # "PASS", "CAT4", "Academic"
    factor: str
    improvement: Optional[str] = None
    decline: Optional[str] = None
    significance: str  # "significant", "slight"

class FragileLearnerChange(BaseModel):
    current: bool
    previous: bool
    hasChanged: bool
    direction: str  # "positive", "negative", "unchanged"

class InterventionEffectiveness(BaseModel):
    domain: str
    factor: str
    effectiveness: str  # "effective", "partially effective", "not effective", "unknown"
    evidence: str

class PassProgressAnalysis(BaseModel):
    available: bool
    factorAnalysis: Optional[Dict[str, FactorProgress]] = None
    averageChange: Optional[float] = None
    overallStatus: Optional[str] = None
    message: Optional[str] = None

class Cat4ProgressAnalysis(BaseModel):
    available: bool
    domainAnalysis: Optional[Dict[str, FactorProgress]] = None
    fragileLearnerChange: Optional[FragileLearnerChange] = None
    averageChange: Optional[float] = None
    overallStatus: Optional[str] = None
    message: Optional[str] = None

class AcademicProgressAnalysis(BaseModel):
    available: bool
    subjectAnalysis: Optional[Dict[str, FactorProgress]] = None
    averageChange: Optional[float] = None
    overallStatus: Optional[str] = None
    message: Optional[str] = None

class InterventionEffectivenessAnalysis(BaseModel):
    available: bool
    interventions: Optional[Dict[str, InterventionEffectiveness]] = None
    message: Optional[str] = None

class ProgressAnalysis(BaseModel):
    hasBaseline: bool
    pass_analysis: Optional[PassProgressAnalysis] = None
    cat4_analysis: Optional[Cat4ProgressAnalysis] = None
    academic_analysis: Optional[AcademicProgressAnalysis] = None
    interventionEffectiveness: Optional[InterventionEffectivenessAnalysis] = None
    improvementAreas: List[ProgressArea] = []
    concernAreas: List[ProgressArea] = []
    summary: str
    timestamp: datetime = Field(default_factory=datetime.now)

# Predictive Analysis Models
class RiskFactor(BaseModel):
    domain: str
    factor: str
    level: float  # 0.0 to 1.0
    weighted_risk: float
    details: str

class EarlyWarningIndicator(BaseModel):
    domain: str
    indicator: str
    level: float  # 0.0 to 1.0
    details: str

class TrendValue(BaseModel):
    timestamp: Union[str, datetime]
    value: float

class TrendAnalysis(BaseModel):
    values: List[TrendValue]
    direction: str  # "improving", "declining", "stable"
    strength: float  # 0.0 to 1.0

class OverallTrendAnalysis(BaseModel):
    available: bool
    pass_trends: Optional[Dict[str, TrendAnalysis]] = None
    cat4_trends: Optional[Dict[str, TrendAnalysis]] = None
    academic_trends: Optional[Dict[str, TrendAnalysis]] = None
    overall_direction: str
    message: Optional[str] = None

class PreventiveRecommendation(BaseModel):
    priority: str  # "high", "medium", "low"
    type: str  # "intervention", "monitoring", "preventive", "trend-response", "maintenance"
    title: str
    description: str
    timeframe: str

class RiskPrediction(BaseModel):
    overall_risk_score: float  # 0.0 to 1.0
    risk_level: str  # "high", "medium", "borderline", "low"
    risk_factors: List[RiskFactor] = []
    early_indicators: List[EarlyWarningIndicator] = []
    trend_analysis: OverallTrendAnalysis
    time_to_intervention: str  # "urgent", "soon", "monitor", "not urgent"
    confidence: float  # 0.0 to 1.0 - confidence in the prediction
    recommendations: List[PreventiveRecommendation] = []
    timestamp: datetime = Field(default_factory=datetime.now)

# Student Data Model
class StudentData(BaseModel):
    student_id: str
    name: str
    grade: int
    section: Optional[str] = None
    pass_analysis: PassAnalysis
    cat4_analysis: Cat4Analysis
    academic_analysis: AcademicAnalysis
    interventions: List[Intervention] = []
    compoundInterventions: List[CompoundIntervention] = []
    progressAnalysis: Optional[ProgressAnalysis] = None
    riskPrediction: Optional[RiskPrediction] = None
    is_fragile_learner: bool = False
    timestamp: datetime = Field(default_factory=datetime.now)

# Cohort Analysis Models
class GradeDistribution(BaseModel):
    grade: int
    count: int
    fragile_learners: int
    high_risk: int
    interventions_needed: int

class RiskDistribution(BaseModel):
    risk_level: str
    count: int
    percentage: float

class PassRiskDistribution(BaseModel):
    factor: str
    count: int
    average_percentile: float

class Cat4WeaknessDistribution(BaseModel):
    domain: str
    count: int
    average_stanine: float

class AcademicWeaknessDistribution(BaseModel):
    subject: str
    count: int
    average_stanine: float

class InterventionDistribution(BaseModel):
    domain: str
    count: int
    high_priority: int
    effective: Optional[int] = None
    partially_effective: Optional[int] = None
    not_effective: Optional[int] = None

class CohortStatistics(BaseModel):
    total_students: int
    grades: Dict[int, int]
    riskLevels: Dict[str, int]
    fragileLearnersCount: int
    passRiskFactors: Dict[str, int]
    cat4WeaknessAreas: Dict[str, int]
    academicWeaknesses: Dict[str, int]
    interventionsByDomain: Dict[str, int]
    
    # Additional statistics for detailed cohort analysis
    grade_distribution: List[GradeDistribution] = []
    risk_distribution: List[RiskDistribution] = []
    pass_risk_distribution: List[PassRiskDistribution] = []
    cat4_weakness_distribution: List[Cat4WeaknessDistribution] = []
    academic_weakness_distribution: List[AcademicWeaknessDistribution] = []
    intervention_distribution: List[InterventionDistribution] = []
    
    # Timestamp for caching purposes
    timestamp: datetime = Field(default_factory=datetime.now)

# API Response Models
class StudentResponse(BaseModel):
    student: StudentData

class StudentsListResponse(BaseModel):
    students: List[StudentData]
    total_count: int

class CohortStatsResponse(BaseModel):
    stats: CohortStatistics

# Database Models (for app/database/models.py)
# These would be implemented in SQLAlchemy