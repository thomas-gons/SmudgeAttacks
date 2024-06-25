import Badge from "@mui/material/Badge";
import TuneIcon from "@mui/icons-material/Tune";
import {Checkbox, FormControlLabel, FormGroup, Grid, Input} from "@mui/material";
import * as React from "react";
import {useState} from "react";

const ConfigAndGuess = (
  orderGuessingAlgorithms, setOrderGuessingAlgorithms,
  cipherGuess, setCipherGuess,
  pinLength, setPinLength
) => {

  const [isConfigOpen, setIsConfigOpen] = useState<boolean>(false);

  const config = (
    <div
      style={{
        width: '100%', marginTop: '10px', marginBottom: '20px', padding: (isConfigOpen ? '15px': '0px'),
        border: (isConfigOpen ? '1px solid #ddd': '0'), borderRadius: 5, maxWidth: 'fit-content'
      }}
    >
      <div
        style={{color:'rgb(95, 95, 95)'}}
        onClick={() => {setIsConfigOpen(!isConfigOpen)}}>
         Configuration
         <Badge badgeContent={<TuneIcon color="rgb(2, 136, 209)"/>} sx={{marginLeft: '15px', marginTop: '-3px'}}/>

      </div>

      {isConfigOpen && <FormGroup sx={{marginTop: '10px'}}>
        <Grid container spacing={0}>
        {Object.keys(orderGuessingAlgorithms).map((algorithm, _) => (
          <Grid item xs={6}>
            <FormControlLabel control={
              <Checkbox
                defaultChecked
                onChange={(e) => {
                  setOrderGuessingAlgorithms(prevState => {
                    return {...prevState, [algorithm]: e.target.checked };
                  });
                  console.log(orderGuessingAlgorithms)
                }}
              />
            } label={algorithm}/>
          </Grid>
        ))}
        </Grid>
        <div style={{display: 'flex', flexDirection:'column', marginTop: '20px'}}>
          Cipher guesses
          <div>
          {Array(pinLength).fill('').map((_, index) => (
            <Input
              onChange={(e) => {
                const lastChar = e.target.value.slice(-1)
                e.target.value = /[0-9]/.test(lastChar) ? lastChar: '';
                const newCipherGuess = [...cipherGuess];
                newCipherGuess[index] = lastChar;
                setCipherGuess(newCipherGuess);
              }}
              sx={{
                width: 15,
                margin: '0 5px'
            }}/>
          ))}
          </div>
        </div>
      </FormGroup>}
    </div>
  );

  return config;
}

export default ConfigAndGuess