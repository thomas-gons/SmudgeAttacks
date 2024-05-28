from django.shortcuts import render, HttpResponse
from django.contrib.auth.models import User
from django.views.decorators.csrf import csrf_exempt
from rest_framework import generics
from .serializers import UserSerializer, ReferenceSerializer, BoundingBoxSerializer
from rest_framework.permissions import IsAuthenticated, AllowAny
from .models import ReferenceModel, BoundingBoxModel


class CreateUserView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [AllowAny]


class PhoneReferences(generics.ListCreateAPIView):
    serializer_class = ReferenceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ReferenceModel.objects.all()


class BoundingBoxDelete(generics.DestroyAPIView):
    serializer_class = BoundingBoxSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        reference = self.request.data['ref']
        return BoundingBoxModel.objects.filter(ref=reference)


import json
import random
import base64
from typing import *

import cv2
import numpy as np
from ultralytics import YOLO

WIDTH = 640
HEIGHT = 640


class BoundingBox:
    x: int
    y: int
    w: int
    h: int

    def __init__(self, *args):
        if len(args) == 1:
            self.x, self.y, self.w, self.h = args[0]

        elif len(args) == 4:
            self.x, self.y, self.w, self.h = args
        else:
            raise ValueError("Bad arguments")

    @classmethod
    def random_init(cls, bounds: Tuple[int, int] = (WIDTH, HEIGHT), size: Tuple[int, int] = (50, 50)):
        x = random.randint(0, bounds[0])
        y = random.randint(0, bounds[1])
        w = random.randint(0, size[0])
        h = random.randint(0, size[1])
        return cls(x, y, w, h)

    def __repr__(self):
        return f"BoundingBox({self.x}, {self.y}, {self.w}, {self.h})"

    def __dict__(self):
        return {'x': self.x, 'y': self.y, 'w': self.w, 'h': self.h}

    def xyxy(self) -> List[int]:
        return [self.x, self.y, self.x + self.w, self.y + self.h]

    def all_corners(self) -> np.ndarray:
        return np.array([
            [self.x, self.y],
            [self.x + self.w, self.y],
            [self.x, self.y + self. h],
            [self.x + self.w, self.y + self.h]
        ], np.float32)

    def iou(self, other: 'BoundingBox') -> float:
        inter_w = min(self.x + self.w, other.x + other.w) - max(self.x, other.x)
        inter_h = min(self.y + self.h, other.y + other.h) - max(self.y, other.y)
        inter_area = max(inter_w, 0) * max(inter_h, 0)
        union_w = max(self.x + self.w, other.x + other.w) - min(self.x, other.x)
        union_h = max(self.y + self.h, other.y + other.h) - min(self.y, other.y)
        union_area = union_w * union_h
        return inter_area / union_area


from scipy.spatial import KDTree
from scipy.cluster.vq import kmeans

import matplotlib.pyplot as plt


class ModelWrapper:
    def __init__(self):
        self.model_phone_segmentation = YOLO('assets/weights/best_det_phone.pt')
        self.model_smudge_detection = YOLO('assets/weights/best_det_phone.pt')
        self.model_digit_detection = YOLO('assets/weights/best_det_phone.pt')

    def segment_phone(self, image: np.ndarray) -> BoundingBox | None:
        results = self.model_phone_segmentation(image, save=True)
        if len(results[0].boxes) == 0:
            return None
        # if results[0].masks is None:
        #     return None

        box = results[0].boxes[0].xywh.numpy()[0]
        box[0] -= (box[2] / 2)
        box[1] -= (box[3] / 2)
        return BoundingBox([int(b) for b in box])
        # vertices = np.array(results[0].masks[0].xy)[0]
        #
        # kdtree = KDTree(vertices)
        # _k = 5
        # corners = []
        # for i, vertex in enumerate(vertices):
        #     _, indices = kdtree.query(vertex, k=_k)
        #     u = vertex - vertices[indices[_k - 2]]
        #     v = vertex - vertices[indices[_k - 1]]
        #     angle = np.arccos(np.dot(u, v) / (np.linalg.norm(u) * np.linalg.norm(v)))
        #     if 30 < np.rad2deg(angle) < 135:
        #         corners.append(vertex)
        #
        # corners = np.array(corners)
        # centroids = kmeans(corners, k_or_guess=4)[0]
        #
        # plt.imshow(image)
        # plt.scatter(vertices[:, 0], vertices[:, 1], c="#0000ff", linewidths=1)
        # plt.scatter(centroids[:, 0], centroids[:, 1], c="#ff0000", linewidths=1)
        # plt.scatter(corners[:, 0], corners[:, 1], c="#00ff00", linewidths=1)
        # plt.show()
        # plt.close()

        # box = [
        #     np.min(mask[:, 0]), np.min(mask[:, 1]),
        #     np.max(mask[:, 0]), np.max(mask[:, 1])
        # ]
        #
        # box[2] -= box[0]
        # box[3] -= box[1]
        # return BoundingBox([int(b) for b in box])

    def detect_smudge(self, image: np.ndarray) -> List[BoundingBox]:
        result = self.model_smudge_detection(image)
        boxes = result[0].boxes.xywh.numpy()
        return [BoundingBox(box) for box in boxes]

    def detect_digit(self, image: np.ndarray) -> List[BoundingBox]:
        result = self.model_digit_detection(image)
        boxes = result[0].boxes.xywh.numpy()
        return [BoundingBox(box) for box in boxes]


model_wrapper = ModelWrapper()


@csrf_exempt
def detect_phone(request):
    ref = request.POST.get('ref')
    image = request.FILES.get("image")
    image = cv2.imdecode(np.frombuffer(image.read(), np.uint8), cv2.IMREAD_COLOR)
    image = cv2.resize(image, (WIDTH, HEIGHT))

    bb = model_wrapper.segment_phone(image)
    if bb is None:
        return HttpResponse(status=422)

    src_points = bb.all_corners()
    dst_points = np.array([[0, 0], [WIDTH, 0], [0, WIDTH], [WIDTH, HEIGHT]], dtype=np.float32)

    matrix = cv2.getPerspectiveTransform(src_points, dst_points)
    dst = cv2.warpPerspective(image, matrix, (WIDTH, HEIGHT))

    # increase brightness
    brightness_matrix = np.ones(dst.shape, dtype='uint8') * 150
    dst_brightened = cv2.add(dst, brightness_matrix)

    boxes = model_wrapper.detect_smudge(dst_brightened)
    ciphers = guess_number(boxes, ref)

    most_likely_pincode = guess_order(ciphers, ref)

    _, encoded_image = cv2.imencode('.jpg', dst)
    encode_image_data = encoded_image.tobytes()
    base64_image_data = base64.b64encode(encode_image_data).decode('utf-8')

    response = {
        'image': base64_image_data,
        'boxes': boxes,
        'ciphers': ciphers,
        'mostLikelyPINcode': most_likely_pincode
    }
    return HttpResponse(json.dumps(response), content_type="application/json")


def guess_number(boxes: List[BoundingBox], reference: str) -> List[int]:
    bb_refs = BoundingBoxModel.objects.filter(ref=reference)

    pin = []
    for box in boxes:
        max_iou = max([box.iou(bb_ref) for bb_ref in bb_refs])
        if max_iou > 0.8:
            pin.append(boxes.index(box))

    return pin


def guess_order(pin: List[int], ref: str) -> List[List[int]]:
    order = []
    for i in range(10):
        if i in pin:
            order.append(pin.index(i))
        else:
            order.append(-1)

    return order


@csrf_exempt
def add_bb_ref(request):
    image = request.FILES['phone']
    image = cv2.imdecode(np.frombuffer(image.read(), np.uint8), cv2.IMREAD_COLOR)
    image = cv2.resize(image, (WIDTH, HEIGHT))

    # bb = model_wrapper.detect_digit(image)
    ref_m = ReferenceModel.objects.create(ref=request.POST.get('ref'))
    ref_m.save()
    for i in range(10):
        bb = BoundingBox.random_init()
        bb_m = BoundingBoxModel(x=bb.x, y=bb.y, w=bb.w, h=bb.h, cipher=i, ref=ref_m)
        bb_m.save()

    return HttpResponse('', status=201)
