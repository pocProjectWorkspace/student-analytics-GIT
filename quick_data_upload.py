# quick_data_upload.py
"""
Quick script to upload PASS and CAT4 data and see immediate results
"""

import os
import requests
import sys

def test_api_upload():
    """Test uploading via API endpoints"""
    base_url = "http://localhost:8001"  # Your server port
    
    print("Testing API upload...")
    
    # Test if server is running
    try:
        response = requests.get(f"{base_url}/health")
        if response.status_code == 200:
            print("✅ Server is running")
        else:
            print("❌ Server not responding properly")
            return
    except:
        print("❌ Server not running. Start with: python run.py")
        return
    
    # Ask for file paths
    pass_file = input("Enter path to PASS Excel file: ").strip().strip('"')
    cat4_file = input("Enter path to CAT4 Excel file: ").strip().strip('"')
    
    # Upload PASS data
    if pass_file and os.path.exists(pass_file):
        print(f"\nUploading PASS data from: {pass_file}")
        try:
            with open(pass_file, 'rb') as f:
                files = {'file': f}
                response = requests.post(f"{base_url}/api/upload/pass", files=files)
            
            if response.status_code == 200:
                print("✅ PASS data uploaded successfully")
                print(f"Response: {response.json()}")
            else:
                print(f"❌ PASS upload failed: {response.status_code}")
                print(f"Error: {response.text}")
        except Exception as e:
            print(f"❌ Error uploading PASS data: {e}")
    else:
        print(f"❌ PASS file not found: {pass_file}")
    
    # Upload CAT4 data
    if cat4_file and os.path.exists(cat4_file):
        print(f"\nUploading CAT4 data from: {cat4_file}")
        try:
            with open(cat4_file, 'rb') as f:
                files = {'file': f}
                response = requests.post(f"{base_url}/api/upload/cat4", files=files)
            
            if response.status_code == 200:
                print("✅ CAT4 data uploaded successfully")
                print(f"Response: {response.json()}")
            else:
                print(f"❌ CAT4 upload failed: {response.status_code}")
                print(f"Error: {response.text}")
        except Exception as e:
            print(f"❌ Error uploading CAT4 data: {e}")
    else:
        print(f"❌ CAT4 file not found: {cat4_file}")
    
    # Test the results
    print("\nTesting results...")
    try:
        response = requests.get(f"{base_url}/api/stats/cohort")
        if response.status_code == 200:
            stats = response.json()
            fragile_count = stats.get('stats', {}).get('fragileLearnersCount', 0)
            print(f"✅ Fragile Learners: {fragile_count}")
            
            if fragile_count > 0:
                print("🎉 SUCCESS! Fragile learners detected - triangulated analytics working!")
            else:
                print("⚠️  Still 0 fragile learners - data might not be matching")
        else:
            print(f"❌ Stats check failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Error checking stats: {e}")

def create_sample_data():
    """Create sample PASS and CAT4 data for testing"""
    print("Creating sample data for testing...")
    
    # This would create sample Excel files with your actual student IDs
    # But you'll need to use your real PASS and CAT4 files
    print("You need to use your actual PASS and CAT4 Excel files.")
    print("Sample data creation not implemented - use real files.")

def main():
    print("="*60)
    print("QUICK DATA UPLOAD TESTER")
    print("="*60)
    
    print("\nThis script will:")
    print("1. Test if your server is running")
    print("2. Upload PASS and CAT4 files via API")
    print("3. Check if fragile learners are detected")
    
    choice = input("\nProceed with upload test? (y/N): ")
    if choice.lower() == 'y':
        test_api_upload()
    else:
        print("Upload cancelled.")
    
    print(f"\n" + "="*60)
    print("After successful upload, refresh your dashboard to see:")
    print("- Fragile learners > 0")
    print("- More interventions")
    print("- Individual student profiles working")
    print("="*60)

if __name__ == "__main__":
    # Check if requests is available
    try:
        import requests
    except ImportError:
        print("Installing requests library...")
        os.system("pip install requests")
        import requests
    
    main()