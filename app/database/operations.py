"""
Database operations for Student Analytics PoC
--------------------------------------------
This module provides functions for database CRUD operations.
"""

from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
import json

from .models import (
    Student, PassData, CAT4Data, AcademicData, 
    Intervention, AnalysisSession
)


# Session operations
def create_analysis_session(
    db: Session, 
    session_id: str, 
    pass_file: Optional[str] = None,
    cat4_file: Optional[str] = None,
    academic_file: Optional[str] = None
) -> AnalysisSession:
    """Create a new analysis session"""
    db_session = AnalysisSession(
        session_id=session_id,
        pass_file_name=pass_file,
        cat4_file_name=cat4_file,
        academic_file_name=academic_file,
        processing_status="processing"
    )
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    return db_session


def update_session_status(
    db: Session, 
    session_id: str, 
    status: str, 
    students_processed: int = 0,
    error_message: Optional[str] = None
) -> AnalysisSession:
    """Update the status of an analysis session"""
    db_session = db.query(AnalysisSession).filter(AnalysisSession.session_id == session_id).first()
    if db_session:
        db_session.processing_status = status
        db_session.students_processed = students_processed
        db_session.error_message = error_message
        db.commit()
        db.refresh(db_session)
    return db_session


def store_session_results(
    db: Session, 
    session_id: str, 
    results: Dict[str, Any]
) -> AnalysisSession:
    """Store analysis results in the session"""
    db_session = db.query(AnalysisSession).filter(AnalysisSession.session_id == session_id).first()
    if db_session:
        db_session.result_data = results
        db.commit()
        db.refresh(db_session)
    return db_session


def get_session_by_id(db: Session, session_id: str) -> Optional[AnalysisSession]:
    """Get analysis session by ID"""
    return db.query(AnalysisSession).filter(AnalysisSession.session_id == session_id).first()


# Student operations
def create_student(
    db: Session, 
    student_id: str, 
    name: str, 
    grade: str,
    section: Optional[str] = None
) -> Student:
    """Create a new student record"""
    db_student = Student(
        student_id=student_id,
        name=name,
        grade=grade,
        section=section
    )
    db.add(db_student)
    db.commit()
    db.refresh(db_student)
    return db_student


def get_student_by_id(db: Session, student_id: str) -> Optional[Student]:
    """Get a student by their student ID"""
    return db.query(Student).filter(Student.student_id == student_id).first()


def get_students_by_grade(db: Session, grade: str) -> List[Student]:
    """Get all students in a specific grade"""
    return db.query(Student).filter(Student.grade == grade).all()


def get_all_students(db: Session, skip: int = 0, limit: int = 100) -> List[Student]:
    """Get all students with pagination"""
    return db.query(Student).offset(skip).limit(limit).all()


# PASS data operations
def create_pass_data(
    db: Session, 
    student_id: int, 
    factor_data: Dict[str, float],
    prediction: Optional[Dict[str, Any]] = None
) -> PassData:
    """Create PASS data for a student"""
    pass_data = PassData(
        student_id=student_id,
        self_regard=factor_data.get('Self_Regard'),
        perceived_learning=factor_data.get('Perceived_Learning'),
        attitude_teachers=factor_data.get('Attitude_Teachers'),
        general_work_ethic=factor_data.get('General_Work_Ethic'),
        confidence_learning=factor_data.get('Learning_Confidence'),
        preparedness=factor_data.get('Preparedness'),
        emotional_control=factor_data.get('Emotional_Control'),
        social_confidence=factor_data.get('Social_Confidence'),
        curriculum_demand=factor_data.get('Curriculum_Demand')
    )
    
    if prediction:
        pass_data.risk_prediction = prediction.get('overall_risk')
        pass_data.prediction_confidence = prediction.get('confidence')
    
    db.add(pass_data)
    db.commit()
    db.refresh(pass_data)
    return pass_data


# CAT4 data operations
def create_cat4_data(
    db: Session, 
    student_id: int, 
    domain_data: Dict[str, int],
    is_fragile: bool = False
) -> CAT4Data:
    """Create CAT4 data for a student"""
    cat4_data = CAT4Data(
        student_id=student_id,
        verbal_reasoning=domain_data.get('Verbal_Reasoning'),
        quantitative_reasoning=domain_data.get('Quantitative_Reasoning'),
        nonverbal_reasoning=domain_data.get('Nonverbal_Reasoning'),
        spatial_reasoning=domain_data.get('Spatial_Reasoning'),
        is_fragile_learner=is_fragile
    )
    
    db.add(cat4_data)
    db.commit()
    db.refresh(cat4_data)
    return cat4_data


# Academic data operations
def create_academic_data(
    db: Session, 
    student_id: int, 
    subject: str,
    mark: float,
    stanine: Optional[int] = None,
    cat4_comparison: Optional[str] = None
) -> AcademicData:
    """Create academic data for a student"""
    academic_data = AcademicData(
        student_id=student_id,
        subject=subject,
        mark=mark,
        stanine=stanine,
        cat4_comparison=cat4_comparison
    )
    
    db.add(academic_data)
    db.commit()
    db.refresh(academic_data)
    return academic_data


# Intervention operations
def create_intervention(
    db: Session, 
    student_id: int, 
    domain: str,
    factor: str,
    title: str,
    description: str,
    priority: str
) -> Intervention:
    """Create an intervention recommendation for a student"""
    intervention = Intervention(
        student_id=student_id,
        domain=domain,
        factor=factor,
        title=title,
        description=description,
        priority=priority
    )
    
    db.add(intervention)
    db.commit()
    db.refresh(intervention)
    return intervention


def mark_intervention_implemented(
    db: Session, 
    intervention_id: int,
    notes: Optional[str] = None
) -> Intervention:
    """Mark an intervention as implemented"""
    from datetime import datetime
    
    intervention = db.query(Intervention).filter(Intervention.id == intervention_id).first()
    if intervention:
        intervention.is_implemented = True
        intervention.implementation_date = datetime.utcnow()
        intervention.implementation_notes = notes
        db.commit()
        db.refresh(intervention)
    return intervention


def get_student_interventions(db: Session, student_id: int) -> List[Intervention]:
    """Get all interventions for a student"""
    return db.query(Intervention).filter(Intervention.student_id == student_id).all()


# Bulk operations for analytics results
def store_analytics_results(db: Session, results: Dict[str, Any]) -> bool:
    """
    Store complete analytics results in the database.
    This handles creating/updating all related records.
    """
    try:
        # Process each student in the results
        for student_data in results.get('students', []):
            # Get or create student
            db_student = get_student_by_id(db, student_data['student_id'])
            if not db_student:
                db_student = create_student(
                    db,
                    student_data['student_id'],
                    student_data['name'],
                    student_data['grade']
                )
            
            # Store PASS data if available
            if student_data.get('pass_analysis', {}).get('available'):
                pass_factors = {}
                for factor, data in student_data['pass_analysis']['factors'].items():
                    pass_factors[factor] = data['percentile']
                
                create_pass_data(
                    db, 
                    db_student.id, 
                    pass_factors,
                    student_data['pass_analysis'].get('prediction')
                )
            
            # Store CAT4 data if available
            if student_data.get('cat4_analysis', {}).get('available'):
                cat4_domains = {}
                for domain, data in student_data['cat4_analysis']['domains'].items():
                    cat4_domains[domain] = data['stanine']
                
                create_cat4_data(
                    db, 
                    db_student.id, 
                    cat4_domains,
                    student_data['cat4_analysis'].get('is_fragile_learner', False)
                )
            
            # Store academic data if available
            if student_data.get('academic_analysis', {}).get('available'):
                for subject, data in student_data['academic_analysis']['subjects'].items():
                    create_academic_data(
                        db,
                        db_student.id,
                        subject,
                        data['mark'],
                        data['stanine'],
                        data.get('cat4_comparison')
                    )
            
            # Store interventions
            for intervention in student_data.get('interventions', []):
                create_intervention(
                    db,
                    db_student.id,
                    intervention['domain'],
                    intervention['factor'],
                    intervention['title'],
                    intervention['description'],
                    intervention['priority']
                )
        
        return True
    except Exception as e:
        # Log the error
        print(f"Error storing analytics results: {str(e)}")
        # Rollback the transaction
        db.rollback()
        return False