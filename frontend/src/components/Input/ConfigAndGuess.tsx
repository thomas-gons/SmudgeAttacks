import Badge from "@mui/material/Badge";
import TuneIcon from "@mui/icons-material/Tune";
import InfoIcon from '@mui/icons-material/Info';
import {
  Checkbox,
  FormControlLabel,
  FormGroup,
  Grid,
  Input,
  Radio,
  RadioGroup,
  Tooltip, tooltipClasses,
  TooltipProps
} from "@mui/material";
import * as React from "react";
import Button from "@mui/material/Button";
import {styled} from "@mui/material/styles";


interface ConfigAndGuessProps {
  orderGuessingAlgorithms: { [algorithm: string]: boolean },
  setOrderGuessingAlgorithms: React.Dispatch<React.SetStateAction<{ [algorithm: string]: boolean }>>,
  cipherGuess: string[],
  setCipherGuess: React.Dispatch<React.SetStateAction<string[]>>,
  setCipherCorrection: React.Dispatch<React.SetStateAction<'manual' | 'auto'>>,
  pinLength: number,
}

const LightTooltip = styled(({className, ...props}: TooltipProps) => (
  <Tooltip {...props} classes={{popper: className}}/>
))(({theme}) => ({
  [`& .${tooltipClasses.tooltip}`]: {
    backgroundColor: theme.palette.common.white,
    color: 'rgba(0, 0, 0, 0.6)',
    boxShadow: theme.shadows[1],
    fontSize: 14,
  },
}));

const ConfigAndGuess: React.FC<ConfigAndGuessProps> = ({
  orderGuessingAlgorithms,
  setOrderGuessingAlgorithms,
  cipherGuess,
  setCipherGuess,
  setCipherCorrection,
  pinLength,
}) => {

  const [isConfigOpen, setIsConfigOpen] = React.useState<boolean>(false);

  const helperOffset = (x: number, y: number) => {
    return {modifiers: [{name: 'offset', options: {offset: [x, y]}}]}
  }

  const orderGuessingAlgorithmsElement = (
    <div style={{marginTop: '8px'}}>
      <div>
        Order guessing algorithms
        <LightTooltip
          title={"Select the algorithms you want to use for guessing the sequence"}
          placement={"right"}
          slotProps={{popper: helperOffset(0, 0)}}
        >
          <InfoIcon sx={{
            marginLeft: '3px',
            marginBottom: '-1px',
            width: '20px',
            color: 'rgb(21, 101, 192)'
          }}/>
        </LightTooltip>

      </div>
      <Grid container spacing={0}>
        {Object.keys(orderGuessingAlgorithms).map((algorithm, index) => (
          <Grid item xs={6} key={index}>
            <FormControlLabel control={
              <Checkbox
                checked={orderGuessingAlgorithms[algorithm]}
                size={"small"}
                onChange={(e) => {
                  setOrderGuessingAlgorithms(prevState => {
                    return {...prevState, [algorithm]: e.target.checked};
                  });
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
        <LightTooltip
          title={"Enter the guessed pin code"}
          placement={"right"}
          slotProps={{popper: helperOffset(0, 0)}}
        >
          <InfoIcon sx={{
            marginLeft: '3px',
            marginBottom: '-1px',
            width: '20px',
            color: 'rgb(21, 101, 192)'
          }}/>
        </LightTooltip>

      </div>
      <div id={"cipher-guesses-container"} style={{marginLeft: '3px'}}>
        {Array(pinLength).fill('').map((_: never, index: number) => (
          <Input
            key={index}
            value={cipherGuess[index] || ''}
            onChange={(e) => {
              const lastChar = e.target.value.slice(-1)
              e.target.value = /[0-9]/.test(lastChar) ? lastChar : '';
              const newCipherGuess = [...cipherGuess];
              newCipherGuess[index] = lastChar;
              setCipherGuess(newCipherGuess);
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
      <LightTooltip
        title={"By default the system will ask you to correct the guessed ciphers if they don't match the sequence length"}
        placement={"right"}
        slotProps={{popper: helperOffset(0, 0)}}
      >
        <InfoIcon sx={{
          marginLeft: '1px',
          marginBottom: '-1px',
          width: '20px',
          color: 'rgb(21, 101, 192)'
        }}/>
      </LightTooltip>

      <RadioGroup
        row
        aria-label="manual-auto"
        name="manual-auto"
        defaultValue='manual'
        onChange={(e) => {
          setCipherCorrection(e.target.value as 'manual' | 'auto');
        }}
      >
        <FormControlLabel value={"manual"} control={<Radio size={"small"}/>} label="Manual" sx={{marginLeft: '3px'}}/>
        <FormControlLabel value={"auto"} control={<Radio size={"small"}/>} label="Auto" sx={{marginLeft: '3px'}}/>
      </RadioGroup>
    </div>
  )

  const config = (
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
        <Badge badgeContent={<TuneIcon color="rgb(2, 136, 209)"/>} sx={{marginLeft: '15px', marginTop: '-3px'}}/>

      </div>

      {isConfigOpen && <FormGroup sx={{marginTop: '10px'}}>
        {orderGuessingAlgorithmsElement}
        <div style={{position: 'relative', display: 'flex', flexDirection: 'column', marginTop: '8px'}}>
          {cipherGuessElement}
          {cipher_correction}
          <div style={{position: 'absolute', right: 0, bottom: '-10px'}}>
            <Button
              onClick={() => {
                const resetCipherGuess = cipherGuess.map(() => '');
                setCipherGuess(resetCipherGuess);
                const resetOrderGuessingAlgorithms = Object.keys(orderGuessingAlgorithms).reduce((acc, key) => {
                  acc[key] = true;
                  return acc;
                }, {} as { [algorithm: string]: boolean });
                setOrderGuessingAlgorithms(resetOrderGuessingAlgorithms);
              }}
            >
              Reset
            </Button>
          </div>
        </div>
      </FormGroup>}
    </div>
  );

  return config;
}

export default ConfigAndGuess