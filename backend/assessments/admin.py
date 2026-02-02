from django.contrib import admin
from .models import Skill, Question, AssessmentAttempt

@admin.register(Skill)
class SkillAdmin(admin.ModelAdmin):
    list_display = ('name',)
    search_fields = ('name',)

@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ('skill', 'text', 'correct_option')
    list_filter = ('skill',)
    search_fields = ('text', 'skill__name')

@admin.register(AssessmentAttempt)
class AssessmentAttemptAdmin(admin.ModelAdmin):
    list_display = ('user', 'status', 'score', 'start_time')
    list_filter = ('status', 'start_time')

