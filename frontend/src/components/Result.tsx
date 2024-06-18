import {styled, useTheme} from '@mui/material/styles';
import MobileStepper from '@mui/material/MobileStepper';
import {Badge, Button, Grid, Paper} from '@mui/material';
import KeyboardArrowLeft from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRight from '@mui/icons-material/KeyboardArrowRight';
import {useState} from "react";
import CancelIcon from '@mui/icons-material/Cancel';
import {Data, Result} from '../pages/Home'


const Item = styled(Paper)(({theme}) => ({
  backgroundColor: theme.palette.mode === 'dark' ? '#1A2027' : '#fff',
  ...theme.typography.body2,
  padding: theme.spacing(1),
  textAlign: 'center',
  color: theme.palette.text.secondary,
}));


const ResultComponent = ({result, setResult}) => {
  const theme = useTheme();
  const [activeStep, setActiveStep] = useState<Number>(0)
  const [showSecondHalf, setShowSecondHalf] = useState<Boolean>(false);
  const handleNext = () => {
    const keys = Object.keys(result.data);
    const currentIndex = keys.indexOf(result.currentSource);
    const nextIndex = (currentIndex + 1) % keys.length;
    setActiveStep(nextIndex)
    setResult(prevResult => ({
      data: prevResult.data,
      currentSource: keys[nextIndex],
      nbStep: prevResult.nbStep
    }))
    setShowSecondHalf(false)
  };

  const handleBack = () => {
    const keys = Object.keys(result.data);
    const currentIndex = keys.indexOf(result.currentSource);
    const prevIndex = (currentIndex - 1 + keys.length) % keys.length;
    setActiveStep(prevIndex)
    setResult(prevResult => ({
      data: prevResult.data,
      currentSource: keys[prevIndex],
      nbStep: prevResult.nbStep
    }))
    setShowSecondHalf(false)
  };

  const removeResult = () => {
    console.log("hey")
    const keys = Object.keys(result.data);
    delete result.data[result.currentSource]
    setResult(result)
    setShowSecondHalf(false)
  }

  if (result.currentSource === "" || result.data == {}) {
    return;
  }

  const res = result.data[result.currentSource]
  const reference = res["reference"]
  let sequence = res["sequence"]
  const image = res["image"]
  const pin_codes = res["pin_codes"]

  let pin_codes_grid = (
    <div style={{color: theme.palette.text.secondary}}>No PIN codes</div>
  )

  if (pin_codes.length > 0) {
      sequence = 'Sequence: ' + res['sequence']

    const halfLength = Math.ceil(pin_codes.length / 2);
    const firstHalf = pin_codes.slice(0, halfLength);
    const secondHalf = pin_codes.slice(halfLength);

    pin_codes_grid = (
      <div style={{position: 'relative'}}>
        <p style={{color: theme.palette.text.secondary}}>PIN codes</p>
        <Paper elevation={1} style={{padding: '16px'}}>
          <Grid container spacing={1.5} direction={"column"}>
            {(showSecondHalf ? secondHalf : firstHalf).map((item, index) => (
              <Grid item xs={1} key={index}>
                <Item style={{padding: '5px 25px'}}>{showSecondHalf ? index + halfLength + 1 : index + 1}. {item}</Item>
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
          onClick={() => setShowSecondHalf(!showSecondHalf)}
        >
          <Badge
            badgeContent={showSecondHalf ? '-' : '+'}
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
      variant="dots"
      steps={result.nbStep}
      position="static"
      activeStep={activeStep}
      sx={{maxWidth: 400, flexGrow: 1, marginTop: '20px'}}
      nextButton={
        <Button size="small" onClick={handleNext} disabled={activeStep === result.nbStep}>
          Next
          {theme.direction === 'rtl' ? (
            <KeyboardArrowLeft/>
          ) : (
            <KeyboardArrowRight/>
          )}
        </Button>
      }
      backButton={
        <Button size="small" onClick={handleBack} disabled={activeStep === 0}>
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
      marginBottom: '40px'
    }}>
      <div id={"result"}>
        <div id={"result-metadata"} style={{color: theme.palette.text.secondary}}>
          {reference} <br/>
          {result.currentSource} <br/>
          <div style={{marginTop: 5}}>{sequence}</div>
        </div>
        <div style={{position: 'relative', display: 'inline-block'}}>
          <Button
          style={{
            position: "absolute", top: "0px", right: "0px",
            fontWeight: '500',
            color: "transparent ", backgroundColor: "transparent"
          }}
          color="primary"
          onClick={() => removeResult}
        >
         <Badge
           badgeContent={<CancelIcon style={{fontSize: 30, color:"#f00"}}/>}
           color="error"
           overlap="circular"
           anchorOrigin={{
             vertical: 'top',
             horizontal: 'right',
           }}
           sx={{"& .MuiBadge-badge": {borderRadius: '50%', maxWidth: 0, backgroundColor:"  #fff", border: 5, borderColor:"#f00"}}}
           style={{position: 'absolute', top: 0, right: 0,}}
         ></Badge>
          </Button>
          <img src={image} alt="no result" style={{objectFit: 'fill', width: '350px', borderRadius: '5px'}}/>
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