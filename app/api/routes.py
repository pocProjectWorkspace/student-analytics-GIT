# app/api/routes.py
from fastapi import APIRouter, HTTPException, Depends, Query, Path
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database.db import get_db
from app.database import schemas, models
from app.api.models import (
    StudentData, StudentsListResponse, CohortStatsResponse,
    StudentResponse, ProgressAnalysis, RiskPrediction
)
from app.engine.analytics import (
    StudentAnalyticsEngine, 
    ProgressTracker, 
    PredictiveAnalytics
)

router = APIRouter()

@router.get("/students/", response_model=StudentsListResponse)
async def get_students(
    grade: Optional[int] = None,
    risk_level: Optional[str] = None,
    fragile_status: Optional[bool] = None,
    has_pass_risk: Optional[bool] = None,
    has_cat4_weakness: Optional[bool] = None,
    has_academic_weakness: Optional[bool] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    Get list of students with optional filtering
    """
    # Base query
    query = db.query(models.Student)
    
    # Apply filters
    if grade is not None:
        query = query.filter(models.Student.grade == grade)
    
    if risk_level is not None:
        # This requires a join with the latest risk prediction
        query = query.join(
            models.RiskPrediction,
            models.Student.id == models.RiskPrediction.student_id
        ).filter(models.RiskPrediction.risk_level == risk_level)
    
    if fragile_status is not None:
        query = query.filter(models.Student.is_fragile_learner == fragile_status)
    
    # More complex filters (these will be slower)
    if has_pass_risk is not None:
        if has_pass_risk:
            # Students with PASS risk factors
            query = query.join(
                models.PassAssessment,
                models.Student.id == models.PassAssessment.student_id
            ).join(
                models.PassFactor,
                models.PassAssessment.id == models.PassFactor.assessment_id
            ).filter(models.PassFactor.level == "at-risk")
        else:
            # Students without PASS risk factors
            # This is more complex - we need a subquery
            risk_student_ids = db.query(models.Student.id).join(
                models.PassAssessment,
                models.Student.id == models.PassAssessment.student_id
            ).join(
                models.PassFactor,
                models.PassAssessment.id == models.PassFactor.assessment_id
            ).filter(models.PassFactor.level == "at-risk").subquery()
            
            query = query.filter(models.Student.id.notin_(risk_student_ids))
    
    # Similar filters can be applied for CAT4 and academic weakness
    
    # Execute query with pagination
    students_db = query.offset(skip).limit(limit).all()
    total_count = query.count()
    
    # Process students through analytics engine to get full data
    analytics_engine = StudentAnalyticsEngine()
    enriched_students = []
    
    for student_db in students_db:
        # Get the enriched student data
        student_data = analytics_engine.process_student(student_db)
        
        # Add historical data analysis if available
        progress_tracker = ProgressTracker()
        previous_data = get_latest_historical_data(student_db.id, db)
        if previous_data:
            progress_analysis = progress_tracker.track_progress(student_data, previous_data)
            student_data.progressAnalysis = progress_analysis
        
        # Add risk prediction
        predictive_analytics = PredictiveAnalytics()
        historical_data = get_historical_data(student_db.id, db)
        risk_prediction = predictive_analytics.predict_risk(student_data, historical_data)
        student_data.riskPrediction = risk_prediction
        
        enriched_students.append(student_data)
    
    return StudentsListResponse(
        students=enriched_students,
        total_count=total_count
    )

@router.get("/students/{student_id}", response_model=StudentResponse)
async def get_student(
    student_id: str = Path(..., description="The student ID"),
    include_history: bool = Query(False, description="Whether to include historical data"),
    db: Session = Depends(get_db)
):
    """
    Get detailed data for a specific student
    """
    # Find the student in database
    student_db = db.query(models.Student).filter(models.Student.student_id == student_id).first()
    if not student_db:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Process student data through analytics engine
    analytics_engine = StudentAnalyticsEngine()
    student_data = analytics_engine.process_student(student_db)
    
    # Add historical data analysis if available
    progress_tracker = ProgressTracker()
    previous_data = get_latest_historical_data(student_db.id, db)
    if previous_data:
        progress_analysis = progress_tracker.track_progress(student_data, previous_data)
        student_data.progressAnalysis = progress_analysis
    
    # Add risk prediction
    predictive_analytics = PredictiveAnalytics()
    historical_data = get_historical_data(student_db.id, db)
    risk_prediction = predictive_analytics.predict_risk(student_data, historical_data)
    student_data.riskPrediction = risk_prediction
    
    # Return the response
    return StudentResponse(student=student_data)

@router.get("/stats/cohort", response_model=CohortStatsResponse)
async def get_cohort_stats(
    grade: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """
    Get cohort statistics
    """
    # Check if we have recent stats in the database
    stats_db = db.query(models.CohortStatistics).order_by(
        models.CohortStatistics.date.desc()
    ).first()
    
    # If recent stats exist, return them
    if stats_db and (datetime.now() - stats_db.date).days < 1:
        return CohortStatsResponse(stats=stats_db)
    
    # Otherwise, generate new stats
    stats = generate_cohort_stats(db, grade)
    
    # Save the stats to database for caching
    new_stats_db = models.CohortStatistics(
        total_students=stats.total_students,
        grades=stats.grades,
        risk_levels=stats.riskLevels,
        fragile_learners_count=stats.fragileLearnersCount,
        pass_risk_factors=stats.passRiskFactors,
        cat4_weakness_areas=stats.cat4WeaknessAreas,
        academic_weaknesses=stats.academicWeaknesses,
        interventions_by_domain=stats.interventionsByDomain,
        grade_distribution=stats.grade_distribution,
        risk_distribution=stats.risk_distribution,
        pass_risk_distribution=stats.pass_risk_distribution,
        cat4_weakness_distribution=stats.cat4_weakness_distribution,
        academic_weakness_distribution=stats.academic_weakness_distribution,
        intervention_distribution=stats.intervention_distribution
    )
    db.add(new_stats_db)
    db.commit()
    
    return CohortStatsResponse(stats=stats)

@router.post("/students/{student_id}/interventions", response_model=StudentResponse)
async def generate_interventions(
    student_id: str = Path(..., description="The student ID"),
    db: Session = Depends(get_db)
):
    """
    Generate intervention recommendations for a student
    """
    # Find the student in database
    student_db = db.query(models.Student).filter(models.Student.student_id == student_id).first()
    if not student_db:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Process student data through analytics engine
    analytics_engine = StudentAnalyticsEngine()
    student_data = analytics_engine.process_student(student_db)
    
    # Generate interventions
    pass_analysis = student_data.pass_analysis if student_data.pass_analysis.available else None
    cat4_analysis = student_data.cat4_analysis if student_data.cat4_analysis.available else None
    academic_analysis = student_data.academic_analysis if student_data.academic_analysis.available else None
    is_fragile_learner = student_data.is_fragile_learner
    
    # Generate standard interventions
    interventions = analytics_engine.generateInterventions(
        pass_analysis, cat4_analysis, academic_analysis, is_fragile_learner
    )
    
    # Generate compound interventions
    compound_interventions = analytics_engine.generateCompoundInterventions(
        pass_analysis, cat4_analysis, academic_analysis, is_fragile_learner
    )
    
    # Update student data
    student_data.interventions = interventions
    student_data.compoundInterventions = compound_interventions
    
    # Save interventions to database
    for intervention in interventions:
        # Check if intervention already exists
        existing = db.query(models.Intervention).filter(
            models.Intervention.student_id == student_db.id,
            models.Intervention.title == intervention.title,
            models.Intervention.domain == intervention.domain,
            models.Intervention.factor == intervention.factor
        ).first()
        
        if not existing:
            new_intervention = models.Intervention(
                student_id=student_db.id,
                domain=intervention.domain,
                factor=intervention.factor,
                title=intervention.title,
                description=intervention.description,
                priority=intervention.priority,
                is_compound=False
            )
            db.add(new_intervention)
    
    # Save compound interventions to database
    for intervention in compound_interventions:
        # Check if intervention already exists
        existing = db.query(models.Intervention).filter(
            models.Intervention.student_id == student_db.id,
            models.Intervention.title == intervention.title,
            models.Intervention.domain == intervention.domain,
            models.Intervention.factor == intervention.factor
        ).first()
        
        if not existing:
            new_intervention = models.Intervention(
                student_id=student_db.id,
                domain=intervention.domain,
                factor=intervention.factor,
                title=intervention.title,
                description=intervention.description,
                priority=intervention.priority,
                is_compound=True,
                impact=intervention.impact
            )
            db.add(new_intervention)
    
    db.commit()
    
    return StudentResponse(student=student_data)

@router.post("/students/{student_id}/risk-prediction", response_model=RiskPrediction)
async def generate_risk_prediction(
    student_id: str = Path(..., description="The student ID"),
    db: Session = Depends(get_db)
):
    """
    Generate risk prediction for a student
    """
    # Find the student in database
    student_db = db.query(models.Student).filter(models.Student.student_id == student_id).first()
    if not student_db:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Process student data through analytics engine
    analytics_engine = StudentAnalyticsEngine()
    student_data = analytics_engine.process_student(student_db)
    
    # Get historical data
    historical_data = get_historical_data(student_db.id, db)
    
    # Generate risk prediction
    predictive_analytics = PredictiveAnalytics()
    risk_prediction = predictive_analytics.predict_risk(student_data, historical_data)
    
    # Save prediction to database
    new_prediction = models.RiskPrediction(
        student_id=student_db.id,
        overall_risk_score=risk_prediction.overall_risk_score,
        risk_level=risk_prediction.risk_level,
        risk_factors=risk_prediction.risk_factors,
        early_indicators=risk_prediction.early_indicators,
        trend_analysis=risk_prediction.trend_analysis,
        time_to_intervention=risk_prediction.time_to_intervention,
        confidence=risk_prediction.confidence,
        recommendations=risk_prediction.recommendations
    )
    db.add(new_prediction)
    db.commit()
    
    return risk_prediction

@router.post("/students/{student_id}/progress-analysis", response_model=ProgressAnalysis)
async def generate_progress_analysis(
    student_id: str = Path(..., description="The student ID"),
    db: Session = Depends(get_db)
):
    """
    Generate progress analysis for a student
    """
    # Find the student in database
    student_db = db.query(models.Student).filter(models.Student.student_id == student_id).first()
    if not student_db:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Process student data through analytics engine
    analytics_engine = StudentAnalyticsEngine()
    student_data = analytics_engine.process_student(student_db)
    
    # Get previous data snapshot
    previous_data = get_latest_historical_data(student_db.id, db)
    if not previous_data:
        raise HTTPException(status_code=404, detail="No previous data available for progress analysis")
    
    # Generate progress analysis
    progress_tracker = ProgressTracker()
    progress_analysis = progress_tracker.track_progress(student_data, previous_data)
    
    # Save analysis to database
    new_analysis = models.ProgressAnalysis(
        student_id=student_db.id,
        has_baseline=progress_analysis.hasBaseline,
        pass_analysis=progress_analysis.pass_analysis,
        cat4_analysis=progress_analysis.cat4_analysis,
        academic_analysis=progress_analysis.academic_analysis,
        intervention_effectiveness=progress_analysis.intervention_effectiveness,
        improvement_areas=progress_analysis.improvement_areas,
        concern_areas=progress_analysis.concern_areas,
        summary=progress_analysis.summary
    )
    db.add(new_analysis)
    db.commit()
    
    return progress_analysis

@router.post("/students/{student_id}/save-snapshot")
async def save_historical_snapshot(
    student_id: str = Path(..., description="The student ID"),
    reason: str = Query("Regular Update", description="Reason for taking snapshot"),
    db: Session = Depends(get_db)
):
    """
    Save a snapshot of current student data for historical tracking
    """
    # Find the student in database
    student_db = db.query(models.Student).filter(models.Student.student_id == student_id).first()
    if not student_db:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Process student data through analytics engine
    analytics_engine = StudentAnalyticsEngine()
    student_data = analytics_engine.process_student(student_db)
    
    # Extract data components
    pass_data = student_data.pass_analysis if student_data.pass_analysis.available else None
    cat4_data = student_data.cat4_analysis if student_data.cat4_analysis.available else None
    academic_data = student_data.academic_analysis if student_data.academic_analysis.available else None
    interventions_data = student_data.interventions if student_data.interventions else []
    
    # Save snapshot to database
    new_snapshot = models.HistoricalStudentSnapshot(
        student_id=student_db.id,
        snapshot_reason=reason,
        student_data=student_data.dict(),
        pass_data=pass_data.dict() if pass_data else None,
        cat4_data=cat4_data.dict() if cat4_data else None,
        academic_data=academic_data.dict() if academic_data else None,
        interventions_data=[i.dict() for i in interventions_data]
    )
    db.add(new_snapshot)
    db.commit()
    
    return {"message": "Snapshot saved successfully"}

# Helper Functions

def get_latest_historical_data(student_id, db):
    """
    Get the latest historical snapshot for a student
    """
    snapshot = db.query(models.HistoricalStudentSnapshot).filter(
        models.HistoricalStudentSnapshot.student_id == student_id
    ).order_by(models.HistoricalStudentSnapshot.snapshot_date.desc()).first()
    
    if snapshot:
        return snapshot.student_data
    
    return None

def get_historical_data(student_id, db, limit=5):
    """
    Get historical snapshots for a student
    """
    snapshots = db.query(models.HistoricalStudentSnapshot).filter(
        models.HistoricalStudentSnapshot.student_id == student_id
    ).order_by(models.HistoricalStudentSnapshot.snapshot_date.desc()).limit(limit).all()
    
    return [snapshot.student_data for snapshot in snapshots]

def generate_cohort_stats(db, grade=None):
    """
    Generate comprehensive cohort statistics
    """
    # This would be a complex function that queries the database
    # and calculates statistics for the entire cohort or a specific grade
    
    # For the sake of brevity, we're not implementing the full function here
    # but it would query each table and aggregate the data as needed
    
    # Example of the basic structure:
    
    # Base query for students
    query = db.query(models.Student)
    if grade is not None:
        query = query.filter(models.Student.grade == grade)
    
    students = query.all()
    
    # Calculate various statistics
    total_students = len(students)
    
    # Grade distribution
    grades = {}
    for student in students:
        if student.grade in grades:
            grades[student.grade] += 1
        else:
            grades[student.grade] = 1
    
    # Risk level distribution (more complex, would use joins)
    risk_levels = {
        "high": 0,
        "medium": 0,
        "borderline": 0,
        "low": 0
    }
    
    # Get latest risk prediction for each student
    for student in students:
        latest_prediction = db.query(models.RiskPrediction).filter(
            models.RiskPrediction.student_id == student.id
        ).order_by(models.RiskPrediction.prediction_date.desc()).first()
        
        if latest_prediction and latest_prediction.risk_level in risk_levels:
            risk_levels[latest_prediction.risk_level] += 1
    
    # Count fragile learners
    fragile_learners_count = sum(1 for student in students if student.is_fragile_learner)
    
    # The rest of the stats would be calculated in a similar manner
    
    # Create the stats object
    from app.api.models import CohortStatistics
    
    stats = CohortStatistics(
        total_students=total_students,
        grades=grades,
        riskLevels=risk_levels,
        fragileLearnersCount=fragile_learners_count,
        passRiskFactors={},  # Would be populated in the full implementation
        cat4WeaknessAreas={},  # Would be populated in the full implementation
        academicWeaknesses={},  # Would be populated in the full implementation
        interventionsByDomain={}  # Would be populated in the full implementation
    )
    
    return stats