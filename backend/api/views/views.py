from django.http import HttpResponse
from django.contrib.auth.models import User
from django.views.decorators.csrf import csrf_exempt
from rest_framework import generics
from backend.api.serializers import UserSerializer, ReferenceSerializer
from rest_framework.permissions import IsAuthenticated, AllowAny

import json
import yaml

from imageProcessing import *
from modelWrapper import ModelWrapper
from digitRecognition import *
from orderGuessing import *

with open("config.yaml", 'r') as stream:
    try:
        config = yaml.safe_load(stream)
    except yaml.YAMLError as exc:
        print(exc)

if TYPE_CHECKING:
    from django.core.handlers.wsgi import WSGIRequest


# generic views for basics CRUD
class CreateUserView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [AllowAny]


class GetPhoneReferencesView(generics.ListCreateAPIView):
    serializer_class = ReferenceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ReferenceModel.objects.all()


model_wrapper = ModelWrapper()


@csrf_exempt
def detect_phone(request: WSGIRequest) -> HttpResponse:
    ref = request.POST.get('ref')
    image = request.FILES.get("image")
    filename = image.name

    image = preprocess_image(image)

    dst = model_wrapper.segment_phone(image)
    if dst is None:
        return HttpResponse(status=422)

    boxes = model_wrapper.detect_smudge(dst, filename)
    ciphers, b64_img = guess_ciphers(dst, boxes, ref)
    most_likely_pin_codes = guess_order(ciphers)

    response = {
        'image': b64_img,
        'pin_codes': most_likely_pin_codes
    }
    return HttpResponse(json.dumps(response), content_type="application/json", status=201)


@csrf_exempt
def add_bb_ref(request: WSGIRequest) -> HttpResponse:
    image = preprocess_image(request.FILES['phone'])

    image = model_wrapper.segment_phone(image)
    if image is None:
        return HttpResponse(status=422)

    bboxes, blob_img = DigitRecognition(img=image).process_data()

    ref_m = ReferenceModel.objects.create(ref=request.POST.get('ref'))
    ref_m.save()
    for i, bb in enumerate(bboxes):
        bb_m = BoundingBoxModel(x=bb.x, y=bb.y, w=bb.w, h=bb.h, cipher=i, ref=ref_m)
        bb_m.save()

    return HttpResponse(blob_img, content_type='image/png', status=201)
