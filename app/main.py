"""
Student Analytics PoC - Main Application
----------------------------------------
This is the main entry point for the Student Analytics Proof of Concept application.
It sets up the FastAPI application, routes, middleware, and database.
"""

import os
from fastapi import FastAPI, Request, Depends
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

# Import API routes
from api.routes import router as api_router

# Import database
from database.database import engine, get_db
from database.models import Base
from database.init_db import init_db

# Create FastAPI application
app = FastAPI(
    title="Student Analytics PoC",
    description="A proof of concept for AI-driven student analytics and intervention recommendations",
    version="0.1.0"
)

# Initialize database tables
init_db()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files
if os.path.exists("static"):
    app.mount("/static", StaticFiles(directory="static"), name="static")

# Setup Jinja2 templates for server-side rendering (optional for API-only mode)
templates = Jinja2Templates(directory="templates") if os.path.exists("templates") else None

# Include API routes
app.include_router(api_router, prefix=os.getenv("API_PREFIX", "/api"))

# Basic routes for server-side pages (optional if using React frontend)
@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    """Render the home page"""
    if templates:
        return templates.TemplateResponse("index.html", {"request": request})
    return HTMLResponse(content="<html><body><h1>Student Analytics API</h1><p>API is running. Use the /api endpoints.</p></body></html>")

@app.get("/upload", response_class=HTMLResponse)
async def upload_page(request: Request):
    """Render the upload page"""
    if templates:
        return templates.TemplateResponse("upload.html", {"request": request})
    return HTMLResponse(content="<html><body><h1>Upload Page</h1><p>Please use the API or React frontend for file uploads.</p></body></html>")

@app.get("/health")
async def health_check(db: Session = Depends(get_db)):
    """Health check endpoint for monitoring"""
    try:
        # Verify database connection
        db.execute("SELECT 1")
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "database": str(e)}

# Entry point
if __name__ == "__main__":
    import uvicorn
    
    # Determine port from environment or use default
    port = int(os.getenv("PORT", 8000))
    
    # Start server
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True if os.getenv("DEBUG", "False").lower() == "true" else False)