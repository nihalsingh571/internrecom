from django.contrib import admin
from .models import ApplicantProfile, RecruiterProfile, Internship, Application

@admin.register(ApplicantProfile)
class ApplicantProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'college', 'degree', 'vsps_score')
    search_fields = ('user__email', 'college', 'degree')
    list_filter = ('college', 'degree')

@admin.register(RecruiterProfile)
class RecruiterProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'company_name', 'is_verified')
    search_fields = ('user__email', 'company_name')
    list_filter = ('is_verified',)

@admin.register(Internship)
class InternshipAdmin(admin.ModelAdmin):
    list_display = ('title', 'recruiter', 'location', 'created_at')
    search_fields = ('title', 'recruiter__company_name')
    list_filter = ('location', 'created_at')

@admin.register(Application)
class ApplicationAdmin(admin.ModelAdmin):
    list_display = ('internship', 'applicant', 'status', 'applied_at')
    search_fields = ('internship__title', 'applicant__user__email')
    list_filter = ('status', 'applied_at')
