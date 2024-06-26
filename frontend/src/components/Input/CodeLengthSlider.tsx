import {Slider} from "@mui/material";
import * as React from "react";


const CodeLengthSlider = (
        setPinLength,
        setOnlyComputeOrder,
        cipherGuess, setCipherGuess
) => {

  const slider = (
    <div style={{display: 'flex', flexDirection: 'row'}}>
      <div style={{minWidth: 'fit-content', marginRight: '25px', marginTop: '1px', color: '#5f5f5f'}}>
        Pin length
      </div>
    <Slider
      aria-label="PIN code's length"
      defaultValue={6}
      onChange={(e) => {
        const newPinLength = e.target.value
        setPinLength(newPinLength)
        const newCipherGuess = Array(newPinLength).fill(undefined);
        for (let i = 0; i < Math.min(newPinLength, cipherGuess.length); i++) {
          newCipherGuess[i] = cipherGuess[i];
        }
        setCipherGuess(newCipherGuess)
        setOnlyComputeOrder(false)
      }}
      valueLabelDisplay="on"
      shiftStep={1}
      step={1}
      marks
      min={4}
      max={8}
      sx={{
        maxWidth: '195px',
        '& .MuiSlider-thumb': {
          height: 25,
          width: 25,
        },
        '& .MuiSlider-valueLabel': {
          fontSize: 18,
          fontWeight: 'normal',
          top: 31,
          left: -4,
          backgroundColor: 'unset',
          color: 'rgb(250, 250, 250)',
          '&::before': {
            display: 'none',
          },
          '& *': {
            background: 'transparent',
            color: '#fff',
          },
        },
      }}
    />
    </div>
  );

  return slider
}

export default CodeLengthSlider