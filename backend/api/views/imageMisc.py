from django.core.files.uploadedfile import TemporaryUploadedFile

from PIL import Image
import numpy as np

from io import BytesIO
import base64
import cv2

from api.config import config


def preprocess_image(img: TemporaryUploadedFile, w: int = config["width"], h: int = config["height"]) -> np.ndarray:
    img = cv2.imdecode(np.frombuffer(img.read(), np.uint8), cv2.IMREAD_COLOR)
    img = cv2.resize(img, (w, h))
    return img


def get_b64_img_from_np_array(image: np.array) -> str:
    image_pil = Image.fromarray(image.astype('uint8'), 'RGB')
    buffer = BytesIO()
    image_pil.save(buffer, format='PNG')
    buffer.seek(0)
    image = buffer.read()

    b64_img = "data:image/png;base64," + base64.b64encode(image).decode('utf-8')
    return b64_img
