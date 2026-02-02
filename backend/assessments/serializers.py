from rest_framework import serializers
from .models import Skill, Question, AssessmentAttempt

class SkillSerializer(serializers.ModelSerializer):
    class Meta:
        model = Skill
        fields = ['id', 'name']

class QuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Question
        fields = ['id', 'text', 'options'] # Exclude correct_option

class AssessmentAttemptSerializer(serializers.ModelSerializer):
    class Meta:
        model = AssessmentAttempt
        fields = ['id', 'status', 'score', 'final_vsps', 'start_time', 'end_time']

class AssessmentSubmitSerializer(serializers.Serializer):
    attempt_id = serializers.IntegerField()
    answers = serializers.JSONField() # {question_id: selected_option_index}
    time_taken = serializers.JSONField() # {question_id: seconds}
    proctoring_log = serializers.JSONField(required=False, default=list)
