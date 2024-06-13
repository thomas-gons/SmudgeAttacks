from typing import *

from scipy.spatial import KDTree
from ultralytics import YOLO
import numpy as np
import cv2

from views import config
from boundingBox import BoundingBox


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
