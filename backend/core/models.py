from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator

class ApplicantProfile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='applicant_profile')
    skills = models.JSONField(default=list)  # List of strings e.g. ["Python", "Django"]
    college = models.CharField(max_length=255, blank=True)
    degree = models.CharField(max_length=255, blank=True)
    
    # Micro-assessment scores (normalized 0-1)
    assessment_accuracy = models.FloatField(default=0.0, validators=[MinValueValidator(0.0), MaxValueValidator(1.0)])
    assessment_speed_score = models.FloatField(default=0.0, validators=[MinValueValidator(0.0), MaxValueValidator(1.0)])
    assessment_skip_penalty = models.FloatField(default=0.0, validators=[MinValueValidator(0.0), MaxValueValidator(1.0)])
    
    # Computed VSPS
    vsps_score = models.FloatField(default=0.0, validators=[MinValueValidator(0.0), MaxValueValidator(1.0)])
    
    # Recency of activity (normalized 0-1)
    recency_score = models.FloatField(default=1.0, validators=[MinValueValidator(0.0), MaxValueValidator(1.0)])

    # Contact & Social
    mobile_number = models.CharField(max_length=20, blank=True)
    github_link = models.URLField(blank=True)
    linkedin_link = models.URLField(blank=True)

    def __str__(self):
        return f"{self.user.email} Profile"

class RecruiterProfile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='recruiter_profile')
    company_name = models.CharField(max_length=255)
    company_website = models.URLField(blank=True)
    is_verified = models.BooleanField(default=False)
    
    def __str__(self):
        return self.company_name

class Internship(models.Model):
    recruiter = models.ForeignKey(RecruiterProfile, on_delete=models.CASCADE, related_name='internships')
    title = models.CharField(max_length=255)
    description = models.TextField()
    location = models.CharField(max_length=255, default='Remote')
    required_skills = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Recruiter rating for this internship context (optional, normalized 0-1) or inherited from recruiter trust
    recruiter_rating = models.FloatField(null=True, blank=True, validators=[MinValueValidator(0.0), MaxValueValidator(1.0)])
    
    # Recency of listing (could be computed dynamically, but storing base score for now)
    recency_score = models.FloatField(default=1.0, validators=[MinValueValidator(0.0), MaxValueValidator(1.0)])

    def __str__(self):
        return self.title

class Application(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('REVIEWED', 'Reviewed'),
        ('ACCEPTED', 'Accepted'),
        ('REJECTED', 'Rejected'),
    ]
    
    internship = models.ForeignKey(Internship, on_delete=models.CASCADE, related_name='applications')
    applicant = models.ForeignKey(ApplicantProfile, on_delete=models.CASCADE, related_name='applications')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    applied_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('internship', 'applicant')

    def __str__(self):
        return f"{self.applicant.user.email} -> {self.internship.title}"
