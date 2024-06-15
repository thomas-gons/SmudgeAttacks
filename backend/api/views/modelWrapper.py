from typing import *

from scipy.spatial import KDTree
from ultralytics import YOLO
import numpy as np
import cv2

from api.config import config
from api.views.boundingBox import BoundingBox


class ModelWrapper:

    def __init__(self):
        self.model_phone_segmentation = YOLO(config["ModelWrapper"]["phone_seg_weights"])
        self.model_smudge_detection = YOLO(config["ModelWrapper"]["smudges_det_weights"])
        self.interp_step = config["ModelWrapper"]["interp_step"]

    def segment_phone(self, image: np.ndarray) -> np.ndarray | None:
        results = self.model_phone_segmentation(image, save=True)

        if results[0].masks is None:
            return None

        polygon = np.array(results[0].masks.xy[0])

        # reduce mask to a quad and refine it
        vertices = self.approx_mask_to_polygon(polygon)

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

    def interpolate_mask_lines(self, vertices: np.ndarray) -> np.ndarray:
        """
        In segmentation task, the irrelevant points in the mask are removed
            => lines are represented with two points no matter how long they are

        As we need to compute regression, we need more points to avoid bias due to
        points on the corners
        """
        interp_vertices = []
        for i in range(len(vertices)):
            start = vertices[i]
            end = vertices[(i + 1) % len(vertices)]
            interp_vertices.append(start)
            u = end - start
            d = np.linalg.norm(u)
            unit_u = u / d
            n_vert = int(d // self.interp_step)
            interp_vertices.extend([start + i * self.interp_step * unit_u for i in range(1, n_vert + 1)])

        return np.array(interp_vertices)

    @staticmethod
    def perform_regressions(clusters) -> Tuple[List[float], List[float]]:
        """
        Approximate the groups with regressions.
        As both of the clusters (=edges) are almost vertical, the slightest
        disturbance due to corner points for most of them can completely deviate
        the regression line. Thus, we inverse axis when a cluster seem vertical
            i.e. Var(Y) >> Var(X)
        """
        slopes = []
        intercepts = []
        for cluster in clusters:
            x = cluster[:, 0]
            y = cluster[:, 1]
            if np.var(x) > np.var(y):
                slope, intercept = np.polyfit(x, y, 1)

            else:
                slope_temp, intercept_temp = np.polyfit(y, x, 1)
                slope = 1 / slope_temp
                intercept = -intercept_temp / slope_temp

            slopes.append(slope)
            intercepts.append(intercept)

        return slopes, intercepts

    def approx_mask_to_polygon(self, vertices: np.ndarray) -> np.ndarray:
        """
        Given the mask from the segmentation model we want to simplify
        it to a quad with a good approximation of the corners
        """
        interp_vertices = self.interpolate_mask_lines(vertices)
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

        # approximate the groups with regressions
        slopes, intercepts = self.perform_regressions(approx_groups)

        # extract new vertices by intersecting all lines
        kdtree = KDTree(interp_vertices)
        intersects = []
        for i in range(len(approx_groups)):
            for j in range(i + 1, len(approx_groups)):
                x_intersect = (intercepts[j] - intercepts[i]) / (slopes[i] - slopes[j])
                y_intersect = slopes[i] * x_intersect + intercepts[i]
                d, _ = kdtree.query(np.array([x_intersect, y_intersect]), k=1)

                # excluding all intersections to far from the original point cloud
                if d > 100:
                    continue
                intersects.append([x_intersect, y_intersect])

        # set the vertices into the following order: top left, top right, bottom right, bottom left
        intersects = np.array(intersects)
        distances = np.linalg.norm(intersects, axis=1)
        intersects = intersects[np.argsort(distances)]
        return intersects
