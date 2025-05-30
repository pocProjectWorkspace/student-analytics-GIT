# simple_classification_fix.py
"""
Simple script to fix the classification logic in your existing data
"""

import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Database configuration
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./student_analytics.db")

# Create database connection
engine = create_engine(
    DATABASE_URL, 
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def stanine_to_sas(stanine: float) -> float:
    """Convert stanine to SAS score"""
    stanine_to_sas_map = {
        1: 74, 2: 81, 3: 88, 4: 96, 5: 103,
        6: 112, 7: 119, 8: 127, 9: 141
    }
    return stanine_to_sas_map.get(int(stanine), 103)

def fix_classifications():
    """Fix the classification logic for existing data"""
    print("="*50)
    print("FIXING CLASSIFICATION LOGIC")
    print("="*50)
    
    db = SessionLocal()
    
    try:
        # Fix PASS factor classifications
        print("\n1. Fixing PASS factor classifications...")
        pass_factors = db.execute(text("SELECT id, percentile, level FROM pass_factors")).fetchall()
        
        updated_pass = 0
        for factor_id, percentile, current_level in pass_factors:
            # Apply corrected classification per instruction set
            if percentile >= 65:  # >65 = Strength
                new_level = "strength"
            elif percentile >= 45:  # 45-65 = Balanced
                new_level = "balanced"
            else:  # <45 = At Risk
                new_level = "at-risk"
            
            if current_level != new_level:
                db.execute(text("""
                    UPDATE pass_factors 
                    SET level = :new_level 
                    WHERE id = :factor_id
                """), {"new_level": new_level, "factor_id": factor_id})
                updated_pass += 1
        
        print(f"   ✓ Updated {updated_pass} PASS factor classifications")
        
        # Fix CAT4 domain classifications
        print("\n2. Fixing CAT4 domain classifications...")
        cat4_domains = db.execute(text("SELECT id, stanine, level, sas_score FROM cat4_domains")).fetchall()
        
        updated_cat4 = 0
        for domain_id, stanine, current_level, current_sas in cat4_domains:
            # Use existing SAS score or convert from stanine
            sas_score = current_sas if current_sas else stanine_to_sas(stanine)
            
            # Apply corrected classification per instruction set
            if sas_score > 110:  # SAS > 110 = Strength
                new_level = "strength"
            elif sas_score >= 90:  # 90-110 = Balanced
                new_level = "balanced"
            else:  # <90 = Weakness
                new_level = "weakness"
            
            # Update both level and SAS score
            db.execute(text("""
                UPDATE cat4_domains 
                SET level = :new_level, sas_score = :sas_score 
                WHERE id = :domain_id
            """), {"new_level": new_level, "sas_score": sas_score, "domain_id": domain_id})
            
            if current_level != new_level:
                updated_cat4 += 1
        
        print(f"   ✓ Updated {updated_cat4} CAT4 domain classifications")
        
        # Fix academic subject classifications
        print("\n3. Fixing academic subject classifications...")
        academic_subjects = db.execute(text("SELECT id, stanine, level FROM academic_subjects")).fetchall()
        
        updated_academic = 0
        for subject_id, stanine, current_level in academic_subjects:
            # Apply corrected classification per instruction set
            if stanine >= 7:  # 7-9 = Strength
                new_level = "strength"
            elif stanine >= 4:  # 4-6 = Balanced
                new_level = "balanced"
            else:  # 1-3 = Weakness
                new_level = "weakness"
            
            if current_level != new_level:
                db.execute(text("""
                    UPDATE academic_subjects 
                    SET level = :new_level 
                    WHERE id = :subject_id
                """), {"new_level": new_level, "subject_id": subject_id})
                updated_academic += 1
        
        print(f"   ✓ Updated {updated_academic} academic subject classifications")
        
        # Recalculate fragile learner status
        print("\n4. Recalculating fragile learner status...")
        
        # Get students with CAT4 assessments
        students_with_cat4 = db.execute(text("""
            SELECT s.id, s.student_id, ca.id as cat4_id, s.is_fragile_learner
            FROM students s
            JOIN cat4_assessments ca ON s.id = ca.student_id
        """)).fetchall()
        
        updated_fragile = 0
        for student_id, student_external_id, cat4_assessment_id, current_fragile in students_with_cat4:
            # Count domains with SAS < 90
            weakness_count = db.execute(text("""
                SELECT COUNT(*) 
                FROM cat4_domains 
                WHERE assessment_id = :assessment_id 
                AND (sas_score < 90 OR (sas_score IS NULL AND stanine <= 3))
            """), {"assessment_id": cat4_assessment_id}).fetchone()[0]
            
            # Apply instruction set rule: fragile learner if 2+ domains have SAS < 90
            is_fragile = weakness_count >= 2
            
            if current_fragile != is_fragile:
                # Update student
                db.execute(text("""
                    UPDATE students 
                    SET is_fragile_learner = :is_fragile 
                    WHERE id = :student_id
                """), {"is_fragile": is_fragile, "student_id": student_id})
                
                # Update CAT4 assessment
                db.execute(text("""
                    UPDATE cat4_assessments 
                    SET is_fragile_learner = :is_fragile, fragile_flags = :fragile_flags 
                    WHERE id = :assessment_id
                """), {"is_fragile": is_fragile, "fragile_flags": weakness_count, "assessment_id": cat4_assessment_id})
                
                updated_fragile += 1
        
        print(f"   ✓ Updated fragile learner status for {updated_fragile} students")
        
        # Commit all changes
        db.commit()
        
        print("\n" + "="*50)
        print("CLASSIFICATION FIX COMPLETED!")
        print("="*50)
        
        # Show summary
        print("\nSummary of corrections applied:")
        print("- PASS: <45 at-risk, 45-65 balanced, >65 strength")
        print("- CAT4: SAS <90 weakness, 90-110 balanced, >110 strength")
        print("- Fragile Learner: 2+ CAT4 domains with SAS <90")
        print("- Academic: Stanine 1-3 weakness, 4-6 balanced, 7-9 strength")
        
        # Final counts
        pass_at_risk = db.execute(text("SELECT COUNT(*) FROM pass_factors WHERE level = 'at-risk'")).fetchone()[0]
        pass_balanced = db.execute(text("SELECT COUNT(*) FROM pass_factors WHERE level = 'balanced'")).fetchone()[0]
        pass_strength = db.execute(text("SELECT COUNT(*) FROM pass_factors WHERE level = 'strength'")).fetchone()[0]
        
        cat4_weakness = db.execute(text("SELECT COUNT(*) FROM cat4_domains WHERE level = 'weakness'")).fetchone()[0]
        cat4_balanced = db.execute(text("SELECT COUNT(*) FROM cat4_domains WHERE level = 'balanced'")).fetchone()[0]
        cat4_strength = db.execute(text("SELECT COUNT(*) FROM cat4_domains WHERE level = 'strength'")).fetchone()[0]
        
        fragile_learners = db.execute(text("SELECT COUNT(*) FROM students WHERE is_fragile_learner = 1")).fetchone()[0]
        total_students = db.execute(text("SELECT COUNT(*) FROM students")).fetchone()[0]
        
        print(f"\nFinal Classification Counts:")
        print(f"PASS: {pass_at_risk} at-risk, {pass_balanced} balanced, {pass_strength} strength")
        print(f"CAT4: {cat4_weakness} weakness, {cat4_balanced} balanced, {cat4_strength} strength")
        print(f"Fragile Learners: {fragile_learners}/{total_students} students")
        
        print("\n✅ Your dashboard should now show correct analytics!")
        
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        db.rollback()
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    if not os.path.exists("app"):
        print("⚠️  Please run from project root directory")
        sys.exit(1)
    
    print("This will fix the classification logic in your database.")
    print("Based on your database inspection, this is safe to run.")
    
    confirm = input("\nProceed with classification fix? (y/N): ")
    if confirm.lower() != 'y':
        print("Fix cancelled.")
        sys.exit(0)
    
    try:
        fix_classifications()
    except Exception as e:
        print(f"\n❌ Fix failed: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)