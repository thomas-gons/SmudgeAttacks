from rest_framework import serializers
from .models import ReferenceModel, BoundingBoxModel


class ReferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReferenceModel
        fields = '__all__'

    def create(self, validated_data):
        ref = ReferenceModel.objects.create(**validated_data)
        return ref


class BoundingBoxSerializer(serializers.ModelSerializer):
    class Meta:
        model = BoundingBoxModel
        fields = ["id", "x", "y", "w", "h"]
        extra_kwargs = {"ref": {"read_only": True}}
