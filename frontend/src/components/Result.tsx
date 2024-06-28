import {styled, useTheme} from '@mui/material/styles';
import MobileStepper from '@mui/material/MobileStepper';
import {Badge, Button, Grid, Paper} from '@mui/material';
import KeyboardArrowLeft from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRight from '@mui/icons-material/KeyboardArrowRight';
import * as React from "react";
import CancelIcon from '@mui/icons-material/Cancel';
import {Result} from "../pages/Home";
import {displayStatus} from "./Status";
import LightTooltipHelper from "./LightTooltipHelper";



const GridItem = styled(Paper)(({theme}) => ({
  backgroundColor: theme.palette.mode === 'dark' ? '#1A2027' : '#fff',
  ...theme.typography.body2,
  padding: theme.spacing(1),
  textAlign: 'center',
  color: theme.palette.text.secondary
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
    displayStatus("Result from " + prevcurrent_source + "has been deleted", "success")
  }

  if (result.current_source === "" || Object.keys(result.data).length === 0)
    return;


  const res = result.data[result.current_source]
  const reference = res["reference"]
  const image = res["image"]
  const pin_codes = res["pin_codes"]

  const pin_codes_grid = () => {
    if (pin_codes.length === 0) {
      return (
        <div style={{color: theme.palette.text.secondary}}>No PIN codes</div>
      )
    }

    const splitIndex = Math.max(Math.ceil(pin_codes.length / 2), 10)
    const firstPart = pin_codes.slice(0, splitIndex);
    const secondPart = pin_codes.slice(splitIndex);

    return (
      <div style={{position: 'relative', marginLeft: '125px'}}>
        <div style={{color: theme.palette.text.secondary, marginBottom: '10px'}}>
          PIN codes
          <LightTooltipHelper
            title={"Only the PIN codes ranks are displayed because probabilities" +
                  " are too small to be readable."}
            placement={"top"}
          />
        </div>
        <Paper elevation={1} style={{padding: '16px'}}>
         <Grid container sx={{width: '220px'}}>
             <Grid container xs={6}  direction="column">
              {firstPart.map((item, index) => (
                <GridItem key={index} sx={{padding: '8px 10px', margin: '2px 5px'}}>
                  {index + 1}. {item}
                </GridItem>
              ))}
            </Grid>
             <Grid container xs={6} direction="column" >
              {secondPart.map((item, index) => (
                <GridItem key={index} sx={{padding: '8px 10px', margin: '2px 5px'}}>
                  {index + splitIndex + 1}. {item}
                </GridItem>
              ))}
            </Grid>
          </Grid>
        </Paper>
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
      alignItems: 'center',
      marginBottom: '20px'
    }}>
      <div id={"result"} style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
        <div id={"result-metadata"} style={{color: theme.palette.text.secondary}}>
          {reference} <br/>
          {result.current_source} <br/>
        </div>
        <div style={{position: 'relative'}}>
          <img src={image} alt="no result" style={{objectFit: 'fill', width: '450px', borderRadius: '5px'}} />
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
              position: 'absolute',
              top: 0,
            }}
            onClick={removeResult}
          />
        </div>
        {stepper}
      </div>
      <div style={{height: '480x', width: '200px', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '65px'}}>
        {pin_codes_grid()}
      </div>
    </div>
  );
}


export default ResultComponent