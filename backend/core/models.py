from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator

class ApplicantProfile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='applicant_profile')
    skills = models.JSONField(default=list)  # List of strings e.g. ["Python", "Django"]
    college = models.CharField(max_length=255, blank=True)
    degree = models.CharField(max_length=255, blank=True)
    major = models.CharField(max_length=255, blank=True)
    graduation_year = models.PositiveIntegerField(null=True, blank=True)
    interested_role = models.CharField(max_length=255, blank=True)
    
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
    STATUS_CHOICES = [
        ('OPEN', 'Open'),
        ('REVIEWING', 'Reviewing'),
        ('PAUSED', 'Paused'),
        ('CLOSED', 'Closed'),
    ]

    recruiter = models.ForeignKey(RecruiterProfile, on_delete=models.CASCADE, related_name='internships')
    title = models.CharField(max_length=255)
    description = models.TextField()
    location = models.CharField(max_length=255, default='Remote')
    work_type = models.CharField(max_length=50, default='On-site')
    stipend = models.PositiveIntegerField(null=True, blank=True)
    required_skills = models.JSONField(default=list)
    preferred_skills = models.JSONField(default=list, blank=True)
    responsibilities = models.TextField(blank=True)
    duration = models.CharField(max_length=100, blank=True)
    start_date = models.DateField(null=True, blank=True)
    deadline = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='OPEN')
    created_at = models.DateTimeField(auto_now_add=True)

class PlatformSettings(models.Model):
    """Global platform settings"""
    enforce_2fa_for_admins_recruiters = models.BooleanField(default=True)
    auto_approve_verified_recruiters = models.BooleanField(default=False)
    recruiter_rating = models.FloatField(
        blank=True,
        null=True,
        validators=[MinValueValidator(0.0), MaxValueValidator(1.0)],
    )
    recency_score = models.FloatField(
        default=1.0,
        validators=[MinValueValidator(0.0), MaxValueValidator(1.0)],
    )

    # Singleton pattern - only one instance should exist
    class Meta:
        verbose_name = "Platform Setting"
        verbose_name_plural = "Platform Settings"

    def save(self, *args, **kwargs):
        # Ensure only one instance exists
        if not self.pk and PlatformSettings.objects.exists():
            raise ValueError("Only one PlatformSettings instance can exist")
        return super().save(*args, **kwargs)

    @classmethod
    def get_settings(cls):
        """Get the singleton platform settings instance"""
        settings, created = cls.objects.get_or_create(
            pk=1,
            defaults={
                'enforce_2fa_for_admins_recruiters': True,
                'auto_approve_verified_recruiters': False,
            },
        )
        return settings

    def __str__(self):
        return "Platform Settings"

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
