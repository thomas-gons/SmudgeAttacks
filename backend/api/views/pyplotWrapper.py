import base64
from io import BytesIO
from typing import *

import numpy as np
from matplotlib import pyplot as plt
from matplotlib.axes import Axes
from matplotlib.figure import Figure

from boundingBox import BoundingBox


class PyplotWrapper:
    ax: Axes
    fig: Figure

    def __init__(self, is_subplots):
        self.fig, self.ax = plt.subplots() if is_subplots else (None, plt.gca())

    @property
    def is_subplot(self) -> bool:
        return self.fig is not None

    def plot_bounding_boxes(self, bboxes: List[BoundingBox], labels: List = (), c: str = 'r') -> None:
        is_labels = (len(labels) == len(bboxes))

        for i, bbox in enumerate(bboxes):
            plot_box = bbox.all_corners()
            self.ax.plot(plot_box[:, 0], plot_box[:, 1], color=c)

            if not is_labels and self.is_subplot:
                continue

            center = bbox.get_center()
            self.ax.text(float(center[0]), float(center[1]), labels[i], ha='center', va='center', color='white')

    @staticmethod
    def show():
        plt.show()

    def plot_reference(
            self,
            image: np.ndarray,
            refs_bboxes: List[BoundingBox],
            labels: List,
    ) -> None:

        self.ax.imshow(image)
        self.plot_bounding_boxes(refs_bboxes, labels, c="green")

    def plot_result(
            self,
            image: np.ndarray,
            bboxes: List[BoundingBox],
            refs_bboxes: List[BoundingBox],
            labels: List,
    ) -> None:

        self.ax.imshow(image)
        self.plot_bounding_boxes(refs_bboxes, labels, c="green")
        self.plot_bounding_boxes(bboxes, c="red")

    def export_as_blob(self) -> BytesIO:
        self.ax.axis('off')
        buffer = BytesIO()
        # save the plot to a buffer but exclude the white space around the plot
        plt.savefig(buffer, format='png', bbox_inches='tight', pad_inches=0)
        plt.close(self.fig)
        buffer.seek(0)
        return buffer

    def export_as_b64(self) -> str:
        blob = self.export_as_blob()
        data = blob.getvalue()
        b64_data = base64.b64encode(data).decode('utf-8')
        formatted_b64_data = f"data:image/png;base64,{b64_data}"

        return formatted_b64_data
