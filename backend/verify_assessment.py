import os
import django
from rest_framework.test import APIRequestFactory
from assessments.views import AssessmentViewSet
from assessments.models import Skill, Question
from users.models import User
from core.models import ApplicantProfile

import sys
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'internconnect_backend.settings')
django.setup()

def test_assessment_start():
    # Setup
    user, _ = User.objects.get_or_create(email='test@example.com', username='testuser')
    if not hasattr(user, 'applicant_profile'):
        ApplicantProfile.objects.create(user=user, skills=['Python', 'React'])
    
    factory = APIRequestFactory()
    view = AssessmentViewSet.as_view({'post': 'start'})

    print("Testing Generic Start (All Profile Skills)...")
    request = factory.post('/api/assessments/start/', {}, format='json')
    request.user = user
    response = view(request)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        print(f"Questions: {[q['text'] for q in response.data['questions']]}")

    print("\nTesting Specific Skill Start (python lowercase)...")
    request = factory.post('/api/assessments/start/', {'skills': ['python']}, format='json')
    request.user = user
    response = view(request)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        questions = response.data['questions']
        # Check if all questions are indeed Python questions
        # Since serializer doesn't return skill name directly, we can check IDs or text if unique.
        # But for this quick check, we can rely on text inspection or just DB check if needed.
        print(f"Questions: {[q['text'] for q in questions]}")
        
    print("\nTesting Specific Skill Start (React Only)...")
    request = factory.post('/api/assessments/start/', {'skills': ['React']}, format='json')
    request.user = user
    response = view(request)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        print(f"Questions: {[q['text'] for q in response.data['questions']]}")

if __name__ == "__main__":
    test_assessment_start()
