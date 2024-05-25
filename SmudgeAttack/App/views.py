import numbers

from django.shortcuts import render
from django.http import HttpResponse

from matplotlib import pyplot as plt
import json
import base64
import random
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
        return {'tl': [self.x, self.y], 'tr': [self.x + self.w, self.y], 'bl': [self.x, self.y + self.h],
                'br': [self.x + self.w, self.y + self.h]}

    def xyxy(self) -> List[int]:
        return [self.x, self.y, self.x + self.w, self.y + self.h]

    def iou(self, other: 'BoundingBox') -> float:
        inter_w = min(self.x + self.w, other.x + other.w) - max(self.x, other.x)
        inter_h = min(self.y + self.h, other.y + other.h) - max(self.y, other.y)
        inter_area = max(inter_w, 0) * max(inter_h, 0)
        union_w = max(self.x + self.w, other.x + other.w) - min(self.x, other.x)
        union_h = max(self.y + self.h, other.y + other.h) - min(self.y, other.y)
        union_area = union_w * union_h
        return inter_area / union_area

    @staticmethod
    def from_json(json_data: Dict[str, int]) -> 'BoundingBox':
        return BoundingBox(json_data['x'], json_data['y'], json_data['w'], json_data['h'])

    @property
    def fmt_xywh(self) -> str:
        return f'[{self.x}, {self.y}, {self.w}, {self.h}]'

    @property
    def fmt_xyxy(self) -> str:
        return f'[[{self.x}, {self.y}], [{self.x + self.w}, {self.y + self.h}]]'


def parse_bb_json(data) -> Any:
    if '0' not in data:
        return data
    return [BoundingBox(v) for k, v in data.items()]


def sample_bb(refs):
    for ref in refs:
        bb_refs[ref] = [BoundingBox.random_init() for i in range(10)]


def save_bb(data: Dict[str, List[BoundingBox]]) -> None:
    with open('assets/referenceBB.json', 'w') as f:
        f.write("{\n")

        indent = lambda depth: f.write(depth * "    ")
        last = list(data.keys())[-1]
        for key, value in data.items():
            indent(1)
            f.write(f'"{key}": {{\n')
            for i in range(10):
                indent(2)
                f.write(f'"{i}": {value[i].fmt_xywh}{"," if i != 9 else ""}\n')

            indent(1)
            f.write(f'}}{"," if key != last else ""}\n')

        f.write("}")

class ModelWrapper:
    def __init__(self):
        self.model_phone_segmentation = YOLO('assets/weights/best_segX_phone.pt')
        self.model_smudge_detection = YOLO('assets/weights/best_det_phone.pt')
        self.model_digit_detection = YOLO('assets/weights/best_det_phone.pt')

    def segment_phone(self, image: np.ndarray) -> BoundingBox:
        results = self.model_phone_segmentation(image, save=True)
        mask = np.array(results[0].masks[0].xy)[0]

        min_point = np.min(mask, axis=0)
        max_point = np.max(mask, axis=0)
        box = [
            min_point[0], min_point[1],
            max_point[0], max_point[1]
        ]
        box[2] -= box[0]
        box[3] -= box[1]
        return BoundingBox([int(b) for b in box])

    def detect_smudge(self, image: np.ndarray) -> List[BoundingBox]:
        result = self.model_smudge_detection(image)
        boxes = result[0].boxes.xywh.numpy()
        return [BoundingBox(box) for box in boxes]

    def detect_digit(self, image: np.ndarray) -> List[BoundingBox]:
        result = self.model_digit_detection(image)
        boxes = result[0].boxes.xywh.numpy()
        return [BoundingBox(box) for box in boxes]


bb_refs: Dict[str, List[BoundingBox]] = {}
model_wrapper = ModelWrapper()


def index(request):
    global bb_refs
    # sample_bb(["iPhone 13 Pro Max",
    #            "Samsung Galaxy S21 Ultra",
    #            "Google Pixel 6 Pro",
    #            "OnePlus 9 Pro",
    #            "Xiaomi Mi 11 Ultra"]
    #           )
    # save_bb(bb_refs)
    with open('assets/referenceBB.json', 'r') as f:
        bb_refs = json.load(f, object_hook=parse_bb_json)

    return render(request, "SmudgeAttack/index.html")


def detect_phone(request):
    image = request.FILES['image']
    image = cv2.imdecode(np.frombuffer(image.read(), np.uint8), cv2.IMREAD_COLOR)
    image = cv2.resize(image, (WIDTH, HEIGHT))

    bb = model_wrapper.segment_phone(image)

    _, encoded_image = cv2.imencode('.jpg', image)
    encode_image_data = encoded_image.tobytes()
    base64_image_data = base64.b64encode(encode_image_data).decode('utf-8')

    response = {
        'image': base64_image_data,
        'boxes': bb.__dict__()
    }
    return HttpResponse(json.dumps(response), content_type="application/json")


def process(request):
    # get the image
    image = request.POST.get('image')
    image = base64.b64decode(image)
    image = cv2.imdecode(np.frombuffer(image, np.uint8), cv2.IMREAD_COLOR)
    # apply perspective transform
    src_points_dict = eval(request.POST.get('points'))
    src_points = [src_points_dict['tl'], src_points_dict['tr'], src_points_dict['bl'], src_points_dict['br']]
    dst_points = [[0, 0], [WIDTH, 0], [0, WIDTH], [WIDTH, HEIGHT]]

    src_points = np.array(src_points, dtype=np.float32)
    dst_points = np.array(dst_points, dtype=np.float32)
    matrix = cv2.getPerspectiveTransform(src_points, dst_points)
    dst = cv2.warpPerspective(image, matrix, (WIDTH, HEIGHT))

    _, encoded_image = cv2.imencode('.jpg', dst)
    response = encoded_image.tobytes()
    return HttpResponse(response, content_type="image/jpg")


def add_bb_ref(request):
    global bb_refs

    image = request.FILES['image']
    image = cv2.imdecode(np.frombuffer(image.read(), np.uint8), cv2.IMREAD_COLOR)
    image = cv2.resize(image, (WIDTH, HEIGHT))

    ref = request.POST.get('ref')
    bb = model_wrapper.detect_digit(image)

    bb_refs[ref] = bb
    save_bb(bb_refs)
    return HttpResponse('')


def guess_number(boxes: List[BoundingBox], ref: str) -> List[int]:
    # compute the iou between the reference number location and the boxes
    pin = []
    for box in boxes:
        max_iou = max([box.iou(bb_ref) for bb_ref in bb_refs[ref]])
        if max_iou > 0.8:
            pin.append(boxes.index(box))

    return pin


def guess_order(pin: List[int], ref: str) -> List[int]:
    order = []
    for i in range(10):
        if i in pin:
            order.append(pin.index(i))
        else:
            order.append(-1)

    return order
