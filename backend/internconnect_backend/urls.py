from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('auth/', include('djoser.urls')),
    path('auth/', include('djoser.urls.jwt')),
    path('auth/social/', include('users.urls')),
    path('api/auth/', include('users.api_urls')),
    path('api/', include('users.admin_urls')),
    path('api/', include('core.urls')),
    path('api/', include('assessments.urls')),
]
