import base64
import io

import pyotp
import qrcode
import requests
from django.conf import settings
from django.contrib.auth import authenticate, get_user_model
from django.core import signing
from django.http import HttpResponseRedirect
from django.utils.crypto import get_random_string
from rest_framework import status, viewsets, permissions
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework_simplejwt.tokens import RefreshToken
from urllib.parse import urlencode

from .serializers import AdminUserSerializer

User = get_user_model()


def _is_allowed_redirect(uri: str) -> bool:
    if not uri:
        return False
    return any(uri.startswith(allowed) for allowed in settings.SOCIAL_REDIRECT_WHITELIST if allowed)


def _get_requested_redirect(request):
    requested = request.GET.get('redirect_uri')
    if requested and _is_allowed_redirect(requested):
        return requested
    return settings.FRONTEND_LOGIN_URL


def _redirect_with_params(destination: str, params: dict):
    query_string = urlencode(params)
    connector = '&' if '?' in destination else '?'
    return HttpResponseRedirect(f'{destination}{connector}{query_string}')


def _redirect_with_error(destination: str, error_code: str):
    return _redirect_with_params(destination, {'error': error_code, 'socialLogin': 'failed'})


def _create_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return str(refresh.access_token), str(refresh)


def _verify_recaptcha(token: str, remote_ip: str | None = None):
    # Allow disabling reCAPTCHA for local development/testing.
    if getattr(settings, 'DISABLE_RECAPTCHA', False) or settings.DEBUG:
        return True, None
    if not settings.RECAPTCHA_SECRET_KEY:
        return False, 'recaptcha_not_configured'
    if not token:
        return False, 'recaptcha_token_missing'
    payload = {
        'secret': settings.RECAPTCHA_SECRET_KEY,
        'response': token,
    }
    if remote_ip:
        payload['remoteip'] = remote_ip
    try:
        response = requests.post('https://www.google.com/recaptcha/api/siteverify', data=payload, timeout=5)
        response.raise_for_status()
    except requests.RequestException:
        return False, 'recaptcha_request_failed'
    result = response.json()
    if not result.get('success'):
        return False, 'recaptcha_invalid'
    return True, None


def _ensure_username(email: str) -> str:
    base = email.split('@')[0] or 'user'
    candidate = base
    suffix = 1
    while User.objects.filter(username=candidate).exists():
        candidate = f'{base}-{suffix}'
        suffix += 1
    return candidate


def _upsert_user(email, first_name='', last_name=''):
    defaults = {
        'username': _ensure_username(email),
        'first_name': first_name or '',
        'last_name': last_name or '',
    }
    user, created = User.objects.get_or_create(email=email, defaults=defaults)
    updated = False
    if not created:
        if first_name and not user.first_name:
            user.first_name = first_name
            updated = True
        if last_name and not user.last_name:
            user.last_name = last_name
            updated = True
    if updated:
        user.save(update_fields=['first_name', 'last_name'])
    return user


class GoogleOAuthStartView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
            return Response({'detail': 'Google login is not configured.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        redirect_back = _get_requested_redirect(request)
        state_payload = {'redirect': redirect_back}
        state = signing.dumps(state_payload, salt='google-oauth-state')
        params = {
            'client_id': settings.GOOGLE_CLIENT_ID,
            'redirect_uri': settings.GOOGLE_REDIRECT_URI,
            'response_type': 'code',
            'scope': 'openid email profile',
            'state': state,
            'access_type': 'offline',
            'prompt': 'select_account',
        }
        auth_url = 'https://accounts.google.com/o/oauth2/v2/auth?' + urlencode(params)
        return HttpResponseRedirect(auth_url)


class GoogleOAuthCallbackView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        code = request.GET.get('code')
        state = request.GET.get('state')
        redirect_back = settings.FRONTEND_LOGIN_URL

        if state:
            try:
                payload = signing.loads(state, salt='google-oauth-state', max_age=300)
                candidate = payload.get('redirect')
                if _is_allowed_redirect(candidate):
                    redirect_back = candidate
            except signing.BadSignature:
                pass

        if not code:
            return _redirect_with_error(redirect_back, 'google_code_missing')

        token_payload = {
            'code': code,
            'client_id': settings.GOOGLE_CLIENT_ID,
            'client_secret': settings.GOOGLE_CLIENT_SECRET,
            'redirect_uri': settings.GOOGLE_REDIRECT_URI,
            'grant_type': 'authorization_code',
        }

        try:
            token_response = requests.post('https://oauth2.googleapis.com/token', data=token_payload, timeout=10)
            token_response.raise_for_status()
        except requests.RequestException:
            return _redirect_with_error(redirect_back, 'google_token_error')

        tokens = token_response.json()
        access_token = tokens.get('access_token')

        if not access_token:
            return _redirect_with_error(redirect_back, 'google_access_missing')

        try:
            userinfo_response = requests.get(
                'https://openidconnect.googleapis.com/v1/userinfo',
                headers={'Authorization': f'Bearer {access_token}'},
                timeout=10,
            )
            userinfo_response.raise_for_status()
            profile = userinfo_response.json()
        except requests.RequestException:
            return _redirect_with_error(redirect_back, 'google_profile_error')

        email = profile.get('email')
        if not email:
            return _redirect_with_error(redirect_back, 'google_email_missing')

        user = _upsert_user(email, profile.get('given_name', ''), profile.get('family_name', ''))
        access_jwt, refresh_jwt = _create_tokens_for_user(user)
        return _redirect_with_params(
            redirect_back,
            {
                'provider': 'google',
                'socialLogin': 'success',
                'access': access_jwt,
                'refresh': refresh_jwt,
            },
        )


class GithubOAuthStartView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        if not settings.GITHUB_CLIENT_ID or not settings.GITHUB_CLIENT_SECRET:
            return Response({'detail': 'GitHub login is not configured.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        redirect_back = _get_requested_redirect(request)
        state_payload = {'redirect': redirect_back, 'nonce': get_random_string(12)}
        state = signing.dumps(state_payload, salt='github-oauth-state')
        params = {
            'client_id': settings.GITHUB_CLIENT_ID,
            'redirect_uri': settings.GITHUB_REDIRECT_URI,
            'scope': 'read:user user:email',
            'state': state,
            'allow_signup': 'true',
        }
        auth_url = 'https://github.com/login/oauth/authorize?' + urlencode(params)
        return HttpResponseRedirect(auth_url)


class GithubOAuthCallbackView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        code = request.GET.get('code')
        state = request.GET.get('state')
        redirect_back = settings.FRONTEND_LOGIN_URL

        if state:
            try:
                payload = signing.loads(state, salt='github-oauth-state', max_age=300)
                candidate = payload.get('redirect')
                if _is_allowed_redirect(candidate):
                    redirect_back = candidate
            except signing.BadSignature:
                pass

        if not code:
            return _redirect_with_error(redirect_back, 'github_code_missing')

        token_payload = {
            'client_id': settings.GITHUB_CLIENT_ID,
            'client_secret': settings.GITHUB_CLIENT_SECRET,
            'code': code,
            'redirect_uri': settings.GITHUB_REDIRECT_URI,
        }

        headers = {'Accept': 'application/json'}

        try:
            token_response = requests.post(
                'https://github.com/login/oauth/access_token',
                data=token_payload,
                headers=headers,
                timeout=10,
            )
            token_response.raise_for_status()
        except requests.RequestException:
            return _redirect_with_error(redirect_back, 'github_token_error')

        token_body = token_response.json()
        access_token = token_body.get('access_token')

        if not access_token:
            return _redirect_with_error(redirect_back, 'github_access_missing')

        user_headers = {
            'Authorization': f'token {access_token}',
            'Accept': 'application/json',
        }

        try:
            profile_response = requests.get('https://api.github.com/user', headers=user_headers, timeout=10)
            profile_response.raise_for_status()
            profile = profile_response.json()
        except requests.RequestException:
            return _redirect_with_error(redirect_back, 'github_profile_error')

        email = profile.get('email')
        if not email:
            try:
                email_response = requests.get('https://api.github.com/user/emails', headers=user_headers, timeout=10)
                email_response.raise_for_status()
                emails = email_response.json()
                primary_email = next((item['email'] for item in emails if item.get('primary')), None)
                email = primary_email or (profile.get('login') and f"{profile['login']}@users.noreply.github.com")
            except requests.RequestException:
                email = profile.get('login') and f"{profile['login']}@users.noreply.github.com"

        if not email:
            return _redirect_with_error(redirect_back, 'github_email_missing')

        full_name = (profile.get('name') or '').strip()
        first_name = ''
        last_name = ''
        if full_name:
            parts = full_name.split(' ', 1)
            first_name = parts[0]
            if len(parts) > 1:
                last_name = parts[1]

        user = _upsert_user(email, first_name, last_name)
        access_jwt, refresh_jwt = _create_tokens_for_user(user)
        return _redirect_with_params(
            redirect_back,
            {
                'provider': 'github',
                'socialLogin': 'success',
                'access': access_jwt,
                'refresh': refresh_jwt,
            },
        )


class IsAdminRole(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == User.Role.ADMIN


class AdminUserViewSet(viewsets.ModelViewSet):
    serializer_class = AdminUserSerializer
    queryset = User.objects.all().order_by('-date_joined')
    permission_classes = [IsAuthenticated, IsAdminRole]

    def perform_destroy(self, instance):
        if instance == self.request.user:
            raise ValidationError('You cannot delete your own administrator account.')
        super().perform_destroy(instance)

    @action(detail=True, methods=['post'])
    def suspend(self, request, pk=None):
        user = self.get_object()
        if user == request.user:
            raise ValidationError('You cannot suspend yourself.')
        if user.is_active:
            user.is_active = False
            user.save(update_fields=['is_active'])
        serializer = self.get_serializer(user)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        user = self.get_object()
        if not user.is_active:
            user.is_active = True
            user.save(update_fields=['is_active'])
        serializer = self.get_serializer(user)
        return Response(serializer.data)


class RecaptchaLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = (request.data.get('email') or '').strip().lower()
        password = request.data.get('password') or ''
        token = request.data.get('recaptchaToken')

        if not email or not password:
            return Response({'detail': 'Email and password are required.'}, status=status.HTTP_400_BAD_REQUEST)

        valid, error_code = _verify_recaptcha(token, request.META.get('REMOTE_ADDR'))
        if not valid:
            error_message = 'Complete the reCAPTCHA challenge to continue.'
            if error_code == 'recaptcha_request_failed':
                error_message = 'Unable to validate reCAPTCHA. Please try again.'
            elif error_code == 'recaptcha_not_configured':
                error_message = 'reCAPTCHA is not configured on the server.'
            return Response({'detail': error_message}, status=status.HTTP_400_BAD_REQUEST)

        user = authenticate(request, username=email, password=password)
        if not user:
            return Response({'detail': 'Invalid email or password.'}, status=status.HTTP_401_UNAUTHORIZED)

        # Check if 2FA is enforced for admins and recruiters
        from core.models import PlatformSettings
        platform_settings = PlatformSettings.get_settings()
        requires_2fa = (
            platform_settings.enforce_2fa_for_admins_recruiters
            and user.role in [User.Role.ADMIN, User.Role.RECRUITER]
        )

        # If 2FA is required but not configured:
        # - Admins: allow login but inform them to configure 2FA or turn enforcement off
        # - Recruiters: block login until they set up 2FA
        if requires_2fa and (not user.two_factor_enabled or not user.two_factor_secret):
            if user.role == User.Role.ADMIN:
                access_jwt, refresh_jwt = _create_tokens_for_user(user)
                return Response(
                    {
                        'access': access_jwt,
                        'refresh': refresh_jwt,
                        'two_factor_setup_required': True,
                        'detail': 'Two-factor authentication is required for admins. Please enable it under Platform Settings.',
                    },
                    status=status.HTTP_200_OK,
                )
            return Response(
                {
                    'detail': 'Two-factor authentication is required. Please set it up before logging in.',
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        if user.two_factor_enabled:
            return Response({'2fa_required': True, 'user_id': user.id}, status=status.HTTP_200_OK)

        access_jwt, refresh_jwt = _create_tokens_for_user(user)
        return Response({'access': access_jwt, 'refresh': refresh_jwt}, status=status.HTTP_200_OK)


class EnableTwoFactorView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        secret = pyotp.random_base32()
        user.two_factor_secret = secret
        user.two_factor_enabled = False
        user.save(update_fields=['two_factor_secret', 'two_factor_enabled'])

        totp = pyotp.TOTP(secret)
        uri = totp.provisioning_uri(name=user.email, issuer_name='InternConnect')
        qr = qrcode.QRCode(box_size=6, border=2)
        qr.add_data(uri)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        qr_b64 = base64.b64encode(buffer.getvalue()).decode()

        return Response(
            {
                'secret': secret,
                'otpauth_url': uri,
                'qr_code': f'data:image/png;base64,{qr_b64}',
            }
        )


class VerifyTwoFactorSetupView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        code = (request.data.get('code') or '').strip()
        if not user.two_factor_secret:
            return Response({'detail': 'Two-factor setup not initiated.'}, status=status.HTTP_400_BAD_REQUEST)

        totp = pyotp.TOTP(user.two_factor_secret)
        if not totp.verify(code, valid_window=1):
            return Response({'detail': 'Invalid verification code.'}, status=status.HTTP_400_BAD_REQUEST)

        user.two_factor_enabled = True
        user.save(update_fields=['two_factor_enabled'])
        return Response({'detail': 'Two-factor authentication enabled.'})


class DisableTwoFactorView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        user.two_factor_enabled = False
        user.two_factor_secret = None
        user.save(update_fields=['two_factor_enabled', 'two_factor_secret'])
        return Response({'detail': 'Two-factor authentication disabled.'})


class VerifyLoginOTPView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        user_id = request.data.get('user_id')
        code = (request.data.get('code') or '').strip()
        if not user_id or not code:
            return Response({'detail': 'User ID and code are required.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

        if not user.two_factor_enabled or not user.two_factor_secret:
            return Response({'detail': 'Two-factor authentication is not enabled for this account.'}, status=status.HTTP_400_BAD_REQUEST)

        totp = pyotp.TOTP(user.two_factor_secret)
        if not totp.verify(code, valid_window=1):
            return Response({'detail': 'Invalid or expired code.'}, status=status.HTTP_400_BAD_REQUEST)

        access_jwt, refresh_jwt = _create_tokens_for_user(user)
        return Response({'access': access_jwt, 'refresh': refresh_jwt})
