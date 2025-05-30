# fixed_migration.py
"""
Fixed migration script that first inspects the database structure
and then updates with corrected analytics logic.
"""

import os
import sys
from sqlalchemy import create_engine, text, Column, Integer, String, Float, Boolean, ForeignKey, DateTime, Text, JSON, inspect
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from datetime import datetime

# Database configuration
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./student_analytics.db")

# Create database connection
engine = create_engine(
    DATABASE_URL, 
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Analytics logic constants
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

def stanine_to_sas(stanine: float) -> float:
    """Convert stanine to SAS score"""
    stanine_to_sas_map = {
        1: 74, 2: 81, 3: 88, 4: 96, 5: 103,
        6: 112, 7: 119, 8: 127, 9: 141
    }
    
    if stanine in stanine_to_sas_map:
        return stanine_to_sas_map[stanine]
    
    # Linear interpolation for decimal stanines
    lower = int(stanine)
    upper = lower + 1
    
    if lower < 1:
        return 74
    if upper > 9:
        return 141
    
    lower_sas = stanine_to_sas_map.get(lower, 74)
    upper_sas = stanine_to_sas_map.get(upper, 141)
    
    fraction = stanine - lower
    return lower_sas + (upper_sas - lower_sas) * fraction

def inspect_database_structure(db: Session):
    """Inspect the actual database structure"""
    print("Inspecting database structure...")
    
    inspector = inspect(engine)
    
    # Check tables and their columns
    tables_to_check = ['students', 'pass_factors', 'cat4_domains', 'cat4_assessments', 'academic_subjects', 'interventions']
    
    table_structures = {}
    
    for table_name in tables_to_check:
        if inspector.has_table(table_name):
            columns = inspector.get_columns(table_name)
            table_structures[table_name] = [col['name'] for col in columns]
            print(f"  {table_name}: {', '.join(table_structures[table_name])}")
        else:
            print(f"  {table_name}: TABLE NOT FOUND")
            table_structures[table_name] = []
    
    return table_structures

def run_fixed_migration():
    """Run the database migration with structure inspection"""
    print("Starting FIXED migration to corrected triangulated analytics...")
    
    db = SessionLocal()
    
    try:
        # Step 0: Inspect database structure
        print("Step 0: Inspecting database structure...")
        table_structures = inspect_database_structure(db)
        
        # Step 1: Add new columns if they don't exist
        print("\nStep 1: Adding new database columns...")
        
        # Add p_number to pass_factors if it doesn't exist
        if 'p_number' not in table_structures.get('pass_factors', []):
            try:
                db.execute(text("ALTER TABLE pass_factors ADD COLUMN p_number VARCHAR(10)"))
                db.commit()
                print("  ✓ Added p_number column to pass_factors")
            except Exception as e:
                print(f"  ! Could not add p_number column: {e}")
        else:
            print("  ✓ p_number column already exists in pass_factors")
        
        # Add sas_score to cat4_domains if it doesn't exist
        if 'sas_score' not in table_structures.get('cat4_domains', []):
            try:
                db.execute(text("ALTER TABLE cat4_domains ADD COLUMN sas_score FLOAT"))
                db.commit()
                print("  ✓ Added sas_score column to cat4_domains")
            except Exception as e:
                print(f"  ! Could not add sas_score column: {e}")
        else:
            print("  ✓ sas_score column already exists in cat4_domains")
        
        # Add fragile_flags to cat4_assessments if it doesn't exist
        if 'fragile_flags' not in table_structures.get('cat4_assessments', []):
            try:
                db.execute(text("ALTER TABLE cat4_assessments ADD COLUMN fragile_flags INTEGER DEFAULT 0"))
                db.commit()
                print("  ✓ Added fragile_flags column to cat4_assessments")
            except Exception as e:
                print(f"  ! Could not add fragile_flags column: {e}")
        else:
            print("  ✓ fragile_flags column already exists in cat4_assessments")
        
        # Add trigger to interventions if it doesn't exist
        if 'trigger' not in table_structures.get('interventions', []):
            try:
                db.execute(text("ALTER TABLE interventions ADD COLUMN trigger VARCHAR(200)"))
                db.commit()
                print("  ✓ Added trigger column to interventions")
            except Exception as e:
                print(f"  ! Could not add trigger column: {e}")
        else:
            print("  ✓ trigger column already exists in interventions")
        
        # Step 2: Update PASS factor classifications using raw SQL
        print("\nStep 2: Updating PASS factor classifications...")
        
        # Get all PASS factors
        pass_factors_result = db.execute(text("SELECT id, name, percentile, level FROM pass_factors")).fetchall()
        updated_count = 0
        
        for factor_row in pass_factors_result:
            factor_id, name, percentile, current_level = factor_row
            
            # Apply corrected classification per instruction set
            if percentile >= 65:  # >65 = Strength
                new_level = "strength"
            elif percentile >= 45:  # 45-65 = Balanced
                new_level = "balanced"
            else:  # <45 = At Risk
                new_level = "at-risk"
            
            # Update P-number mapping
            p_number = PASS_P_MAPPING.get(name, 'Unknown')
            
            # Only update if changed
            if current_level != new_level:
                db.execute(text("""
                    UPDATE pass_factors 
                    SET level = :new_level, p_number = :p_number 
                    WHERE id = :factor_id
                """), {"new_level": new_level, "p_number": p_number, "factor_id": factor_id})
                updated_count += 1
            else:
                # Still update p_number even if level didn't change
                db.execute(text("""
                    UPDATE pass_factors 
                    SET p_number = :p_number 
                    WHERE id = :factor_id
                """), {"p_number": p_number, "factor_id": factor_id})
        
        db.commit()
        print(f"  ✓ Updated {updated_count} PASS factor classifications")
        
        # Step 3: Update CAT4 domain classifications using raw SQL
        print("\nStep 3: Updating CAT4 domain classifications...")
        
        # Get all CAT4 domains
        cat4_domains_result = db.execute(text("SELECT id, stanine, level FROM cat4_domains")).fetchall()
        updated_count = 0
        
        for domain_row in cat4_domains_result:
            domain_id, stanine, current_level = domain_row
            
            # Convert stanine to SAS
            sas_score = stanine_to_sas(stanine)
            
            # Apply corrected classification per instruction set
            if sas_score > 110:  # SAS > 110 = Strength
                new_level = "strength"
            elif sas_score >= 90:  # 90-110 = Balanced
                new_level = "balanced"
            else:  # <90 = Weakness
                new_level = "weakness"
            
            # Update both level and SAS score
            if current_level != new_level:
                updated_count += 1
            
            db.execute(text("""
                UPDATE cat4_domains 
                SET level = :new_level, sas_score = :sas_score 
                WHERE id = :domain_id
            """), {"new_level": new_level, "sas_score": sas_score, "domain_id": domain_id})
        
        db.commit()
        print(f"  ✓ Updated {updated_count} CAT4 domain classifications")
        
        # Step 4: Update academic subject classifications using raw SQL
        print("\nStep 4: Updating academic subject classifications...")
        
        # First, check what columns actually exist in academic_subjects
        academic_columns = table_structures.get('academic_subjects', [])
        print(f"  Academic subjects columns: {academic_columns}")
        
        # Try to find the stanine column - it might have a different name
        stanine_column = None
        for col in academic_columns:
            if 'stanine' in col.lower():
                stanine_column = col
                break
        
        if not stanine_column:
            print("  ! No stanine column found in academic_subjects table")
            print("  ! Skipping academic subject classification update")
        else:
            print(f"  Using stanine column: {stanine_column}")
            
            # Get all academic subjects
            academic_subjects_result = db.execute(text(f"SELECT id, {stanine_column}, level FROM academic_subjects")).fetchall()
            updated_count = 0
            
            for subject_row in academic_subjects_result:
                subject_id, stanine, current_level = subject_row
                
                if stanine is None:
                    continue
                
                # Apply corrected classification per instruction set
                if stanine >= 7:  # 7-9 = Strength
                    new_level = "strength"
                elif stanine >= 4:  # 4-6 = Balanced
                    new_level = "balanced"
                else:  # 1-3 = Weakness
                    new_level = "weakness"
                
                # Only update if changed
                if current_level != new_level:
                    db.execute(text("""
                        UPDATE academic_subjects 
                        SET level = :new_level 
                        WHERE id = :subject_id
                    """), {"new_level": new_level, "subject_id": subject_id})
                    updated_count += 1
            
            db.commit()
            print(f"  ✓ Updated {updated_count} academic subject classifications")
        
        # Step 5: Recalculate fragile learner status using raw SQL
        print("\nStep 5: Recalculating fragile learner status...")
        
        # Get students with CAT4 data
        students_with_cat4 = db.execute(text("""
            SELECT s.id, s.student_id, s.name, ca.id as cat4_id, s.is_fragile_learner
            FROM students s
            JOIN cat4_assessments ca ON s.id = ca.student_id
        """)).fetchall()
        
        updated_count = 0
        
        for student_row in students_with_cat4:
            student_id, student_external_id, name, cat4_assessment_id, current_fragile_status = student_row
            
            # Get CAT4 domains for this student
            domains = db.execute(text("""
                SELECT stanine FROM cat4_domains 
                WHERE assessment_id = :assessment_id
            """), {"assessment_id": cat4_assessment_id}).fetchall()
            
            # Count domains with SAS < 90 (converted from stanine)
            fragile_flags = 0
            for domain_row in domains:
                stanine = domain_row[0]
                if stanine is not None:
                    sas_score = stanine_to_sas(stanine)
                    if sas_score < 90:
                        fragile_flags += 1
            
            # Apply instruction set rule: fragile learner if 2+ domains have SAS < 90
            is_fragile = fragile_flags >= 2
            
            # Update if changed
            if current_fragile_status != is_fragile:
                db.execute(text("""
                    UPDATE students 
                    SET is_fragile_learner = :is_fragile 
                    WHERE id = :student_id
                """), {"is_fragile": is_fragile, "student_id": student_id})
                
                db.execute(text("""
                    UPDATE cat4_assessments 
                    SET is_fragile_learner = :is_fragile, fragile_flags = :fragile_flags 
                    WHERE id = :assessment_id
                """), {"is_fragile": is_fragile, "fragile_flags": fragile_flags, "assessment_id": cat4_assessment_id})
                
                updated_count += 1
        
        db.commit()
        print(f"  ✓ Updated fragile learner status for {updated_count} students")
        
        # Step 6: Clear old interventions
        print("\nStep 6: Clearing old interventions...")
        intervention_count_result = db.execute(text("SELECT COUNT(*) FROM interventions")).fetchone()
        intervention_count = intervention_count_result[0] if intervention_count_result else 0
        
        if intervention_count > 0:
            db.execute(text("DELETE FROM interventions"))
            db.commit()
            print(f"  ✓ Cleared {intervention_count} old interventions")
        else:
            print("  ✓ No interventions to clear")
        
        print("\n" + "="*50)
        print("MIGRATION COMPLETED SUCCESSFULLY!")
        print("="*50)
        
        # Show summary using raw SQL
        print("\nMigration Summary:")
        
        # PASS classifications
        pass_at_risk = db.execute(text("SELECT COUNT(*) FROM pass_factors WHERE level = 'at-risk'")).fetchone()[0]
        pass_balanced = db.execute(text("SELECT COUNT(*) FROM pass_factors WHERE level = 'balanced'")).fetchone()[0]
        pass_strength = db.execute(text("SELECT COUNT(*) FROM pass_factors WHERE level = 'strength'")).fetchone()[0]
        print(f"PASS: {pass_at_risk} at-risk, {pass_balanced} balanced, {pass_strength} strength")
        
        # CAT4 classifications
        cat4_weakness = db.execute(text("SELECT COUNT(*) FROM cat4_domains WHERE level = 'weakness'")).fetchone()[0]
        cat4_balanced = db.execute(text("SELECT COUNT(*) FROM cat4_domains WHERE level = 'balanced'")).fetchone()[0]
        cat4_strength = db.execute(text("SELECT COUNT(*) FROM cat4_domains WHERE level = 'strength'")).fetchone()[0]
        print(f"CAT4: {cat4_weakness} weakness, {cat4_balanced} balanced, {cat4_strength} strength")
        
        # Fragile learners
        fragile_learners = db.execute(text("SELECT COUNT(*) FROM students WHERE is_fragile_learner = 1")).fetchone()[0]
        total_students = db.execute(text("SELECT COUNT(*) FROM students")).fetchone()[0]
        print(f"Fragile Learners: {fragile_learners}/{total_students} students")
        
        print("\nThe database has been updated with corrected triangulated analytics!")
        print("Your dashboard should now show accurate classifications.")
        print("\nKey corrections applied:")
        print("- PASS: <45 at-risk, 45-65 balanced, >65 strength")
        print("- CAT4: SAS <90 weakness, 90-110 balanced, >110 strength")
        print("- Fragile Learner: 2+ CAT4 domains with SAS <90")
        print("- Academic: Stanine 1-3 weakness, 4-6 balanced, 7-9 strength")
        
    except Exception as e:
        print(f"\n✗ MIGRATION FAILED: {str(e)}")
        db.rollback()
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    print("="*60)
    print("FIXED STUDENT ANALYTICS DATABASE MIGRATION")
    print("Updating to Corrected Triangulated Analytics Logic") 
    print("="*60)
    
    # Check if we're in the right directory
    if not os.path.exists("app"):
        print("\n⚠️  WARNING: 'app' directory not found!")
        print("Please run this script from the project root directory:")
        print("cd C:\\Workspace\\student-analytics-poc")
        print("python fixed_migration.py")
        sys.exit(1)
    
    # Confirm migration
    confirm = input("\nThis will update all analytics data in the database. Continue? (y/N): ")
    if confirm.lower() != 'y':
        print("Migration cancelled.")
        sys.exit(0)
    
    try:
        run_fixed_migration()
    except Exception as e:
        print(f"\n✗ MIGRATION FAILED: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)