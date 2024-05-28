from django.contrib.auth.models import User
from rest_framework import serializers
from .models import ReferenceModel, BoundingBoxModel


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "password"]
        extra_kwargs = {"password": {"write_only": True}}

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        return user


class ReferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReferenceModel
        fields = ["ref"]

    def create(self, validated_data):
        ref = ReferenceModel.objects.create(**validated_data)
        return ref


class BoundingBoxSerializer(serializers.ModelSerializer):
    class Meta:
        model = BoundingBoxModel
        fields = ["id", "x", "y", "w", "h"]
        extra_kwargs = {"ref": {"read_only": True}}
