from typing import TYPE_CHECKING

import numpy as np
import cv2

from views import config


if TYPE_CHECKING:
    from django.core.files.uploadedfile import TemporaryUploadedFile


def preprocess_image(img: TemporaryUploadedFile, w: int = config["width"], h: int = config["height"]) -> np.ndarray:
    img = cv2.imdecode(np.frombuffer(img.read(), np.uint8), cv2.IMREAD_COLOR)
    img = cv2.resize(img, (w, h))
    return img
