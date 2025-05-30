# direct_data_loader.py
"""
Direct database loader for PASS and CAT4 data - no external dependencies
"""

import os
import sys
import pandas as pd
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.database import models

# Database configuration
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./student_analytics.db")
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Analytics constants
PASS_P_MAPPING = {
    'Perceived Learning Capability': 'P1',
    'Confidence in Learning': 'P2', 
    'Self-regard as a Learner': 'P3',
    'Attitudes to Teachers': 'P4',
    'Response to Curriculum': 'P5',
    'General Work Ethic': 'P6',
    'Preparedness for Learning': 'P7',
    'Attitudes to Attendance': 'P8',
    'Feelings about School': 'P9'
}

def load_pass_data(file_path: str):
    """Load PASS data from Excel file"""
    print(f"\n📋 Loading PASS data from: {file_path}")
    
    if not os.path.exists(file_path):
        print(f"❌ File not found: {file_path}")
        return False
    
    db = SessionLocal()
    try:
        df = pd.read_excel(file_path)
        print(f"   Columns found: {df.columns.tolist()}")
        print(f"   Rows: {len(df)}")
        
        students_processed = 0
        errors = 0
        
        for index, row in df.iterrows():
            try:
                student_id = str(row.get('Student ID', ''))
                
                # Try different student ID column names
                if not student_id or student_id == 'nan' or pd.isna(student_id):
                    student_id = str(row.get('ID', ''))  # Your file uses 'ID' column
                
                if not student_id or student_id == 'nan' or pd.isna(student_id):
                    continue
                    
                # Find existing student
                student_db = db.query(models.Student).filter(
                    models.Student.student_id == student_id
                ).first()
                
                if not student_db:
                    print(f"   ⚠️  Student {student_id} not found - skipping")
                    continue
                
                # Check if PASS assessment already exists
                existing = db.query(models.PassAssessment).filter(
                    models.PassAssessment.student_id == student_db.id
                ).first()
                
                if existing:
                    continue  # Skip if already exists
                
                # Get PASS percentiles from Excel (updated for your actual column names)
                pass_values = {}
                
                # Updated column mappings based on your actual file structure
                column_mappings = {
                    'Perceived Learning Capability': ['Perceived Learning Capability P2', 'Perceived learning capability'],
                    'Self-regard as a Learner': ['Learner Self Regard P3', 'Self-regard as a learner'],
                    'Preparedness for Learning': ['Preparedness for Learning P4', 'Preparedness for Learning  P4', 'Preparedness for learning'],
                    'General Work Ethic': ['General Work Ethic P6', 'General work ethic'],
                    'Confidence in Learning': ['Confidence in Learning P7', 'Confidence in learning'],
                    'Feelings about School': ['Feelings about school P1', 'Feelings about school'],
                    'Attitudes to Teachers': ['Attitudes to Teachers P5', 'Attitudes to teachers'],
                    'Attitudes to Attendance': ['Attitudes to Attendance P8', 'Attitudes to attendance'],
                    'Response to Curriculum': ['Response to Curriculum P9', 'Response to curriculum demands', 'Response to curriculum']
                }
                
                for standard_name, possible_columns in column_mappings.items():
                    value = None
                    for col_name in possible_columns:
                        if col_name in df.columns:
                            value = row.get(col_name, 0)
                            break
                    pass_values[standard_name] = value if pd.notna(value) else 0
                
                # Calculate average
                valid_values = [float(v) for v in pass_values.values() if pd.notna(v) and v != 0]
                avg_percentile = sum(valid_values) / len(valid_values) if valid_values else 0
                
                if avg_percentile == 0:
                    continue  # Skip if no valid data
                
                # Create PASS assessment
                pass_assessment = models.PassAssessment(
                    student_id=student_db.id,
                    average_percentile=avg_percentile
                )
                db.add(pass_assessment)
                db.flush()
                
                # Add PASS factors
                factors_added = 0
                for factor_name, percentile in pass_values.items():
                    if pd.notna(percentile) and percentile > 0:
                        percentile = float(percentile)
                        
                        # Apply corrected classification per instruction set
                        if percentile >= 65:  # >65 = Strength
                            level = "strength"
                        elif percentile >= 45:  # 45-65 = Balanced
                            level = "balanced"
                        else:  # <45 = At Risk
                            level = "at-risk"
                        
                        p_number = PASS_P_MAPPING.get(factor_name, 'Unknown')
                        
                        pass_factor = models.PassFactor(
                            assessment_id=pass_assessment.id,
                            name=factor_name,
                            percentile=percentile,
                            level=level,
                            p_number=p_number
                        )
                        db.add(pass_factor)
                        factors_added += 1
                
                if factors_added > 0:
                    students_processed += 1
                    if students_processed % 20 == 0:
                        print(f"   Processed {students_processed} students...")
                        db.commit()
                
            except Exception as e:
                errors += 1
                if errors <= 5:  # Only show first 5 errors
                    print(f"   ❌ Error processing row {index}: {e}")
        
        db.commit()
        print(f"✅ PASS data loaded for {students_processed} students")
        return students_processed > 0
        
    except Exception as e:
        print(f"❌ Error loading PASS data: {e}")
        db.rollback()
        return False
    finally:
        db.close()

def load_cat4_data(file_path: str):
    """Load CAT4 data from Excel file"""
    print(f"\n🧠 Loading CAT4 data from: {file_path}")
    
    if not os.path.exists(file_path):
        print(f"❌ File not found: {file_path}")
        return False
    
    db = SessionLocal()
    try:
        df = pd.read_excel(file_path)
        print(f"   Columns found: {df.columns.tolist()}")
        print(f"   Rows: {len(df)}")
        
        students_processed = 0
        errors = 0
        
        for index, row in df.iterrows():
            try:
                student_id = str(row.get('Student ID', ''))
                
                # Try different student ID column names  
                if not student_id or student_id == 'nan' or pd.isna(student_id):
                    student_id = str(row.get('ID', ''))  # Your file uses 'ID' column
                
                if not student_id or student_id == 'nan' or pd.isna(student_id):
                    continue
                    
                # Find existing student
                student_db = db.query(models.Student).filter(
                    models.Student.student_id == student_id
                ).first()
                
                if not student_db:
                    print(f"   ⚠️  Student {student_id} not found - skipping")
                    continue
                
                # Check if CAT4 assessment already exists
                existing = db.query(models.CAT4Assessment).filter(
                    models.CAT4Assessment.student_id == student_db.id
                ).first()
                
                if existing:
                    continue  # Skip if already exists
                
                # Get SAS values from Excel (try different column name variations)
                sas_columns = {
                    'Verbal': ['Verbal SAS', 'verbal sas', 'Verbal'],
                    'Quantitative': ['Quantitative SAS', 'quantitative sas', 'Quantitative', 'Quant SAS'],
                    'Non-verbal': ['Non-verbal SAS', 'non-verbal sas', 'Non-verbal', 'Nonverbal SAS'],
                    'Spatial': ['Spatial SAS', 'spatial sas', 'Spatial']
                }
                
                sas_values = {}
                for domain, possible_columns in sas_columns.items():
                    value = None
                    for col_name in possible_columns:
                        if col_name in df.columns:
                            value = row.get(col_name, 0)
                            break
                    sas_values[domain] = float(value) if pd.notna(value) and value != 0 else 0
                
                # Skip if no valid SAS data
                valid_sas = [v for v in sas_values.values() if v > 0]
                if not valid_sas:
                    continue
                
                # Calculate fragile learner status (2+ domains with SAS < 90)
                fragile_flags = sum(1 for sas in valid_sas if sas < 90)
                is_fragile = fragile_flags >= 2
                
                # Create CAT4 assessment
                cat4_assessment = models.CAT4Assessment(
                    student_id=student_db.id,
                    is_fragile_learner=is_fragile,
                    average_stanine=5,  # Default
                    fragile_flags=fragile_flags
                )
                db.add(cat4_assessment)
                db.flush()
                
                # Add CAT4 domains
                domains_added = 0
                for domain_name, sas_score in sas_values.items():
                    if sas_score > 0:
                        # Classification per instruction set
                        if sas_score > 110:  # SAS > 110 = Strength
                            level = "strength"
                        elif sas_score >= 90:  # 90-110 = Balanced
                            level = "balanced"
                        else:  # <90 = Weakness
                            level = "weakness"
                        
                        # Convert SAS to stanine (approximate)
                        if sas_score <= 74: stanine = 1
                        elif sas_score <= 81: stanine = 2
                        elif sas_score <= 88: stanine = 3
                        elif sas_score <= 96: stanine = 4
                        elif sas_score <= 103: stanine = 5
                        elif sas_score <= 112: stanine = 6
                        elif sas_score <= 119: stanine = 7
                        elif sas_score <= 127: stanine = 8
                        else: stanine = 9
                        
                        cat4_domain = models.CAT4Domain(
                            assessment_id=cat4_assessment.id,
                            name=domain_name,
                            stanine=stanine,
                            level=level,
                            sas_score=sas_score
                        )
                        db.add(cat4_domain)
                        domains_added += 1
                
                if domains_added > 0:
                    # Update student fragile learner status
                    student_db.is_fragile_learner = is_fragile
                    students_processed += 1
                    
                    if students_processed % 20 == 0:
                        print(f"   Processed {students_processed} students...")
                        db.commit()
                
            except Exception as e:
                errors += 1
                if errors <= 5:  # Only show first 5 errors
                    print(f"   ❌ Error processing row {index}: {e}")
        
        db.commit()
        print(f"✅ CAT4 data loaded for {students_processed} students")
        return students_processed > 0
        
    except Exception as e:
        print(f"❌ Error loading CAT4 data: {e}")
        db.rollback()
        return False
    finally:
        db.close()

def check_results():
    """Check the results after loading"""
    print(f"\n🔍 Checking results...")
    
    db = SessionLocal()
    try:
        # Check data counts
        total_students = db.execute(text("SELECT COUNT(*) FROM students")).fetchone()[0]
        pass_count = db.execute(text("SELECT COUNT(*) FROM pass_assessments")).fetchone()[0]
        cat4_count = db.execute(text("SELECT COUNT(*) FROM cat4_assessments")).fetchone()[0]
        fragile_count = db.execute(text("SELECT COUNT(*) FROM students WHERE is_fragile_learner = 1")).fetchone()[0]
        
        print(f"📊 Results:")
        print(f"   Total Students: {total_students}")
        print(f"   PASS Assessments: {pass_count}")
        print(f"   CAT4 Assessments: {cat4_count}")
        print(f"   Fragile Learners: {fragile_count}")
        
        # Check classification distributions
        if pass_count > 0:
            pass_at_risk = db.execute(text("SELECT COUNT(*) FROM pass_factors WHERE level = 'at-risk'")).fetchone()[0]
            print(f"   PASS At-Risk Factors: {pass_at_risk}")
        
        if cat4_count > 0:
            cat4_weakness = db.execute(text("SELECT COUNT(*) FROM cat4_domains WHERE level = 'weakness'")).fetchone()[0]
            print(f"   CAT4 Weakness Domains: {cat4_weakness}")
        
        success = pass_count > 0 or cat4_count > 0
        if success:
            print(f"🎉 SUCCESS! Data loaded successfully!")
            print(f"\nRefresh your dashboard to see the results:")
            print(f"- Fragile learners should now be > 0")
            print(f"- More interventions should appear")
            print(f"- PASS and CAT4 columns should have data")
        
        return success
        
    except Exception as e:
        print(f"❌ Error checking results: {e}")
        return False
    finally:
        db.close()

def main():
    print("="*60)
    print("DIRECT DATA LOADER - STUDENT ANALYTICS")
    print("="*60)
    
    print(f"\nThis script will load PASS and CAT4 data directly into the database.")
    print(f"Make sure your Excel files have the correct columns:")
    print(f"\nPASS file should have:")
    print(f"- Student ID")
    print(f"- Perceived learning capability")
    print(f"- Self-regard as a learner")
    print(f"- Preparedness for learning")
    print(f"- General work ethic")
    print(f"- Confidence in learning")
    print(f"- Feelings about school")
    print(f"- Attitudes to teachers")
    print(f"- Attitudes to attendance")
    print(f"- Response to curriculum demands")
    
    print(f"\nCAT4 file should have:")
    print(f"- Student ID")
    print(f"- Verbal SAS")
    print(f"- Quantitative SAS")
    print(f"- Non-verbal SAS")
    print(f"- Spatial SAS")
    
    # Get file paths
    print(f"\n📁 Please provide Excel file paths:")
    pass_file = input("\nPASS Excel file path (or press Enter to skip): ").strip().strip('"')
    cat4_file = input("CAT4 Excel file path (or press Enter to skip): ").strip().strip('"')
    
    if not pass_file and not cat4_file:
        print("❌ No files provided")
        return
    
    success_count = 0
    
    # Load PASS data
    if pass_file:
        if load_pass_data(pass_file):
            success_count += 1
    
    # Load CAT4 data
    if cat4_file:
        if load_cat4_data(cat4_file):
            success_count += 1
    
    # Check results
    if success_count > 0:
        check_results()
    else:
        print(f"\n❌ No data was loaded successfully")
        print(f"Check file paths and column names")
    
    print(f"\n" + "="*60)

if __name__ == "__main__":
    main()