import os
import django
import sys

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'internconnect_backend.settings')
django.setup()

from users.models import User
from core.models import RecruiterProfile, Internship, ApplicantProfile
from ml_engine.recommender import RecommendationEngine, CandidateProfile, MicroAssessment, Internship as MLInternship

def debug_flow():
    with open('debug_output.txt', 'w') as f:
        f.write("--- Starting Debug Flow ---\n")

        # 1. Create Recruiter
        recruiter_user = User.objects.filter(email="recruiter@test.com").first()
        if not recruiter_user:
             recruiter_user = User.objects.create(username="recruiter@test.com", email="recruiter@test.com", role='RECRUITER')
        
        recruiter_profile, _ = RecruiterProfile.objects.get_or_create(
            user=recruiter_user, 
            defaults={'company_name': 'Test Corp'}
        )
        f.write(f"Recruiter: {recruiter_profile}\n")

        # 2. Create Internship
        internship, created = Internship.objects.get_or_create(
            recruiter=recruiter_profile,
            title="Python Developer",
            defaults={
                'description': "Looking for Python Django expert",
                'required_skills': ["Python", "Django"],
                'location': 'Remote'
            }
        )
        f.write(f"Internship: {internship} (Created: {created})\n")

        # 3. Create Student
        student_user = User.objects.filter(email="student@test.com").first()
        if not student_user:
             student_user = User.objects.create(username="student@test.com", email="student@test.com", role='APPLICANT')
             
        student_profile, _ = ApplicantProfile.objects.get_or_create(
            user=student_user,
            defaults={
                'skills': ["Python", "Java"],
                'assessment_accuracy': 0.8,
                'assessment_speed_score': 0.8,
                'vsps_score': 0.8, # Verified
            }
        )
        f.write(f"Student: {student_profile} (VSPS: {student_profile.vsps_score})\n")

        # 4. Prepare Candidate for ML
        skills_list = student_profile.skills
        candidate = CandidateProfile(
            id=student_user.id,
            skills=skills_list,
            micro_assessment=MicroAssessment(
                accuracy=student_profile.assessment_accuracy,
                speed_score=student_profile.assessment_speed_score,
                skip_penalty=student_profile.assessment_skip_penalty
            ),
            recency_score=student_profile.recency_score
        )
        f.write(f"ML Candidate: {candidate}\n")

        # 5. Prepare Internships for ML
        db_internships = Internship.objects.all()
        f.write(f"Total DB Internships: {db_internships.count()}\n")
        
        ml_internships = []
        internship_map = {}
        for i in db_internships:
             ml_i = MLInternship(
                 id=i.id,
                 title=i.title,
                 description=i.description,
                 recruiter_rating=i.recruiter_rating,
                 recency_score=i.recency_score
             )
             ml_internships.append(ml_i)
             internship_map[i.id] = i

        # 6. Run Engine
        engine = RecommendationEngine()
        results = engine.recommend(candidate, ml_internships)
        
        f.write(f"Recommendations found: {len(results)}\n")
        for res in results:
            f.write(f" - {res['internship'].title}: Score={res['final_score']} (Cos={res['cosine_similarity']}, VSPS={res['vsps']}, Trust={res['trust_score']})\n")

if __name__ == "__main__":
    try:
        debug_flow()
    except Exception as e:
        with open('debug_output.txt', 'a') as f:
            f.write(f"Error: {e}\n")
            import traceback
            traceback.print_exc(file=f)
