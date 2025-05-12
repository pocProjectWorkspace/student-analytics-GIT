"""
Database models for Student Analytics PoC
----------------------------------------
This module defines the SQLAlchemy ORM models for database storage.
"""

from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime, Text, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

Base = declarative_base()


class Student(Base):
    """Student model - core entity for student information"""
    __tablename__ = "students"
    
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    grade = Column(String, nullable=False)
    section = Column(String, nullable=True)
    
    # Relationships
    pass_data = relationship("PassData", back_populates="student", uselist=False, cascade="all, delete-orphan")
    cat4_data = relationship("CAT4Data", back_populates="student", uselist=False, cascade="all, delete-orphan")
    academic_data = relationship("AcademicData", back_populates="student", cascade="all, delete-orphan")
    interventions = relationship("Intervention", back_populates="student", cascade="all, delete-orphan")
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class PassData(Base):
    """PASS assessment data model"""
    __tablename__ = "pass_data"
    
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    
    # PASS factors
    self_regard = Column(Float, nullable=True)
    perceived_learning = Column(Float, nullable=True)
    attitude_teachers = Column(Float, nullable=True)
    general_work_ethic = Column(Float, nullable=True)
    confidence_learning = Column(Float, nullable=True)
    preparedness = Column(Float, nullable=True)
    emotional_control = Column(Float, nullable=True)
    social_confidence = Column(Float, nullable=True)
    curriculum_demand = Column(Float, nullable=True)
    
    # Prediction
    risk_prediction = Column(String, nullable=True)
    prediction_confidence = Column(Float, nullable=True)
    
    # Relationship
    student = relationship("Student", back_populates="pass_data")
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class CAT4Data(Base):
    """CAT4 cognitive assessment data model"""
    __tablename__ = "cat4_data"
    
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    
    # CAT4 domains
    verbal_reasoning = Column(Integer, nullable=True)
    quantitative_reasoning = Column(Integer, nullable=True)
    nonverbal_reasoning = Column(Integer, nullable=True)
    spatial_reasoning = Column(Integer, nullable=True)
    
    # Derived metrics
    is_fragile_learner = Column(Boolean, default=False)
    
    # Relationship
    student = relationship("Student", back_populates="cat4_data")
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class AcademicData(Base):
    """Academic performance data model"""
    __tablename__ = "academic_data"
    
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    
    # Subject and marks
    subject = Column(String, nullable=False)
    mark = Column(Float, nullable=False)
    stanine = Column(Integer, nullable=True)
    
    # CAT4 comparison
    cat4_comparison = Column(String, nullable=True)
    
    # Relationship
    student = relationship("Student", back_populates="academic_data")
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Intervention(Base):
    """Intervention recommendation model"""
    __tablename__ = "interventions"
    
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    
    # Intervention details
    domain = Column(String, nullable=False)
    factor = Column(String, nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    priority = Column(String, nullable=False)
    
    # Implementation tracking
    is_implemented = Column(Boolean, default=False)
    implementation_date = Column(DateTime, nullable=True)
    implementation_notes = Column(Text, nullable=True)
    
    # Relationship
    student = relationship("Student", back_populates="interventions")
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class AnalysisSession(Base):
    """Analysis session model for tracking file uploads and processing"""
    __tablename__ = "analysis_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, unique=True, index=True, nullable=False)
    
    # Files processed
    pass_file_name = Column(String, nullable=True)
    cat4_file_name = Column(String, nullable=True)
    academic_file_name = Column(String, nullable=True)
    
    # Processing metadata
    students_processed = Column(Integer, default=0)
    processing_status = Column(String, default="pending")
    error_message = Column(Text, nullable=True)
    
    # Result storage (for sessions without DB persistence)
    result_data = Column(JSON, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)