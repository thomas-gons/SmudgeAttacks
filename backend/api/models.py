from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator


class ReferenceModel(models.Model):
    ref = models.CharField(max_length=100, unique=True)


class BoundingBoxModel(models.Model):
    x = models.IntegerField()
    y = models.IntegerField()
    w = models.IntegerField()
    h = models.IntegerField()

    cipher = models.IntegerField(validators=[MinValueValidator(0), MaxValueValidator(9)])

    ref = models.ForeignKey(ReferenceModel, on_delete=models.CASCADE, related_name="boundingBoxes")

    def __str__(self):
        return f"(x: {self.x}, y: {self.y}, w: {self.w}, h: {self.h})"

