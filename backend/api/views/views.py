from django.http import HttpResponse, Http404
from django.contrib.auth.models import User
from django.views.decorators.csrf import csrf_exempt
from rest_framework import generics
from rest_framework.response import Response

from api.serializers import UserSerializer, ReferenceSerializer
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.views import APIView
from django.core.handlers.wsgi import WSGIRequest

import json

from api.views.imageProcessing import *
from api.views.modelWrapper import ModelWrapper
from api.views.digitRecognition import *
from api.views.orderGuessing import *


class CreateUserView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [AllowAny]


class PhoneReferences(APIView):
    serializer_class = ReferenceSerializer
    permission_classes = [IsAuthenticated]

    def get(self, request, format=None):
        references = ReferenceModel.objects.all()
        serializer = ReferenceSerializer(references, many=True)
        return Response(serializer.data)

    def post(self, request, format=None):
        image = preprocess_image(request.FILES['phone'])
        reference = request.POST.get('ref')

        image = model_wrapper.segment_phone(image)
        if image is None:
            return HttpResponse(status=422)

        bboxes, b64_image = DigitRecognition(img=image).process_data()

        ref_m = ReferenceModel.objects.create(ref=reference)
        ref_m.save()
        for i, bb in enumerate(bboxes):
            bb_m = BoundingBoxModel(x=bb.x, y=bb.y, w=bb.w, h=bb.h, cipher=i, ref=ref_m)
            bb_m.save()

        response = {
            'image': b64_image,
            'ref': reference,
            'id': ref_m.id
        }
        return HttpResponse(json.dumps(response), content_type='application/json', status=201)

    def put(self, request, format=None):
        pass

    def delete(self, request, pk, format=None):
        ReferenceModel.objects.filter(id=pk).delete()
        return HttpResponse(status=201)

model_wrapper = ModelWrapper()

@csrf_exempt
def detect_phone(request: WSGIRequest) -> HttpResponse:
    ref = request.POST.get('ref')
    image = request.FILES.get("image")
    filename = image.name

    image = get_image(image)
    original_shape = image.shape
    image_cropped = preprocess_image(image)

    dst = model_wrapper.segment_phone(image_cropped)
    if dst is None:
        return HttpResponse(status=422)

    boxes = model_wrapper.detect_smudge(dst, filename)
    ciphers, b64_img = guess_ciphers(dst, boxes, ref)
    most_likely_pin_codes = guess_order(ciphers)

    pw = PyplotWrapper(True)
    pw.plot_image(image)
    # x_fact, y_fact = np.array(original_shape)[:2] / (640, 640)
    # [box.scale(x_fact, y_fact) for box in boxes]
    # pw.plot_bounding_boxes(boxes)
    # b64_img = pw.export_as_b64()
    sequence_formatted = " - ".join(most_likely_pin_codes[0]) if len(most_likely_pin_codes) > 0 else ''
    response = {
        'sequence': sequence_formatted,
        'image': b64_img,
        'pin_codes': most_likely_pin_codes,
        'filename': filename,
        'reference': ref
    }
    return HttpResponse(json.dumps(response), content_type="application/json", status=201)
