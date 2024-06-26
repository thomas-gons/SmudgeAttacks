import React from 'react';
import { Stage, Layer, Image, Rect} from 'react-konva';
import {InProcessResult} from "../pages/Home";

const CodeUserValidation = (
  inProcessResult: InProcessResult
) => {

  const [addedBboxes, setAddedBboxes] = React.useState([]);
  const [rmBboxes, setRmBboxes] = React.useState([]);
  const ratio = 480 / 640;
  const img: HTMLImageElement = new window.Image();
  img.src = inProcessResult.image;

  const ref_bboxes = (
    inProcessResult.refs_bboxes.map((bbox, index) => (
      <Rect
        key={index} // Ensure each Rect has a unique key
        x={bbox[0] * ratio}
        y={bbox[1] * ratio}
        width={bbox[2] * ratio}
        height={bbox[3] * ratio}
        stroke={addedBboxes.includes(index) ? '#f00' : '#0f0'}
        strokeWidth={2}
        onClick={() => {
          if (addedBboxes.includes(index)) {
            setAddedBboxes(addedBboxes.filter((item) => item !== index));
          } else {
            setAddedBboxes([...addedBboxes, index]);
          }
        }}
      />
    ))
  )

  const inferred_bboxes = (
    inProcessResult.inferred_bboxes.map((bbox, index) => (
      <Rect
        key={index} // Ensure each Rect has a unique key
        x={bbox[0] * ratio}
        y={bbox[1] * ratio}
        width={bbox[2] * ratio}
        height={bbox[3] * ratio}
        stroke={rmBboxes.includes(index) ? '#ff0' : '#f00'}
        strokeWidth={2}
        onClick={() => {
          if (rmBboxes.includes(index)) {
            setRmBboxes(rmBboxes.filter((item) => item !== index));
          } else {
            setRmBboxes([...rmBboxes, index]);
          }
        }}
      />))
  )

  return (
    <div style={{display: 'flex', flexDirection: 'row'}}>
      <Stage
        width={640}
        height={640}
        style={{marginTop: 200}}>
        <Layer>
          <Image
            image={img}
            width={480}
            height={480}
          />
          {ref_bboxes}
          {inferred_bboxes}
        </Layer>
      </Stage>
      <div>
      </div>
    </div>
  );
};

export default CodeUserValidation;