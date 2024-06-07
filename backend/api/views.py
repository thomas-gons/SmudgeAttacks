from django.http import HttpResponse
from django.contrib.auth.models import User
from django.views.decorators.csrf import csrf_exempt
from rest_framework import generics
from .serializers import UserSerializer, ReferenceSerializer
from rest_framework.permissions import IsAuthenticated, AllowAny
from .models import ReferenceModel, BoundingBoxModel

import json
import random
import base64
from typing import *
from io import BytesIO
from itertools import permutations
from collections import defaultdict
from functools import reduce

import cv2
from scipy.spatial import KDTree
from sklearn.cluster import DBSCAN
import matplotlib.pyplot as plt
import numpy as np
from ultralytics import YOLO
import inflect

import yaml


with open("config.yaml", 'r') as stream:
    try:
        config = yaml.safe_load(stream)
    except yaml.YAMLError as exc:
        print(exc)


WSGIRequest = Type['WSGIRequest']
TemporaryUploadedFile = Type['TemporaryUploadedFile']


class CreateUserView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [AllowAny]


class GetPhoneReferencesView(generics.ListCreateAPIView):
    serializer_class = ReferenceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ReferenceModel.objects.all()


class BoundingBox:
    x: int
    y: int
    w: int
    h: int

    def __init__(self, *args: Tuple[int, int, int, int] | Tuple[int, int, int] | int) -> None:
        if len(args) == 1:
            self.x, self.y, self.w, self.h = args[0]

        elif len(args) == 4:
            self.x, self.y, self.w, self.h = args
        else:
            raise ValueError("Bad arguments")

    @classmethod
    def random_init(
            cls: Type['BoundingBox'],
            bounds: Tuple[int, int] = (config["width"] , config["height"] ),
            size: Tuple[int, int] = (50, 50)
    ):

        x = random.randint(0, bounds[0])
        y = random.randint(0, bounds[1])
        w = random.randint(0, size[0])
        h = random.randint(0, size[1])
        return cls(x, y, w, h)

    def __repr__(self) -> str:
        return f"BoundingBox({self.x}, {self.y}, {self.w}, {self.h})"

    def __dict__(self) -> Dict[str, int]:
        return {'x': self.x, 'y': self.y, 'w': self.w, 'h': self.h}

    def xyxy(self) -> List[int]:
        # top left and bottom right corners of the bounding box
        return [self.x, self.y, self.x + self.w, self.y + self.h]

    def all_corners(self) -> np.ndarray:
        # top left, top right, bottom left, bottom right
        return np.array([
            [self.x, self.y],
            [self.x + self.w, self.y],
            [self.x, self.y + self.h],
            [self.x + self.w, self.y + self.h]
        ], dtype=np.float32)

    def iou(self, other: 'BoundingBox') -> float:
        # compute the overlap area between two bounding boxes
        inter_w = min(self.x + self.w, other.x + other.w) - max(self.x, other.x)
        inter_h = min(self.y + self.h, other.y + other.h) - max(self.y, other.y)
        inter_area = max(inter_w, 0) * max(inter_h, 0)
        union_w = max(self.x + self.w, other.x + other.w) - min(self.x, other.x)
        union_h = max(self.y + self.h, other.y + other.h) - min(self.y, other.y)
        union_area = union_w * union_h

        return inter_area / union_area


def export_plotted_bbox_on_image(img: np.ndarray, bboxes: List[BoundingBox]) -> BytesIO:

    fig, ax = plt.subplots()
    ax.imshow(img)

    # plot every bounding box
    for i, box in enumerate(bboxes):
        box = np.array(
            [[box.x, box.y],
             [box.x + box.w, box.y],
             [box.x + box.w, box.y + box.h],
             [box.x, box.y + box.h],
             [box.x, box.y]])
        ax.plot(box[:, 0], box[:, 1], c="#00ff00")

    ax.axis('off')

    buffer = BytesIO()
    # save the plot to a buffer but exclude the white space around the plot
    plt.savefig(buffer, format='png', bbox_inches='tight', pad_inches=0)
    plt.close(fig)

    # reset the buffer to the beginning
    buffer.seek(0)
    return buffer


class DigitRecognition:
    """
        1  2  3
        4  5  6
        7  8  9
           0

    Below cipher coordinates from the center aka 5
    """
    pin_layout = np.array([
        [-1, -1], [0, -1], [1, -1],
        [-1,  0], [0,  0], [1,  0],
        [-1,  1], [0,  1], [1,  1],
        [ 0,  2]
    ])

    images_edges: np.ndarray
    result: BytesIO

    def __init__(self, img: np.ndarray):
        self.image = img
        self.bounds = config["DigitRecognition"]["bounds"]
        self.width_bounds = config["width"] * np.array(self.bounds)
        self.height_bounds = config["height"] * np.array(self.bounds)
        self.digit_alignment_delta = config["DigitRecognition"]["digit_alignment_delta"]
        self.bbox_padding = config["DigitRecognition"]["bbox_padding"]
        self.canny_thresholds = config["DigitRecognition"]["canny_thresholds"]

    def extract_shape_contours(self):
        self.image = cv2.cvtColor(self.image, cv2.COLOR_BGR2GRAY)

        # edge detection using canny
        self.images_edges = cv2.Canny(self.image, self.canny_thresholds[0], self.canny_thresholds[1])
        contours, _ = cv2.findContours(self.images_edges, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
        contours = np.vstack(contours).squeeze()

        # get individual contours
        clusters = DBSCAN(
            eps=config["DigitRecognition"]["cluster_eps"],
            min_samples=config["DigitRecognition"]["cluster_min_samples"]).fit(contours)

        clusters_xy = [[] for _ in range(np.max(clusters.labels_) + 1)]
        for i, cluster_id in enumerate(clusters.labels_):
            if cluster_id == -1:
                continue

            clusters_xy[cluster_id].append(list(contours[i]))

        return clusters_xy

    def filter_clusters(self, clusters: List):
        # get the barycenters of all clusters that aren't too near to edges or too large
        barycenters = []
        for cluster in clusters:
            cluster = np.array(cluster)
            # get the bounding box
            tl = np.min(cluster, axis=0)
            br = np.max(cluster, axis=0)
            w = br[0] - tl[0]
            h = br[1] - tl[1]
            area = w * h
            barycenter = [tl[0] + w / 2, tl[1] + h / 2]

            if (area > 0.1 * (config["width"] * config["height"]) or not
            ((self.width_bounds[0] < barycenter[0] < self.width_bounds[1]) and
             (self.height_bounds[0] < barycenter[1] < self.height_bounds[1]))):
                continue

            barycenters.append(barycenter)

        barycenters = np.array(barycenters)
        return barycenters

    def extract_digit_matrix(self, barycenters):

        # 1-9 are aligned with two others ciphers vertically and horizontally in a pin-code
        # iter two times to remove residuals barycenter => e.g. input dot or texts
        for _ in range(2):
            to_keep = []
            for i, b in enumerate(barycenters):
                near_x_count = 0
                near_y_count = 0
                for j, bb in enumerate(barycenters):
                    if b[0] == bb[0] and b[1] == bb[1]:
                        continue

                    dx = abs(b[0] - bb[0])
                    dy = abs(b[1] - bb[1])
                    if dx < self.digit_alignment_delta[0]:
                        near_x_count += 1
                    if dy < self.digit_alignment_delta[1]:
                        near_y_count += 1

                if near_x_count >= 2 and near_y_count >= 2:
                    to_keep.append(i)

            barycenters = barycenters[np.array(to_keep)]

        return barycenters

    def get_pin_bbox(self, barycenters):
        bbox_min = np.min(barycenters, axis=0)
        bbox_max = np.max(barycenters, axis=0)
        center = (bbox_max + bbox_min) / 2

        distances = np.linalg.norm(barycenters - center, axis=1)
        r_center = barycenters[np.argmin(distances)].copy()

        # distances between cipher from 5 respect a schema:
        # d(2, 5) = d(8, 5) = h
        # d(4, 5) = d(6, 5) = w
        #
        # and h < w by default because of the layout
        r_distances = np.sort(np.linalg.norm(barycenters - r_center, axis=1))
        h = np.mean(r_distances[1:3])
        w = np.mean(r_distances[3:5])

        adj_barycenters = r_center + DigitRecognition.pin_layout * [w, h]
        bboxes = [BoundingBox(
            adj_b[0] - self.bbox_padding[0],
            adj_b[1] - self.bbox_padding[1],
            self.bbox_padding[0] * 2,
            self.bbox_padding[1] * 2
        ) for adj_b in adj_barycenters]

        DigitRecognition.result = export_plotted_bbox_on_image(self.image, bboxes)
        # replace the bounding box for 0 at the beginning
        bboxes.insert(0, bboxes[-1])
        bboxes.pop(-1)
        return bboxes

    def process_data(self) -> List[BoundingBox]:
        clusters = self.extract_shape_contours()
        barycenters = self.filter_clusters(clusters)
        matrix_barycenters = self.extract_digit_matrix(barycenters)
        return self.get_pin_bbox(matrix_barycenters)


class ModelWrapper:

    def __init__(self):
        self.model_phone_segmentation = YOLO(config["ModelWrapper"]["phone_seg_weights"])
        self.model_smudge_detection = YOLO(config["ModelWrapper"]["smudges_det_weights"])
        self.interp_step = config["ModelWrapper"]["interp_step"]

    def approx_mask_to_polygon(self, img: np.ndarray, vertices: np.ndarray) -> np.ndarray:
        # resampling to add more points between far consecutive point
        interp_vertices = []
        for i in range(len(vertices)):
            start = vertices[i]
            end = vertices[(i + 1) % len(vertices)]
            interp_vertices.append(start)
            u = end - start
            d = np.linalg.norm(u)
            unit_u = u / d
            n_vert = int(d // self.interp_step)
            for j in range(1, n_vert + 1):
                noise = np.random.normal(0, 0.25, size=start.shape)
                noisy_interp_vert = start + j * self.interp_step * unit_u + noise
                interp_vertices.append(noisy_interp_vert)

        interp_vertices = np.array(interp_vertices)
        contours = interp_vertices.reshape((-1, 1, 2)).astype(np.int32)
        eps = 1

        # rough approximation
        while True:
            approx = cv2.approxPolyDP(contours, eps, True)
            approx = approx.reshape((-1, 2))
            if len(approx) == 4:
                break

            eps += 0.5

        # Refining
        # split original vertices in edges according to the rough approximation
        indices = [np.where(np.array((interp_vertices == point)).all(axis=1))[0][0] for point in approx]
        approx_groups = np.split(interp_vertices, indices)
        # merge the first group with the last
        approx_groups = [np.concatenate((approx_groups[0], approx_groups[-1]))] + approx_groups[1:-1]

        slopes = []
        intercepts = []
        for approx_group in approx_groups:
            x = approx_group[:, 0]
            y = approx_group[:, 1]
            if np.var(x) > np.var(y):
                slope, intercept = np.polyfit(x, y, 1)

            else:
                slope_temp, intercept_temp = np.polyfit(y, x, 1)
                slope = 1 / slope_temp
                intercept = -intercept_temp / slope_temp

            slopes.append(slope)
            intercepts.append(intercept)

        # extract new vertices by intersecting all lines
        # but excluding all intersections to far from the original point cloud
        kdtree = KDTree(interp_vertices)
        intersects = []
        for i in range(len(approx_groups)):
            for j in range(i + 1, len(approx_groups)):
                x_intersect = (intercepts[j] - intercepts[i]) / (slopes[i] - slopes[j])
                y_intersect = slopes[i] * x_intersect + intercepts[i]
                d, _ = kdtree.query(np.array([x_intersect, y_intersect]), k=1)
                if d > 100:
                    continue
                intersects.append([x_intersect, y_intersect])

        # set the vertices into the following order: top left, top right, bottom right, bottom left
        intersects = np.array(intersects)
        distances = np.linalg.norm(intersects, axis=1)
        intersects = intersects[np.argsort(distances)]
        return intersects

    def segment_phone(self, image: np.ndarray) -> np.ndarray | None:
        results = self.model_phone_segmentation(image, save=True)

        if results[0].masks is None:
            return None

        polygon = np.array(results[0].masks.xy[0])

        # reduce mask to a quad and refine it
        vertices = self.approx_mask_to_polygon(image, polygon)

        # deform the original image with this quad
        dst_points = np.array([
                 [0, 0],
                 [config["width"], 0],
                 [0, config["width"]],
                 [config["width"], config["height"]]
            ], dtype=np.float32)

        matrix = cv2.getPerspectiveTransform(vertices.astype(np.float32), dst_points)
        image = cv2.warpPerspective(image, matrix, (config["width"], config["height"]))
        return image

    def detect_smudge(self, image: np.ndarray, filename: LiteralString) -> List[BoundingBox]:
        result = self.model_smudge_detection(image, save=True, name=filename)
        boxes = result[0].boxes.xywh.numpy()
        boxes[:, 0] -= (boxes[:, 2] / 2)
        boxes[:, 1] -= (boxes[:, 3] / 2)
        return [BoundingBox(box) for box in boxes]


def preprocess_image(img: TemporaryUploadedFile, w: int = config["width"], h: int = config["height"]) -> np.ndarray:
    img = cv2.imdecode(np.frombuffer(img.read(), np.uint8), cv2.IMREAD_COLOR)
    img = cv2.resize(img, (w, h))
    return img


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

    # increase brightness
    # brightness_matrix = np.ones(dst.shape, dtype='uint8') * 150
    # dst_brightened = cv2.add(dst, brightness_matrix)

    boxes = model_wrapper.detect_smudge(dst, filename)
    ciphers, res = guess_ciphers(dst, boxes, ref)
    print(ciphers)
    return HttpResponse(res, content_type='image/png', status=201)
    most_likely_pincodes = guess_order(ciphers)

    blob = export_plotted_bbox_on_image(dst, boxes)
    base64_image_data = base64.b64encode(blob.getvalue()).decode('utf-8')

    response = {
        'image': base64_image_data,
        'mostLikelyPINcode': most_likely_pincodes
    }
    return HttpResponse(json.dumps(response), content_type="application/json")


def guess_ciphers(img, boxes: List[BoundingBox], reference: str) -> Tuple[List[Tuple[int, float]], BytesIO]:
    ref_id = ReferenceModel.objects.get(ref=reference).id
    bb_refs = BoundingBoxModel.objects.filter(ref=ref_id)
    bb_refs = {bb.cipher: BoundingBox(bb.x, bb.y, bb.w, bb.h) for bb in bb_refs}

    fig, ax = plt.subplots()
    ax.imshow(img)

    # plot every bounding box
    for cipher, box in bb_refs.items():
        bbox = np.array(
            [[box.x, box.y],
             [box.x + box.w, box.y],
             [box.x + box.w, box.y + box.h],
             [box.x, box.y + box.h],
             [box.x, box.y]])
        ax.plot(bbox[:, 0], bbox[:, 1], c="#00ff00")
        center_x = (box.x + box.x + box.w) / 2
        center_y = (box.y + box.y + box.h) / 2

        # Write the cipher text at the center of the bounding box
        ax.text(center_x, center_y, cipher, ha='center', va='center', color='white')

    for i, box in enumerate(boxes):
        box = np.array(
            [[box.x, box.y],
             [box.x + box.w, box.y],
             [box.x + box.w, box.y + box.h],
             [box.x, box.y + box.h],
             [box.x, box.y]])
        ax.plot(box[:, 0], box[:, 1], c="#ff0000")

    ax.axis('off')
    buffer = BytesIO()
    # save the plot to a buffer but exclude the white space around the plot
    plt.savefig(buffer, format='png', bbox_inches='tight', pad_inches=0)
    plt.close(fig)

    # reset the buffer to the beginning
    buffer.seek(0)

    pin = []
    min_iou = config["CipherGuessing"]["min_iou"]
    for box in boxes:
        iou = np.array([box.iou(bb_ref) for bb_ref in bb_refs.values()], dtype=np.float32)
        best_cipher = np.argmax(iou)
        best_iou = iou[best_cipher]
        pin.append((best_cipher, best_iou))

    # TODO: handle less or more than six ciphers retrieved
    # --> if less use markov chain to guess more probable missing ciphers
    # --> if more then compute order for all sequence of 6 ciphers keep cipher with IOU > 0.9 in place
    return pin, buffer


p = inflect.engine()
pin_length_lit = p.number_to_words(config['pin_length'])
for k, v in config["OrderGuessing"].items():
    config["OrderGuessing"][k] = v.replace("###", pin_length_lit)

# numpy raises exception already no need to check
transition_mat = np.load(config["OrderGuessing"]["transition_matrix"], allow_pickle=True)
prob_by_index = np.load(config["OrderGuessing"]["prob_by_index"], allow_pickle=True)
freq = np.load(config["OrderGuessing"]["frequencies"], allow_pickle=True)


def guess_order(ciphers: List[Tuple[int, float]]) -> List[str]:
    if len(ciphers) != config['pin_length']:
        return []
    all_pins_sep = list(permutations(ciphers))
    all_pins = np.array([reduce(lambda x, y: 10 * x + y, pin) for pin in all_pins_sep])
    all_pins_sep = np.array(all_pins_sep)
    n_permutations = len(all_pins)

    prob_acc_index = np.prod(prob_by_index[all_pins_sep, np.arange(all_pins_sep.shape[1])], axis=1)
    sorted_pins_acc_index = np.argsort(prob_acc_index)[::-1]

    prob_acc_markov = np.prod(transition_mat[all_pins_sep[:, :-1], all_pins_sep[:, 1:]], axis=1)
    sorted_pins_acc_markov = np.argsort(prob_acc_markov)[::-1]

    prob_acc_freq = freq[all_pins]
    sorted_pins_acc_freq = np.argsort(prob_acc_freq)[::-1]

    weights = defaultdict(int)

    for i in range(n_permutations):
        ith_pin_acc_index = all_pins[sorted_pins_acc_index[i]]
        ith_pin_acc_markov = all_pins[sorted_pins_acc_markov[i]]
        ith_pin_acc_freq = all_pins[sorted_pins_acc_freq[i]]

        weights[ith_pin_acc_index] += i
        weights[ith_pin_acc_markov] += i
        weights[ith_pin_acc_freq] += i

    return [k for k, v in sorted(weights.items(), key=lambda item: item[1])[:min(20, n_permutations)]]


@csrf_exempt
def add_bb_ref(request: WSGIRequest) -> HttpResponse:
    image = preprocess_image(request.FILES['phone'])

    image = model_wrapper.segment_phone(image)
    if image is None:
        return HttpResponse(status=422)

    bboxes = DigitRecognition(img=image).process_data()

    ref_m = ReferenceModel.objects.create(ref=request.POST.get('ref'))
    ref_m.save()
    for i, bb in enumerate(bboxes):
        bb_m = BoundingBoxModel(x=bb.x, y=bb.y, w=bb.w, h=bb.h, cipher=i, ref=ref_m)
        bb_m.save()

    return HttpResponse(DigitRecognition.result, content_type='image/png', status=201)
