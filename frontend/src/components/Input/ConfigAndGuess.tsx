import Badge from "@mui/material/Badge";
import TuneIcon from "@mui/icons-material/Tune";
import {
  Checkbox,
  FormControlLabel,
  FormGroup,
  Grid,
  Input,
  Radio,
  RadioGroup,
} from "@mui/material";
import * as React from "react";
import Button from "@mui/material/Button";
import {Config} from "../../pages/Home";
import LightTooltipHelper from "../LightTooltipHelper";


interface ConfigAndGuessProps {
  config: Config,
  setConfig: React.Dispatch<React.SetStateAction<Config>>
}



const ConfigAndGuess: React.FC<ConfigAndGuessProps> = ({
  config,
  setConfig
}) => {

  const [isConfigOpen, setIsConfigOpen] = React.useState<boolean>(false);

  const order_guessing_algorithms_element = (
    <div style={{marginTop: '8px'}}>
      <div>
        Order guessing algorithms
        <LightTooltipHelper title={"Select the algorithms you want to use for guessing the sequence"} placement={"right"}/>
      </div>
      <Grid container spacing={0}>
        {Object.keys(config.order_guessing_algorithms).map((algorithm, index) => (
          <Grid item xs={6} key={index}>
            <FormControlLabel control={
              <Checkbox
                checked={config.order_guessing_algorithms[algorithm]}
                size={"small"}
                onChange={(e) => {
                  setConfig({
                    ...config,
                    order_guessing_algorithms: {
                      ...config.order_guessing_algorithms,
                      [algorithm]: e.target.checked
                    }
                  })
                }}
              />
            } label={algorithm} style={{marginLeft: '3px'}}/>
          </Grid>
        ))}
      </Grid>
    </div>
  )

  const cipherGuessElement = (
    <div>
      <div>
        Cipher guesses
        <LightTooltipHelper title={"Enter the guessed pin code"} placement={"right"} />
      </div>
      <div id={"cipher-guesses-container"} style={{marginLeft: '3px'}}>
        {Array(config.pin_length).fill('').map((_, index: number) => (
          <Input
            key={index}
            value={config.order_cipher_guesses[index] || ''}
            onChange={(e) => {
              const lastChar = e.target.value.slice(-1)
              e.target.value = /[0-9]/.test(lastChar) ? lastChar : '';
              const newCipherGuess = [...config.order_cipher_guesses];
              newCipherGuess[index] = lastChar;
              setConfig({
                ...config,
                order_cipher_guesses: newCipherGuess
              });
            }}
            sx={{
              width: 15,
              marginX: '5px',
            }}/>
        ))}
      </div>
    </div>
  )

  const cipher_correction = (
    <div style={{marginTop: '15px'}}>
      Cipher correction
      <LightTooltipHelper
        title={"By default the system will ask you to correct the guessed ciphers" +
               " if they don't match the sequence length"}
        placement={"right"}
      />

      <RadioGroup
        row
        aria-label="manual-auto"
        name="manual-auto"
        defaultValue='manual'
        onChange={(e) => {
          setConfig({...config, inference_correction: e.target.value as 'manual' | 'auto'})
        }}
      >
        <FormControlLabel value={"manual"} control={<Radio size={"small"}/>} label="Manual" sx={{marginLeft: '3px'}}/>
        <FormControlLabel value={"auto"} control={<Radio size={"small"}/>} label="Auto" sx={{marginLeft: '3px'}}/>
      </RadioGroup>
    </div>
  )

  return (
    <div
      style={{
        width: '100%', marginTop: '10px', marginBottom: '20px', padding: (isConfigOpen ? '15px' : '0px'),
        border: (isConfigOpen ? '1px solid #ddd' : '0'), borderRadius: 5, maxWidth: 'fit-content',
        color: 'rgba(0, 0, 0, 0.8)'
      }}
    >
      <div
        style={{color: 'rgb(95, 95, 95)'}}
        onClick={() => {
          setIsConfigOpen(!isConfigOpen)
        }}>
        Configuration
        <Badge badgeContent={<TuneIcon />} sx={{marginLeft: '15px', marginTop: '-3px'}}/>

      </div>

      {isConfigOpen && <FormGroup sx={{marginTop: '10px'}}>
        {order_guessing_algorithms_element}
        <div style={{position: 'relative', display: 'flex', flexDirection: 'column', marginTop: '8px'}}>
          {cipherGuessElement}
          {cipher_correction}
          <div style={{position: 'absolute', right: 0, bottom: '-10px'}}>
            <Button
              onClick={() => {
                config.resetCipherGuess();
                config.resetOrderGuessingAlgorithms()
                setConfig({...config})
              }}
            >
              Reset
            </Button>
          </div>
        </div>
      </FormGroup>}
    </div>
  );

}

export default ConfigAndGuess