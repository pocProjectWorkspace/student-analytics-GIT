# check_cat4_data.py
"""
Check CAT4 data for specific student
"""

import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./student_analytics.db")
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def check_specific_student_cat4(student_id="13100100050084"):
    """Check CAT4 data for specific student"""
    print("="*60)
    print(f"CHECKING CAT4 DATA FOR STUDENT: {student_id}")
    print("="*60)
    
    db = SessionLocal()
    
    try:
        # Check if student exists
        student = db.execute(text("""
            SELECT id, student_id, name, is_fragile_learner 
            FROM students 
            WHERE student_id = :student_id
        """), {"student_id": student_id}).fetchone()
        
        if not student:
            print(f"❌ Student {student_id} not found in database")
            return
        
        internal_id, external_id, name, is_fragile = student
        print(f"✅ Student found: {external_id} - {name}")
        print(f"   Internal ID: {internal_id}")
        print(f"   Fragile Learner: {is_fragile}")
        
        # Check CAT4 assessment
        cat4_assessment = db.execute(text("""
            SELECT id, is_fragile_learner, average_stanine, fragile_flags
            FROM cat4_assessments 
            WHERE student_id = :student_id
        """), {"student_id": internal_id}).fetchone()
        
        if not cat4_assessment:
            print(f"❌ No CAT4 assessment found for student {student_id}")
            print(f"   This explains why CAT4 shows as unavailable")
        else:
            assessment_id, cat4_fragile, avg_stanine, fragile_flags = cat4_assessment
            print(f"✅ CAT4 assessment found:")
            print(f"   Assessment ID: {assessment_id}")
            print(f"   Fragile Learner: {cat4_fragile}")
            print(f"   Average Stanine: {avg_stanine}")
            print(f"   Fragile Flags: {fragile_flags}")
            
            # Check CAT4 domains
            domains = db.execute(text("""
                SELECT name, stanine, level, sas_score
                FROM cat4_domains 
                WHERE assessment_id = :assessment_id
            """), {"assessment_id": assessment_id}).fetchall()
            
            if domains:
                print(f"✅ CAT4 domains found ({len(domains)}):")
                for name, stanine, level, sas_score in domains:
                    print(f"   {name}: Stanine {stanine}, SAS {sas_score}, Level {level}")
            else:
                print(f"❌ No CAT4 domains found for assessment {assessment_id}")
        
        # Check what CAT4 data exists overall
        print(f"\n📊 Overall CAT4 Data Count:")
        total_cat4_assessments = db.execute(text("SELECT COUNT(*) FROM cat4_assessments")).fetchone()[0]
        total_cat4_domains = db.execute(text("SELECT COUNT(*) FROM cat4_domains")).fetchone()[0]
        print(f"   Total CAT4 Assessments: {total_cat4_assessments}")
        print(f"   Total CAT4 Domains: {total_cat4_domains}")
        
        # Check if this student exists in uploaded CAT4 file range
        print(f"\n🔍 Student ID Analysis:")
        if student_id.startswith("131001000500"):
            print(f"   Student ID {student_id} looks like it should have CAT4 data")
            print(f"   (ID range suggests it's from CAT4 upload batch)")
        elif student_id.startswith("131001000363"):
            print(f"   Student ID {student_id} is from academic-only batch")
            print(f"   (This student might not be in your CAT4 file)")
        
        # Check sample CAT4 student IDs
        sample_cat4_students = db.execute(text("""
            SELECT s.student_id, s.name 
            FROM students s
            JOIN cat4_assessments ca ON s.id = ca.student_id
            LIMIT 5
        """)).fetchall()
        
        if sample_cat4_students:
            print(f"\n📋 Sample students WITH CAT4 data:")
            for sid, sname in sample_cat4_students:
                print(f"   {sid} - {sname}")
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    # Check the specific student
    check_specific_student_cat4("13100100050084")
    
    print(f"\n" + "="*60)
    print("If CAT4 data is missing for this student:")
    print("1. Check if this student ID is in your CAT4 Excel file")
    print("2. Re-upload CAT4 data if needed")
    print("3. Or provide CAT4 file with matching student IDs")
    print("="*60)