import random
from datetime import datetime
from docx import Document
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from .models import Skill, Question, AssessmentAttempt
from .serializers import (
    SkillSerializer,
    QuestionSerializer,
    QuestionAdminSerializer,
    AssessmentAttemptSerializer,
    AssessmentAttemptDetailSerializer,
    AssessmentSubmitSerializer,
)
from .utils import save_questions
from .gemini_generator import (
    generate_questions_with_gemini,
    generate_default_questions,
    determine_next_difficulty,
)
from core.models import ApplicantProfile
from django.contrib.auth import get_user_model

User = get_user_model()

class AdminOnlyPermission(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and getattr(request.user, 'role', '').upper() == 'ADMIN'


def merge_skill_attempt_payload(existing_skills, assessed_skills, attempt, accuracy, final_vsps):
    """
    Normalize the applicant profile skill payload with the latest assessment attempt.
    Persists score + status metadata for both successful and failed attempts.
    """
    if not isinstance(existing_skills, list):
        existing_skills = []

    timestamp = (attempt.end_time or timezone.now()).isoformat()
    attempt_status = attempt.status
    score_percent = round(max(0.0, accuracy) * 100, 1)

    assessed_lookup = {}
    for skill in assessed_skills:
        name = (skill.name or '').strip()
        if name:
            assessed_lookup[name.lower()] = name

    seen = set()
    next_skills = []

    for raw in existing_skills:
        if isinstance(raw, str):
            entry = {'name': raw, 'status': 'pending'}
        elif isinstance(raw, dict):
            entry = dict(raw)
        else:
            entry = {'name': '', 'status': 'pending'}

        name = (entry.get('name') or '').strip()
        key = name.lower()
        if key and key in assessed_lookup:
            entry['status'] = 'verified' if attempt_status == 'COMPLETED' else 'pending'
            entry['updated_at'] = timestamp
            entry['last_score'] = score_percent
            entry['last_accuracy'] = accuracy
            entry['last_vsps'] = final_vsps
            entry['last_status'] = attempt_status
            entry['last_attempt_id'] = attempt.id
            seen.add(key)
        next_skills.append(entry)

    for key, display_name in assessed_lookup.items():
        if key in seen:
            continue
        next_skills.append({
            'name': display_name,
            'status': 'verified' if attempt_status == 'COMPLETED' else 'pending',
            'updated_at': timestamp,
            'last_score': score_percent,
            'last_accuracy': accuracy,
            'last_vsps': final_vsps,
            'last_status': attempt_status,
            'last_attempt_id': attempt.id,
        })

    return next_skills

class SkillViewSet(viewsets.ModelViewSet):
    queryset = Skill.objects.all()
    serializer_class = SkillSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated(), AdminOnlyPermission()]

    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)
        skill = Skill.objects.get(id=response.data['id'])

        # Check if questions already exist
        if Question.objects.filter(skill=skill).exists():
            response.data['message'] = "Skill created successfully. Questions already exist."
            return response

        try:
            # Try to generate questions with Gemini
            questions = generate_questions_with_gemini(skill.name)
            generation_method = "AI"
            message = "Skill created successfully. 10 questions generated using AI."
        except Exception as e:
            # Fallback to default questions
            questions = generate_default_questions(skill.name)
            generation_method = "fallback"
            message = "Skill created successfully. AI question generation failed. 10 default questions created."

        # Save questions to database
        try:
            save_questions(skill, questions)
        except Exception as e:
            message = f"Skill created successfully. Failed to save questions: {str(e)}"

        response.data['message'] = message
        return response

class AssessmentViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['POST'])
    def start(self, request):
        user = request.user
        if not hasattr(user, 'applicant_profile'):
             return Response({"error": "Only applicants can take assessments"}, status=status.HTTP_403_FORBIDDEN)

        profile = user.applicant_profile
        raw_skills = profile.skills

        # Determine adaptive difficulty from the candidate's last accuracy (proposal §7)
        difficulty = determine_next_difficulty(profile.assessment_accuracy)

        # Extract names if skills are dicts
        user_skills = []
        for s in raw_skills:
            if isinstance(s, dict):
                user_skills.append(s.get('name'))
            else:
                user_skills.append(s)

        specific_skills = request.data.get('skills', [])
        if specific_skills:
           user_skills = specific_skills

        if not user_skills:
            return Response({"error": "No skills provided. Please add a skill first."}, status=status.HTTP_400_BAD_REQUEST)

        # Find or bootstrap Skill objects (case-insensitive)
        skill_objs = []
        for s_name in user_skills:
            if not s_name:
                continue
            normalized = s_name.strip()
            if not normalized:
                continue
            skill_obj = Skill.objects.filter(name__iexact=normalized).first()
            if not skill_obj:
                skill_obj = Skill.objects.create(name=normalized)
                try:
                    generated = generate_questions_with_gemini(normalized, difficulty=difficulty)
                except Exception:
                    generated = generate_default_questions(normalized, difficulty=difficulty)
                save_questions(skill_obj, generated)
            skill_objs.append(skill_obj)

        if not skill_objs:
             return Response({"error": f"No assessment available for skills: {', '.join(user_skills)}"}, status=status.HTTP_404_NOT_FOUND)

        # Select 10 random questions from these skills
        questions = list(Question.objects.filter(skill__in=skill_objs))

        if not questions:
            regenerated = False
            for skill in skill_objs:
                if Question.objects.filter(skill=skill).exists():
                    continue
                try:
                    new_questions = generate_questions_with_gemini(skill.name, difficulty=difficulty)
                except Exception:
                    new_questions = generate_default_questions(skill.name, difficulty=difficulty)
                save_questions(skill, new_questions)
                regenerated = True

            if regenerated:
                questions = list(Question.objects.filter(skill__in=skill_objs))

        if not questions:
             return Response({"error": f"No questions available for skills: {', '.join(user_skills)}"}, status=status.HTTP_404_NOT_FOUND)

        if len(questions) < 10:
            selected_questions = questions
        else:
            selected_questions = random.sample(questions, 10)

        attempt = AssessmentAttempt.objects.create(user=user)
        attempt.skills_assessed.set(skill_objs)

        serializer = QuestionSerializer(selected_questions, many=True)
        return Response({
            "attempt_id": attempt.id,
            "difficulty": difficulty,
            "questions": serializer.data
        })

    @action(detail=False, methods=['POST'])
    def submit(self, request):
        serializer = AssessmentSubmitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            attempt = AssessmentAttempt.objects.get(id=data['attempt_id'], user=request.user)
        except AssessmentAttempt.DoesNotExist:
            return Response({"error": "Invalid attempt ID"}, status=status.HTTP_404_NOT_FOUND)

        if attempt.status != 'PENDING':
             return Response({
                 "status": attempt.status,
                 "score": attempt.score or 0.0,
                 "vsps": attempt.final_vsps or 0.0,
                 "message": "Assessment already submitted"
             })

        answers = data['answers']          # {q_id: option_idx}
        time_taken = data['time_taken']    # {q_id: seconds}
        proctoring_log = data['proctoring_log']

        profile = getattr(request.user, 'applicant_profile', None)
        assessed_skills = list(attempt.skills_assessed.all())
        attempt.end_time = timezone.now()
        attempt.violation_log = proctoring_log
        attempt.violation_count = len(proctoring_log)

        # --- Integrity Factor (proposal §3.2) -----------------------------------
        # 1–2 violations: degrade score via IntegrityFactor multiplier
        # 3+ violations:  FAIL immediately
        violation_count = attempt.violation_count
        if violation_count >= 3:
            integrity_factor = 0.0   # will trigger FAIL below
        elif violation_count == 2:
            integrity_factor = 0.7
        elif violation_count == 1:
            integrity_factor = 0.85
        else:
            integrity_factor = 1.0
        attempt.integrity_factor = max(0.7, integrity_factor) if integrity_factor > 0 else 1.0

        if violation_count >= 3:
            attempt.status = 'FAILED'
            attempt.score = 0.0
            attempt.final_vsps = attempt.final_vsps or 0.0
            attempt.save()
            if profile:
                profile.assessment_accuracy = 0.0
                profile.assessment_speed_score = 0.0
                profile.integrity_factor = 0.7
                profile.skills = merge_skill_attempt_payload(
                    profile.skills, assessed_skills, attempt, 0.0, attempt.final_vsps
                )
                profile.save(update_fields=[
                    'assessment_accuracy', 'assessment_speed_score',
                    'integrity_factor', 'skills',
                ])
            return Response({
                "status": "FAILED",
                "score": 0.0,
                "vsps": attempt.final_vsps,
                "message": "Proctoring violation limit exceeded. Assessment invalidated."
            })

        # --- Score & VSPS Calculation (proposal §3.2) ---------------------------
        correct_count = 0
        total_questions = len(answers)
        total_time = 0
        difficulty_weights = []

        if total_questions == 0:
            attempt.status = 'FAILED'
            attempt.save()
            return Response({"status": "FAILED", "reason": "No answers provided."})

        for q_id, option_idx in answers.items():
            try:
                question = Question.objects.get(id=q_id)
                option_value = int(option_idx)
                if question.correct_option == option_value:
                    correct_count += 1
                total_time += time_taken.get(str(q_id), 0)
                # Collect difficulty weight for DifficultyScore
                difficulty_weights.append(
                    Question.DIFFICULTY_WEIGHTS.get(question.difficulty, 0.5)
                )
            except Question.DoesNotExist:
                continue

        accuracy = correct_count / total_questions
        avg_time = total_time / total_questions

        # Speed Score: 1.0 if avg_time < 5 s, 0.0 if > 20 s, linear in between
        speed_score = 1.0 - max(0.0, min(1.0, (avg_time - 5) / 15))

        # DifficultyScore (proposal §3.1)
        difficulty_score = (
            sum(difficulty_weights) / len(difficulty_weights)
            if difficulty_weights else 0.5
        )

        # Skip penalty — frontend forces answers, so remains 0; kept for formula completeness
        skip_penalty = 0.0

        # Consistency (proposal §3.1): std-dev stability across last 3 completed attempts
        past_accuracies = list(
            AssessmentAttempt.objects.filter(
                user=request.user,
                status='COMPLETED',
            ).order_by('-end_time').values_list('score', flat=True)[:3]
        )
        if len(past_accuracies) >= 2:
            import statistics
            consistency = max(0.0, 1.0 - statistics.stdev(past_accuracies))
        else:
            consistency = 0.5  # neutral for first/second attempt

        # Recency Factor: use profile recency_score (set externally / by signal)
        recency_factor = getattr(profile, 'recency_score', 1.0) if profile else 1.0

        # Full VSPS formula (proposal §3.2)
        base_performance = (
            0.45 * accuracy
            + 0.20 * speed_score
            + 0.15 * difficulty_score
            + 0.10 * consistency
            + 0.10 * recency_factor
        )
        penalty = skip_penalty * 0.15
        raw_vsps = (base_performance - penalty) * integrity_factor
        final_vsps = max(0.0, min(1.0, raw_vsps))

        attempt.score = accuracy
        attempt.speed_score = speed_score
        attempt.difficulty_score = difficulty_score
        attempt.integrity_factor = integrity_factor
        attempt.final_vsps = final_vsps

        if accuracy >= 0.6:  # Pass threshold
            attempt.status = 'COMPLETED'
            if profile:
                profile.vsps_score = final_vsps
                profile.assessment_accuracy = accuracy
                profile.assessment_speed_score = speed_score
                profile.assessment_difficulty_score = difficulty_score
                profile.assessment_consistency = consistency
                profile.integrity_factor = integrity_factor
                profile.skills = merge_skill_attempt_payload(
                    profile.skills, assessed_skills, attempt, accuracy, final_vsps
                )
                profile.save(update_fields=[
                    'vsps_score', 'assessment_accuracy', 'assessment_speed_score',
                    'assessment_difficulty_score', 'assessment_consistency',
                    'integrity_factor', 'skills',
                ])
            msg = "Assessment Passed!"
        else:
            attempt.status = 'FAILED'
            if profile:
                profile.assessment_accuracy = accuracy
                profile.assessment_speed_score = speed_score
                profile.assessment_difficulty_score = difficulty_score
                profile.assessment_consistency = consistency
                profile.integrity_factor = integrity_factor
                profile.skills = merge_skill_attempt_payload(
                    profile.skills, assessed_skills, attempt, accuracy, final_vsps
                )
                profile.save(update_fields=[
                    'assessment_accuracy', 'assessment_speed_score',
                    'assessment_difficulty_score', 'assessment_consistency',
                    'integrity_factor', 'skills',
                ])
            msg = "Assessment Failed. Low accuracy."

        attempt.save()

        return Response({
            "status": attempt.status,
            "score": accuracy,
            "vsps": final_vsps,
            "difficulty": attempt.difficulty_score,
            "integrity_factor": integrity_factor,
            "message": msg
        })

    @action(
        detail=False,
        methods=['GET'],
        url_path='attempts',
        permission_classes=[permissions.IsAuthenticated, AdminOnlyPermission],
    )
    def list_attempts(self, request):
        queryset = AssessmentAttempt.objects.select_related('user').prefetch_related('skills_assessed').order_by('-start_time')
        status_filter = request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter.upper())
        email_filter = request.query_params.get('email')
        if email_filter:
            queryset = queryset.filter(user__email__icontains=email_filter)
        limit_value = request.query_params.get('limit')
        try:
            limit_value = int(limit_value) if limit_value else 100
        except (TypeError, ValueError):
            limit_value = 100
        limit_value = max(1, min(limit_value, 250))
        queryset = queryset[:limit_value]
        serializer = AssessmentAttemptDetailSerializer(queryset, many=True)
        return Response(serializer.data)

class QuestionAdminViewSet(viewsets.ModelViewSet):
    serializer_class = QuestionAdminSerializer
    permission_classes = [permissions.IsAuthenticated, AdminOnlyPermission]

    def get_queryset(self):
        queryset = Question.objects.select_related('skill').order_by('-created_at')
        skill_id = self.request.query_params.get('skill')
        if skill_id:
            queryset = queryset.filter(skill_id=skill_id)
        return queryset

    @action(detail=False, methods=['POST'], url_path='import-docx')
    def import_docx(self, request):
        """Import questions in bulk from a DOCX file."""
        file = request.FILES.get('file')
        if not file:
            return Response({"detail": "No file uploaded."}, status=status.HTTP_400_BAD_REQUEST)

        filename = getattr(file, 'name', '') or ''
        if not filename.lower().endswith('.docx'):
            return Response(
                {"detail": "Unsupported file type. Please upload a .docx file."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        skill_id = request.data.get('skill_id') or request.data.get('skill')
        if not skill_id:
            return Response({"detail": "Skill ID is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            skill = Skill.objects.get(id=skill_id)
        except Skill.DoesNotExist:
            return Response({"detail": "Skill not found."}, status=status.HTTP_404_NOT_FOUND)

        try:
            doc = Document(file)
        except Exception as e:
            return Response({"detail": f"Unable to read DOCX file: {e}"}, status=status.HTTP_400_BAD_REQUEST)

        questions_data = parse_questions_from_docx(doc)
        if not questions_data:
            return Response({"detail": "No questions found in the DOCX file. Please check the format matches the template."}, status=status.HTTP_400_BAD_REQUEST)

        imported = 0
        errors = []
        for q in questions_data:
            try:
                Question.objects.create(
                    skill=skill,
                    text=q["text"],
                    options=q["options"],
                    correct_option=q["correct_option"],
                )
                imported += 1
            except Exception as e:
                errors.append(str(e))

        return Response({"imported": imported, "errors": errors}, status=status.HTTP_201_CREATED)
