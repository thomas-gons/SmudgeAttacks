import {useEffect, useMemo, useState} from 'react';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import api from "../api.js";
import Button from '@mui/material/Button';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import {styled} from '@mui/material/styles';
import {Data} from '../pages/Home.js'
import {closeSnackbar, enqueueSnackbar} from "notistack";
import Badge from '@mui/material/Badge';
import CheckIcon from '@mui/icons-material/Check';
import CancelIcon from '@mui/icons-material/Cancel';
import TuneIcon from '@mui/icons-material/Tune';

import {
  Checkbox, CircularProgress,
  FormControl,
  FormControlLabel,
  FormGroup,
  Grid,
  Grow,
  Input,
  Slider
} from "@mui/material";
import * as React from "react";

// Styled Components
const VisuallyHiddenInput = styled('input')({
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  height: 1,
  overflow: 'hidden',
  position: 'absolute',
  bottom: 0,
  left: 0,
  whiteSpace: 'nowrap',
  width: 1,
});

// Styles
const baseStyle = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: '20px',
  marginTop: '20px',
  borderWidth: 2,
  borderRadius: 2,
  borderColor: '#eeeeee',
  borderStyle: 'dashed',
  backgroundColor: '#fafafa',
  color: '#bdbdbd',
  outline: 'none',
  transition: 'border .24s ease-in-out'
};

const focusedStyle = {borderColor: '#2196f3'};
const acceptStyle = {borderColor: '#00e676', color: '#00e676'};
const rejectStyle = {borderColor: '#ff1744', color: '#ff1744'};

const thumbsContainer = {
  display: 'flex',
  flexDirection: 'row',
  flexWrap: 'wrap',
  marginTop: 16
};

const thumb = {
  display: 'inline-flex',
  borderRadius: 2,
  border: '1px solid #eaeaea',
  marginBottom: 8,
  marginRight: 8,
  width: 100,
  height: 100,
  padding: 4,
  boxSizing: 'border-box'
};

const thumbInner = {
  display: 'flex',
  minWidth: 0,
  overflow: 'hidden'
};

const imgStyle = {display: 'block', width: 'auto', height: '100%'};

type ReferenceLabel = 'empty' | 'known' | 'unknown'

// PhoneReferences Component
const PhoneReferences = ({result, setResult}) => {

  const [openAutocompletion, setOpenAutocompletion] = useState(false);
  const [files, setFiles] = useState([]);
  const [phoneReferences, setPhoneReferences] = useState<{ [ref: string]: number }>({});
  const [orderGuessingAlgorithms, setOrderGuessingAlgorithms] = useState<{[algorithm: string]: boolean}>({});
  const [cipherGuess, setCipherGuess] = useState<string[]>(Array(6))
  const [inputValue, setInputValue] = useState('');
  const [referenceLabel, setReferenceLabel] = useState<ReferenceLabel>('empty');
  const [isConfigOpen, setIsConfigOpen] = useState<Boolean>(false);
  const [isProcessing, setIsProcessing] = useState<Boolean>(false)
  const displayStatus = (message, severity, action = null, options = {}) => {
    enqueueSnackbar({message, variant: severity, TransitionComponent: Grow, action, ...options})
  }

  useEffect(() => {
    loadReferences();
  }, []);

  const [pinLength, setPinLength] = useState(6); // Valeur initiale du slider

  const pinLengthSliderLike = (
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

  const loadReferences = () => {
    api.get('/api/phone-references')
      .then(response => {
        const refs = response.data['refs']
        setPhoneReferences(refs.reduce((acc, ref) => {
          acc[ref.ref] = ref.id
          return acc;
        }, {} as { [key: string]: number }));
        const newOrderGuessingAlgorithms = response.data['order_guessing_algorithms'].reduce((acc, algorithm) => {
          acc[algorithm] = true
          return acc
        }, {});
        setOrderGuessingAlgorithms(newOrderGuessingAlgorithms)
      })
      .catch(err => {
        console.error('There was an error loading the references!', err);
      });
  };

  const handleAddReference = (e) => {
    if (!inputValue) {
      displayStatus('Please enter a reference text.', 'error');
      return;
    } else if (referenceLabel === 'known') {
      displayStatus('This reference already exists', 'error');
      return;
    } else if (!e.target.files || e.target.files.length === 0) {
      displayStatus('Please select a reference image.', 'error');
      return;
    }

    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('ref', inputValue);
    formData.append('phone', file);


    api.post("/api/phone-references", formData)
      .then(response => {
        if (response.status === 201) {
          setPhoneReferences(prevReferences => ({
            ...prevReferences,
            [response.data['ref']]: response.data['id']
          }));
          setInputValue("");
          setReferenceLabel("empty")
          displayStatus(response.data['ref'] + ' added successfully!', 'success');
          const imageURL = URL.createObjectURL(response.data);
          // setResult(imageURL);
        }
      })
      .catch(err => {
        if (err.response && err.response.status === 422) {
          displayStatus(err.response.data, 'error');
        }
      });
  };

  const handleDeleteReference = (e) => {
    api.delete("/api/phone-references/" + phoneReferences[inputValue])
      .then(response => {
        if (response.status === 201) {
          delete phoneReferences[inputValue];
          setPhoneReferences(phoneReferences)
          setInputValue("");
          setReferenceLabel("empty")
          displayStatus('Reference delete successfully!', 'success');
        }
      })
  }

  const handleBuildNewStatistics = (e) => {
    const formData = new FormData();
    formData.append("new_pin_code_length", pinLength.toString())
    api.post("api/build-statistics", formData)
      .then(response => {
        if (response.status === 201) {
          displayStatus(response.data, 'You can now retry the processing', 'success');
        }
      })
      .catch(err => {
        if (err.response && err.response.status === 422) {
          displayStatus(err.response.data, 'error');
        }
      });
  }

  const handleUploadSmudgeTraces = () => {
    if (!inputValue) {
      displayStatus('Please enter a reference text.', 'error');
      return;
    } else if (referenceLabel === 'unknown' || referenceLabel === 'empty') {
      displayStatus('Please select an existing phone reference or add one.', 'error');
      return;
    } else if (files.length === 0) {
      displayStatus('Please select at least a phone image.', 'error');
      return;
    }

    files.forEach(file => {
      const formData = new FormData();
      formData.append("ref", inputValue);
      formData.append('image', file);
      formData.append("order_guessing_algorithms", Object.keys(orderGuessingAlgorithms).filter(algorithm => orderGuessingAlgorithms[algorithm]))
      formData.append('cipherGuess', cipherGuess);
      setIsProcessing(true)
      api.post("api/find-pin-code", formData)
        .then(response => {
          if (response.status === 201) {
            setIsProcessing(false)
            const filename = response.data['filename'];

            const data: Data = {
              reference: response.data['reference'],
              sequence: response.data['sequence'],
              image: response.data['image'],
              pin_codes: response.data['pin_codes']
            };
            setResult(prevRes => ({
              data: {...prevRes.data, ...{[filename]: data}},
              currentSource: filename,
              nbStep: prevRes.nbStep + 1
            }));
            displayStatus(`The image "${filename}" has been correctly processed`, 'success')
          }
        })
        .catch(err => {
          if (err.response && err.response.status === 422) {
            if (err.response.data.startsWith('No statistics')) {
              displayStatus(err.response.data, 'warning',
                (key) => (
                  <Button
                    variant={"contained"}
                    style={{
                      justifyContent: 'space-between',
                      backgroundColor: 'transparent', boxShadow: 'none'
                    }}>
                    <Badge
                      badgeContent={<CheckIcon/>}
                    >
                     <VisuallyHiddenInput
                        type="file"
                        accept=".txt"
                        onChange={() => {console.log('TODO')}}
                    />
                    </Badge>
                    <Badge
                      badgeContent={<CancelIcon/>}
                      onClick={() => {
                        closeSnackbar()
                      }}
                    >
                    </Badge>
                  </Button>
                ), {autoHideDuration: null, style: {whiteSpace: 'pre-line'}})
            } else {
              displayStatus(err.response.data, 'warning');
            }
          }
          setIsProcessing(false)
        });
    });
  };

  const thumbs = files.map(file => (
    <div style={thumb} key={file.name}>
      <div style={thumbInner}>
        <img src={file.preview} style={imgStyle} onLoad={() => URL.revokeObjectURL(file.preview)}/>
      </div>
    </div>
  ));

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

  return (
    <div>
      {pinLengthSliderLike}
      <div className="newReference" style={{marginTop: '10px'}}>
        <Autocomplete
          disablePortal
          id="combo-box-demo"
          options={Object.keys(phoneReferences)}
          sx={{width: 300, height: 45}}
          renderInput={(params) => <TextField {...params} label="Phone References"/>}
          inputValue={inputValue}
          onInputChange={(event, newInputValue) => {
            setInputValue(newInputValue);
            setReferenceLabel(Object.keys(phoneReferences).some(x => x === newInputValue) ? 'known' :
              newInputValue !== '' ? 'unknown' : 'empty');
          }}
          onOpen={() => setOpenAutocompletion(true)}
          onClose={() => setOpenAutocompletion(false)}
          open={openAutocompletion}
          freeSolo
        />
        {referenceLabel === 'unknown' && (
          <Button
            component="label"
            variant="contained"
            startIcon={<CloudUploadIcon/>}
            style={{marginLeft: "20px", minWidth: 'fit-content'}}
          >
            Add new reference
            <VisuallyHiddenInput
              type="file"
              accept=".jpg, .jpeg, .png, .webp"
              onChange={handleAddReference}
            />
          </Button>
        )}
      {referenceLabel === 'known' && (
        <Button
          component="label"
          variant="contained"
          sx={{marginLeft: '20px', minWidth: 'fit-content'}}
          onClick={() => {
            displayStatus('Do you really want to delete ' + inputValue, 'info',
              (key) => (
                <Button
                  variant={"contained"}
                  style={{
                    justifyContent: 'space-between',
                    backgroundColor: 'transparent', boxShadow: 'none'
                  }}>
                  <Badge
                    badgeContent={<CheckIcon/>}
                    onClick={() => {
                      handleDeleteReference(inputValue)
                    }}
                  >
                  </Badge>
                  <Badge
                    badgeContent={<CancelIcon/>}
                    onClick={() => {
                      closeSnackbar()
                    }}
                  >
                  </Badge>
                </Button>
              ), {autoHideDuration: null})
          }}
        > Delete reference
        </Button>
      )}
      </div>

      <section className="container">
        <Button
          component="label"
          variant="contained"
          style={{marginTop: "20px"}}
        >
          Add Smudge Traces
          <VisuallyHiddenInput
            type="file"
            accept=".jpg, .jpeg, .png, .webp"
            multiple
            required
            onChange={(event) => {
              const nbFileLimit = 5
              let acceptedFiles = Array.from(event.target.files);
              if (acceptedFiles.length > nbFileLimit) {
                displayStatus("You can only select up to " + nbFileLimit + " files.", "error")
                console.log(acceptedFiles)
                acceptedFiles = acceptedFiles.slice(0, nbFileLimit)
                console.log(acceptedFiles)
              }
              setFiles(acceptedFiles.map(file => Object.assign(file, {
                preview: URL.createObjectURL(file)
              })));
            }}
          />
        </Button>
        <aside style={thumbsContainer}>
          {thumbs}
        </aside>
      </section>
      {config}
      <div style={{display: 'flex', alignItems: 'center'}}>
      <Button
        variant="contained"
        onClick={handleUploadSmudgeTraces}
        startIcon={<CloudUploadIcon/>}
      >
        Process Smudge Traces
      </Button>
        {isProcessing &&
          <div style={{marginLeft: '20px'}}>
            <CircularProgress size='2em'/>
          </div>
        }
      </div>
    </div>
  );
};

export default PhoneReferences;
