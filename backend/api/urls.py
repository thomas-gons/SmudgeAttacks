from django.urls import path
from . import views

urlpatterns = [
    path("phone-references/get", views.GetPhoneReferencesView.as_view(), name="get-phone-references"),
    path("phone-references/add", views.add_bb_ref, name="add-phone-references"),
    path("find-pin-code", views.detect_phone, name="find-pin-code"),
]