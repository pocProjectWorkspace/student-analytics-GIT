"""
API Routes for Student Analytics PoC
-----------------------------------
This module defines the API endpoints for the Student Analytics application.
"""

import os
import tempfile
import shutil
from typing import List, Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse, FileResponse
from pydantic import BaseModel

# Import the analytics engine
from engine.analytics import StudentAnalyticsEngine
from reports.generator import StudentReportGenerator

# Create router
router = APIRouter(tags=["Student Analytics"])

# Initialize analytics engine
analytics_engine = StudentAnalyticsEngine()

# Define data models for API responses
class StudentSummary(BaseModel):
    student_id: str
    name: str
    grade: str
    risk_count: int
    risk_areas: List[dict]
    intervention_count: int

class GradeSummary(BaseModel):
    total_students: int
    at_risk_count: int
    fragile_learners_count: int
    academic_concerns_count: int

class UploadResponse(BaseModel):
    status: str
    message: str
    students_processed: int
    session_id: str

# In-memory storage for session data (replace with database in production)
session_data = {}

# API Endpoints
@router.post("/upload", response_model=UploadResponse)
async def upload_files(
    background_tasks: BackgroundTasks,
    pass_file: Optional[UploadFile] = File(None),
    cat4_file: Optional[UploadFile] = File(None),
    academic_file: Optional[UploadFile] = File(None)
):
    """
    Upload and process student data files.
    At least one file must be provided.
    """
    # Validate input
    if not any([pass_file, cat4_file, academic_file]):
        raise HTTPException(status_code=400, detail="At least one file must be provided")
    
    # Create temporary directory for files
    temp_dir = tempfile.mkdtemp()
    temp_files = {}
    
    try:
        # Save uploaded files
        for name, file_obj in [("pass_file", pass_file), ("cat4_file", cat4_file), ("academic_file", academic_file)]:
            if file_obj:
                file_path = os.path.join(temp_dir, file_obj.filename)
                with open(file_path, "wb") as f:
                    content = await file_obj.read()
                    f.write(content)
                temp_files[name] = file_path
        
        # Process files with analytics engine
        results = analytics_engine.process_student_files(
            temp_files.get("pass_file"),
            temp_files.get("cat4_file"),
            temp_files.get("academic_file")
        )
        
        # Generate a session ID
        import uuid
        session_id = str(uuid.uuid4())
        
        # Store results in session data (would be database in production)
        session_data[session_id] = results
        
        # Schedule cleanup of temporary files (in background)
        background_tasks.add_task(shutil.rmtree, temp_dir)
        
        return {
            "status": "success",
            "message": "Files processed successfully",
            "students_processed": len(results["students"]),
            "session_id": session_id
        }
        
    except Exception as e:
        # Clean up temp files in case of error
        shutil.rmtree(temp_dir)
        raise HTTPException(status_code=500, detail=f"Error processing files: {str(e)}")

@router.get("/grades/{grade_id}")
async def get_grade_data(grade_id: str, session_id: str):
    """
    Get grade-level analytics data.
    Use 'all' as grade_id to get data for all grades.
    """
    # Check if session exists
    if session_id not in session_data:
        raise HTTPException(status_code=404, detail="Session not found")
    
    results = session_data[session_id]
    
    # If no grade level data is available yet
    if not results.get("grade_level_summary"):
        raise HTTPException(status_code=404, detail="No grade data available")
    
    # Get data for specified grade
    if grade_id != "all" and grade_id not in results["grade_level_summary"]:
        raise HTTPException(status_code=404, detail=f"Grade {grade_id} not found")
    
    # Filter students by grade if needed
    filtered_students = results["students"]
    if grade_id != "all":
        filtered_students = [s for s in results["students"] if s["grade"] == grade_id]
    
    # Prepare at-risk students list
    at_risk_students = []
    for student in filtered_students:
        # Consider a student at risk if they have any risk areas or are a fragile learner
        pass_risks = len(student["pass_analysis"].get("risk_areas", [])) if student["pass_analysis"].get("available", False) else 0
        cat4_risks = len(student["cat4_analysis"].get("weakness_areas", [])) if student["cat4_analysis"].get("available", False) else 0
        is_fragile = student["cat4_analysis"].get("is_fragile_learner", False) if student["cat4_analysis"].get("available", False) else False
        
        total_risks = pass_risks + cat4_risks + (1 if is_fragile else 0)
        
        if total_risks > 0:
            # Collect risk areas
            risk_areas = []
            if student["pass_analysis"].get("available", False):
                for risk in student["pass_analysis"].get("risk_areas", []):
                    risk_areas.append({
                        "factor": risk["factor"].replace("_", " "),
                        "level": "at risk"
                    })
            
            if student["cat4_analysis"].get("available", False):
                for weakness in student["cat4_analysis"].get("weakness_areas", []):
                    risk_areas.append({
                        "factor": weakness["domain"].replace("_", " "),
                        "level": "weakness"
                    })
                
                if is_fragile:
                    risk_areas.append({
                        "factor": "Fragile Learner",
                        "level": "high"
                    })
            
            at_risk_students.append({
                "id": student["student_id"],
                "name": student["name"],
                "risk_count": total_risks,
                "risk_areas": risk_areas,
                "intervention_count": len(student["interventions"])
            })
    
    # Sort at-risk students by risk count (highest first)
    at_risk_students.sort(key=lambda s: s["risk_count"], reverse=True)
    
    # Get summary for the specified grade
    if grade_id == "all":
        # Aggregate across all grades
        summary = {
            "total_students": len(filtered_students),
            "at_risk_count": len(at_risk_students),
            "fragile_learners_count": sum(1 for s in filtered_students if s["cat4_analysis"].get("is_fragile_learner", False) if s["cat4_analysis"].get("available", False)),
            "academic_concerns_count": sum(1 for s in filtered_students if any(subj["level"] == "Weakness" for subj in s["academic_analysis"].get("subjects", {}).values()) if s["academic_analysis"].get("available", False))
        }
    else:
        # Use the specified grade summary
        grade_summary = results["grade_level_summary"][grade_id]
        summary = {
            "total_students": grade_summary["total_students"],
            "at_risk_count": grade_summary["students_with_risk"],
            "fragile_learners_count": grade_summary["fragile_learners"],
            "academic_concerns_count": sum(1 for s in filtered_students if any(subj["level"] == "Weakness" for subj in s["academic_analysis"].get("subjects", {}).values()) if s["academic_analysis"].get("available", False))
        }
    
    # Create risk heatmap data
    risk_data = []
    for student in filtered_students:
        risk_count = 0
        if student["pass_analysis"].get("available", False):
            risk_count += len(student["pass_analysis"].get("risk_areas", []))
        if student["cat4_analysis"].get("available", False):
            risk_count += len(student["cat4_analysis"].get("weakness_areas", []))
            if student["cat4_analysis"].get("is_fragile_learner", False):
                risk_count += 1
        
        # Extract section/class from student data if available (or use default)
        section = student.get("section", "Class A")  # Default to Class A if not specified
        
        risk_data.append({
            "id": student["student_id"],
            "name": student["name"],
            "section": section,
            "riskCount": risk_count
        })
    
    # Get available grades
    available_grades = list(set(s["grade"] for s in results["students"]))
    
    # Prepare PASS average data (if available)
    average_pass_data = None
    if any(s["pass_analysis"].get("available", False) for s in filtered_students):
        # Collect all PASS factors
        all_factors = {}
        for student in filtered_students:
            if student["pass_analysis"].get("available", False):
                for factor, data in student["pass_analysis"].get("factors", {}).items():
                    if factor not in all_factors:
                        all_factors[factor] = []
                    all_factors[factor].append(data["percentile"])
        
        # Calculate averages
        if all_factors:
            average_pass_data = {
                "factors": {}
            }
            for factor, values in all_factors.items():
                average_pass_data["factors"][factor] = {
                    "percentile": sum(values) / len(values),
                    "risk_level": "Balanced"  # Simplification - could be more sophisticated
                }
    
    # Prepare cognitive distribution data (if available)
    cognitive_distribution = None
    if any(s["cat4_analysis"].get("available", False) for s in filtered_students):
        cognitive_distribution = {
            "domains": {},
            "fragile_learner_percentage": 0
        }
        
        # Count students with CAT4 data
        cat4_students = [s for s in filtered_students if s["cat4_analysis"].get("available", False)]
        if cat4_students:
            # Calculate fragile learner percentage
            fragile_count = sum(1 for s in cat4_students if s["cat4_analysis"].get("is_fragile_learner", False))
            cognitive_distribution["fragile_learner_percentage"] = (fragile_count / len(cat4_students)) * 100
            
            # Collect domain levels
            for domain in ["Verbal_Reasoning", "Quantitative_Reasoning", "Nonverbal_Reasoning", "Spatial_Reasoning"]:
                levels = {"Weakness": 0, "Average": 0, "Strength": 0}
                for student in cat4_students:
                    if domain in student["cat4_analysis"].get("domains", {}):
                        levels[student["cat4_analysis"]["domains"][domain]["level"]] += 1
                
                # Convert to percentages
                cognitive_distribution["domains"][domain] = {
                    "name": domain.replace("_", " "),
                    "weakness_percentage": (levels["Weakness"] / len(cat4_students)) * 100,
                    "average_percentage": (levels["Average"] / len(cat4_students)) * 100,
                    "strength_percentage": (levels["Strength"] / len(cat4_students)) * 100
                }
    
    # Prepare academic performance data (if available)
    academic_performance = None
    if any(s["academic_analysis"].get("available", False) for s in filtered_students):
        academic_performance = {
            "subjects": {}
        }
        
        # Collect all subjects
        all_subjects = set()
        for student in filtered_students:
            if student["academic_analysis"].get("available", False):
                all_subjects.update(student["academic_analysis"].get("subjects", {}).keys())
        
        # Calculate subject averages
        for subject in all_subjects:
            subject_marks = []
            for student in filtered_students:
                if student["academic_analysis"].get("available", False) and subject in student["academic_analysis"].get("subjects", {}):
                    subject_marks.append(student["academic_analysis"]["subjects"][subject]["stanine"])
            
            if subject_marks:
                academic_performance["subjects"][subject] = {
                    "name": subject,
                    "average": sum(subject_marks) / len(subject_marks),
                    "distribution": {
                        "weakness": sum(1 for m in subject_marks if m <= 3) / len(subject_marks) * 100,
                        "average": sum(1 for m in subject_marks if 4 <= m <= 6) / len(subject_marks) * 100,
                        "strength": sum(1 for m in subject_marks if m >= 7) / len(subject_marks) * 100
                    }
                }
    
    # Return the complete dashboard data
    return {
        "summary": summary,
        "riskData": risk_data,
        "atRiskStudents": at_risk_students,
        "averagePassData": average_pass_data,
        "cognitiveDistribution": cognitive_distribution,
        "academicPerformance": academic_performance,
        "availableGrades": available_grades
    }

@router.get("/students/{student_id}")
async def get_student_data(student_id: str, session_id: str):
    """
    Get detailed analytics data for a specific student.
    """
    # Check if session exists
    if session_id not in session_data:
        raise HTTPException(status_code=404, detail="Session not found")
    
    results = session_data[session_id]
    
    # Find the student in the results
    student = next((s for s in results["students"] if s["student_id"] == student_id), None)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Return the student data directly (it's already in the right format)
    return student

@router.get("/students/{student_id}/report")
async def get_student_report(student_id: str, session_id: str, background_tasks: BackgroundTasks):
    """
    Generate and download a PDF report for a student.
    """
    # Check if session exists
    if session_id not in session_data:
        raise HTTPException(status_code=404, detail="Session not found")
    
    results = session_data[session_id]
    
    # Find the student in the results
    student = next((s for s in results["students"] if s["student_id"] == student_id), None)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    try:
        # Generate the PDF report
        report_generator = StudentReportGenerator()
        pdf_bytes = report_generator.generate_report(student)
        
        # Create a temporary file for the PDF
        fd, temp_path = tempfile.mkstemp(suffix=".pdf")
        with os.fdopen(fd, 'wb') as f:
            f.write(pdf_bytes)
        
        # Schedule removal of the temp file after it's served
        background_tasks.add_task(os.unlink, temp_path)
        
        # Return the file as a download
        return FileResponse(
            temp_path,
            media_type="application/pdf",
            filename=f"Student_Report_{student['name'].replace(' ', '_')}.pdf"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating report: {str(e)}")

@router.get("/sample-data")
async def get_sample_data():
    """
    Get links to sample data files for testing.
    """
    # In a real application, these would be actual files stored in a static directory
    # For the PoC, we'll just return dummy links
    return {
        "sample_files": {
            "pass": "/static/samples/pass_sample.csv",
            "cat4": "/static/samples/cat4_sample.csv",
            "academic": "/static/samples/academic_sample.csv"
        },
        "file_formats": {
            "pass_format": "Student ID, Name, Grade, Self-Regard, Attitude_Teachers, General_Work_Ethic, ...",
            "cat4_format": "Student ID, Name, Verbal_Reasoning, Quantitative_Reasoning, Nonverbal_Reasoning, Spatial_Reasoning",
            "academic_format": "Student ID, Name, English_Marks, Math_Marks, Science_Marks, Humanities_Marks"
        }
    }