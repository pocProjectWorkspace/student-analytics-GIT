# app/database/models.py - Corrected for Excel Structure
from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime, Text, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

Base = declarative_base()

class Student(Base):
    __tablename__ = 'students'
    
    id = Column(Integer, primary_key=True)
    student_id = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    grade = Column(Integer, nullable=False)
    section = Column(String(50), nullable=True)
    is_fragile_learner = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    
    # Relationships
    pass_assessment = relationship("PassAssessment", back_populates="student", uselist=False)
    cat4_assessment = relationship("CAT4Assessment", back_populates="student", uselist=False)
    academic_assessments = relationship("AcademicAssessment", back_populates="student")
    interventions = relationship("Intervention", back_populates="student")
    risk_predictions = relationship("RiskPrediction", back_populates="student")
    progress_analyses = relationship("ProgressAnalysis", back_populates="student")

class PassAssessment(Base):
    __tablename__ = 'pass_assessments'
    
    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey('students.id'), nullable=False)
    assessment_date = Column(DateTime, default=datetime.now)
    
    # Individual PASS factor percentiles (based on Excel columns)
    perceived_learning_capability = Column(Float, nullable=True)
    self_regard_as_learner = Column(Float, nullable=True)
    preparedness_for_learning = Column(Float, nullable=True)
    general_work_ethic = Column(Float, nullable=True)
    confidence_in_learning = Column(Float, nullable=True)
    feelings_about_school = Column(Float, nullable=True)
    attitudes_to_teachers = Column(Float, nullable=True)
    attitudes_to_attendance = Column(Float, nullable=True)
    response_to_curriculum = Column(Float, nullable=True)
    
    # Calculated average
    average_percentile = Column(Float, nullable=True)
    
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    
    # Relationships
    student = relationship("Student", back_populates="pass_assessment")
    factors = relationship("PassFactor", back_populates="assessment")

class PassFactor(Base):
    __tablename__ = 'pass_factors'
    
    id = Column(Integer, primary_key=True)
    assessment_id = Column(Integer, ForeignKey('pass_assessments.id'), nullable=False)
    name = Column(String(100), nullable=False)
    percentile = Column(Float, nullable=False)
    level = Column(String(50), nullable=False)  # "at-risk", "balanced", "strength"
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    
    # Relationships
    assessment = relationship("PassAssessment", back_populates="factors")

class CAT4Assessment(Base):
    __tablename__ = 'cat4_assessments'
    
    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey('students.id'), nullable=False)
    assessment_date = Column(DateTime, default=datetime.now)
    
    # Individual CAT4 domain stanines (based on Excel columns)
    verbal_sas = Column(Float, nullable=True)
    quantitative_sas = Column(Float, nullable=True)
    nonverbal_sas = Column(Float, nullable=True)
    spatial_sas = Column(Float, nullable=True)
    mean_sas = Column(Float, nullable=True)
    
    # Verbal Spatial Profile
    verbal_spatial_profile = Column(String(100), nullable=True)
    
    # Fragile learner determination
    is_fragile_learner = Column(Boolean, default=False)
    average_stanine = Column(Float, nullable=True)
    
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    
    # Relationships
    student = relationship("Student", back_populates="cat4_assessment")
    domains = relationship("CAT4Domain", back_populates="assessment")

class CAT4Domain(Base):
    __tablename__ = 'cat4_domains'
    
    id = Column(Integer, primary_key=True)
    assessment_id = Column(Integer, ForeignKey('cat4_assessments.id'), nullable=False)
    name = Column(String(100), nullable=False)  # "Verbal", "Quantitative", "Non-verbal", "Spatial"
    stanine = Column(Float, nullable=False)
    percentile = Column(Float, nullable=True)
    level = Column(String(50), nullable=False)  # "weakness", "balanced", "strength"
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    
    # Relationships
    assessment = relationship("CAT4Assessment", back_populates="domains")

class AcademicAssessment(Base):
    __tablename__ = 'academic_assessments'
    
    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey('students.id'), nullable=False)
    assessment_date = Column(DateTime, default=datetime.now)
    term = Column(String(50), nullable=True)  # e.g., "Term 1", "Final"
    
    # Individual subject data (based on Excel columns)
    english_internal_marks = Column(Float, nullable=True)
    english_internal_stanine = Column(Float, nullable=True)
    english_asset_stanine = Column(Float, nullable=True)
    english_comparison = Column(String(100), nullable=True)
    
    maths_internal_marks = Column(Float, nullable=True)
    maths_internal_stanine = Column(Float, nullable=True)
    maths_asset_stanine = Column(Float, nullable=True)
    maths_comparison = Column(String(100), nullable=True)
    
    science_internal_marks = Column(Float, nullable=True)
    science_internal_stanine = Column(Float, nullable=True)
    science_asset_stanine = Column(Float, nullable=True)
    science_comparison = Column(String(100), nullable=True)
    
    # Calculated average
    average_stanine = Column(Float, nullable=True)
    
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    
    # Relationships
    student = relationship("Student", back_populates="academic_assessments")
    subjects = relationship("AcademicSubject", back_populates="assessment")

class AcademicSubject(Base):
    __tablename__ = 'academic_subjects'
    
    id = Column(Integer, primary_key=True)
    assessment_id = Column(Integer, ForeignKey('academic_assessments.id'), nullable=False)
    name = Column(String(100), nullable=False)  # "English", "Maths", "Science"
    internal_marks = Column(Float, nullable=True)
    internal_stanine = Column(Float, nullable=False)
    asset_stanine = Column(Float, nullable=True)
    percentile = Column(Float, nullable=True)
    level = Column(String(50), nullable=False)  # "weakness", "balanced", "strength"
    comparison = Column(String(100), nullable=True)  # e.g., "Meeting Potential", "Below Potential"
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    
    # Relationships
    assessment = relationship("AcademicAssessment", back_populates="subjects")

class Intervention(Base):
    __tablename__ = 'interventions'
    
    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey('students.id'), nullable=False)
    domain = Column(String(50), nullable=False)  # "emotional", "behavioral", "cognitive", "academic", "holistic", "integrated"
    factor = Column(String(100), nullable=False)  # What factor is being targeted
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    priority = Column(String(50), nullable=False)  # "high", "medium", "low"
    is_compound = Column(Boolean, default=False)
    impact = Column(String(50), nullable=True)  # "very high", "high", "medium", "low" (for compound interventions)
    status = Column(String(50), default="assigned")  # "assigned", "in-progress", "completed", "evaluated"
    start_date = Column(DateTime, nullable=True)
    end_date = Column(DateTime, nullable=True)
    effectiveness = Column(String(50), nullable=True)  # "effective", "partially effective", "not effective", "unknown"
    evidence = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    
    # Relationships
    student = relationship("Student", back_populates="interventions")

class RiskPrediction(Base):
    __tablename__ = 'risk_predictions'
    
    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey('students.id'), nullable=False)
    prediction_date = Column(DateTime, default=datetime.now)
    overall_risk_score = Column(Float, nullable=False)  # 0.0 to 1.0
    risk_level = Column(String(50), nullable=False)  # "high", "medium", "borderline", "low"
    risk_factors = Column(JSON, nullable=True)
    early_indicators = Column(JSON, nullable=True)
    trend_analysis = Column(JSON, nullable=True)
    time_to_intervention = Column(String(50), nullable=False)  # "urgent", "soon", "monitor", "not urgent"
    confidence = Column(Float, nullable=False)  # 0.0 to 1.0
    recommendations = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    
    # Relationships
    student = relationship("Student", back_populates="risk_predictions")

class ProgressAnalysis(Base):
    __tablename__ = 'progress_analyses'
    
    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey('students.id'), nullable=False)
    analysis_date = Column(DateTime, default=datetime.now)
    has_baseline = Column(Boolean, default=False)
    pass_analysis = Column(JSON, nullable=True)
    cat4_analysis = Column(JSON, nullable=True)
    academic_analysis = Column(JSON, nullable=True)
    intervention_effectiveness = Column(JSON, nullable=True)
    improvement_areas = Column(JSON, nullable=True)
    concern_areas = Column(JSON, nullable=True)
    summary = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    
    # Relationships
    student = relationship("Student", back_populates="progress_analyses")

class CohortStatistics(Base):
    __tablename__ = 'cohort_statistics'
    
    id = Column(Integer, primary_key=True)
    date = Column(DateTime, default=datetime.now)
    total_students = Column(Integer, nullable=False)
    grades = Column(JSON, nullable=True)  # Dictionary of grade:count
    risk_levels = Column(JSON, nullable=True)  # Dictionary of risk_level:count
    fragile_learners_count = Column(Integer, nullable=False, default=0)
    pass_risk_factors = Column(JSON, nullable=True)  # Dictionary of factor:count
    cat4_weakness_areas = Column(JSON, nullable=True)  # Dictionary of domain:count
    academic_weaknesses = Column(JSON, nullable=True)  # Dictionary of subject:count
    interventions_by_domain = Column(JSON, nullable=True)  # Dictionary of domain:count
    
    # Additional detailed statistics
    grade_distribution = Column(JSON, nullable=True)
    risk_distribution = Column(JSON, nullable=True)
    pass_risk_distribution = Column(JSON, nullable=True)
    cat4_weakness_distribution = Column(JSON, nullable=True)
    academic_weakness_distribution = Column(JSON, nullable=True)
    intervention_distribution = Column(JSON, nullable=True)
    
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

class HistoricalStudentSnapshot(Base):
    __tablename__ = 'historical_student_snapshots'
    
    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey('students.id'), nullable=False)
    snapshot_date = Column(DateTime, default=datetime.now)
    snapshot_reason = Column(String(100), nullable=True)
    
    # Complete student data snapshot in JSON format
    student_data = Column(JSON, nullable=False)
    pass_data = Column(JSON, nullable=True)
    cat4_data = Column(JSON, nullable=True)
    academic_data = Column(JSON, nullable=True)
    interventions_data = Column(JSON, nullable=True)
    risk_prediction_data = Column(JSON, nullable=True)
    
    created_at = Column(DateTime, default=datetime.now)
    
    # Relationship
    student = relationship("Student")