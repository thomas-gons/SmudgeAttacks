import {styled, useTheme} from '@mui/material/styles';
import MobileStepper from '@mui/material/MobileStepper';
import {Badge, Button, Grid, Grow, Paper} from '@mui/material';
import KeyboardArrowLeft from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRight from '@mui/icons-material/KeyboardArrowRight';
import * as React from "react";
import CancelIcon from '@mui/icons-material/Cancel';
import {enqueueSnackbar} from "notistack";
import {Result} from "../pages/Home";



const Item = styled(Paper)(({theme}) => ({
  backgroundColor: theme.palette.mode === 'dark' ? '#1A2027' : '#fff',
  ...theme.typography.body2,
  padding: theme.spacing(1),
  textAlign: 'center',
  color: theme.palette.text.secondary,
}));


interface ResultComponentProps {
  result: Result,
  setResult: React.Dispatch<React.SetStateAction<Result>>,

}


const ResultComponent: React.FC<ResultComponentProps> = ({
  result,
  setResult,
}) => {

  const theme = useTheme();
  const [activeStep, setActiveStep] = React.useState<number>(0)
  const [showSecondPart, setShowSecondPart] = React.useState<boolean>(false);

  const displayStatus = (message, severity, ...options) => {
    enqueueSnackbar({message, variant: severity, TransitionComponent: Grow, ...options})
  }

  const handleNext = () => {
    const keys = Object.keys(result.data);
    const currentIndex = keys.indexOf(result.current_source);
    const nextIndex = (currentIndex + 1) % keys.length;
    setActiveStep(nextIndex)
    setResult(prevResult => ({
      data: prevResult.data,
      current_source: keys[nextIndex],
      nb_step: prevResult.nb_step
    }))
    setShowSecondPart(false)
  };

  const handleBack = () => {
    const keys = Object.keys(result.data);
    const currentIndex = keys.indexOf(result.current_source);
    const prevIndex = (currentIndex - 1 + keys.length) % keys.length;
    setActiveStep(prevIndex)
    setResult(prevResult => ({
      data: prevResult.data,
      current_source: keys[prevIndex],
      nb_step: prevResult.nb_step
    }))
    setShowSecondPart(false)
  };

  const removeResult = () => {
    delete result.data[result.current_source]
    const prevcurrent_source = result.current_source
    const keys = Object.keys(result.data)
    if (keys.length > 0) {
      setResult(prevResult => ({
        data: prevResult.data,
        current_source: keys[0],
        nb_step: prevResult.nb_step - 1
      }));
    } else {
      setResult({
        data: {},
        current_source: '',
        nb_step: 0
      })
    }
    setActiveStep(0);
    setShowSecondPart(false)
    displayStatus("Result from " + prevcurrent_source + "has been deleted", "success")
  }

  if (result.current_source === "" || result.data == {}) {
    return;
  }

  const res = result.data[result.current_source]
  const reference = res["reference"]
  let sequence = res["sequence"]
  const image = res["image"]
  const pin_codes = res["pin_codes"]

  let pin_codes_grid = (
    <div style={{color: theme.palette.text.secondary}}>No PIN codes</div>
  )

  if (pin_codes.length > 0) {
    sequence = 'Sequence: ' + res['sequence']

    const splitIndex = Math.max(Math.ceil(pin_codes.length / 2), 10)
    const firstPart = pin_codes.slice(0, splitIndex);
    const secondPart = pin_codes.slice(splitIndex);

    pin_codes_grid = (
      <div style={{marginLeft: '20px'}}>
        <p style={{color: theme.palette.text.secondary}}>PIN codes</p>
        <Paper elevation={1} style={{padding: '16px'}}>
          <Grid container spacing={1.5} direction={"column"}>
            {(showSecondPart ? secondPart : firstPart).map((item, index) => (
              <Grid item xs={1} key={index}>
                <Item style={{padding: '5px 25px'}}>{showSecondPart ? index + splitIndex + 1 : index + 1}. {item}</Item>
              </Grid>
            ))}
          </Grid>
        </Paper>
        <Button
          style={{
            position: "absolute", top: "55px", right: "-10px", padding: "2px 10px 1px 10px",
            borderRadius: "20px",
            minWidth: 'fit-content',
            boxShadow: '0px 2px 4px -1px rgba(0,0,0,0.2),0px 4px 5px 0px rgba(0,0,0,0.14),0px 1px 10px 0px rgba(0,0,0,0.12)',
            fontWeight: '500',
            fontSize: '16px',
            color: "white", backgroundColor: "rgb(25, 118, 210)"
          }}
          color="primary"
          onClick={() => setShowSecondPart(!showSecondPart)}
        >
          <Badge
            badgeContent={showSecondPart ? '-' : '+'}
            color="primary"
            overlap="circular"
            anchorOrigin={{
              vertical: 'top',
              horizontal: 'left',
            }}
            sx={{"& .MuiBadge-badge": {fontSize: 18, height: 25, width: 25, borderRadius: '20px'}}}
          >
          </Badge>
        </Button>
      </div>
    )
  }

  const stepper = (
    <MobileStepper
      variant="text"
      steps={result.nb_step}
      position="static"
      activeStep={activeStep}
      sx={{
        maxWidth: '240px',
        marginTop: '20px',
        textAlign: 'center',
        color: theme.palette.text.secondary,
      }}
      nextButton={
        <Button
          size="small"
          onClick={handleNext}
          disabled={activeStep === result.nb_step}
          sx={{marginLeft: 1, paddingTop: 1, fontSize: 14}}
        >
          Next
          {theme.direction === 'rtl' ? (
            <KeyboardArrowLeft/>
          ) : (
            <KeyboardArrowRight/>
          )}
        </Button>
      }
      backButton={
        <Button
          size="small"
          onClick={handleBack}
          disabled={activeStep === 0}
          sx={{marginRight: 1, paddingTop: 1, fontSize: 14}}

        >
          {theme.direction === 'rtl' ? (
            <KeyboardArrowRight/>
          ) : (
            <KeyboardArrowLeft/>
          )}
          Back
        </Button>
      }
    />
  )

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'space-evenly',
    }}>
      <div id={"result"} style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
        <div id={"result-metadata"} style={{color: theme.palette.text.secondary}}>
          {reference} <br/>
          {result.current_source} <br/>
        </div>
        <div>
          <img src={image} alt="no result" style={{objectFit: 'fill', width: '480px', borderRadius: '5px'}} />
          <Badge
            badgeContent={<CancelIcon style={{fontSize: 30, color: "#f00"}}/>}
            color="error"
            overlap="circular"
            sx={{
              "& .MuiBadge-badge": {
                borderRadius: '50%',
                maxWidth: 0,
                backgroundColor: "  #fff",
                border: 5,
                borderColor: "#f00",
              },
            }}
            onClick={removeResult}
          />
        </div>
        {stepper}
      </div>
      <div style={{height: '477px', width: '170px', display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
        {pin_codes_grid}
      </div>
    </div>
  );
}


export default ResultComponent