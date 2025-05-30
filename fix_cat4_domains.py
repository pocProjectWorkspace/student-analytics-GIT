# fix_cat4_domains.py
"""
Fix missing CAT4 domains by re-processing the CAT4 file
"""

import os
import pandas as pd
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.database import models

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./student_analytics.db")
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def sas_to_stanine(sas: float) -> float:
    """Convert SAS to stanine score"""
    if sas <= 74: return 1
    elif sas <= 81: return 2
    elif sas <= 88: return 3
    elif sas <= 96: return 4
    elif sas <= 103: return 5
    elif sas <= 112: return 6
    elif sas <= 119: return 7
    elif sas <= 127: return 8
    else: return 9

def fix_cat4_domains():
    """Fix missing CAT4 domains by reprocessing the data"""
    print("="*60)
    print("FIXING MISSING CAT4 DOMAINS")
    print("="*60)
    
    cat4_file = input("Enter path to your CAT4 Excel file: ").strip().strip('"')
    
    if not os.path.exists(cat4_file):
        print(f"❌ File not found: {cat4_file}")
        return
    
    db = SessionLocal()
    
    try:
        # Read CAT4 file
        df = pd.read_excel(cat4_file)
        print(f"📋 CAT4 file columns: {df.columns.tolist()}")
        print(f"📋 CAT4 file rows: {len(df)}")
        
        # First, clear existing domains to avoid duplicates
        print("\n🗑️  Clearing existing CAT4 domains...")
        deleted_count = db.execute(text("DELETE FROM cat4_domains")).rowcount
        print(f"   Deleted {deleted_count} existing domain records")
        
        students_processed = 0
        domains_created = 0
        
        for index, row in df.iterrows():
            student_id = str(row.get('Student ID', ''))
            
            if not student_id or student_id == 'nan' or pd.isna(student_id):
                continue
            
            # Find existing student and CAT4 assessment
            student_db = db.query(models.Student).filter(
                models.Student.student_id == student_id
            ).first()
            
            if not student_db:
                continue
            
            cat4_assessment = db.query(models.CAT4Assessment).filter(
                models.CAT4Assessment.student_id == student_db.id
            ).first()
            
            if not cat4_assessment:
                continue
            
            # Get SAS values from Excel
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
            
            # Create CAT4 domains
            domains_added = 0
            for domain_name, sas_score in sas_values.items():
                if sas_score > 0:
                    stanine = sas_to_stanine(sas_score)
                    
                    # Classification per instruction set
                    if sas_score > 110:
                        level = "strength"
                    elif sas_score >= 90:
                        level = "balanced"
                    else:
                        level = "weakness"
                    
                    cat4_domain = models.CAT4Domain(
                        assessment_id=cat4_assessment.id,
                        name=domain_name,
                        stanine=stanine,
                        level=level,
                        sas_score=sas_score
                    )
                    db.add(cat4_domain)
                    domains_added += 1
                    domains_created += 1
            
            if domains_added > 0:
                students_processed += 1
                
                if students_processed % 50 == 0:
                    print(f"   Processed {students_processed} students...")
                    db.commit()
        
        db.commit()
        
        print(f"\n✅ CAT4 domains fix completed!")
        print(f"   Students processed: {students_processed}")
        print(f"   Domains created: {domains_created}")
        
        # Verify the fix
        print(f"\n🔍 Verification:")
        total_domains = db.execute(text("SELECT COUNT(*) FROM cat4_domains")).fetchone()[0]
        print(f"   Total CAT4 domains in database: {total_domains}")
        
        # Check our specific student
        test_student = db.execute(text("""
            SELECT COUNT(*) FROM cat4_domains cd
            JOIN cat4_assessments ca ON cd.assessment_id = ca.id
            JOIN students s ON ca.student_id = s.id
            WHERE s.student_id = '13100100050084'
        """)).fetchone()[0]
        
        print(f"   CAT4 domains for student 13100100050084: {test_student}")
        
        if test_student > 0:
            print(f"🎉 SUCCESS! CAT4 domains are now available!")
        else:
            print(f"⚠️  Student 13100100050084 still has no domains")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    fix_cat4_domains()