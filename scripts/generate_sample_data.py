"""
Sample Data Generator for Student Analytics PoC
----------------------------------------------
This script generates sample CSV files for PASS, CAT4, and academic data.
"""

import os
import pandas as pd
import numpy as np
import random
from datetime import datetime

# Set random seed for reproducibility
np.random.seed(42)

# Configuration
OUTPUT_DIR = "../static/samples"
NUM_STUDENTS = 100
GRADES = ["9", "10", "11", "12"]
SECTIONS = ["A", "B", "C"]

# Create output directory if it doesn't exist
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Generate student IDs and names
def generate_student_base_data():
    """Generate basic student information"""
    student_ids = [f"S{2023}{grade}{section}{str(i).zfill(3)}" 
                  for grade in GRADES 
                  for section in SECTIONS 
                  for i in range(1, NUM_STUDENTS // (len(GRADES) * len(SECTIONS)) + 1)]
    
    first_names = ["Emma", "Liam", "Olivia", "Noah", "Ava", "Jackson", "Isabella", "Lucas",
                  "Sophia", "Aiden", "Mia", "Elijah", "Harper", "Grayson", "Amelia", 
                  "Mason", "Evelyn", "Logan", "Abigail", "Carter", "Emily", "Muhammad",
                  "Elizabeth", "Ethan", "Sofia", "Sebastian", "Avery", "James", 
                  "Scarlett", "Benjamin", "Grace", "William", "Chloe", "Alexander"]
    
    last_names = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller",
                 "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez",
                 "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin",
                 "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark", 
                 "Ramirez", "Lewis", "Robinson", "Walker", "Young", "Allen", "King"]
    
    students = []
    for student_id in student_ids:
        grade = student_id[5]
        section = student_id[6]
        students.append({
            "Student ID": student_id,
            "Name": f"{random.choice(first_names)} {random.choice(last_names)}",
            "Grade": grade,
            "Section": f"{grade}{section}"
        })
    
    return pd.DataFrame(students)

# Generate PASS data
def generate_pass_data(students_df):
    """Generate PASS assessment data"""
    pass_factors = [
        "Self-Regard", "Perceived Learning Capability", "Attitude to Teachers",
        "General Work Ethic", "Confidence in Learning", "Preparedness for Learning",
        "Emotional Control", "Social Confidence", "Response to Curriculum Demands"
    ]
    
    pass_data = students_df.copy()
    
    # Generate percentile scores for each factor (1-99)
    for factor in pass_factors:
        # Create a distribution that's slightly skewed towards higher values
        pass_data[factor] = np.clip(np.random.normal(60, 20, len(pass_data)), 1, 99).astype(int)
    
    return pass_data

# Generate CAT4 data
def generate_cat4_data(students_df):
    """Generate CAT4 assessment data"""
    cat4_domains = [
        "Verbal Reasoning", "Quantitative Reasoning", 
        "Non-verbal Reasoning", "Spatial Ability"
    ]
    
    cat4_data = students_df.copy()
    
    # Generate stanine scores for each domain (1-9)
    for domain in cat4_domains:
        # Create a normal distribution centered around stanine 5
        cat4_data[domain] = np.clip(np.random.normal(5, 2, len(cat4_data)), 1, 9).astype(int)
    
    return cat4_data

# Generate academic data
def generate_academic_data(students_df):
    """Generate academic performance data"""
    subjects = ["English", "Mathematics", "Science", "Humanities"]
    
    academic_records = []
    
    for _, student in students_df.iterrows():
        for subject in subjects:
            # Generate marks on a 0-100 scale
            mark = min(100, max(0, np.random.normal(70, 15)))
            
            academic_records.append({
                "Student ID": student["Student ID"],
                "Name": student["Name"],
                "Grade": student["Grade"],
                "Section": student["Section"],
                "Subject": subject,
                "Mark": round(mark, 1)
            })
    
    return pd.DataFrame(academic_records)

# Generate and save all datasets
def main():
    print("Generating sample data...")
    
    # Generate base student data
    students_df = generate_student_base_data()
    
    # Generate and save PASS data
    pass_df = generate_pass_data(students_df)
    pass_df.to_csv(os.path.join(OUTPUT_DIR, "pass_sample.csv"), index=False)
    
    # Generate and save CAT4 data
    cat4_df = generate_cat4_data(students_df)
    cat4_df.to_csv(os.path.join(OUTPUT_DIR, "cat4_sample.csv"), index=False)
    
    # Generate and save academic data
    academic_df = generate_academic_data(students_df)
    academic_df.to_csv(os.path.join(OUTPUT_DIR, "academic_sample.csv"), index=False)
    
    print(f"Sample data generated and saved to {OUTPUT_DIR}:")
    print(f"- PASS data: {len(pass_df)} records")
    print(f"- CAT4 data: {len(cat4_df)} records")
    print(f"- Academic data: {len(academic_df)} records")

if __name__ == "__main__":
    main()