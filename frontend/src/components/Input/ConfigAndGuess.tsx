import Badge from "@mui/material/Badge";
import TuneIcon from "@mui/icons-material/Tune";
import {Checkbox, FormControlLabel, FormGroup, Grid, Input} from "@mui/material";
import * as React from "react";
import {useState} from "react";
import Button from "@mui/material/Button";

const ConfigAndGuess = (
  orderGuessingAlgorithms: {[algorithm: string]: boolean},
  setOrderGuessingAlgorithms: React.Dispatch<React.SetStateAction<{[algorithm: string]: boolean}>>,
  cipherGuess: string[],
  setCipherGuess: React.Dispatch<React.SetStateAction<string[]>>,
  pinLength: number,
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
        {Object.keys(orderGuessingAlgorithms).map((algorithm, index) => (
          <Grid item xs={6} key={index}>
            <FormControlLabel control={
              <Checkbox
                checked={orderGuessingAlgorithms[algorithm]}
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
        <div style={{position: 'relative', display: 'flex', flexDirection:'column', marginTop: '20px'}}>
          Cipher guesses
          <div id={"cipher-guesses-container"}>
          {Array(pinLength).fill('').map((_: never, index: number) => (
            <Input
              key={index}
              value={cipherGuess[index] || ''}
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
            <div style={{position:'absolute', right: 0, top: '25px'}}>
                <Button
                  onClick={() => {
                    const resetCipherGuess = cipherGuess.map(() => '');
                    setCipherGuess(resetCipherGuess);
                    const resetOrderGuessingAlgorithms = Object.keys(orderGuessingAlgorithms).reduce((acc, key) => {
                      acc[key] = true;
                      return acc;
                    }, {} as {[algorithm: string]: boolean});
                    setOrderGuessingAlgorithms(resetOrderGuessingAlgorithms);
                  }}
                >
                  Reset
                </Button>
            </div>
          </div>
        </div>
      </FormGroup>}
    </div>
  );

  return config;
}

export default ConfigAndGuess