"""
fix_imports.py

This script will fix the incorrect import in routes.py.
Run this script from your project root directory.
"""

import os

# Path to routes.py file
routes_file_path = os.path.join('app', 'api', 'routes.py')

# Check if file exists
if not os.path.exists(routes_file_path):
    print(f"Error: Could not find {routes_file_path}")
    exit(1)

# Read the file content
with open(routes_file_path, 'r') as file:
    content = file.read()

# Replace the incorrect import
corrected_content = content.replace(
    'from app.database.db import get_db',
    'from app.database.database import get_db'
)

# Check if the replacement was made
if content == corrected_content:
    print("No changes needed - import may already be correct or in a different format.")
else:
    # Write the corrected content back to the file
    with open(routes_file_path, 'w') as file:
        file.write(corrected_content)
    print(f"Successfully updated {routes_file_path}")

print("Try running your application again with 'python run.py'")