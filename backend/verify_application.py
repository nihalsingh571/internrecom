import os
import django
import sys

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'internconnect_backend.settings')
django.setup()

from users.models import User
from core.models import RecruiterProfile, Internship, ApplicantProfile, Application
from core.serializers import ApplicationSerializer

def verify_application_flow():
    print("--- Starting Application Flow Verification ---")
    
    # 1. Setup Data
    recruiter_user = User.objects.filter(email="recruiter_app_test@test.com").first()
    if not recruiter_user:
        recruiter_user = User.objects.create(username="recruiter_app_test@test.com", email="recruiter_app_test@test.com", role='RECRUITER')
    
    recruiter_profile, _ = RecruiterProfile.objects.get_or_create(user=recruiter_user, defaults={'company_name': 'App Test Corp'})
    
    internship, _ = Internship.objects.get_or_create(
        recruiter=recruiter_profile,
        title="Application Test Job",
        defaults={'description': 'Test', 'required_skills': ['Python']}
    )
    
    # Create two students with different VSPS
    s1_user = User.objects.filter(email="student1@test.com").first()
    if not s1_user: s1_user = User.objects.create(username="student1@test.com", email="student1@test.com", role='APPLICANT')
    s1_profile, _ = ApplicantProfile.objects.get_or_create(user=s1_user, defaults={'vsps_score': 0.8})
    
    s2_user = User.objects.filter(email="student2@test.com").first()
    if not s2_user: s2_user = User.objects.create(username="student2@test.com", email="student2@test.com", role='APPLICANT')
    s2_profile, _ = ApplicantProfile.objects.get_or_create(user=s2_user, defaults={'vsps_score': 0.95}) # Higher Score

    # Clear existing applications for test
    Application.objects.filter(internship=internship).delete()

    # 2. Apply
    print(f"Applying for {s1_user.email} (VSPS: {s1_profile.vsps_score})")
    Application.objects.create(internship=internship, applicant=s1_profile)
    
    print(f"Applying for {s2_user.email} (VSPS: {s2_profile.vsps_score})")
    Application.objects.create(internship=internship, applicant=s2_profile)

    # 3. Verify Recruiter View (Sorted by VSPS)
    print("Fetching applications for Recruiter...")
    applications = Application.objects.filter(internship=internship).order_by('-applicant__vsps_score')
    
    results = ApplicationSerializer(applications, many=True).data
    
    if len(results) != 2:
        print(f"FAILED: Expected 2 applications, got {len(results)}")
        return

    first = results[0]
    second = results[1]
    
    print(f"1. {first['applicant_email']} - VSPS: {first['applicant_vsps']}")
    print(f"2. {second['applicant_email']} - VSPS: {second['applicant_vsps']}")

    if first['applicant_email'] == "student2@test.com":
        print("SUCCESS: Student 2 (Higher VSPS) is ranked first.")
    else:
        print("FAILED: Sorting incorrect.")

if __name__ == "__main__":
    verify_application_flow()
