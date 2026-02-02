from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ApplicantProfileViewSet, RecruiterProfileViewSet, InternshipViewSet

router = DefaultRouter()
router.register(r'applicants', ApplicantProfileViewSet, basename='applicant')
router.register(r'recruiters', RecruiterProfileViewSet, basename='recruiter')
router.register(r'internships', InternshipViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
