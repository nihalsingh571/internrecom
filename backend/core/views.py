from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from .models import ApplicantProfile, RecruiterProfile, Internship, Application
from assessments.models import Skill
from .serializers import ApplicantProfileSerializer, RecruiterProfileSerializer, InternshipSerializer, ApplicationSerializer
from users.models import User

class IsRecruiter(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == User.Role.RECRUITER

class IsApplicant(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == User.Role.APPLICANT

class ApplicantProfileViewSet(viewsets.ModelViewSet):
    serializer_class = ApplicantProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.request.user.role == User.Role.APPLICANT:
            return ApplicantProfile.objects.filter(user=self.request.user)
        return ApplicantProfile.objects.all()

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
        
    @action(detail=False, methods=['GET', 'PATCH'])
    def me(self, request):
        profile, created = ApplicantProfile.objects.get_or_create(user=request.user)
        if request.method == 'GET':
            serializer = self.get_serializer(profile)
            return Response(serializer.data)
        elif request.method == 'PATCH':
            serializer = self.get_serializer(profile, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)

    @action(detail=False, methods=['GET'], permission_classes=[permissions.AllowAny], url_path='suggest')
    def suggest(self, request):
        email = (request.query_params.get('email') or '').strip()
        if not email:
            return Response({'detail': 'Email query parameter is required.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            return Response({'detail': 'Profile not found.'}, status=status.HTTP_404_NOT_FOUND)

        profile, _ = ApplicantProfile.objects.get_or_create(user=user)
        return Response(
            {
                'role': user.role,
                'student_name': (user.get_full_name() or user.email),
                'college': profile.college or '',
                'degree': profile.degree or '',
                'major': profile.major or '',
                'interested_role': profile.interested_role or '',
            }
        )

class RecruiterProfileViewSet(viewsets.ModelViewSet):
    serializer_class = RecruiterProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.request.user.role == User.Role.RECRUITER:
            return RecruiterProfile.objects.filter(user=self.request.user)
        return RecruiterProfile.objects.all()

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def update(self, request, *args, **kwargs):
        # prevent recruiters from toggling their own verified flag
        if request.user.role == User.Role.RECRUITER and 'is_verified' in request.data:
            return Response({'detail': 'Cannot verify yourself'}, status=status.HTTP_403_FORBIDDEN)
        return super().update(request, *args, **kwargs)

    @action(detail=False, methods=['GET'], permission_classes=[permissions.AllowAny], url_path='suggest')
    def suggest(self, request):
        email = (request.query_params.get('email') or '').strip()
        if not email:
            return Response({'detail': 'Email query parameter is required.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            return Response({'detail': 'Profile not found.'}, status=status.HTTP_404_NOT_FOUND)

        profile, _ = RecruiterProfile.objects.get_or_create(
            user=user,
            defaults={'company_name': user.first_name or user.email, 'company_website': ''},
        )
        return Response(
            {
                'role': user.role,
                'company_name': profile.company_name or '',
                'company_website': profile.company_website or '',
                'is_verified': profile.is_verified,
            }
        )

    @action(detail=False, methods=['GET', 'PATCH'])
    def me(self, request):
        profile, created = RecruiterProfile.objects.get_or_create(user=request.user)
        if request.method == 'GET':
            serializer = self.get_serializer(profile)
            return Response(serializer.data)
        elif request.method == 'PATCH':
            serializer = self.get_serializer(profile, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)

class InternshipViewSet(viewsets.ModelViewSet):
    queryset = Internship.objects.all()
    serializer_class = InternshipSerializer
    
    def get_permissions(self):
        # allow anonymous access to list and retrieve
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'applicants']:
            return [IsRecruiter()]
        if self.action in ['list', 'retrieve', 'recommendations']:
            from rest_framework.permissions import AllowAny
            return [AllowAny()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        user = self.request.user
        if user.role == User.Role.ADMIN:
            recruiter_id = self.request.data.get('recruiter_id')
            if not recruiter_id:
                raise ValidationError({'recruiter_id': 'This field is required for admin-created listings.'})
            try:
                recruiter_profile = RecruiterProfile.objects.get(pk=recruiter_id)
            except RecruiterProfile.DoesNotExist:
                raise ValidationError({'recruiter_id': 'Recruiter not found.'})
        else:
            recruiter_profile = RecruiterProfile.objects.get(user=user)
        instance = serializer.save(recruiter=recruiter_profile)
        self._sync_skill_catalog(instance.required_skills)
        return instance

    def perform_update(self, serializer):
        instance = serializer.save()
        self._sync_skill_catalog(instance.required_skills)

    def _sync_skill_catalog(self, skills):
        if not skills:
            return
        for skill in skills:
            label = ''
            if isinstance(skill, str):
                label = skill.strip()
            elif isinstance(skill, dict):
                label = (skill.get('name') or '').strip()
            if label:
                Skill.objects.get_or_create(name=label)

    @action(detail=True, methods=['POST'])
    def apply(self, request, pk=None):
        internship = self.get_object()
        user = request.user
        
        if user.role != User.Role.APPLICANT:
            return Response({"error": "Only applicants can apply"}, status=status.HTTP_403_FORBIDDEN)
            
        try:
            profile = user.applicant_profile
        except ApplicantProfile.DoesNotExist:
            return Response({"error": "Profile not found"}, status=status.HTTP_404_NOT_FOUND)
            
        if Application.objects.filter(internship=internship, applicant=profile).exists():
            return Response({"error": "Already applied"}, status=status.HTTP_400_BAD_REQUEST)
            
        application = Application.objects.create(internship=internship, applicant=profile)
        return Response(ApplicationSerializer(application).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['GET'])
    def applicants(self, request, pk=None):
        internship = self.get_object()
        
        try:
            recruiter_profile = request.user.recruiter_profile
            if internship.recruiter != recruiter_profile:
                return Response({"error": "Not authorized"}, status=status.HTTP_403_FORBIDDEN)
        except RecruiterProfile.DoesNotExist:
            return Response({"error": "Profile not found"}, status=status.HTTP_403_FORBIDDEN)
            
        applications = Application.objects.filter(internship=internship).order_by('-applicant__vsps_score')
        serializer = ApplicationSerializer(applications, many=True)
        return Response(serializer.data)

class IsAdminPermission(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and getattr(request.user, 'role', None) == User.Role.ADMIN


class PlatformSettingsViewSet(viewsets.ViewSet):
    permission_classes = [IsAdminPermission]

    @action(detail=False, methods=['GET'], url_path='settings')
    def get_settings(self, request):
        """Get current platform settings"""
        from .models import PlatformSettings
        settings = PlatformSettings.get_settings()
        return Response({
            'enforce_2fa_for_admins_recruiters': settings.enforce_2fa_for_admins_recruiters,
            'auto_approve_verified_recruiters': settings.auto_approve_verified_recruiters
        })

    @action(detail=False, methods=['PATCH'])
    def update_settings(self, request):
        """Update platform settings"""
        from .models import PlatformSettings
        settings = PlatformSettings.get_settings()
        
        enforce_2fa = request.data.get('enforce_2fa_for_admins_recruiters')
        auto_approve = request.data.get('auto_approve_verified_recruiters')
        
        if enforce_2fa is not None:
            settings.enforce_2fa_for_admins_recruiters = enforce_2fa
        if auto_approve is not None:
            settings.auto_approve_verified_recruiters = auto_approve
            
        settings.save()
        
        return Response({
            'enforce_2fa_for_admins_recruiters': settings.enforce_2fa_for_admins_recruiters,
            'auto_approve_verified_recruiters': settings.auto_approve_verified_recruiters
        })

    @action(detail=False, methods=['GET'])
    def recommendations(self, request):
        user = request.user
        if user.role != User.Role.APPLICANT:
            return Response({"error": "Only applicants can get recommendations"}, status=status.HTTP_403_FORBIDDEN)

        try:
            profile = user.applicant_profile
        except ApplicantProfile.DoesNotExist:
            return Response({"error": "Profile not found"}, status=status.HTTP_404_NOT_FOUND)

        from ml_engine.recommender import (
            RecommendationEngine, CandidateProfile, MicroAssessment,
            Internship as MLInternship,
        )

        skills_list = []
        for s in profile.skills:
            if isinstance(s, dict):
                skills_list.append(s.get('name', ''))
            else:
                skills_list.append(str(s))

        # Build MicroAssessment with all VSPS parameters (proposal §3.1)
        candidate = CandidateProfile(
            id=user.id,
            skills=skills_list,
            micro_assessment=MicroAssessment(
                accuracy=profile.assessment_accuracy,
                speed_score=profile.assessment_speed_score,
                skip_penalty=profile.assessment_skip_penalty,
                difficulty_score=profile.assessment_difficulty_score,
                consistency=profile.assessment_consistency,
                recency_factor=profile.recency_score,
                integrity_factor=profile.integrity_factor,
            ),
            recency_score=profile.recency_score,
        )

        # Compute completion_ratio for Trust Score (proposal §4.1)
        total_applications = Application.objects.filter(applicant=profile).count()
        completed_applications = Application.objects.filter(
            applicant=profile, status__in=['ACCEPTED', 'REVIEWED']
        ).count()
        completion_ratio = (
            completed_applications / total_applications
            if total_applications > 0 else 0.5
        )

        db_internships = Internship.objects.select_related('recruiter').all()
        ml_internships = []
        internship_map = {}

        for i in db_internships:
            ml_i = MLInternship(
                id=i.id,
                title=i.title,
                description=i.description,
                recruiter_rating=i.recruiter_rating,       # now a real DB field
                recency_score=i.recency_score,             # now a real DB field
                is_verified=i.recruiter.is_verified,       # RecruiterProfile.is_verified
            )
            ml_internships.append(ml_i)
            internship_map[i.id] = i

        engine = RecommendationEngine()
        results = engine.recommend(
            candidate,
            ml_internships,
            completion_ratio=completion_ratio,
        )

        response_data = []
        for res in results:
            ml_internship = res['internship']
            original_obj = internship_map.get(ml_internship.id)
            if not original_obj:
                continue

            i_data = self.get_serializer(original_obj).data
            i_data['recommendation'] = {
                'final_score': res['final_score'],
                'cosine_similarity': res['cosine_similarity'],
                'vsps': res['vsps'],
                'trust_score': res['trust_score'],
            }
            response_data.append(i_data)

        return Response(response_data)


class ApplicationViewSet(viewsets.ModelViewSet):
    serializer_class = ApplicationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == User.Role.APPLICANT:
            try:
                return Application.objects.filter(applicant=user.applicant_profile)
            except ApplicantProfile.DoesNotExist:
                return Application.objects.none()
        elif user.role == User.Role.RECRUITER:
            try:
                return Application.objects.filter(internship__recruiter=user.recruiter_profile)
            except RecruiterProfile.DoesNotExist:
                return Application.objects.none()
        elif user.role == User.Role.ADMIN:
            return Application.objects.select_related('internship', 'applicant').all()
        return Application.objects.none()

    def perform_update(self, serializer):
        # only recruiters can change status
        if self.request.user.role == User.Role.RECRUITER:
            serializer.save()
        else:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied()
