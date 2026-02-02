from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from .models import ApplicantProfile, RecruiterProfile, Internship, Application
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

class RecruiterProfileViewSet(viewsets.ModelViewSet):
    serializer_class = RecruiterProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.request.user.role == User.Role.RECRUITER:
            return RecruiterProfile.objects.filter(user=self.request.user)
        return RecruiterProfile.objects.all()

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

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
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'applicants']:
            return [IsRecruiter()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        recruiter_profile = RecruiterProfile.objects.get(user=self.request.user)
        serializer.save(recruiter=recruiter_profile)

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

    @action(detail=False, methods=['GET'])
    def recommendations(self, request):
        user = request.user
        if user.role != User.Role.APPLICANT:
            return Response({"error": "Only applicants can get recommendations"}, status=status.HTTP_403_FORBIDDEN)
        
        try:
            profile = user.applicant_profile
        except ApplicantProfile.DoesNotExist:
            return Response({"error": "Profile not found"}, status=status.HTTP_404_NOT_FOUND)

        from ml_engine.recommender import RecommendationEngine, CandidateProfile, MicroAssessment, Internship as MLInternship
        
        skills_list = []
        for s in profile.skills:
            if isinstance(s, dict):
                skills_list.append(s.get('name', ''))
            else:
                skills_list.append(str(s))
        
        candidate = CandidateProfile(
            id=user.id,
            skills=skills_list,
            micro_assessment=MicroAssessment(
                accuracy=profile.assessment_accuracy,
                speed_score=profile.assessment_speed_score,
                skip_penalty=profile.assessment_skip_penalty
            ),
            recency_score=profile.recency_score
        )

        db_internships = Internship.objects.all()
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

        engine = RecommendationEngine()
        results = engine.recommend(candidate, ml_internships)

        response_data = []
        for res in results:
            ml_internship = res['internship']
            original_obj = internship_map.get(ml_internship.id)
            if not original_obj: continue

            i_data = self.get_serializer(original_obj).data
            i_data['recommendation'] = {
                'final_score': res['final_score'],
                'cosine_similarity': res['cosine_similarity'],
                'vsps': res['vsps'],
                'trust_score': res['trust_score']
            }
            response_data.append(i_data)
        
        return Response(response_data)
