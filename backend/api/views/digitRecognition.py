from typing import *

import cv2
import numpy as np
from sklearn.cluster import DBSCAN
from torch.ao.quantization.fx.lower_to_fbgemm import lower_to_fbgemm

from api.models import ReferenceModel, BoundingBoxModel


from api.config import config
from api.views.boundingBox import BoundingBox
from api.views.pyplotWrapper import PyplotWrapper
from matplotlib import pyplot as plt


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

    def __init__(self, img: np.ndarray):
        self.image = img
        self.canny_thresholds = config["DigitRecognition"]["canny_thresholds"]

        self.bounds = config["DigitRecognition"]["bounds"]
        self.width_bounds = config["width"] * np.array(self.bounds)
        self.height_bounds = config["height"] * np.array(self.bounds)
        self.too_wide_area = 0.1 * (config["width"] * config["height"])

        self.digit_alignment_iter = config["DigitRecognition"]["digit_alignment_iter"]
        self.digit_alignment_delta = config["DigitRecognition"]["digit_alignment_delta"]
        self.bbox_padding = config["DigitRecognition"]["bbox_padding"]

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

        # split the original contours into individuals
        clusters_xy = [[] for _ in range(np.max(clusters.labels_) + 1)]
        for i, cluster_id in enumerate(clusters.labels_):
            if cluster_id == -1:
                continue

            clusters_xy[cluster_id].append(list(contours[i]))

        return clusters_xy

    def filter_clusters(self, clusters: List):
        """
        Filter individual contours, eliminating those that are too wide or too close to the edge.
        Retain the centroids of the ones that respect those criteria
        """
        centroids = []
        for cluster in clusters:
            cluster = np.array(cluster)
            # get the bounding box
            tl = np.min(cluster, axis=0)
            br = np.max(cluster, axis=0)
            w = br[0] - tl[0]
            h = br[1] - tl[1]
            area = w * h
            centroid = [tl[0] + w / 2, tl[1] + h / 2]

            if (area > self.too_wide_area or not
                ((self.width_bounds[0] < centroid[0] < self.width_bounds[1]) and
                    (self.height_bounds[0] < centroid[1] < self.height_bounds[1]))):

                continue

            centroids.append(centroid)

        centroids = np.array(centroids)
        return centroids

    def extract_digit_matrix(self, centroids):
        """
        Isolate points that form a 3x3 matrix using geometric constraints.
        """


        def get_average_spacing(points, axis_index):

            p = np.array(points)[:, axis_index]
            consecutive_distances = np.diff(np.sort(p))

            return np.mean(consecutive_distances)

        to_keep = []
        avg_spacings_x = []
        avg_spacings_y = []
        new_indexes = {}
        for i, b in enumerate(centroids):
            near_x = []
            near_y = []
            for j, bb in enumerate(centroids):
                if i == j:
                    continue

                dx = abs(b[0] - bb[0])
                dy = abs(b[1] - bb[1])

                if dx < self.digit_alignment_delta[0]:
                    near_x.append(bb)
                if dy < self.digit_alignment_delta[1]:
                    near_y.append(bb)


            if len(near_x) >= 2 and len(near_y) >= 2:
                to_keep.append(i)
                new_indexes.update({i: len(avg_spacings_y)})
                avg_spacings_x.append(get_average_spacing(np.append(near_y, b).reshape(-1, 2), 0))
                avg_spacings_y.append(get_average_spacing(np.append(near_x, b).reshape(-1, 2), 1))

        centroids = centroids[np.array(to_keep)]

        x_q1, x_q3 = np.percentile(np.array(avg_spacings_x), [25, 75])
        y_q1, y_q3 = np.percentile(np.array(avg_spacings_y), [25, 75])
        x_iqr = x_q3 - x_q1
        y_iqr = y_q3 - y_q1

        x_bounds = (x_q1 - 1.5 * x_iqr, x_q3 + 1.5 * x_iqr)
        y_bounds = (y_q1 - 1.5 * y_iqr, y_q3 + 1.5 * y_iqr)

        valid_indices = np.where((avg_spacings_x >= x_bounds[0]) & (avg_spacings_x <= x_bounds[1]) &
                                 (avg_spacings_y >= y_bounds[0]) & (avg_spacings_y <= y_bounds[1]))[0]

        centroids  = centroids[valid_indices]

        if centroids.shape[0] >= 9:
            centroids = centroids[np.argsort(centroids[:, 1])[:9]]

        return centroids

    def get_pin_bbox(self, centroids):
        """
        Match the (adjusted) centroids with the numbers and create bounding boxes centered on them.
        """

        # locate the cipher 5 by taking the nearest centroid from the center
        # of the matrix bounding box
        bbox_min = np.min(centroids, axis=0)
        bbox_max = np.max(centroids, axis=0)
        center = (bbox_max + bbox_min) / 2

        distances = np.linalg.norm(centroids - center, axis=1)
        r_center = centroids[np.argmin(distances)].copy()

        # distances between cipher from 5 respect a schema:
        # d(2, 5) = d(8, 5) = h
        # d(4, 5) = d(6, 5) = w
        #
        # and h < w by default because of the layout
        r_distances = np.sort(np.linalg.norm(centroids - r_center, axis=1))
        h = np.mean(r_distances[1:3])
        w = np.mean(r_distances[3:5])


        # adjust all centroids for better alignment and create bounding boxes
        adj_centroids = r_center + DigitRecognition.pin_layout * [w, h]

        bboxes = [BoundingBox(
            adj_b[0] - w/3,
            adj_b[1] - h/2,
            2*w/3,
            h
        ) for adj_b in adj_centroids]

        # 0's bounding box is at the end thus we reposition it
        bboxes.insert(0, bboxes[-1])
        bboxes.pop(-1)
        return bboxes

    def process_data(self) -> List[BoundingBox]:
        """
        Method to execute the whole pipeline to extract digits' bounding boxes
        """
        clusters = self.extract_shape_contours()
        centroids = self.filter_clusters(clusters)
        matrix_centroids = self.extract_digit_matrix(centroids)
        pin_bboxes = self.get_pin_bbox(matrix_centroids)

        return pin_bboxes


def guess_ciphers(bboxes: List[BoundingBox], reference: str) -> Tuple[
        np.array,
        List[BoundingBox],
]:
    """
    "Guess" the ciphers used for the PIN code by taking the best IOU score
    between the references and the inferred bounding boxes for each one
    """

    # get the correct reference bounding boxes from the database
    ref_id = ReferenceModel.objects.get(ref=reference).id
    refs_obj = BoundingBoxModel.objects.filter(ref=ref_id)
    refs_dict = {bb.cipher: BoundingBox(bb.x, bb.y, bb.w, bb.h) for bb in refs_obj}
    refs_bboxes = list(refs_dict.values())

    pin = []
    for bb in bboxes:
        iou = np.array([bb.iou(ref_bb) for ref_bb in refs_bboxes], dtype=np.float32)
        best_cipher = np.argmax(iou)
        best_iou = float(iou[best_cipher])
        pin.append((best_cipher, best_iou))

    # TODO: handle less or more than six ciphers retrieved
    # --> if less use markov chain to guess more probable missing ciphers
    # --> if more then compute order for all sequence of 6 ciphers keep cipher with IOU > 0.9 in place
    return np.array(pin), [ref.xywh() for ref in refs_bboxes]
