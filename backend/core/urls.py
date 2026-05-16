from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ApplicantProfileViewSet, RecruiterProfileViewSet, InternshipViewSet, ApplicationViewSet, PlatformSettingsViewSet

router = DefaultRouter()
router.register(r'applicants', ApplicantProfileViewSet, basename='applicant')
router.register(r'recruiters', RecruiterProfileViewSet, basename='recruiter')
router.register(r'internships', InternshipViewSet)
router.register(r'applications', ApplicationViewSet, basename='application')
router.register(r'platform-settings', PlatformSettingsViewSet, basename='platform-settings')

urlpatterns = [
    path('', include(router.urls)),
]
