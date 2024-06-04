import matplotlib.pyplot as plt
from django.shortcuts import HttpResponse
from django.contrib.auth.models import User
from django.views.decorators.csrf import csrf_exempt
from rest_framework import generics
from .serializers import UserSerializer, ReferenceSerializer, BoundingBoxSerializer
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
import numpy as np
from ultralytics import YOLO


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
        if len(args) == 3:
            self.x, self.y = args[:2]
            self.w = self.h = args[2]
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
            [self.x, self.y + self.h],
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


def export_plotted_bbox_on_image(img: np.ndarray, bboxes: List[BoundingBox]) -> BytesIO:
    fig, ax = plt.subplots()
    ax.imshow(img)
    for i, box in enumerate(bboxes):
        box = np.array(
            [[box.x, box.y], [box.x + box.w, box.y], [box.x + box.w, box.y + box.h], [box.x, box.y + box.h],
             [box.x, box.y]])
        ax.plot(box[:, 0], box[:, 1], c="#00ff00")

    ax.axis('off')

    buffer = BytesIO()
    plt.savefig(buffer, format='png', bbox_inches='tight', pad_inches=0)
    plt.close(fig)
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
        [-1, 0], [0, 0], [1, 0],
        [-1, 1], [0, 1], [1, 1],
        [0, 2]
    ])

    images_edges = None
    result = None

    def __init__(self, **kwargs):
        self.image = kwargs["img"]
        self.bounds = kwargs.get("bounds", np.array([0.1, 0.9]))
        self.width_bounds = WIDTH * self.bounds
        self.height_bounds = HEIGHT * self.bounds
        self.digit_alignment_delta = kwargs.get("digit_delta_alignment", [20, 20])
        self.bbox_padding = kwargs.get("bbox_padding", 30)

    def extract_shape_contours(self, threshold=128):
        self.image = cv2.cvtColor(self.image, cv2.COLOR_BGR2GRAY)
        self.images_edges = cv2.Canny(self.image, 200, 255)
        contours, _ = cv2.findContours(self.images_edges, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
        contours = np.vstack(contours).squeeze()

        plt.imshow(self.images_edges)
        plt.show()

        plt.imshow(self.images_edges)
        plt.scatter(contours[:, 0], contours[:, 1])
        plt.show()

        # get individual contours
        clusters = DBSCAN(eps=10, min_samples=20).fit(contours)
        clusters_xy = [[] for _ in range(np.max(clusters.labels_) + 1)]
        for i, cluster_id in enumerate(clusters.labels_):
            if cluster_id == -1:
                continue

            clusters_xy[cluster_id].append(list(contours[i]))

        return clusters_xy

    def filter_clusters(self, clusters):
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

            if (area > 0.1 * (WIDTH * HEIGHT) or not
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
            adj_b[0] - self.bbox_padding,
            adj_b[1] - self.bbox_padding,
            self.bbox_padding * 2
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
        self.model_phone_segmentation = YOLO('assets/weights/yolov8-segx-2-phone.pt')
        self.model_smudge_detection = YOLO('assets/weights/yolov8-det-phone.pt')

    @staticmethod
    def approx_mask_to_polygon(img, vertices, ) -> np.ndarray:

        # resampling to add more points between far consecutive point
        step = 30
        interp_vertices = []
        for i in range(len(vertices)):
            start = vertices[i]
            end = vertices[(i + 1) % len(vertices)]
            interp_vertices.append(start)
            u = end - start
            d = np.linalg.norm(u)
            unit_u = u / d
            n_vert = int(d // step)
            for j in range(1, n_vert + 1):
                noise = np.random.normal(0, 0.25, size=start.shape)
                noisy_interp_vert = start + j * step * unit_u + noise
                interp_vertices.append(noisy_interp_vert)

        interp_vertices = np.array(interp_vertices)
        contours = interp_vertices.reshape((-1, 1, 2)).astype(np.int32)
        eps = 1

        plt.imshow(img)
        plt.scatter(interp_vertices[:, 0], interp_vertices[:, 1])
        plt.show()

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
        approx_groups = [approx_group for approx_group in approx_groups if len(approx_group) >= 15]

        plt.imshow(img)
        slopes = []
        intercepts = []
        for approx_group in approx_groups:
            x = approx_group[:, 0]
            y = approx_group[:, 1]
            slope, intercept = np.polyfit(x, y, 1)
            slopes.append(slope)
            intercepts.append(intercept)
            # Plot the regression line
            plt.scatter(x, y)
            plt.plot(x, x * slope + intercept)

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
                plt.scatter(x_intersect, y_intersect, c="blue")
                intersects.append([x_intersect, y_intersect])

        plt.show()
        # set the vertices into the following order: top left, top right, bottom right, bottom left
        intersects = np.array(intersects)
        distances = np.linalg.norm(intersects, axis=1)
        intersects = intersects[np.argsort(distances)]
        return intersects

    def segment_phone(self, image: np.ndarray) -> np.ndarray | None:
        results = self.model_phone_segmentation(image)

        if results[0].masks is None:
            return None

        polygon = np.array(results[0].masks.xy[0])

        # reduce mask to a quad and refine it
        vertices = self.approx_mask_to_polygon(image, polygon)

        # deform the original image with this quad
        dst_points = np.array([[0, 0], [WIDTH, 0], [0, WIDTH], [WIDTH, HEIGHT]], dtype=np.float32)
        matrix = cv2.getPerspectiveTransform(vertices.astype(np.float32), dst_points)
        image = cv2.warpPerspective(image, matrix, (WIDTH, HEIGHT))
        return image

    def detect_smudge(self, image: np.ndarray) -> List[BoundingBox]:
        result = self.model_smudge_detection(image)
        boxes = result[0].boxes.xywh.numpy()
        return [BoundingBox(box) for box in boxes]


def preprocess_image(img, w=WIDTH, h=HEIGHT) -> np.ndarray:
    img = cv2.imdecode(np.frombuffer(img.read(), np.uint8), cv2.IMREAD_COLOR)
    img = cv2.resize(img, (w, h))
    return img


model_wrapper = ModelWrapper()


@csrf_exempt
def detect_phone(request):
    ref = request.POST.get('ref')
    image = preprocess_image(request.FILES.get("image"))

    dst = model_wrapper.segment_phone(image)
    if dst is None:
        return HttpResponse(status=422)

    # increase brightness
    brightness_matrix = np.ones(dst.shape, dtype='uint8') * 150
    dst_brightened = cv2.add(dst, brightness_matrix)

    boxes = model_wrapper.detect_smudge(dst_brightened)
    ciphers = guess_ciphers(boxes, ref)

    most_likely_pincodes = guess_order(ciphers)

    blob = export_plotted_bbox_on_image(dst, boxes)
    base64_image_data = base64.b64encode(blob.getvalue()).decode('utf-8')

    response = {
        'image': base64_image_data,
        'mostLikelyPINcode': most_likely_pincodes
    }
    return HttpResponse(json.dumps(response), content_type="application/json")


def guess_ciphers(boxes: List[BoundingBox], reference: str) -> List[int]:
    bb_refs = BoundingBoxModel.objects.filter(ref=reference)

    pin = []
    for box in boxes:
        max_iou = max([box.iou(bb_ref) for bb_ref in bb_refs])
        if max_iou > 0.8:
            pin.append(boxes.index(box))

    # TODO: handle less or more than six ciphers retrieved
    # --> if less use markov chain to guess more probable missing ciphers
    # --> if more then compute order for all sequence of 6 ciphers keep cipher with IOU > 0.9 in place
    return pin


transition_mat = np.load("assets/markovChainTransitionMatDump", allow_pickle=True)
prob_by_index = np.load("assets/probByIndexDump", allow_pickle=True)
freq = np.load("assets/frequenciesDump", allow_pickle=True)


def guess_order(ciphers: List[int]) -> List[str]:
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
def add_bb_ref(request):
    image = preprocess_image(request.FILES['phone'])

    image = model_wrapper.segment_phone(image)
    if image is None:
        return HttpResponse(status=422)

    bboxes = DigitRecognition(img=image).process_data()

    # ref_m = ReferenceModel.objects.create(ref=request.POST.get('ref'))
    # ref_m.save()
    # for i, bb in enumerate(bboxes):
    #     bb_m = BoundingBoxModel(x=bb.x, y=bb.y, w=bb.w, h=bb.h, cipher=i, ref=ref_m)
    #     bb_m.save()

    return HttpResponse(DigitRecognition.result, content_type='image/png', status=201)
