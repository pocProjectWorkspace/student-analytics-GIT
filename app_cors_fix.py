# app_cors_fix.py
from fastapi import FastAPI, Request, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import sys

# Create a simple test app for debugging CORS
app = FastAPI(title="CORS Debug App")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for testing
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/students")
async def test_students():
    """Test endpoint that returns fake student data"""
    return {
        "students": [
            {
                "student_id": "12345",
                "name": "John Smith",
                "grade": "9",
                "section": "A",
                "pass_analysis": {
                    "available": True,
                    "factors": [
                        {"name": "self regard", "percentile": 35, "level": "at-risk"}
                    ],
                    "riskAreas": [
                        {"factor": "self regard", "percentile": 35, "level": "at-risk"}
                    ]
                },
                "cat4_analysis": {
                    "available": True,
                    "domains": [
                        {"name": "Verbal Reasoning", "stanine": 7, "level": "strength"}
                    ],
                    "is_fragile_learner": True
                },
                "is_fragile_learner": True
            }
        ],
        "total_count": 1
    }

@app.get("/api/students/{student_id}")
async def test_student_detail(student_id: str):
    """Test endpoint that returns fake student detail data"""
    return {
        "student": {
            "student_id": student_id,
            "name": "John Smith",
            "grade": "9",
            "section": "A",
            "pass_analysis": {
                "available": True,
                "factors": [
                    {"name": "self regard", "percentile": 35, "level": "at-risk", "description": "How positive a student feels about themselves as a learner"}
                ],
                "riskAreas": [
                    {"factor": "self regard", "percentile": 35, "level": "at-risk"}
                ]
            },
            "cat4_analysis": {
                "available": True,
                "domains": [
                    {"name": "Verbal Reasoning", "stanine": 7, "level": "strength", "description": "The ability to understand and analyze words"}
                ],
                "weaknessAreas": [],
                "strengthAreas": [
                    {"domain": "Verbal Reasoning", "stanine": 7, "level": "strength"}
                ],
                "is_fragile_learner": True,
                "averageStanine": 7
            },
            "academic_analysis": {
                "available": True,
                "subjects": [
                    {"name": "English", "stanine": 5, "level": "balanced", "comparison": "Below Potential"}
                ]
            },
            "interventions": [
                {
                    "domain": "emotional",
                    "factor": "Self Regard",
                    "title": "Self-Esteem Building",
                    "description": "Weekly sessions focusing on identifying and celebrating strengths.",
                    "priority": "high"
                }
            ],
            "is_fragile_learner": True
        }
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle all exceptions"""
    return JSONResponse(
        status_code=500,
        content={"detail": f"Server error: {str(exc)}"}
    )

# Run the app directly if this file is executed
if __name__ == "__main__":
    port = 8001
    if len(sys.argv) > 1:
        port = int(sys.argv[1])
    uvicorn.run(app, host="0.0.0.0", port=port)