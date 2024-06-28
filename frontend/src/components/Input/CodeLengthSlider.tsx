import {Slider} from "@mui/material";
import * as React from "react";
import {Config} from "../../pages/Home";


interface CodeLengthSliderProps {
  config: Config,
  setConfig: React.Dispatch<React.SetStateAction<Config>>
  setOnlyComputeOrder: React.Dispatch<React.SetStateAction<boolean>>
}

const CodeLengthSlider: React.FC<CodeLengthSliderProps> = ({
  config,
  setConfig,
  setOnlyComputeOrder
}) => {

  return (
    <div style={{display: 'flex', flexDirection: 'row'}}>
      <div style={{minWidth: 'fit-content', marginRight: '25px', marginTop: '1px', color: '#5f5f5f'}}>
        Pin length
      </div>
    <Slider
      aria-label="PIN code's length"
      defaultValue={6}
      onChange={(event: Event) => {
        if (!(event.target instanceof HTMLInputElement)) return

        const newPinLength: number = parseInt(event.target.value)
        const newCipherGuess = Array(newPinLength).fill('');
        for (let i = 0; i < Math.min(newPinLength, config.cipher_guess.length); i++) {
          newCipherGuess[i] = config.cipher_guess[i];
        }
        setConfig({
          ...config,
          pinLength: newPinLength,
          cipher_guess: newCipherGuess
        });
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
}

export default CodeLengthSlider