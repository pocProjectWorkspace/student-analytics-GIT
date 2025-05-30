# simple_upload_tester.py
"""
Simple script to test and upload PASS/CAT4 data
"""

import requests
import os
import sys

def check_server():
    """Check if server is running"""
    try:
        response = requests.get("http://localhost:8001/health", timeout=5)
        if response.status_code == 200:
            print("✅ Server is running on port 8001")
            return True
    except:
        pass
    
    try:
        response = requests.get("http://localhost:8000/health", timeout=5)
        if response.status_code == 200:
            print("✅ Server is running on port 8000")
            return "http://localhost:8000"
    except:
        pass
    
    print("❌ Server not running. Please start with: python run.py")
    return False

def upload_file(file_path, endpoint_url, file_type):
    """Upload a file to the specified endpoint"""
    if not os.path.exists(file_path):
        print(f"❌ File not found: {file_path}")
        return False
    
    print(f"\n📤 Uploading {file_type} data from: {file_path}")
    
    try:
        with open(file_path, 'rb') as f:
            files = {'file': (os.path.basename(file_path), f, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')}
            response = requests.post(endpoint_url, files=files, timeout=60)
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ {file_type} upload successful!")
            print(f"   Response: {result.get('message', 'Success')}")
            return True
        else:
            print(f"❌ {file_type} upload failed!")
            print(f"   Status Code: {response.status_code}")
            print(f"   Error: {response.text[:500]}")  # Limit error message length
            return False
            
    except requests.exceptions.Timeout:
        print(f"❌ {file_type} upload timed out (file might be too large)")
        return False
    except Exception as e:
        print(f"❌ {file_type} upload error: {str(e)}")
        return False

def check_results(server_url):
    """Check upload results"""
    print(f"\n🔍 Checking results...")
    
    try:
        # Check cohort stats
        response = requests.get(f"{server_url}/api/stats/cohort", timeout=10)
        if response.status_code == 200:
            stats = response.json()
            fragile_count = stats.get('stats', {}).get('fragileLearnersCount', 0)
            print(f"📊 Current Statistics:")
            print(f"   Fragile Learners: {fragile_count}")
            
            # Get intervention counts
            interventions_by_domain = stats.get('stats', {}).get('interventionsByDomain', {})
            total_interventions = sum(interventions_by_domain.values())
            print(f"   Total Interventions: {total_interventions}")
            
            if fragile_count > 0:
                print("🎉 SUCCESS! Fragile learners detected - data upload worked!")
            else:
                print("⚠️  Still 0 fragile learners - checking database...")
                # Run quick database check
                check_database_direct()
                
            return fragile_count > 0
        else:
            print(f"❌ Stats check failed: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Error checking results: {e}")
        return False

def check_database_direct():
    """Direct database check"""
    try:
        from sqlalchemy import create_engine, text
        from sqlalchemy.orm import sessionmaker
        
        DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./student_analytics.db")
        engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {})
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        
        db = SessionLocal()
        
        pass_count = db.execute(text("SELECT COUNT(*) FROM pass_assessments")).fetchone()[0]
        cat4_count = db.execute(text("SELECT COUNT(*) FROM cat4_assessments")).fetchone()[0]
        
        print(f"📋 Database Check:")
        print(f"   PASS Assessments: {pass_count}")
        print(f"   CAT4 Assessments: {cat4_count}")
        
        if pass_count > 0 or cat4_count > 0:
            print("✅ Data was uploaded to database!")
        else:
            print("❌ No data found in database - upload may have failed")
            
        db.close()
        
    except Exception as e:
        print(f"❌ Database check error: {e}")

def main():
    print("="*60)
    print("STUDENT ANALYTICS - DATA UPLOAD TESTER")
    print("="*60)
    
    # Check if server is running
    server_url = check_server()
    if not server_url:
        return
    
    if isinstance(server_url, bool):
        server_url = "http://localhost:8001"  # Default
    
    print(f"\nUsing server: {server_url}")
    
    # Get file paths
    print(f"\n📁 Please provide the Excel file paths:")
    print("   (You can drag and drop files to get their paths)")
    
    pass_file = input("\nPASS Excel file path: ").strip().strip('"')
    cat4_file = input("CAT4 Excel file path: ").strip().strip('"')
    
    if not pass_file and not cat4_file:
        print("❌ No files provided")
        return
    
    # Upload files
    success_count = 0
    
    if pass_file:
        if upload_file(pass_file, f"{server_url}/api/upload/pass", "PASS"):
            success_count += 1
    
    if cat4_file:
        if upload_file(cat4_file, f"{server_url}/api/upload/cat4", "CAT4"):
            success_count += 1
    
    if success_count > 0:
        # Check results
        if check_results(server_url):
            print(f"\n🎉 SUCCESS! Data uploaded and working!")
            print(f"\nNext steps:")
            print(f"1. Refresh your dashboard: http://localhost:5173/dashboard")
            print(f"2. You should now see:")
            print(f"   - Fragile learners > 0")
            print(f"   - More interventions")
            print(f"   - PASS and CAT4 data in student profiles")
        else:
            print(f"\n⚠️  Upload completed but results unclear")
            print(f"Try refreshing your dashboard and running:")
            print(f"python data_diagnostic.py")
    else:
        print(f"\n❌ Upload failed - check file paths and server logs")
    
    print(f"\n" + "="*60)

if __name__ == "__main__":
    # Install requests if needed
    try:
        import requests
    except ImportError:
        print("Installing requests...")
        os.system("pip install requests")
        import requests
    
    main()