"""
Student Analytics PoC - Startup Script
-------------------------------------
This script runs the FastAPI application using Uvicorn.
It ensures the correct application path is used.
"""

import os
import sys
import uvicorn

# Add the parent directory to the path to ensure proper imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__))))

if __name__ == "__main__":
    # Run the application with Uvicorn
    # The import string format is: package.module:app_instance
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        workers=1
    )