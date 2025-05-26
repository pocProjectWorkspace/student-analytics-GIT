# main.py

from fastapi import FastAPI, Request, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session
import os

from app.api.routes import router as api_router
from app.database.database import engine, get_db
from app.database.models import Base
from app.database.init_db import init_db

# Create FastAPI application
app = FastAPI(
    title="Student Analytics PoC",
    description="A proof of concept for AI-driven student analytics and intervention recommendations",
    version="0.1.0"
)

# Apply CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Or restrict to ["http://localhost:5173"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database tables
init_db()

# Include API routes - ONLY NEED THIS ONE LINE
app.include_router(api_router, prefix="/api")

# Mount static files
static_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")
if os.path.exists(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")

# Setup Jinja2 templates for server-side rendering
template_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "templates")
templates = Jinja2Templates(directory=template_dir) if os.path.exists(template_dir) else None

# Basic routes for server-side pages
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
        db.execute("SELECT 1")
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "database": str(e)}