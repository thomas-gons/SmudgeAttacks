from django.http import HttpResponse
from django.contrib.auth.models import User
from django.views.decorators.csrf import csrf_exempt
from rest_framework import generics

from api.serializers import UserSerializer, ReferenceSerializer
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.views import APIView
from django.core.handlers.wsgi import WSGIRequest

import json

from api.views.imageMisc import *
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

    def get(self, request):
        references = ReferenceModel.objects.all()
        serializer = ReferenceSerializer(references, many=True)
        data = json.dumps({
            "refs": serializer.data,
            "order_guessing_algorithms": algorithms
        })
        return HttpResponse(data, content_type='application/json')

    def post(self, request):
        image = preprocess_image(request.FILES['phone'])
        reference = request.POST.get('ref')

        image = model_wrapper.segment_phone(image)
        if image is None:
            return HttpResponse(status=422)

        bboxes = DigitRecognition(img=image).process_data()

        ref_m = ReferenceModel.objects.create(ref=reference)
        ref_m.save()
        for i, bb in enumerate(bboxes):
            bb_m = BoundingBoxModel(x=bb.x, y=bb.y, w=bb.w, h=bb.h, cipher=i, ref=ref_m)
            bb_m.save()

        response = {
            'image': get_b64_img_from_np_array(image),
            'bboxes': [bb.xywh() for bb in bboxes],
            'ref': reference,
            'id': ref_m.id
        }
        return HttpResponse(json.dumps(response), content_type='application/json', status=201)

    @staticmethod
    def delete(request, pk):
        ReferenceModel.objects.filter(id=pk).delete()
        return HttpResponse(status=201)


model_wrapper = ModelWrapper()


@csrf_exempt
def find_pin_code(request: WSGIRequest) -> HttpResponse:

    user_config = json.loads(request.POST.get('config'))
    order_guessing_algorithms = user_config['order_guessing_algorithms']
    order_cipher_guesses = user_config['order_cipher_guesses']

    new_pin_length = user_config['pin_length']
    if not OrderGuessing.check_new_pin_length(new_pin_length):
        return HttpResponse(f"No statistics built for PIN codes of {ciphers_to_literal[new_pin_length]} symbols.\n"
                            f"Would you like to build new statistics for this length ?", status=422)

    ref = request.POST.get('ref')
    image = request.FILES.get("image")
    filename = image.name
    image = preprocess_image(image)

    seg_img = model_wrapper.segment_phone(image)
    if seg_img is None:
        return HttpResponse(f"The image {filename} does not appear to contain a phone", status=422)

    b64_img = get_b64_img_from_np_array(seg_img)

    bboxes = model_wrapper.detect_smudge(seg_img, filename)
    ciphers, refs_bboxes = guess_ciphers(bboxes, ref)

    if len(ciphers) != new_pin_length and user_config['inference_correction'] == 'manual':

        response = {
            'reference': ref,
            'filename': filename,
            'image': b64_img,
            'ref_bboxes': refs_bboxes,
            'inferred_bboxes': [bb.xywh() for bb in bboxes],
            'inferred_ciphers': [int(cipher[0]) for cipher in ciphers],
            'msg': 'The number of detected ciphers does not match the expected PIN length'
        }
        return HttpResponse(json.dumps(response), content_type="application/json", status=206)

    most_likely_pin_codes = OrderGuessing.process(ciphers, order_guessing_algorithms, order_cipher_guesses)

    response = {
        'image': b64_img,
        'pin_codes': most_likely_pin_codes,
        'filename': filename,
        'reference': ref,
        'ref_bboxes': refs_bboxes,
        'inferred_bboxes': [bb.xywh() for bb in bboxes],
    }
    return HttpResponse(json.dumps(response), content_type="application/json", status=200)


@csrf_exempt
def find_pin_code_manual_corrected_inference(request: WSGIRequest) -> HttpResponse:
    new_ciphers = json.loads(request.POST.get('new_ciphers'))
    bboxes = json.loads(request.POST.get('mapping_cipher_bboxes'))
    user_config = json.loads(request.POST.get('config'))

    order_guessing_algorithms = user_config['order_guessing_algorithms']
    order_cipher_guesses = user_config['order_cipher_guesses']

    ciphers = [(cipher, 1.0) for cipher in new_ciphers]
    most_likely_pin_codes = OrderGuessing.process(ciphers, order_guessing_algorithms, order_cipher_guesses)

    response = {
        'pin_codes': most_likely_pin_codes,
        'bboxes': [bb[1] for bb in bboxes]
    }

    return HttpResponse(json.dumps(response), content_type="application/json", status=200)


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
    return HttpResponse(json.dumps(response), content_type="application/json", status=200)


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
