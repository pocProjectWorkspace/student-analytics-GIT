# standalone_migration.py
"""
Standalone migration script to update database with corrected analytics logic.
Run this from the project root directory.
"""

import os
import sys
from sqlalchemy import create_engine, text, Column, Integer, String, Float, Boolean, ForeignKey, DateTime, Text, JSON
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

# Simplified models for migration
class Student(Base):
    __tablename__ = 'students'
    id = Column(Integer, primary_key=True)
    student_id = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    grade = Column(Integer, nullable=False)
    section = Column(String(50), nullable=True)
    is_fragile_learner = Column(Boolean, default=False)

class PassFactor(Base):
    __tablename__ = 'pass_factors'
    id = Column(Integer, primary_key=True)
    assessment_id = Column(Integer, ForeignKey('pass_assessments.id'), nullable=False)
    name = Column(String(100), nullable=False)
    percentile = Column(Float, nullable=False)
    level = Column(String(50), nullable=False)
    p_number = Column(String(10), nullable=True)

class CAT4Domain(Base):
    __tablename__ = 'cat4_domains'
    id = Column(Integer, primary_key=True)
    assessment_id = Column(Integer, ForeignKey('cat4_assessments.id'), nullable=False)
    name = Column(String(100), nullable=False)
    stanine = Column(Float, nullable=False)
    level = Column(String(50), nullable=False)
    sas_score = Column(Float, nullable=True)

class CAT4Assessment(Base):
    __tablename__ = 'cat4_assessments'
    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey('students.id'), nullable=False)
    is_fragile_learner = Column(Boolean, default=False)
    fragile_flags = Column(Integer, default=0)

class AcademicSubject(Base):
    __tablename__ = 'academic_subjects'
    id = Column(Integer, primary_key=True)
    assessment_id = Column(Integer, ForeignKey('academic_assessments.id'), nullable=False)
    name = Column(String(100), nullable=False)
    internal_stanine = Column(Float, nullable=False)
    level = Column(String(50), nullable=False)

class Intervention(Base):
    __tablename__ = 'interventions'
    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey('students.id'), nullable=False)
    domain = Column(String(50), nullable=False)
    trigger = Column(String(200), nullable=True)
    intervention_type = Column(String(200), nullable=True)
    priority = Column(String(50), nullable=False)
    description = Column(Text, nullable=False)
    status = Column(String(50), default="recommended")

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

def run_migration():
    """Run the database migration"""
    print("Starting migration to corrected triangulated analytics...")
    
    db = SessionLocal()
    
    try:
        # Step 1: Add new columns if they don't exist
        print("Step 1: Adding new database columns...")
        try:
            db.execute(text("ALTER TABLE pass_factors ADD COLUMN p_number VARCHAR(10)"))
            db.commit()
            print("  ✓ Added p_number column to pass_factors")
        except Exception:
            print("  ✓ p_number column already exists or not needed")
        
        try:
            db.execute(text("ALTER TABLE cat4_domains ADD COLUMN sas_score FLOAT"))
            db.commit()
            print("  ✓ Added sas_score column to cat4_domains")
        except Exception:
            print("  ✓ sas_score column already exists or not needed")
        
        try:
            db.execute(text("ALTER TABLE cat4_assessments ADD COLUMN fragile_flags INTEGER DEFAULT 0"))
            db.commit()
            print("  ✓ Added fragile_flags column to cat4_assessments")
        except Exception:
            print("  ✓ fragile_flags column already exists or not needed")
        
        try:
            db.execute(text("ALTER TABLE interventions ADD COLUMN trigger VARCHAR(200)"))
            db.commit()
            print("  ✓ Added trigger column to interventions")
        except Exception:
            print("  ✓ trigger column already exists or not needed")
        
        # Step 2: Update PASS factor classifications
        print("\nStep 2: Updating PASS factor classifications...")
        pass_factors = db.query(PassFactor).all()
        updated_count = 0
        
        for factor in pass_factors:
            percentile = factor.percentile
            
            # Apply corrected classification per instruction set
            if percentile >= 65:  # >65 = Strength
                new_level = "strength"
            elif percentile >= 45:  # 45-65 = Balanced
                new_level = "balanced"
            else:  # <45 = At Risk
                new_level = "at-risk"
            
            # Update P-number mapping
            p_number = PASS_P_MAPPING.get(factor.name, 'Unknown')
            
            # Only update if changed
            if factor.level != new_level:
                factor.level = new_level
                updated_count += 1
            
            # Update p_number if column exists
            try:
                if hasattr(factor, 'p_number'):
                    factor.p_number = p_number
            except:
                pass
        
        db.commit()
        print(f"  ✓ Updated {updated_count} PASS factor classifications")
        
        # Step 3: Update CAT4 domain classifications
        print("\nStep 3: Updating CAT4 domain classifications...")
        cat4_domains = db.query(CAT4Domain).all()
        updated_count = 0
        
        for domain in cat4_domains:
            # Convert stanine to SAS
            sas_score = stanine_to_sas(domain.stanine)
            
            # Update SAS score if column exists
            try:
                if hasattr(domain, 'sas_score'):
                    domain.sas_score = sas_score
            except:
                pass
            
            # Apply corrected classification per instruction set
            if sas_score > 110:  # SAS > 110 = Strength
                new_level = "strength"
            elif sas_score >= 90:  # 90-110 = Balanced
                new_level = "balanced"
            else:  # <90 = Weakness
                new_level = "weakness"
            
            # Only update if changed
            if domain.level != new_level:
                domain.level = new_level
                updated_count += 1
        
        db.commit()
        print(f"  ✓ Updated {updated_count} CAT4 domain classifications")
        
        # Step 4: Update academic subject classifications
        print("\nStep 4: Updating academic subject classifications...")
        academic_subjects = db.query(AcademicSubject).all()
        updated_count = 0
        
        for subject in academic_subjects:
            stanine = subject.internal_stanine
            
            # Apply corrected classification per instruction set
            if stanine >= 7:  # 7-9 = Strength
                new_level = "strength"
            elif stanine >= 4:  # 4-6 = Balanced
                new_level = "balanced"
            else:  # 1-3 = Weakness
                new_level = "weakness"
            
            # Only update if changed
            if subject.level != new_level:
                subject.level = new_level
                updated_count += 1
        
        db.commit()
        print(f"  ✓ Updated {updated_count} academic subject classifications")
        
        # Step 5: Recalculate fragile learner status
        print("\nStep 5: Recalculating fragile learner status...")
        
        # Get students with CAT4 data
        students_with_cat4 = db.execute(text("""
            SELECT s.id, s.student_id, s.name, ca.id as cat4_id
            FROM students s
            JOIN cat4_assessments ca ON s.id = ca.student_id
        """)).fetchall()
        
        updated_count = 0
        
        for student_row in students_with_cat4:
            student_id = student_row[0]
            cat4_assessment_id = student_row[3]
            
            # Get CAT4 domains for this student
            domains = db.execute(text("""
                SELECT stanine FROM cat4_domains 
                WHERE assessment_id = :assessment_id
            """), {"assessment_id": cat4_assessment_id}).fetchall()
            
            # Count domains with SAS < 90 (converted from stanine)
            fragile_flags = 0
            for domain_row in domains:
                stanine = domain_row[0]
                sas_score = stanine_to_sas(stanine)
                if sas_score < 90:
                    fragile_flags += 1
            
            # Apply instruction set rule: fragile learner if 2+ domains have SAS < 90
            is_fragile = fragile_flags >= 2
            
            # Update student fragile learner status
            current_status = db.execute(text("""
                SELECT is_fragile_learner FROM students WHERE id = :student_id
            """), {"student_id": student_id}).fetchone()
            
            if current_status and current_status[0] != is_fragile:
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
        
        # Step 6: Clear and regenerate interventions (simplified)
        print("\nStep 6: Clearing old interventions...")
        intervention_count = db.query(Intervention).count()
        if intervention_count > 0:
            db.query(Intervention).delete()
            db.commit()
            print(f"  ✓ Cleared {intervention_count} old interventions")
        
        print("\n" + "="*50)
        print("MIGRATION COMPLETED SUCCESSFULLY!")
        print("="*50)
        
        # Show summary
        print("\nMigration Summary:")
        
        # PASS classifications
        pass_at_risk = db.query(PassFactor).filter(PassFactor.level == 'at-risk').count()
        pass_balanced = db.query(PassFactor).filter(PassFactor.level == 'balanced').count() 
        pass_strength = db.query(PassFactor).filter(PassFactor.level == 'strength').count()
        print(f"PASS: {pass_at_risk} at-risk, {pass_balanced} balanced, {pass_strength} strength")
        
        # CAT4 classifications
        cat4_weakness = db.query(CAT4Domain).filter(CAT4Domain.level == 'weakness').count()
        cat4_balanced = db.query(CAT4Domain).filter(CAT4Domain.level == 'balanced').count()
        cat4_strength = db.query(CAT4Domain).filter(CAT4Domain.level == 'strength').count()
        print(f"CAT4: {cat4_weakness} weakness, {cat4_balanced} balanced, {cat4_strength} strength")
        
        # Fragile learners
        fragile_learners = db.query(Student).filter(Student.is_fragile_learner == True).count()
        total_students = db.query(Student).count()
        print(f"Fragile Learners: {fragile_learners}/{total_students} students")
        
        print("\nThe database has been updated with corrected triangulated analytics!")
        print("Your dashboard should now show accurate classifications.")
        
    except Exception as e:
        print(f"\n✗ MIGRATION FAILED: {str(e)}")
        db.rollback()
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    print("="*60)
    print("STUDENT ANALYTICS DATABASE MIGRATION")
    print("Updating to Corrected Triangulated Analytics Logic") 
    print("="*60)
    
    # Check if we're in the right directory
    if not os.path.exists("app"):
        print("\n⚠️  WARNING: 'app' directory not found!")
        print("Please run this script from the project root directory:")
        print("cd C:\\Workspace\\student-analytics-poc")
        print("python standalone_migration.py")
        sys.exit(1)
    
    # Confirm migration
    confirm = input("\nThis will update all analytics data in the database. Continue? (y/N): ")
    if confirm.lower() != 'y':
        print("Migration cancelled.")
        sys.exit(0)
    
    try:
        run_migration()
    except Exception as e:
        print(f"\n✗ MIGRATION FAILED: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)