from djoser.serializers import UserCreateSerializer as BaseUserCreateSerializer, UserSerializer as BaseUserSerializer
from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()

class UserCreateSerializer(BaseUserCreateSerializer):
    agree_terms = serializers.BooleanField(write_only=True)

    class Meta(BaseUserCreateSerializer.Meta):
        model = User
        fields = ('id', 'email', 'username', 'password', 'first_name', 'last_name', 'role', 'agree_terms')

    def validate_agree_terms(self, value):
        if not value:
            raise serializers.ValidationError("You must accept terms.")
        return value

    def create(self, validated_data):
        validated_data.pop('agree_terms', None)
        return super().create(validated_data)

class UserSerializer(BaseUserSerializer):
    class Meta(BaseUserSerializer.Meta):
        model = User
        fields = ('id', 'email', 'username', 'first_name', 'last_name', 'role', 'two_factor_enabled')

class AdminUserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=False)

    class Meta:
        model = User
        fields = (
            'id',
            'email',
            'username',
            'first_name',
            'last_name',
            'role',
            'two_factor_enabled',
            'is_active',
            'last_login',
            'date_joined',
            'password',
        )
        extra_kwargs = {
            'username': {'required': False, 'allow_blank': True},
        }

    def validate(self, attrs):
        if self.instance is None and not attrs.get('password'):
            raise serializers.ValidationError({'password': 'Password is required for new users.'})
        return attrs

    def _ensure_username(self, email: str) -> str:
        base = (email.split('@')[0] or 'user').lower()
        candidate = base
        suffix = 1
        while User.objects.filter(username=candidate).exists():
            candidate = f"{base}{suffix}"
            suffix += 1
        return candidate

    def _apply_role_flags(self, user):
        if user.role == User.Role.ADMIN:
            user.is_staff = True
        elif not user.is_superuser:
            user.is_staff = False

    def create(self, validated_data):
        password = validated_data.pop('password')
        username = validated_data.get('username')
        if not username:
            validated_data['username'] = self._ensure_username(validated_data['email'])
        user = User(**validated_data)
        user.set_password(password)
        self._apply_role_flags(user)
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        self._apply_role_flags(instance)
        instance.save()
        return instance
