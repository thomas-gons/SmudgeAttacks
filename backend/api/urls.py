from django.urls import path
from api.views import views

urlpatterns = [
    path("phone-references", views.PhoneReferences.as_view(), name="phone-references"),
    path("phone-references/<int:pk>", views.PhoneReferences.as_view()),
    path("build-statistics", views.build_statistics, name="build-statistics"),
    path("find-pin-code", views.find_pin_code, name="find-pin-code"),
    path("find-pin-code-from-manual", views.find_pin_code_manual_corrected_inference, name="find-pin-code-from-manual"),
    path("update-pin-code", views.update_pin_code, name="update-pin-code"),
]
