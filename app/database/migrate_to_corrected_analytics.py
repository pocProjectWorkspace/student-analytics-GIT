# app/database/migrate_to_corrected_analytics.py
"""
Migration script to update existing database with corrected triangulated analytics
following the instruction set for AI-based student profiling.
"""

import sys
import os

# Add the project root directory to Python path
project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, project_root)

# Now we can import from app
try:
    from sqlalchemy.orm import Session
    from sqlalchemy import text
    from app.database.database import engine, SessionLocal
    from app.database import models
    from app.engine.triangulated_analytics import TriangulatedAnalyticsEngine
except ImportError as e:
    print(f"Import error: {e}")
    print(f"Current directory: {os.getcwd()}")
    print(f"Project root: {project_root}")
    print("Please run this script from the project root directory:")
    print("python app/database/migrate_to_corrected_analytics.py")
    sys.exit(1)

def migrate_to_corrected_analytics():
    """
    Main migration function to update database with corrected analytics logic
    """
    print("Starting migration to corrected triangulated analytics...")
    
    db = SessionLocal()
    analytics_engine = TriangulatedAnalyticsEngine()
    
    try:
        # Step 1: Add new columns if they don't exist
        print("Step 1: Adding new database columns...")
        add_new_columns(db)
        
        # Step 2: Update PASS factor classifications
        print("Step 2: Updating PASS factor classifications...")
        update_pass_classifications(db, analytics_engine)
        
        # Step 3: Update CAT4 domain classifications and fragile learner status
        print("Step 3: Updating CAT4 classifications and fragile learner status...")
        update_cat4_classifications(db, analytics_engine)
        
        # Step 4: Update academic subject classifications
        print("Step 4: Updating academic subject classifications...")
        update_academic_classifications(db, analytics_engine)
        
        # Step 5: Recalculate student fragile learner status
        print("Step 5: Recalculating fragile learner status...")
        recalculate_fragile_learner_status(db, analytics_engine)
        
        # Step 6: Update intervention mappings
        print("Step 6: Updating intervention mappings...")
        update_intervention_mappings(db, analytics_engine)
        
        # Step 7: Generate corrected analytics for all students
        print("Step 7: Generating corrected analytics for all students...")
        regenerate_student_analytics(db, analytics_engine)
        
        db.commit()
        print("Migration completed successfully!")
        
    except Exception as e:
        print(f"Migration failed: {str(e)}")
        db.rollback()
        raise e
    finally:
        db.close()

def add_new_columns(db: Session):
    """Add new columns needed for corrected analytics"""
    try:
        # Add P-number mapping to PassFactor
        db.execute(text("""
            ALTER TABLE pass_factors 
            ADD COLUMN IF NOT EXISTS p_number VARCHAR(10)
        """))
        
        # Add SAS score storage to CAT4Domain
        db.execute(text("""
            ALTER TABLE cat4_domains 
            ADD COLUMN IF NOT EXISTS sas_score FLOAT
        """))
        
        # Add fragile flags count to CAT4Assessment
        db.execute(text("""
            ALTER TABLE cat4_assessments 
            ADD COLUMN IF NOT EXISTS fragile_flags INTEGER DEFAULT 0
        """))
        
        # Add trigger column to Intervention
        db.execute(text("""
            ALTER TABLE interventions 
            ADD COLUMN IF NOT EXISTS trigger VARCHAR(200)
        """))
        
        db.commit()
        print("  ✓ New columns added successfully")
        
    except Exception as e:
        print(f"  ✗ Error adding columns: {str(e)}")
        # Continue migration even if columns already exist

def update_pass_classifications(db: Session, analytics_engine: TriangulatedAnalyticsEngine):
    """Update PASS factor classifications according to instruction set"""
    pass_factors = db.query(models.PassFactor).all()
    updated_count = 0
    
    for factor in pass_factors:
        percentile = factor.percentile
        
        # Apply corrected classification per instruction set
        if percentile >= 65:  # >65 → Strength
            new_level = "strength"
        elif percentile >= 45:  # 45-65 → Balanced
            new_level = "balanced"
        else:  # <45 → At Risk
            new_level = "at-risk"
        
        # Update P-number mapping
        p_number = analytics_engine.pass_p_mapping.get(factor.name, 'Unknown')
        
        # Only update if changed
        if factor.level != new_level or factor.p_number != p_number:
            factor.level = new_level
            factor.p_number = p_number
            updated_count += 1
    
    db.commit()
    print(f"  ✓ Updated {updated_count} PASS factor classifications")

def update_cat4_classifications(db: Session, analytics_engine: TriangulatedAnalyticsEngine):
    """Update CAT4 domain classifications according to instruction set"""
    cat4_domains = db.query(models.CAT4Domain).all()
    updated_count = 0
    
    for domain in cat4_domains:
        # Convert stanine to SAS if SAS not already stored
        if not hasattr(domain, 'sas_score') or not domain.sas_score:
            sas_score = analytics_engine._stanine_to_sas(domain.stanine)
            domain.sas_score = sas_score
        else:
            sas_score = domain.sas_score
        
        # Apply corrected classification per instruction set
        if sas_score > 110:  # SAS > 110 → Strength
            new_level = "strength"
        elif sas_score >= 90:  # 90-110 → Balanced
            new_level = "balanced"
        else:  # <90 → Weakness
            new_level = "weakness"
        
        # Only update if changed
        if domain.level != new_level:
            domain.level = new_level
            updated_count += 1
    
    db.commit()
    print(f"  ✓ Updated {updated_count} CAT4 domain classifications")

def update_academic_classifications(db: Session, analytics_engine: TriangulatedAnalyticsEngine):
    """Update academic subject classifications according to instruction set"""
    academic_subjects = db.query(models.AcademicSubject).all()
    updated_count = 0
    
    for subject in academic_subjects:
        stanine = subject.internal_stanine
        
        # Apply corrected classification per instruction set
        if stanine >= 7:  # 7-9 → Strength
            new_level = "strength"
        elif stanine >= 4:  # 4-6 → Balanced
            new_level = "balanced"
        else:  # 1-3 → Weakness
            new_level = "weakness"
        
        # Only update if changed
        if subject.level != new_level:
            subject.level = new_level
            updated_count += 1
    
    db.commit()
    print(f"  ✓ Updated {updated_count} academic subject classifications")

def recalculate_fragile_learner_status(db: Session, analytics_engine: TriangulatedAnalyticsEngine):
    """Recalculate fragile learner status according to instruction set"""
    students = db.query(models.Student).all()
    updated_count = 0
    
    for student in students:
        if student.cat4_assessment and student.cat4_assessment.domains:
            # Count domains with SAS < 90
            fragile_flags = 0
            for domain in student.cat4_assessment.domains:
                sas_score = getattr(domain, 'sas_score', None)
                if not sas_score:
                    sas_score = analytics_engine._stanine_to_sas(domain.stanine)
                    domain.sas_score = sas_score
                
                if sas_score < 90:
                    fragile_flags += 1
            
            # Apply instruction set rule: fragile learner if 2+ domains have SAS < 90
            is_fragile = fragile_flags >= 2
            
            # Update fragile flags count
            student.cat4_assessment.fragile_flags = fragile_flags
            
            # Only update if changed
            if student.is_fragile_learner != is_fragile:
                student.is_fragile_learner = is_fragile
                student.cat4_assessment.is_fragile_learner = is_fragile
                updated_count += 1
    
    db.commit()
    print(f"  ✓ Updated fragile learner status for {updated_count} students")

def update_intervention_mappings(db: Session, analytics_engine: TriangulatedAnalyticsEngine):
    """Update intervention mappings according to instruction set"""
    # For now, we'll clear existing interventions and regenerate them
    # In a production system, you might want to preserve existing interventions
    # and only update the trigger mapping
    
    intervention_count = db.query(models.Intervention).count()
    if intervention_count > 0:
        print(f"  ! Found {intervention_count} existing interventions - these will be regenerated")
        db.query(models.Intervention).delete()
        db.commit()
    
    print("  ✓ Intervention mappings will be regenerated in next step")

def regenerate_student_analytics(db: Session, analytics_engine: TriangulatedAnalyticsEngine):
    """Regenerate analytics for all students using corrected logic"""
    students = db.query(models.Student).all()
    processed_count = 0
    
    for student in students:
        try:
            # Generate corrected analytics
            analysis_result = analytics_engine.process_student_data(student, db)
            
            # Create new interventions based on corrected logic
            for intervention_data in analysis_result['interventions']:
                intervention = models.Intervention(
                    student_id=student.id,
                    trigger=intervention_data['trigger'],
                    domain=intervention_data['domain'],
                    intervention_type=intervention_data['intervention'],
                    priority=intervention_data['priority'],
                    description=intervention_data['description'],
                    status="recommended"
                )
                db.add(intervention)
            
            processed_count += 1
            
            if processed_count % 10 == 0:
                print(f"  ... Processed {processed_count}/{len(students)} students")
                db.commit()
        
        except Exception as e:
            print(f"  ✗ Error processing student {student.student_id}: {str(e)}")
            continue
    
    db.commit()
    print(f"  ✓ Regenerated analytics for {processed_count} students")

def verify_migration(db: Session):
    """Verify that the migration was successful"""
    print("\nVerifying migration results...")
    
    # Check PASS classifications
    pass_at_risk = db.query(models.PassFactor).filter(models.PassFactor.level == 'at-risk').count()
    pass_balanced = db.query(models.PassFactor).filter(models.PassFactor.level == 'balanced').count()
    pass_strength = db.query(models.PassFactor).filter(models.PassFactor.level == 'strength').count()
    
    print(f"PASS Classifications: {pass_at_risk} at-risk, {pass_balanced} balanced, {pass_strength} strength")
    
    # Check CAT4 classifications
    cat4_weakness = db.query(models.CAT4Domain).filter(models.CAT4Domain.level == 'weakness').count()
    cat4_balanced = db.query(models.CAT4Domain).filter(models.CAT4Domain.level == 'balanced').count()
    cat4_strength = db.query(models.CAT4Domain).filter(models.CAT4Domain.level == 'strength').count()
    
    print(f"CAT4 Classifications: {cat4_weakness} weakness, {cat4_balanced} balanced, {cat4_strength} strength")
    
    # Check fragile learners
    fragile_learners = db.query(models.Student).filter(models.Student.is_fragile_learner == True).count()
    total_students = db.query(models.Student).count()
    
    print(f"Fragile Learners: {fragile_learners}/{total_students} students ({fragile_learners/total_students*100:.1f}%)")
    
    # Check interventions
    intervention_count = db.query(models.Intervention).count()
    print(f"Generated Interventions: {intervention_count}")
    
    # Check intervention distribution by domain
    intervention_domains = db.execute(text("""
        SELECT domain, COUNT(*) as count 
        FROM interventions 
        GROUP BY domain 
        ORDER BY count DESC
    """)).fetchall()
    
    print("Intervention Distribution:")
    for domain, count in intervention_domains:
        print(f"  {domain}: {count}")

if __name__ == "__main__":
    print("=" * 60)
    print("STUDENT ANALYTICS DATABASE MIGRATION")
    print("Updating to Corrected Triangulated Analytics Logic")
    print("=" * 60)
    
    # Confirm migration
    confirm = input("\nThis will update all analytics data in the database. Continue? (y/N): ")
    if confirm.lower() != 'y':
        print("Migration cancelled.")
        sys.exit(0)
    
    try:
        migrate_to_corrected_analytics()
        
        # Verify results
        db = SessionLocal()
        verify_migration(db)
        db.close()
        
        print("\n" + "=" * 60)
        print("MIGRATION COMPLETED SUCCESSFULLY!")
        print("=" * 60)
        print("\nThe database has been updated with corrected triangulated analytics.")
        print("All student data now follows the instruction set logic:")
        print("- PASS: >65 Strength, 45-65 Balanced, <45 At Risk")
        print("- CAT4: SAS >110 Strength, 90-110 Balanced, <90 Weakness")
        print("- Academic: Stanine 7-9 Strength, 4-6 Balanced, 1-3 Weakness")
        print("- Fragile Learner: 2+ CAT4 domains with SAS < 90")
        print("- Interventions: Mapped according to instruction set triggers")
        
    except Exception as e:
        print(f"\n✗ MIGRATION FAILED: {str(e)}")
        sys.exit(1)