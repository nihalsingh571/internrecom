from rest_framework import serializers
from .models import ApplicantProfile, RecruiterProfile, Internship

class ApplicantProfileSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source='user.email')
    first_name = serializers.CharField(source='user.first_name', read_only=True)
    last_name = serializers.CharField(source='user.last_name', read_only=True)
    # expose the degree field under the more familiar name "education" for clients
    education = serializers.CharField(source='degree', required=False, allow_blank=True)

    class Meta:
        model = ApplicantProfile
        # include education field in the response so clients can update it
        fields = ['id', 'email', 'first_name', 'last_name', 'skills', 'college', 'degree', 'education', 'major', 'graduation_year',
                  'interested_role',
                  'assessment_accuracy', 'assessment_speed_score', 'assessment_skip_penalty',
                  'vsps_score', 'recency_score', 'mobile_number', 'github_link', 'linkedin_link']
        extra_kwargs = {
            'email': {'required': False},
            # degree/education are optional
            'degree': {'required': False},
            'major': {'required': False},
            'graduation_year': {'required': False},
        }

    def update(self, instance, validated_data):
        # Handle User update (email)
        user_data = {}
        if 'user' in validated_data:
             user_nested = validated_data.pop('user')
             if 'email' in user_nested:
                 user_data['email'] = user_nested['email']
        
        # Update Profile fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Update User fields if any
        if user_data:
            user = instance.user
            for attr, value in user_data.items():
                setattr(user, attr, value)
            user.save()
            
        return instance

class RecruiterProfileSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source='user.email', read_only=True)
    
    class Meta:
        model = RecruiterProfile
        fields = ['id', 'email', 'company_name', 'company_website', 'is_verified']

class InternshipSerializer(serializers.ModelSerializer):
    recruiter_name = serializers.CharField(source='recruiter.user.get_full_name', read_only=True)
    company_name = serializers.CharField(source='recruiter.company_name', read_only=True)
    recruiter_email = serializers.EmailField(source='recruiter.user.email', read_only=True)
    # allow description/location/skills to be omitted when creating
    description = serializers.CharField(required=False, allow_blank=True)
    location = serializers.CharField(required=False)
    required_skills = serializers.ListField(child=serializers.CharField(), required=False)
    preferred_skills = serializers.ListField(child=serializers.CharField(), required=False)
    work_type = serializers.CharField(required=False)
    stipend = serializers.IntegerField(required=False, allow_null=True)
    status = serializers.ChoiceField(choices=Internship.STATUS_CHOICES, required=False)
    responsibilities = serializers.CharField(required=False, allow_blank=True)
    duration = serializers.CharField(required=False, allow_blank=True)
    start_date = serializers.DateField(required=False, allow_null=True)
    deadline = serializers.DateField(required=False, allow_null=True)
    
    class Meta:
        model = Internship
        fields = [
            'id',
            'title',
            'description',
            'location',
            'required_skills',
            'preferred_skills',
            'work_type',
            'stipend',
            'status',
            'responsibilities',
            'duration',
            'start_date',
            'deadline',
            'created_at',
            'recruiter',
            'recruiter_name',
            'recruiter_email',
            'company_name',
        ]
        read_only_fields = ['recruiter', 'created_at']

from .models import Application

class ApplicationSerializer(serializers.ModelSerializer):
    applicant_name = serializers.CharField(source='applicant.user.get_full_name', read_only=True)
    applicant_email = serializers.EmailField(source='applicant.user.email', read_only=True)
    applicant_vsps = serializers.FloatField(source='applicant.vsps_score', read_only=True)
    # Include applicant details for recruiter view
    
    class Meta:
        model = Application
        fields = ['id', 'internship', 'applicant', 'status', 'applied_at', 
                  'applicant_name', 'applicant_email', 'applicant_vsps']
        # make status writable; viewset enforces that only recruiters can change it
        read_only_fields = ['applicant', 'applied_at']
