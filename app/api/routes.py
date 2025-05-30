# app/api/routes.py - Clean, complete version with fixed syntax
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

# Import the corrected analytics engine
from app.engine.triangulated_analytics import TriangulatedAnalyticsEngine

router = APIRouter()

# Initialize the analytics engine
analytics_engine = TriangulatedAnalyticsEngine()

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
            student_id = str(row.get('Student ID', ''))
            name = str(row.get('Name', ''))
            grade = row.get('Grade', 9)
            section = str(row.get('Section', ''))
            
            if not student_id or student_id == 'nan':
                continue
                
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
                        
                        if stanine >= 7:
                            level = "strength"
                        elif stanine >= 4:
                            level = "balanced"
                        else:
                            level = "weakness"
                            
                        academic_subject = models.AcademicSubject(
                            assessment_id=academic_assessment.id,
                            name=subject['name'],
                            stanine=stanine,
                            percentile=0,
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
                verbal_sas = row.get('Verbal SAS', 0)
                quantitative_sas = row.get('Quantitative SAS', 0)
                nonverbal_sas = row.get('Non-verbal SAS', 0)
                spatial_sas = row.get('Spatial SAS', 0)
                mean_sas = row.get('Mean SAS', 0)
                
                sas_scores = [verbal_sas, quantitative_sas, nonverbal_sas, spatial_sas]
                fragile_flags = sum(1 for sas in sas_scores if pd.notna(sas) and float(sas) < 90)
                is_fragile = fragile_flags >= 2
                
                cat4_assessment = models.CAT4Assessment(
                    student_id=student_db.id,
                    is_fragile_learner=is_fragile,
                    average_stanine=analytics_engine._sas_to_stanine(float(mean_sas)) if pd.notna(mean_sas) else 0,
                    fragile_flags=fragile_flags
                )
                db.add(cat4_assessment)
                db.flush()
                
                domains = [
                    {'name': 'Verbal', 'sas': float(verbal_sas) if pd.notna(verbal_sas) else 0},
                    {'name': 'Quantitative', 'sas': float(quantitative_sas) if pd.notna(quantitative_sas) else 0},
                    {'name': 'Non-verbal', 'sas': float(nonverbal_sas) if pd.notna(nonverbal_sas) else 0},
                    {'name': 'Spatial', 'sas': float(spatial_sas) if pd.notna(spatial_sas) else 0}
                ]
                
                for domain in domains:
                    if domain['sas'] > 0:
                        sas_score = domain['sas']
                        stanine = analytics_engine._sas_to_stanine(sas_score)
                        
                        if sas_score > 110:
                            level = "strength"
                        elif sas_score >= 90:
                            level = "balanced"
                        else:
                            level = "weakness"
                            
                        cat4_domain = models.CAT4Domain(
                            assessment_id=cat4_assessment.id,
                            name=domain['name'],
                            stanine=stanine,
                            level=level,
                            sas_score=sas_score
                        )
                        db.add(cat4_domain)
                        print(f"Added CAT4 domain: {domain['name']} - SAS {sas_score} - {level}")  # Debug
                
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
                perceived_learning = row.get('Perceived learning capability', 0)
                self_regard = row.get('Self-regard as a learner', 0)
                preparedness = row.get('Preparedness for learning', 0)
                general_work_ethic = row.get('General work ethic', 0)
                confidence = row.get('Confidence in learning', 0)
                feelings = row.get('Feelings about school', 0)
                attitudes_teachers = row.get('Attitudes to teachers', 0)
                attitudes_attendance = row.get('Attitudes to attendance', 0)
                response_curriculum = row.get('Response to curriculum demands', 0)
                
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
                        
                        if percentile >= 65:
                            level = "strength"
                        elif percentile >= 45:
                            level = "balanced"
                        else:
                            level = "at-risk"
                            
                        p_number = analytics_engine.pass_p_mapping.get(factor['name'], 'Unknown')
                            
                        pass_factor = models.PassFactor(
                            assessment_id=pass_assessment.id,
                            name=factor['name'],
                            percentile=percentile,
                            level=level,
                            p_number=p_number
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
    """Get all students with corrected triangulated analytics"""
    try:
        students_db = db.query(models.Student).all()
        print(f"Found {len(students_db)} students in database")
        
        students_list = []
        for student_db in students_db:
            analysis_result = analytics_engine.process_student_data(student_db, db)
            
            # Ensure we always have the expected structure
            pass_analysis = PassAnalysis(
                available=analysis_result['pass_analysis']['available'],
                factors=analysis_result['pass_analysis'].get('factors', []),
                riskAreas=analysis_result['pass_analysis'].get('riskAreas', []),
                strengthAreas=analysis_result['pass_analysis'].get('strengthAreas', []),
                averagePercentile=analysis_result['pass_analysis'].get('averagePercentile', 0)
            )
            
            cat4_analysis = Cat4Analysis(
                available=analysis_result['cat4_analysis']['available'],
                domains=analysis_result['cat4_analysis'].get('domains', []),
                weaknessAreas=analysis_result['cat4_analysis'].get('weaknessAreas', []),
                learningPreferences=[],
                is_fragile_learner=analysis_result['is_fragile_learner'],
                averageStanine=None
            )
            
            academic_analysis = AcademicAnalysis(
                available=analysis_result['academic_analysis']['available'],
                subjects=analysis_result['academic_analysis'].get('subjects', []),
                averageStanine=analysis_result['academic_analysis'].get('averageStanine')
            )
            
            student_data = StudentData(
                student_id=student_db.student_id,
                name=student_db.name,
                grade=student_db.grade,
                section=student_db.section,
                is_fragile_learner=analysis_result['is_fragile_learner'],
                pass_analysis=pass_analysis,
                cat4_analysis=cat4_analysis,
                academic_analysis=academic_analysis,
                interventions=analysis_result['interventions'],
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

@router.get("/students/{student_id}", response_model=StudentResponse)
async def get_student_by_id(student_id: str, db: Session = Depends(get_db)):
    """Get individual student data by student_id"""
    try:
        student_db = db.query(models.Student).filter(
            models.Student.student_id == student_id
        ).first()
        
        if not student_db:
            raise HTTPException(status_code=404, detail="Student not found")
        
        analysis_result = analytics_engine.process_student_data(student_db, db)
        
        pass_analysis = PassAnalysis(
            available=analysis_result['pass_analysis']['available'],
            factors=analysis_result['pass_analysis'].get('factors', []),
            riskAreas=analysis_result['pass_analysis'].get('riskAreas', []),
            strengthAreas=analysis_result['pass_analysis'].get('strengthAreas', []),
            averagePercentile=None
        )
        
        cat4_analysis = Cat4Analysis(
            available=analysis_result['cat4_analysis']['available'],
            domains=analysis_result['cat4_analysis'].get('domains', []),
            weaknessAreas=analysis_result['cat4_analysis'].get('weaknessAreas', []),
            learningPreferences=[],
            is_fragile_learner=analysis_result['is_fragile_learner'],
            averageStanine=None
        )
        
        academic_analysis = AcademicAnalysis(
            available=analysis_result['academic_analysis']['available'],
            subjects=analysis_result['academic_analysis'].get('subjects', []),
            averageStanine=analysis_result['academic_analysis'].get('averageStanine')
        )
        
        student_data = StudentData(
            student_id=student_db.student_id,
            name=student_db.name,
            grade=student_db.grade,
            section=student_db.section,
            is_fragile_learner=analysis_result['is_fragile_learner'],
            pass_analysis=pass_analysis,
            cat4_analysis=cat4_analysis,
            academic_analysis=academic_analysis,
            interventions=analysis_result['interventions'],
            compoundInterventions=[],
            progressAnalysis=None,
            riskPrediction=None
        )
        
        return StudentResponse(student=student_data)
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting student {student_id}: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/students/{student_id}/progress")
async def get_student_progress(student_id: str, db: Session = Depends(get_db)):
    """Get student progress analysis"""
    try:
        student_db = db.query(models.Student).filter(
            models.Student.student_id == student_id
        ).first()
        
        if not student_db:
            raise HTTPException(status_code=404, detail="Student not found")
        
        progress_data = {
            "student_id": student_id,
            "has_baseline": True,
            "progress_summary": "Based on current data analysis",
            "improvement_areas": [],
            "concern_areas": [],
            "recommendations": [
                "Continue monitoring academic performance",
                "Maintain current intervention strategies"
            ]
        }
        
        return progress_data
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting student progress {student_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/students/{student_id}/risk-prediction")
async def get_student_risk_prediction(student_id: str, db: Session = Depends(get_db)):
    """Get student risk prediction"""
    try:
        student_db = db.query(models.Student).filter(
            models.Student.student_id == student_id
        ).first()
        
        if not student_db:
            raise HTTPException(status_code=404, detail="Student not found")
        
        analysis_result = analytics_engine.process_student_data(student_db, db)
        
        risk_factors = []
        overall_risk_score = 0.0
        
        # Add risk factors from PASS data
        if analysis_result['pass_analysis']['available']:
            pass_risks = len(analysis_result['pass_analysis'].get('riskAreas', []))
            if pass_risks > 0:
                risk_factors.append(f"{pass_risks} PASS risk factors identified")
                overall_risk_score += min(pass_risks * 0.15, 0.6)
        
        # Add risk factors from CAT4 data
        if analysis_result['cat4_analysis']['available']:
            cat4_weaknesses = len(analysis_result['cat4_analysis'].get('weaknessAreas', []))
            if cat4_weaknesses > 0:
                risk_factors.append(f"{cat4_weaknesses} CAT4 cognitive weaknesses")
                overall_risk_score += min(cat4_weaknesses * 0.2, 0.8)
        
        # Add risk factors from academic data
        if analysis_result['academic_analysis']['available']:
            academic_weaknesses = len(analysis_result['academic_analysis'].get('weaknessAreas', []))
            if academic_weaknesses > 0:
                risk_factors.append(f"{academic_weaknesses} academic subject weaknesses")
                overall_risk_score += min(academic_weaknesses * 0.1, 0.3)
        
        # Fragile learner adds significant risk
        if analysis_result['is_fragile_learner']:
            risk_factors.append("Identified as fragile learner (2+ CAT4 weaknesses)")
            overall_risk_score += 0.4
        
        overall_risk_score = min(overall_risk_score, 1.0)
        
        if overall_risk_score >= 0.7:
            risk_level = "high"
        elif overall_risk_score >= 0.4:
            risk_level = "medium"
        elif overall_risk_score >= 0.2:
            risk_level = "borderline"
        else:
            risk_level = "low"
        
        recommendations = []
        intervention_count = len(analysis_result['interventions'])
        
        if intervention_count > 0:
            recommendations.append(f"Implement {intervention_count} recommended interventions")
        
        if analysis_result['is_fragile_learner']:
            recommendations.append("Provide holistic learning support due to fragile learner status")
        
        if not risk_factors:
            recommendations.append("Continue current support and monitor progress")
        
        risk_prediction = {
            "student_id": student_id,
            "overall_risk_score": round(overall_risk_score, 2),
            "risk_level": risk_level,
            "risk_factors": risk_factors,
            "confidence": 0.85 if len(risk_factors) > 0 else 0.6,
            "time_to_intervention": "immediate" if risk_level == "high" else "soon" if risk_level == "medium" else "monitor",
            "recommendations": recommendations,
            "prediction_date": "2025-01-28",
            "early_indicators": risk_factors[:3] if risk_factors else [],
            "trend_analysis": {
                "direction": "stable",
                "confidence": 0.7,
                "factors": ["Limited historical data available"]
            }
        }
        
        return risk_prediction
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting student risk prediction {student_id}: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stats/cohort", response_model=CohortStatsResponse)
def get_cohort_stats(db: Session = Depends(get_db)):
    """Get cohort statistics with corrected analytics"""
    try:
        student_count = db.query(models.Student).count()
        print(f"Found {student_count} students in database")
        
        students = db.query(models.Student).all()
        
        grades = {}
        fragile_count = 0
        pass_risk_factors = {}
        cat4_weakness_areas = {}
        academic_weaknesses = {}
        interventions_by_domain = {}
        
        for student in students:
            analysis_result = analytics_engine.process_student_data(student, db)
            
            grade_key = str(student.grade)
            grades[grade_key] = grades.get(grade_key, 0) + 1
            
            if analysis_result['is_fragile_learner']:
                fragile_count += 1
            
            for risk_area in analysis_result['pass_analysis'].get('riskAreas', []):
                factor = risk_area['factor']
                pass_risk_factors[factor] = pass_risk_factors.get(factor, 0) + 1
            
            for weakness in analysis_result['cat4_analysis'].get('weaknessAreas', []):
                domain = weakness['domain']
                cat4_weakness_areas[domain] = cat4_weakness_areas.get(domain, 0) + 1
            
            for weakness in analysis_result['academic_analysis'].get('weaknessAreas', []):
                subject = weakness['subject']
                academic_weaknesses[subject] = academic_weaknesses.get(subject, 0) + 1
            
            for intervention in analysis_result['interventions']:
                domain = intervention['domain']
                interventions_by_domain[domain] = interventions_by_domain.get(domain, 0) + 1
        
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
            passRiskFactors=pass_risk_factors,
            cat4WeaknessAreas=cat4_weakness_areas,
            academicWeaknesses=academic_weaknesses,
            interventionsByDomain=interventions_by_domain
        )
        
        return CohortStatsResponse(stats=stats)
        
    except Exception as e:
        print(f"Error getting cohort stats: {str(e)}")
        import traceback
        traceback.print_exc()
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
@router.get("/debug/student/{student_id}")
async def debug_student_data(student_id: str, db: Session = Depends(get_db)):
    """Debug endpoint to check student data structure"""
    try:
        student_db = db.query(models.Student).filter(
            models.Student.student_id == student_id
        ).first()
        
        if not student_db:
            return {"error": "Student not found"}
        
        # Get raw analysis result
        analysis_result = analytics_engine.process_student_data(student_db, db)
        
        # Return the raw structure for debugging
        return {
            "student_id": student_id,
            "raw_analysis": analysis_result,
            "pass_structure": {
                "available": analysis_result['pass_analysis']['available'],
                "factors_type": type(analysis_result['pass_analysis'].get('factors')).__name__,
                "factors_length": len(analysis_result['pass_analysis'].get('factors', [])),
                "factors_content": analysis_result['pass_analysis'].get('factors', [])
            }
        }
        
    except Exception as e:
        return {"error": str(e), "traceback": str(e)}

        return CohortStatsResponse(stats=default_stats)