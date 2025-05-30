# inspect_database.py
"""
Script to inspect the current database structure and understand the schema
"""

import os
import sys
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.orm import sessionmaker
import json

# Database configuration
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./student_analytics.db")

# Create database connection
engine = create_engine(
    DATABASE_URL, 
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def inspect_database():
    """Inspect the complete database structure"""
    print("="*60)
    print("DATABASE STRUCTURE INSPECTION")
    print("="*60)
    
    db = SessionLocal()
    inspector = inspect(engine)
    
    try:
        # Get all tables
        table_names = inspector.get_table_names()
        print(f"\nFound {len(table_names)} tables:")
        
        for table_name in sorted(table_names):
            print(f"\n📋 TABLE: {table_name}")
            print("-" * 40)
            
            # Get columns
            columns = inspector.get_columns(table_name)
            print("COLUMNS:")
            for col in columns:
                col_type = str(col['type'])
                nullable = "NULL" if col['nullable'] else "NOT NULL"
                default = f" DEFAULT {col['default']}" if col['default'] else ""
                print(f"  • {col['name']:<30} {col_type:<15} {nullable}{default}")
            
            # Get sample data
            try:
                sample_data = db.execute(text(f"SELECT * FROM {table_name} LIMIT 3")).fetchall()
                if sample_data:
                    print(f"\nSAMPLE DATA ({len(sample_data)} rows):")
                    for i, row in enumerate(sample_data):
                        print(f"  Row {i+1}: {dict(row._mapping) if hasattr(row, '_mapping') else dict(row)}")
                else:
                    print("\nSAMPLE DATA: No data found")
            except Exception as e:
                print(f"\nSAMPLE DATA: Could not fetch data - {e}")
            
            # Get foreign keys
            try:
                foreign_keys = inspector.get_foreign_keys(table_name)
                if foreign_keys:
                    print("\nFOREIGN KEYS:")
                    for fk in foreign_keys:
                        print(f"  • {fk['constrained_columns']} -> {fk['referred_table']}.{fk['referred_columns']}")
            except Exception as e:
                print(f"\nFOREIGN KEYS: Could not fetch - {e}")
        
        print("\n" + "="*60)
        print("INSPECTION COMPLETE")
        print("="*60)
        
        # Check for specific issues
        print("\n🔍 CHECKING FOR COMMON ISSUES:")
        
        # Check pass_assessments structure
        if 'pass_assessments' in table_names:
            pass_columns = [col['name'] for col in inspector.get_columns('pass_assessments')]
            print(f"\n• pass_assessments columns: {pass_columns}")
            
            expected_pass_columns = [
                'perceived_learning_capability', 'confidence_in_learning', 'self_regard_as_learner',
                'attitudes_to_teachers', 'response_to_curriculum', 'general_work_ethic',
                'preparedness_for_learning', 'attitudes_to_attendance', 'feelings_about_school'
            ]
            
            missing_columns = [col for col in expected_pass_columns if col not in pass_columns]
            if missing_columns:
                print(f"  ⚠️  Missing PASS columns: {missing_columns}")
            else:
                print("  ✅ All expected PASS columns found")
        
        # Check academic_subjects structure  
        if 'academic_subjects' in table_names:
            academic_columns = [col['name'] for col in inspector.get_columns('academic_subjects')]
            print(f"\n• academic_subjects columns: {academic_columns}")
            
            stanine_columns = [col for col in academic_columns if 'stanine' in col.lower()]
            if stanine_columns:
                print(f"  ✅ Found stanine columns: {stanine_columns}")
            else:
                print("  ⚠️  No stanine columns found")
        
        # Check cat4_domains structure
        if 'cat4_domains' in table_names:
            cat4_columns = [col['name'] for col in inspector.get_columns('cat4_domains')]
            print(f"\n• cat4_domains columns: {cat4_columns}")
            
            if 'sas_score' in cat4_columns:
                print("  ✅ SAS score column found")
            else:
                print("  ⚠️  SAS score column missing")
        
        # Generate corrected model suggestions
        print("\n📝 SUGGESTED NEXT STEPS:")
        print("1. Review the database structure above")
        print("2. Check if your actual table structure matches your models")
        print("3. Run the appropriate migration based on findings")
        
    except Exception as e:
        print(f"Error during inspection: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    if not os.path.exists("app"):
        print("\n⚠️  WARNING: 'app' directory not found!")
        print("Please run this script from the project root directory")
        sys.exit(1)
    
    inspect_database()