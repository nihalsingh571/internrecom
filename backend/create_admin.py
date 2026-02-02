import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'internconnect_backend.settings')
django.setup()

from django.contrib.auth import get_user_model
User = get_user_model()

email = 'admin@example.com'
password = 'admin123'

if not User.objects.filter(email=email).exists():
    User.objects.create_superuser(username='admin', email=email, password=password, role='ADMIN', first_name='Admin', last_name='User')
    print(f"Superuser created: {email} / {password}")
else:
    print(f"Superuser already exists: {email}")
