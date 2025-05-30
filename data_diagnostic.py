# data_diagnostic.py
"""
Script to diagnose what data is actually loaded in the database
"""

import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Database configuration
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./student_analytics.db")
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def diagnose_data():
    """Diagnose what data is actually loaded"""
    print("="*60)
    print("STUDENT DATA DIAGNOSTIC")
    print("="*60)
    
    db = SessionLocal()
    
    try:
        # Basic counts
        print("\n📊 BASIC DATA COUNTS:")
        total_students = db.execute(text("SELECT COUNT(*) FROM students")).fetchone()[0]
        print(f"Total Students: {total_students}")
        
        # PASS data availability
        pass_assessments = db.execute(text("SELECT COUNT(*) FROM pass_assessments")).fetchone()[0]
        pass_factors = db.execute(text("SELECT COUNT(*) FROM pass_factors")).fetchone()[0]
        students_with_pass = db.execute(text("""
            SELECT COUNT(DISTINCT s.id) 
            FROM students s 
            JOIN pass_assessments pa ON s.id = pa.student_id
        """)).fetchone()[0]
        
        print(f"\n📋 PASS DATA:")
        print(f"PASS Assessments: {pass_assessments}")
        print(f"PASS Factors: {pass_factors}")
        print(f"Students with PASS data: {students_with_pass} / {total_students} ({students_with_pass/total_students*100:.1f}%)")
        
        # CAT4 data availability
        cat4_assessments = db.execute(text("SELECT COUNT(*) FROM cat4_assessments")).fetchone()[0]
        cat4_domains = db.execute(text("SELECT COUNT(*) FROM cat4_domains")).fetchone()[0]
        students_with_cat4 = db.execute(text("""
            SELECT COUNT(DISTINCT s.id) 
            FROM students s 
            JOIN cat4_assessments ca ON s.id = ca.student_id
        """)).fetchone()[0]
        
        print(f"\n🧠 CAT4 DATA:")
        print(f"CAT4 Assessments: {cat4_assessments}")
        print(f"CAT4 Domains: {cat4_domains}")
        print(f"Students with CAT4 data: {students_with_cat4} / {total_students} ({students_with_cat4/total_students*100:.1f}%)")
        
        # Academic data availability
        academic_assessments = db.execute(text("SELECT COUNT(*) FROM academic_assessments")).fetchone()[0]
        academic_subjects = db.execute(text("SELECT COUNT(*) FROM academic_subjects")).fetchone()[0]
        students_with_academic = db.execute(text("""
            SELECT COUNT(DISTINCT s.id) 
            FROM students s 
            JOIN academic_assessments aa ON s.id = aa.student_id
        """)).fetchone()[0]
        
        print(f"\n📚 ACADEMIC DATA:")
        print(f"Academic Assessments: {academic_assessments}")
        print(f"Academic Subjects: {academic_subjects}")
        print(f"Students with Academic data: {students_with_academic} / {total_students} ({students_with_academic/total_students*100:.1f}%)")
        
        # Check for complete data (triangulated students)
        complete_students = db.execute(text("""
            SELECT COUNT(DISTINCT s.id) 
            FROM students s 
            JOIN pass_assessments pa ON s.id = pa.student_id
            JOIN cat4_assessments ca ON s.id = ca.student_id
            JOIN academic_assessments aa ON s.id = aa.student_id
        """)).fetchone()[0]
        
        print(f"\n🔄 TRIANGULATED DATA:")
        print(f"Students with ALL three data types: {complete_students} / {total_students} ({complete_students/total_students*100:.1f}%)")
        
        # Current fragile learner status
        current_fragile = db.execute(text("SELECT COUNT(*) FROM students WHERE is_fragile_learner = 1")).fetchone()[0]
        print(f"\n⚠️  CURRENT FRAGILE LEARNERS: {current_fragile}")
        
        # Check CAT4 domain levels
        if cat4_domains > 0:
            cat4_weakness_count = db.execute(text("SELECT COUNT(*) FROM cat4_domains WHERE level = 'weakness'")).fetchone()[0]
            cat4_balanced_count = db.execute(text("SELECT COUNT(*) FROM cat4_domains WHERE level = 'balanced'")).fetchone()[0]
            cat4_strength_count = db.execute(text("SELECT COUNT(*) FROM cat4_domains WHERE level = 'strength'")).fetchone()[0]
            
            print(f"\n🧠 CAT4 DOMAIN LEVELS:")
            print(f"Weakness: {cat4_weakness_count}")
            print(f"Balanced: {cat4_balanced_count}")
            print(f"Strength: {cat4_strength_count}")
            
            # Check SAS scores
            sas_scores = db.execute(text("""
                SELECT name, stanine, sas_score, level 
                FROM cat4_domains 
                WHERE sas_score IS NOT NULL 
                LIMIT 5
            """)).fetchall()
            
            if sas_scores:
                print(f"\n🔢 SAMPLE CAT4 SAS SCORES:")
                for name, stanine, sas_score, level in sas_scores:
                    print(f"  {name}: Stanine {stanine} → SAS {sas_score} → {level}")
        
        # Check PASS factor levels
        if pass_factors > 0:
            pass_at_risk_count = db.execute(text("SELECT COUNT(*) FROM pass_factors WHERE level = 'at-risk'")).fetchone()[0]
            pass_balanced_count = db.execute(text("SELECT COUNT(*) FROM pass_factors WHERE level = 'balanced'")).fetchone()[0]
            pass_strength_count = db.execute(text("SELECT COUNT(*) FROM pass_factors WHERE level = 'strength'")).fetchone()[0]
            
            print(f"\n📋 PASS FACTOR LEVELS:")
            print(f"At-Risk: {pass_at_risk_count}")
            print(f"Balanced: {pass_balanced_count}")
            print(f"Strength: {pass_strength_count}")
            
            # Sample PASS factors
            pass_samples = db.execute(text("""
                SELECT name, percentile, level 
                FROM pass_factors 
                LIMIT 5
            """)).fetchall()
            
            print(f"\n📊 SAMPLE PASS FACTORS:")
            for name, percentile, level in pass_samples:
                print(f"  {name}: {percentile}% → {level}")
        
        # Check academic levels
        if academic_subjects > 0:
            academic_weakness_count = db.execute(text("SELECT COUNT(*) FROM academic_subjects WHERE level = 'weakness'")).fetchone()[0]
            academic_balanced_count = db.execute(text("SELECT COUNT(*) FROM academic_subjects WHERE level = 'balanced'")).fetchone()[0]
            academic_strength_count = db.execute(text("SELECT COUNT(*) FROM academic_subjects WHERE level = 'strength'")).fetchone()[0]
            
            print(f"\n📚 ACADEMIC SUBJECT LEVELS:")
            print(f"Weakness: {academic_weakness_count}")
            print(f"Balanced: {academic_balanced_count}")
            print(f"Strength: {academic_strength_count}")
        
        # Check a few sample students in detail
        print(f"\n👥 SAMPLE STUDENT ANALYSIS:")
        sample_students = db.execute(text("""
            SELECT s.id, s.student_id, s.name, s.is_fragile_learner,
                   (SELECT COUNT(*) FROM pass_assessments pa WHERE pa.student_id = s.id) as has_pass,
                   (SELECT COUNT(*) FROM cat4_assessments ca WHERE ca.student_id = s.id) as has_cat4,
                   (SELECT COUNT(*) FROM academic_assessments aa WHERE aa.student_id = s.id) as has_academic
            FROM students s
            LIMIT 10
        """)).fetchall()
        
        for student in sample_students:
            student_id, external_id, name, is_fragile, has_pass, has_cat4, has_academic = student
            data_types = []
            if has_pass: data_types.append("PASS")
            if has_cat4: data_types.append("CAT4")
            if has_academic: data_types.append("Academic")
            
            print(f"  {external_id} - {name}")
            print(f"    Data: {', '.join(data_types) if data_types else 'None'}")
            print(f"    Fragile: {'Yes' if is_fragile else 'No'}")
        
        # Identify the issue
        print(f"\n🔍 DIAGNOSIS:")
        if students_with_pass < total_students * 0.5:
            print("❌ Issue: Most students are missing PASS data")
            print("   Solution: Upload PASS data for more students")
        
        if students_with_cat4 < total_students * 0.5:
            print("❌ Issue: Most students are missing CAT4 data")
            print("   Solution: Upload CAT4 data for more students")
        
        if complete_students < total_students * 0.1:
            print("❌ Issue: Very few students have complete triangulated data")
            print("   Solution: Ensure all data types are uploaded for the same students")
        
        if current_fragile == 0 and cat4_domains > 0:
            print("❌ Issue: No fragile learners despite having CAT4 data")
            print("   Solution: Check fragile learner calculation logic")
            
            # Debug fragile learner calculation
            potential_fragile = db.execute(text("""
                SELECT s.student_id, s.name, 
                       COUNT(cd.id) as total_domains,
                       COUNT(CASE WHEN cd.sas_score < 90 OR (cd.sas_score IS NULL AND cd.stanine <= 3) THEN 1 END) as weak_domains
                FROM students s
                JOIN cat4_assessments ca ON s.id = ca.student_id
                JOIN cat4_domains cd ON ca.id = cd.assessment_id
                GROUP BY s.id, s.student_id, s.name
                HAVING weak_domains >= 2
                LIMIT 5
            """)).fetchall()
            
            if potential_fragile:
                print(f"\n🔍 POTENTIAL FRAGILE LEARNERS FOUND:")
                for student_id, name, total_domains, weak_domains in potential_fragile:
                    print(f"  {student_id} - {name}: {weak_domains}/{total_domains} weak domains")
                print("   → These students should be marked as fragile learners")
        
        print(f"\n" + "="*60)
        print("DIAGNOSTIC COMPLETE")
        print("="*60)
        
    except Exception as e:
        print(f"Error during diagnosis: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    if not os.path.exists("app"):
        print("Please run from project root directory")
        sys.exit(1)
    
    diagnose_data()