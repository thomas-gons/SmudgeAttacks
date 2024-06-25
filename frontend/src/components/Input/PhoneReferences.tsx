import {useState} from 'react';
import api from "../../api.js";
import Button from '@mui/material/Button';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import {Data} from '../../pages/Home.js'
import {closeSnackbar, enqueueSnackbar} from "notistack";
import Badge from '@mui/material/Badge';
import CheckIcon from '@mui/icons-material/Check';
import CancelIcon from '@mui/icons-material/Cancel';
import CodeLengthSlider from "./CodeLengthSlider";

import {CircularProgress, Grow} from "@mui/material";
import * as React from "react";
import ConfigAndGuess from "./ConfigAndGuess";
import ReferenceHandler from "./ReferenceHandler";
import {styled} from "@mui/material/styles";
import SmudgedPhoneInput from "./SmudgedPhoneInput";
import Thumb from "./Thumb";


export const displayStatus = (message, severity, action = null, options = {}) => {
  enqueueSnackbar({message, variant: severity, TransitionComponent: Grow, action, ...options})
}


export const VisuallyHiddenInput = styled('input')({
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

// PhoneReferences Component
const PhoneReferences = ({result, setResult}) => {

  const [
    smudgedPhoneImages,
    setSmudgedPhoneImages] = useState<File[]>([]);

  const [
    orderGuessingAlgorithms,
    setOrderGuessingAlgorithms] = useState<{ [algorithm: string]: boolean }>({});

  const [
    cipherGuess,
    setCipherGuess] = useState<string[]>(Array(6))

  const [
    inputValue,
    setInputValue] = useState('');

  const [
    pinLength,
    setPinLength] = useState(6);

    const [
    isProcessing,
    setIsProcessing] = useState<Boolean>(false)

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
    } else if (smudgedPhoneImages.length === 0) {
      displayStatus('Please select at least a phone image.', 'error');
      return;
    }

    smudgedPhoneImages.forEach(file => {
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
                      <input
                        type="file"
                        accept=".txt"
                        onChange={() => {
                          console.log('TODO')
                        }}
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

  return (
    <div>
      {CodeLengthSlider(pinLength, setPinLength, cipherGuess, setCipherGuess)}
      {ReferenceHandler(orderGuessingAlgorithms, setOrderGuessingAlgorithms, inputValue, setInputValue)}
      {SmudgedPhoneInput(smudgedPhoneImages, setSmudgedPhoneImages)}
      {ConfigAndGuess(
        orderGuessingAlgorithms, setOrderGuessingAlgorithms,
        cipherGuess, setCipherGuess,
        pinLength, setPinLength
      )}
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
