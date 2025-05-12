"""
API data models for Student Analytics PoC
----------------------------------------
This module defines the Pydantic models used for API requests and responses.
"""

from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field


class PassFactor(BaseModel):
    """Model for a single PASS factor"""
    factor: str
    percentile: float
    level: str
    description: Optional[str] = None


class PassRiskArea(BaseModel):
    """Model for a PASS risk area"""
    factor: str
    percentile: float
    level: str


class PassPrediction(BaseModel):
    """Model for overall PASS prediction"""
    overall_risk: str
    confidence: float
    probabilities: Dict[str, float]


class PassAnalysis(BaseModel):
    """Model for complete PASS analysis"""
    available: bool
    factors: Optional[Dict[str, Dict[str, Any]]] = None
    risk_areas: Optional[List[Dict[str, Any]]] = None
    strength_areas: Optional[List[Dict[str, Any]]] = None
    prediction: Optional[Dict[str, Any]] = None
    message: Optional[str] = None


class CognitiveDomain(BaseModel):
    """Model for a CAT4 cognitive domain"""
    domain: str
    stanine: int
    level: str
    description: Optional[str] = None


class CatWeaknessArea(BaseModel):
    """Model for a CAT4 weakness area"""
    domain: str
    stanine: int
    level: str


class Cat4Analysis(BaseModel):
    """Model for complete CAT4 analysis"""
    available: bool
    domains: Optional[Dict[str, Dict[str, Any]]] = None
    weakness_areas: Optional[List[Dict[str, Any]]] = None
    strength_areas: Optional[List[Dict[str, Any]]] = None
    is_fragile_learner: bool = False
    message: Optional[str] = None


class SubjectAnalysis(BaseModel):
    """Model for a subject analysis"""
    mark: float
    stanine: int
    level: str
    cat4_comparison: Optional[str] = None


class AcademicAnalysis(BaseModel):
    """Model for complete academic analysis"""
    available: bool
    subjects: Optional[Dict[str, Dict[str, Any]]] = None
    cat4_comparison: Optional[Dict[str, str]] = None
    average_mark: Optional[float] = None
    message: Optional[str] = None


class Intervention(BaseModel):
    """Model for an intervention recommendation"""
    domain: str
    factor: str
    title: str
    description: str
    priority: str


class StudentAnalysis(BaseModel):
    """Model for complete student analysis"""
    student_id: str
    name: str
    grade: str
    pass_analysis: PassAnalysis
    cat4_analysis: Cat4Analysis
    academic_analysis: AcademicAnalysis
    interventions: List[Intervention]


class RiskItem(BaseModel):
    """Model for a risk area in the dashboard"""
    factor: str
    level: str


class DashboardStudent(BaseModel):
    """Model for a student in the dashboard"""
    id: str
    name: str
    risk_count: int
    risk_areas: List[RiskItem]
    intervention_count: int


class GradeSummary(BaseModel):
    """Model for grade-level summary statistics"""
    total_students: int
    at_risk_count: int
    fragile_learners_count: int
    academic_concerns_count: int


class RiskDataItem(BaseModel):
    """Model for a student in the risk heatmap"""
    id: str
    name: str
    section: str
    riskCount: int


class UploadResponse(BaseModel):
    """Model for file upload response"""
    status: str
    message: str
    students_processed: int
    session_id: str


class SampleDataResponse(BaseModel):
    """Model for sample data response"""
    sample_files: Dict[str, str]
    file_formats: Dict[str, str]