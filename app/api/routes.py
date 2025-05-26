# app/api/routes.py - Complete Corrected Version
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
from fastapi.encoders import jsonable_encoder
from datetime import datetime
import pandas as pd
from io import BytesIO

# Database imports
from app.database.database import get_db
from app.database import models
from app.api.models import (
    StudentData, StudentsListResponse, CohortStatsResponse,
    StudentResponse, ProgressAnalysis, RiskPrediction,
    CohortStatistics as CohortStatsModel,
    PassAnalysis, Cat4Analysis, AcademicAnalysis
)

router = APIRouter()

# UPLOAD ROUTES
@router.post("/upload/asset")
async def upload_asset_data(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Upload Asset (academic performance) data"""
    try:
        print(f"Processing Asset file: {file.filename}")
        contents = await file.read()
        df = pd.read_excel(BytesIO(contents))
        print("Asset columns:", df.columns.tolist())
        
        students_processed = 0
        for index, row in df.iterrows():
            # Use actual Excel column names
            student_id = str(row.get('Student ID', ''))
            name = str(row.get('Name', ''))
            grade = row.get('Grade', 9)
            section = str(row.get('Section', ''))
            
            if not student_id or student_id == 'nan':
                continue
                
            # Create or find student
            student_db = db.query(models.Student).filter(
                models.Student.student_id == student_id
            ).first()
            
            if not student_db:
                student_db = models.Student(
                    student_id=student_id,
                    name=name,
                    grade=int(grade) if pd.notna(grade) else 9,
                    section=section if section != 'nan' else None
                )
                db.add(student_db)
                db.flush()
                print(f"Created student: {student_id} - {name}")
            
            # Create AcademicAssessment
            existing_assessment = db.query(models.AcademicAssessment).filter(
                models.AcademicAssessment.student_id == student_db.id
            ).first()
            
            if not existing_assessment:
                academic_assessment = models.AcademicAssessment(
                    student_id=student_db.id,
                    term="Current"
                )
                db.add(academic_assessment)
                db.flush()
                
                # Add subjects based on actual Excel columns
                subjects = [
                    {
                        'name': 'English',
                        'internal_marks': row.get('Internal Marks - English', 0),
                        'internal_stanine': row.get('Internal Stanine - English', 0),
                        'asset_stanine': row.get('Asset Stanine - English', 0),
                        'comparison': row.get('Compare', '')
                    },
                    {
                        'name': 'Maths',
                        'internal_marks': row.get('Internal Marks - Maths', 0),
                        'internal_stanine': row.get('Internal Stanine - Maths', 0),
                        'asset_stanine': row.get('Asset Stanine- Maths', 0),
                        'comparison': row.get('Compare.1', '')
                    },
                    {
                        'name': 'Science',
                        'internal_marks': row.get('Internal Marks - Science', 0),
                        'internal_stanine': row.get('Internal Stanine - Science', 0),
                        'asset_stanine': row.get('Asset Stanine - Science', 0),
                        'comparison': row.get('Compare.2', '')
                    }
                ]
                
                for subject in subjects:
                    if pd.notna(subject['internal_marks']) and float(subject['internal_marks']) > 0:
                        stanine = float(subject['internal_stanine']) if pd.notna(subject['internal_stanine']) else 5
                        
                        # Determine level
                        if stanine <= 3:
                            level = "weakness"
                        elif stanine >= 7:
                            level = "strength"
                        else:
                            level = "balanced"
                            
                        academic_subject = models.AcademicSubject(
                            assessment_id=academic_assessment.id,
                            name=subject['name'],
                            stanine=stanine,
                            percentile=0,  # Not provided in Excel
                            level=level,
                            comparison=str(subject['comparison']) if pd.notna(subject['comparison']) else ""
                        )
                        db.add(academic_subject)
                
                students_processed += 1
        
        db.commit()
        print(f"Asset processing complete: {students_processed} students")
        return {"message": f"Asset data processed! {students_processed} students."}
        
    except Exception as e:
        db.rollback()
        print(f"Asset error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/upload/cat4")
async def upload_cat4_data(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Upload CAT4 data"""
    try:
        print(f"Processing CAT4 file: {file.filename}")
        contents = await file.read()
        df = pd.read_excel(BytesIO(contents))
        print("CAT4 columns:", df.columns.tolist())
        
        students_processed = 0
        for index, row in df.iterrows():
            student_id = str(row.get('Student ID', ''))
            
            if not student_id or student_id == 'nan':
                continue
                
            student_db = db.query(models.Student).filter(
                models.Student.student_id == student_id
            ).first()
            
            if not student_db:
                print(f"Student {student_id} not found for CAT4 data")
                continue
                
            existing = db.query(models.CAT4Assessment).filter(
                models.CAT4Assessment.student_id == student_db.id
            ).first()
            
            if not existing:
                # Get stanine values from Excel
                verbal_stanine = row.get('Verbal SAS', 0)
                quantitative_stanine = row.get('Quantitative SAS', 0) 
                nonverbal_stanine = row.get('Non-verbal SAS', 0)
                spatial_stanine = row.get('Spatial SAS', 0)
                mean_sas = row.get('Mean SAS', 0)
                
                # Calculate if fragile learner (stanine <= 3 in multiple areas)
                stanines = [verbal_stanine, quantitative_stanine, nonverbal_stanine, spatial_stanine]
                weak_areas = sum(1 for s in stanines if pd.notna(s) and float(s) <= 3)
                is_fragile = weak_areas >= 2
                
                cat4_assessment = models.CAT4Assessment(
                    student_id=student_db.id,
                    is_fragile_learner=is_fragile,
                    average_stanine=float(mean_sas) if pd.notna(mean_sas) else 0
                )
                db.add(cat4_assessment)
                db.flush()
                
                # Add domains
                domains = [
                    {
                        'name': 'Verbal',
                        'stanine': float(verbal_stanine) if pd.notna(verbal_stanine) else 0
                    },
                    {
                        'name': 'Quantitative', 
                        'stanine': float(quantitative_stanine) if pd.notna(quantitative_stanine) else 0
                    },
                    {
                        'name': 'Non-verbal',
                        'stanine': float(nonverbal_stanine) if pd.notna(nonverbal_stanine) else 0
                    },
                    {
                        'name': 'Spatial',
                        'stanine': float(spatial_stanine) if pd.notna(spatial_stanine) else 0
                    }
                ]
                
                for domain in domains:
                    if domain['stanine'] > 0:
                        # Determine level
                        if domain['stanine'] <= 3:
                            level = "weakness"
                        elif domain['stanine'] >= 7:
                            level = "strength"
                        else:
                            level = "balanced"
                            
                        cat4_domain = models.CAT4Domain(
                            assessment_id=cat4_assessment.id,
                            name=domain['name'],
                            stanine=domain['stanine'],
                            level=level
                        )
                        db.add(cat4_domain)
                
                # Update student fragile learner status
                student_db.is_fragile_learner = is_fragile
                students_processed += 1
        
        db.commit()
        print(f"CAT4 processing complete: {students_processed} students")
        return {"message": f"CAT4 data processed! {students_processed} students."}
        
    except Exception as e:
        db.rollback()
        print(f"CAT4 error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/upload/pass")
async def upload_pass_data(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Upload PASS data"""
    try:
        print(f"Processing PASS file: {file.filename}")
        contents = await file.read()
        df = pd.read_excel(BytesIO(contents))
        print("PASS columns:", df.columns.tolist())
        
        students_processed = 0
        for index, row in df.iterrows():
            student_id = str(row.get('Student ID', ''))
            
            if not student_id or student_id == 'nan':
                continue
                
            student_db = db.query(models.Student).filter(
                models.Student.student_id == student_id
            ).first()
            
            if not student_db:
                print(f"Student {student_id} not found for PASS data")
                continue
                
            existing = db.query(models.PassAssessment).filter(
                models.PassAssessment.student_id == student_db.id
            ).first()
            
            if not existing:
                # Get percentile values from actual Excel columns
                perceived_learning = row.get('Perceived learning capability', 0)
                self_regard = row.get('Self-regard as a learner', 0)
                preparedness = row.get('Preparedness for learning', 0)
                general_work_ethic = row.get('General work ethic', 0)
                confidence = row.get('Confidence in learning', 0)
                feelings = row.get('Feelings about school', 0)
                attitudes_teachers = row.get('Attitudes to teachers', 0)
                attitudes_attendance = row.get('Attitudes to attendance', 0)
                response_curriculum = row.get('Response to curriculum demands', 0)
                
                # Calculate average
                values = [perceived_learning, self_regard, preparedness, general_work_ethic, 
                         confidence, feelings, attitudes_teachers, attitudes_attendance, response_curriculum]
                valid_values = [float(v) for v in values if pd.notna(v) and v != 0]
                avg_percentile = sum(valid_values) / len(valid_values) if valid_values else 0
                
                pass_assessment = models.PassAssessment(
                    student_id=student_db.id,
                    average_percentile=avg_percentile
                )
                db.add(pass_assessment)
                db.flush()
                
                # Add factors
                factors = [
                    {'name': 'Perceived Learning Capability', 'percentile': perceived_learning},
                    {'name': 'Self-regard as a Learner', 'percentile': self_regard},
                    {'name': 'Preparedness for Learning', 'percentile': preparedness},
                    {'name': 'General Work Ethic', 'percentile': general_work_ethic},
                    {'name': 'Confidence in Learning', 'percentile': confidence},
                    {'name': 'Feelings about School', 'percentile': feelings},
                    {'name': 'Attitudes to Teachers', 'percentile': attitudes_teachers},
                    {'name': 'Attitudes to Attendance', 'percentile': attitudes_attendance},
                    {'name': 'Response to Curriculum', 'percentile': response_curriculum}
                ]
                
                for factor in factors:
                    if pd.notna(factor['percentile']) and factor['percentile'] > 0:
                        percentile = float(factor['percentile'])
                        
                        # Determine level
                        if percentile <= 25:
                            level = "at-risk"
                        elif percentile >= 75:
                            level = "strength"
                        else:
                            level = "balanced"
                            
                        pass_factor = models.PassFactor(
                            assessment_id=pass_assessment.id,
                            name=factor['name'],
                            percentile=percentile,
                            level=level
                        )
                        db.add(pass_factor)
                
                students_processed += 1
        
        db.commit()
        print(f"PASS processing complete: {students_processed} students")
        return {"message": f"PASS data processed! {students_processed} students."}
        
    except Exception as e:
        db.rollback()
        print(f"PASS error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(e))

# API ROUTES
@router.get("/students", response_model=StudentsListResponse)
async def get_students(db: Session = Depends(get_db)):
    """Get all students"""
    try:
        students_db = db.query(models.Student).limit(100).all()
        print(f"Found {len(students_db)} students in database")
        
        students_list = []
        for student_db in students_db:
            # Create default analysis objects
            pass_analysis = PassAnalysis(available=False)
            cat4_analysis = Cat4Analysis(available=False)
            academic_analysis = AcademicAnalysis(available=False)
            
            student_data = StudentData(
                student_id=student_db.student_id,
                name=student_db.name,
                grade=student_db.grade,
                section=student_db.section,
                is_fragile_learner=student_db.is_fragile_learner or False,
                pass_analysis=pass_analysis,
                cat4_analysis=cat4_analysis,
                academic_analysis=academic_analysis,
                interventions=[],
                compoundInterventions=[],
                progressAnalysis=None,
                riskPrediction=None
            )
            students_list.append(student_data)
        
        return StudentsListResponse(
            students=students_list,
            total_count=len(students_list)
        )
        
    except Exception as e:
        print(f"Error getting students: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stats/cohort", response_model=CohortStatsResponse)
def get_cohort_stats(db: Session = Depends(get_db)):
    """Get cohort statistics"""
    try:
        student_count = db.query(models.Student).count()
        print(f"Found {student_count} students in database")
        
        # Get basic stats
        students = db.query(models.Student).all()
        
        # Grade distribution
        grades = {}
        fragile_count = 0
        for student in students:
            grade_key = str(student.grade)
            grades[grade_key] = grades.get(grade_key, 0) + 1
            if student.is_fragile_learner:
                fragile_count += 1
        
        # Convert grade keys to integers for frontend
        grades_int = {}
        for grade_str, count in grades.items():
            try:
                grades_int[int(grade_str)] = count
            except:
                grades_int[grade_str] = count
        
        stats = CohortStatsModel(
            total_students=student_count,
            grades=grades_int,
            riskLevels={"high": 0, "medium": 0, "borderline": 0, "low": 0},
            fragileLearnersCount=fragile_count,
            passRiskFactors={},
            cat4WeaknessAreas={},
            academicWeaknesses={},
            interventionsByDomain={}
        )
        
        return CohortStatsResponse(stats=stats)
        
    except Exception as e:
        print(f"Error getting cohort stats: {str(e)}")
        import traceback
        traceback.print_exc()
        # Return empty stats on error
        default_stats = CohortStatsModel(
            total_students=0,
            grades={},
            riskLevels={},
            fragileLearnersCount=0,
            passRiskFactors={},
            cat4WeaknessAreas={},
            academicWeaknesses={},
            interventionsByDomain={}
        )
        return CohortStatsResponse(stats=default_stats)