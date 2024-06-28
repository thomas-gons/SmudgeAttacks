import {useState} from 'react';
import api from "../../api.js";
import Button from '@mui/material/Button';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import {Data, InProcessResult} from '../../pages/Home.js'
import {closeSnackbar, enqueueSnackbar} from "notistack";
import Badge from '@mui/material/Badge';
import CheckIcon from '@mui/icons-material/Check';
import CancelIcon from '@mui/icons-material/Cancel';
import CodeLengthSlider from "./CodeLengthSlider";

import {CircularProgress, Grow} from "@mui/material";
import * as React from "react";
import ConfigAndGuess from "./ConfigAndGuess";
import {Result} from "../../pages/Home";
import ReferenceHandler from "./ReferenceHandler";
import {styled} from "@mui/material/styles";
import SmudgedPhoneInput from "./SmudgedPhoneInput";


type ReferenceLabel = 'empty' | 'known' | 'unknown'


export const displayStatus = (message: string, severity: string, action = null, options = {}) => {
  enqueueSnackbar({message, variant: severity, TransitionComponent: Grow, action, ...options})
}


export const VisuallyHiddenInput = styled('input')({
  clipPath: 'inset(50%)',
  height: 1,
  overflow: 'hidden',
  position: 'absolute',
  bottom: 0,
  left: 0,
  whiteSpace: 'nowrap',
  width: 1,
});

interface PhoneReferencesProps {
  setInProcessResult: React.Dispatch<React.SetStateAction<InProcessResult>>,
  result: Result,
  setResult: React.Dispatch<React.SetStateAction<Result>>
}

// PhoneReferences Component
const PhoneReferences: React.FC<PhoneReferencesProps> = ({
  setInProcessResult,
  result,
  setResult
}) => {

  const [pinLength, setPinLength] = useState(6);
  const [inputValue, setInputValue] = useState('');
  const [referenceLabel, setReferenceLabel] = useState<ReferenceLabel>('empty');
  const [smudgedPhoneImages, setSmudgedPhoneImages] = useState<File[]>([]);
  const [orderGuessingAlgorithms, setOrderGuessingAlgorithms] = useState<{ [algorithm: string]: boolean }>({});
  const [cipherGuess, setCipherGuess] = useState<string[]>(Array(6))
  const [cipherCorrection, setCipherCorrection] = useState<'manual' | 'auto'>('manual')
  const [onlyComputeOrder, setOnlyComputeOrder] = useState<boolean>(false)
  const [isProcessing, setIsProcessing] = useState<boolean>(false)

  const resetInProcessResult = () => {
    setInProcessResult({
      reference: "",
      image: "",
      refs_bboxes: [],
      inferred_bboxes: [],
      inferred_ciphers: [],
      expected_pin_length: pinLength
    })
  }

  const resetResult = () => {
    setResult({
      data: {},
      current_source: '',
      nb_step: 0
    })
  }


  const handleBuildNewStatistics = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formData = new FormData();
    formData.append("new_pin_length", pinLength.toString())
    formData.append("reference_file", e.target.files[0])
    api.post("api/build-statistics", formData)
      .then(response => {
        if (response.status === 201) {
          displayStatus(response.data, 'success');
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

    const oga = Object.keys(orderGuessingAlgorithms).filter(algorithm => orderGuessingAlgorithms[algorithm])

    smudgedPhoneImages.forEach(file => {
      const formData = new FormData();
      formData.append("ref", inputValue);
      formData.append('image', file);
      formData.append('order_guessing_algorithms', oga.toString())
      formData.append('cipher_guess', cipherGuess.toString())
      formData.append('cipher_correction', cipherCorrection)
      setIsProcessing(true)
      api.post("api/find-pin-code", formData)
        .then(response => {
          setIsProcessing(false)
          if (response.status === 201) {
            const filename = response.data['filename'];
            if (result.data[filename]) {
              return
            }

            resetInProcessResult()

            const data: Data = {
              reference: response.data['reference'],
              sequence: response.data['sequence'],
              image: response.data['image'],
              pin_codes: response.data['pin_codes']
            };
            setResult(prevRes => ({
              data: {...prevRes.data, ...{[filename]: data}},
              current_source: filename,
              nb_step: prevRes.nb_step + 1
            }));
            setOnlyComputeOrder(true)
            displayStatus(`The image "${filename}" has been correctly processed`, 'success')
          } else if (response.status === 206) {

            resetResult()
            const newInProcessResult: InProcessResult = {
              reference: inputValue,
              image: response.data['image'],
              refs_bboxes: response.data['ref_bboxes'],
              inferred_bboxes: response.data['inferred_bboxes'],
              inferred_ciphers: response.data['inferred_ciphers'],
              expected_pin_length: pinLength
            }
            setInProcessResult(newInProcessResult)
          }
        })
        .catch(err => {

          setIsProcessing(false)
          if (err.response && err.response.status === 422) {
            if (err.response.data.startsWith('No statistics')) {
              displayStatus(err.response.data, 'warning',
                () => (
                  addPINLengthRef
                ), {autoHideDuration: null, style: {whiteSpace: 'pre-line'}})
            } else {
              displayStatus(err.response.data, 'warning');
            }
          }
        });
    });
  };

  const handleUpdatePINCode = () => {

    const oga = Object.keys(orderGuessingAlgorithms).filter(algorithm => orderGuessingAlgorithms[algorithm])

    const formData = new FormData();
    formData.append("sequence", result.data[result.current_source].sequence)
    formData.append('order_guessing_algorithms', oga.toString())
    formData.append('cipher_guess', cipherGuess.toString())
    setIsProcessing(true)

    api.post("api/update-pin-code", formData)
      .then(response => {
        setIsProcessing(false)
        if (response && response.status === 206) {
          const newInProcessResult: InProcessResult = {
            reference: inputValue,
            image: response.data['image'],
            refs_bboxes: response.data['refs_bboxes'],
            inferred_bboxes: response.data['inferred_bboxes'],
            inferred_ciphers: response.data['inferred_ciphers'],
            expected_pin_length: pinLength
          }
          console.log(newInProcessResult)
          setInProcessResult(newInProcessResult)
        }
        const prevResult = result
        prevResult.data[result.current_source].pin_codes = response.data['pin_codes']
        setResult(prevResult)
      })
      .catch(err => {
        setIsProcessing(false)

        if (err.response && err.response.status === 422) {
          displayStatus(err.response.data, 'error');
        }
      });
  }

  const addPINLengthRef = (
    <Button
      variant={"contained"}
      style={{
        justifyContent: 'space-between',
        backgroundColor: 'transparent', boxShadow: 'none'
      }}
    >
      <Badge
        badgeContent={<CheckIcon/>}
        onClick={() => {
          document.getElementById("addPINLengthRefInput").click()
        }}
      >
        <VisuallyHiddenInput
          type="file"
          accept=".txt"
          id="addPINLengthRefInput"
          onChange={(e) => {
            handleBuildNewStatistics(e)
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
  )

  return (
    <div>
      <CodeLengthSlider
        setPinLength={setPinLength} setOnlyComputeOrder={setOnlyComputeOrder}
        cipherGuess={cipherGuess} setCipherGuess={setCipherGuess}
      />
      <ReferenceHandler
        inputValue={inputValue} setInputValue={setInputValue}
        referenceLabel={referenceLabel} setReferenceLabel={setReferenceLabel}
        setOrderGuessingAlgorithms={setOrderGuessingAlgorithms}
      />
      <SmudgedPhoneInput
        smudgedPhoneImages={smudgedPhoneImages} setSmudgedPhoneImages={setSmudgedPhoneImages}
        setOnlyComputeOrder={setOnlyComputeOrder}
      />
      <ConfigAndGuess
        orderGuessingAlgorithms={orderGuessingAlgorithms} setOrderGuessingAlgorithms={setOrderGuessingAlgorithms}
        cipherGuess={cipherGuess} setCipherGuess={setCipherGuess}
        setCipherCorrection={setCipherCorrection} pinLength={pinLength}
      />
      <div style={{display: 'flex', alignItems: 'center', marginBottom: '20px'}}>
        <Button
          variant="contained"
          onClick={(!onlyComputeOrder) ? handleUploadSmudgeTraces : handleUpdatePINCode}
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
