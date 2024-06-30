import React from 'react';
import {Rect, Text} from "react-konva";
import Konva from "konva";


const rgbToRgba = (rgb: string, alpha: number): string => {
  return `rgba(${rgb.slice(4, -1)}, ${alpha})`;
}

const hexToRgba = (hex: string, alpha: number): string => {
  // Remove the hash at the start if it's there
  hex = hex.replace(/^#/, '');

  // Parse r, g, b values
  let r, g, b;

  if (hex.length === 3) {
    r = parseInt(hex[0] + hex[0], 16);
    g = parseInt(hex[1] + hex[1], 16);
    b = parseInt(hex[2] + hex[2], 16);
  } else if (hex.length === 6) {
    r = parseInt(hex.slice(0, 2), 16);
    g = parseInt(hex.slice(2, 4), 16);
    b = parseInt(hex.slice(4, 6), 16);
  } else {
    throw new Error('Invalid hex color');
  }

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

interface BoundingBoxProps {
  bbox: number[],
  key: number,
  ratio: number[],
  strokeColor: string,
  alpha?: number,
  onClick?: (e: Konva.KonvaEventObject<MouseEvent>) => void
}

const BoundingBox: React.FC<BoundingBoxProps> =  ({
  bbox,
  key,
  ratio,
  strokeColor,
  alpha = 1,
  onClick = () => {},
}) => {

  const color: string = strokeColor.startsWith('rgb') ? rgbToRgba(strokeColor, alpha) :
                        strokeColor.startsWith('#') ? hexToRgba(strokeColor, alpha) :
                        strokeColor;
  return (
    <Rect
      key={key}
      x={bbox[0] * ratio[0]}
      y={bbox[1] * ratio[1]}
      width={bbox[2] * ratio[0]}
      height={bbox[3] * ratio[1]}
      stroke={color}
      onClick={onClick}
    />
  )
};

interface TextHelperProps {
  text: string | undefined,
  key: number,
  x: number,
  y: number,
  color?: string
}

const TextHelper: React.FC<TextHelperProps> = ({
  text,
  key,
  x,
  y,
  color= 'white',
}) => {

  return (
    <Text
      key={key}
      x={x}
      y={y}
      text={text}
      fontFamily={'Arial, sans-serif'}
      fontSize={13}
      fontStyle={'bold'}
      fill={color}
      align="center"
      verticalAlign="middle"
      offsetX={4} // Adjust this based on the text width
      offsetY={5.5} // Adjust this based on the text height
    />
  )
}

export {BoundingBox, TextHelper};
