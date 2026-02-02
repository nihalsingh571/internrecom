from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.translation import gettext_lazy as _

class User(AbstractUser):
    class Role(models.TextChoices):
        APPLICANT = 'APPLICANT', 'Applicant'
        RECRUITER = 'RECRUITER', 'Recruiter'
        ADMIN = 'ADMIN', 'Admin'

    email = models.EmailField(_('email address'), unique=True)
    role = models.CharField(max_length=50, choices=Role.choices, default=Role.APPLICANT)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'first_name', 'last_name', 'role']

    def __str__(self):
        return self.email
