from django.shortcuts import render
from django.http import HttpResponse


import json
import base64

import cv2
import numpy as np
from ultralytics import YOLO


def index(request):
    return render(request, "SmudgeAttack/index.html")


model = YOLO('assets/weights/best.pt')


def detect_phone(request):
    image = request.FILES['image']
    image = cv2.imdecode(np.frombuffer(image.read(), np.uint8), cv2.IMREAD_COLOR)
    image = cv2.resize(image, (640, 640))
    result = model(image)
    boxes = result[0].boxes.xyxy.numpy()
    x, y, x2, y2 = boxes[0].astype(int).tolist()
    w = x2 - x
    h = y2 - y
    _, encoded_image = cv2.imencode('.jpg', image)
    encode_image_data = encoded_image.tobytes()

    base64_image_data = base64.b64encode(encode_image_data).decode('utf-8')

    response = {
        'image': base64_image_data,
        'boxes': {'tl': [x, y], 'tr': [x + w, y], 'bl': [x, y + h], 'br': [x + w, y + h]}
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
    dst_points = [[0, 0], [640, 0], [0, 640], [640, 640]]

    src_points = np.array(src_points, dtype=np.float32)
    dst_points = np.array(dst_points, dtype=np.float32)
    matrix = cv2.getPerspectiveTransform(src_points, dst_points)
    dst = cv2.warpPerspective(image, matrix, (640, 640))

    #save the image with random string name
    cv2.imwrite(f"assets/image/{np.random.randint(0, 100000)}.jpg", dst)

    _, encoded_image = cv2.imencode('.jpg', dst)
    response = encoded_image.tobytes()
    return HttpResponse(response, content_type="image/jpg")
