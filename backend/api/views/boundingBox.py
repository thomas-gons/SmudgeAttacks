import random
from typing import *

import numpy as np

from views import config


class BoundingBox:
    """
    Abstraction of a bounding box that helps to handle and save detection model result
    @see ModelWrapper
    """
    x: int
    y: int
    w: int
    h: int

    def __init__(self, *args: Tuple[int, int, int, int] | int) -> None:
        if len(args) == 1:
            self.x, self.y, self.w, self.h = args[0]

        elif len(args) == 4:
            self.x, self.y, self.w, self.h = args
        else:
            raise ValueError("Bad arguments")

    @classmethod
    def random_init(
            cls: Type['BoundingBox'],
            bounds: Tuple[int, int] = (config["width"], config["height"]),
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

    def get_center(self) -> np.ndarray:
        return np.array([
            self.x + self.w / 2,
            self.y + self.h / 2
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
