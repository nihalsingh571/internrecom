import os
import django
from rest_framework.test import APIRequestFactory
from assessments.views import AssessmentViewSet, AssessmentSubmitSerializer
from assessments.models import Skill, Question, AssessmentAttempt
from users.models import User
from core.models import ApplicantProfile
import sys

sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'internconnect_backend.settings')
django.setup()

def test_pending_skill_flow():
    # Setup User and Profile with "Pending" skill object
    email = 'test_pending@example.com'
    user, _ = User.objects.get_or_create(email=email, username='testpending')
    
    # Reset Profile
    ApplicantProfile.objects.filter(user=user).delete()
    profile = ApplicantProfile.objects.create(user=user, skills=[
        {'name': 'Python', 'status': 'pending'},
        {'name': 'React', 'status': 'verified'} # Generic/Legacy
    ])
    
    factory = APIRequestFactory()
    view_start = AssessmentViewSet.as_view({'post': 'start'})
    view_submit = AssessmentViewSet.as_view({'post': 'submit'})

    print(f"Initial Skills: {profile.skills}")

    # 1. Start Assessment for Python
    print("\n1. Starting Assessment for 'Python'...")
    request = factory.post('/api/assessments/start/', {'skills': ['Python']}, format='json')
    request.user = user
    response = view_start(request)
    if response.status_code != 200:
        print(f"Failed to start: {response.data}")
        return
    
    attempt_id = response.data['attempt_id']
    questions = response.data['questions']
    print(f"Attempt ID: {attempt_id}")

    # 2. Submit PASSING Assessment
    print("\n2. Submitting Passing Assessment...")
    answers = {}
    qt_map = {q['id']: q for q in questions}
    
    for q in questions:
        # Find correct option index from DB to ensure pass
        q_obj = Question.objects.get(id=q['id'])
        answers[str(q['id'])] = q_obj.correct_option

    submit_data = {
        'attempt_id': attempt_id,
        'answers': answers,
        'time_taken': {str(q['id']): 5 for q in questions},
        'proctoring_log': []
    }
    
    request = factory.post('/api/assessments/submit/', submit_data, format='json')
    request.user = user
    response = view_submit(request)
    print(f"Submit Status: {response.status_code}")
    print(f"Result: {response.data}")

    # 3. Verify Profile Updated
    profile.refresh_from_db()
    print(f"\nFinal Skills: {profile.skills}")
    
    python_skill = next((s for s in profile.skills if isinstance(s, dict) and s['name'] == 'Python'), None)
    if python_skill and python_skill.get('status') == 'verified':
        print("SUCCESS: Python skill is now VERIFIED!")
    else:
        print("FAILURE: Python skill is NOT verified.")

if __name__ == "__main__":
    test_pending_skill_flow()
