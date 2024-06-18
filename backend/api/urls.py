from django.urls import path
from api.views import views

urlpatterns = [
    path("phone-references", views.PhoneReferences.as_view(), name="phone-references"),
    path("phone-references/<int:pk>", views.PhoneReferences.as_view(), name="delete-phone-references"),
    path("find-pin-code", views.detect_phone, name="find-pin-code"),
]
