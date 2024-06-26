import base64

from django.http import HttpResponse
from django.contrib.auth.models import User
from django.views.decorators.csrf import csrf_exempt
from rest_framework import generics

from api.serializers import UserSerializer, ReferenceSerializer
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.views import APIView
from django.core.handlers.wsgi import WSGIRequest
from PIL import Image

import json

from api.views.imageProcessing import *
from api.views.modelWrapper import ModelWrapper
from api.views.digitRecognition import *
from api.views.orderGuessing import *
from utils.cipher_to_literal import ciphers_to_literal


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
        data = json.dumps({
            "refs": serializer.data,
            "order_guessing_algorithms": algorithms
        })
        return HttpResponse(data, content_type='application/json')

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

    @staticmethod
    def delete(self, request, pk, format=None):
        ReferenceModel.objects.filter(id=pk).delete()
        return HttpResponse(status=201)


model_wrapper = ModelWrapper()


@csrf_exempt
def detect_phone(request: WSGIRequest) -> HttpResponse:
    ref = request.POST.get('ref')
    image = request.FILES.get("image")
    cipher_guess = request.POST.get('cipher_guess').split(',')
    cipher_guessing_algorithms = request.POST.get('order_guessing_algorithms').split(',')

    new_pin_length = len(cipher_guess)
    if not OrderGuessing.check_new_pin_length(new_pin_length):
        return HttpResponse(f"No statistics built for PIN codes of {ciphers_to_literal[new_pin_length]} symbols.\n"
                            f"Would you like to build new statistics for this length ?", status=422)

    only_compute_order = request.POST.get('only_compute_order') == 'true'
    filename = image.name

    image = get_image(image)
    image_cropped = preprocess_image(image)

    dst = model_wrapper.segment_phone(image_cropped)
    if dst is None:
        return HttpResponse(f"The image {filename} does not appear to contain a phone", status=422)

    bboxes = model_wrapper.detect_smudge(dst, filename)
    ciphers, refs_bboxes, b64_img = guess_ciphers(dst, bboxes, ref)

    image_pil = Image.fromarray(dst.astype('uint8'), 'RGB')
    buffer = BytesIO()
    image_pil.save(buffer, format='PNG')
    buffer.seek(0)
    image = buffer.read()

    b64_img = "data:image/png;base64," + base64.b64encode(image).decode('utf-8')
    if len(ciphers) != new_pin_length:
        response = {
            'reference': ref,
            'image': b64_img,
            'ref_bboxes': refs_bboxes,
            'inferred_bboxes': [bb.xywh() for bb in bboxes],
            'msg': 'The number of detected ciphers does not match the expected PIN length'
        }
        return HttpResponse(json.dumps(response), content_type="application/json", status=206)

    most_likely_pin_codes = OrderGuessing.process(ciphers, cipher_guessing_algorithms, cipher_guess)

    pw = PyplotWrapper(True)
    pw.plot_image(image)
    sequence_formatted = " - ".join(most_likely_pin_codes[0]) if len(most_likely_pin_codes) > 0 else ''
    response = {
        'sequence': sequence_formatted,
        'image': b64_img,
        'pin_codes': most_likely_pin_codes,
        'filename': filename,
        'reference': ref
    }
    return HttpResponse(json.dumps(response), content_type="application/json", status=201)


@csrf_exempt
def update_pin_code(request: WSGIRequest) -> HttpResponse:
    sequence = request.POST.get('sequence').split('-')
    formatted_sequence = [(cipher, 1.0) for cipher in sequence]
    cipher_guess = request.POST.get('cipher_guess').split(',')
    cipher_guessing_algorithms = request.POST.get('order_guessing_algorithms').split(',')
    most_likely_pin_codes = OrderGuessing.process(formatted_sequence, cipher_guessing_algorithms, cipher_guess)
    response = {
        'pin_codes': most_likely_pin_codes
    }
    return HttpResponse(json.dumps(response), content_type="application/json", status=201)


@csrf_exempt
def build_statistics(request: WSGIRequest) -> HttpResponse:
    pin_length = int(request.POST.get('new_pin_length'))
    file_content = request.FILES.get('reference_file')
    try:
        OrderGuessing.generate_stats(pin_length, file_content)
    except ValueError as e:
        return HttpResponse(e.args[0], status=422)

    return HttpResponse(f"Statistics for PIN code of {ciphers_to_literal[pin_length]} "
                        f"symbols has been correctly generated.", status=201)
