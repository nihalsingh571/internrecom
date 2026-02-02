from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator

class Skill(models.Model):
    name = models.CharField(max_length=100, unique=True)
    
    def __str__(self):
        return self.name

class Question(models.Model):
    skill = models.ForeignKey(Skill, on_delete=models.CASCADE, related_name='questions')
    text = models.TextField()
    options = models.JSONField(default=list)  # List of strings: ["Option A", "Option B", ...]
    correct_option = models.IntegerField()  # Index of the correct option (0-3)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.skill.name}: {self.text[:50]}..."

class AssessmentAttempt(models.Model):
    STATUS_CHOICES = (
        ('PENDING', 'Pending'),
        ('COMPLETED', 'Completed'),
        ('FAILED', 'Failed'),  # Due to low score or proctoring violation
    )

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='assessments')
    skills_assessed = models.ManyToManyField(Skill)
    start_time = models.DateTimeField(auto_now_add=True)
    end_time = models.DateTimeField(null=True, blank=True)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    score = models.FloatField(default=0.0) # Raw accuracy
    
    # Proctoring & VSPS Metadata
    speed_score = models.FloatField(default=0.0)
    violation_count = models.IntegerField(default=0)
    violation_log = models.JSONField(default=list) # List of violation events
    
    final_vsps = models.FloatField(null=True, blank=True)

    def __str__(self):
        return f"{self.user.email} - {self.status}"
