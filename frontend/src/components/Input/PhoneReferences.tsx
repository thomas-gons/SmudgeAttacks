import {useState} from 'react';
import api from "../../api";
import Button from '@mui/material/Button';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import {Config, Data, InProcessResult} from '../../pages/Home'
import {closeSnackbar} from "notistack";
import Badge from '@mui/material/Badge';
import CheckIcon from '@mui/icons-material/Check';
import CancelIcon from '@mui/icons-material/Cancel';
import CodeLengthSlider from "./CodeLengthSlider";

import {CircularProgress} from "@mui/material";
import * as React from "react";
import ConfigAndGuess from "./ConfigAndGuess";
import {Result} from "../../pages/Home";
import ReferenceHandler from "./ReferenceHandler";
import {styled} from "@mui/material/styles";
import SmudgedPhoneInput from "./SmudgedPhoneInput";
import {displayStatus} from '../Status'

import {AxiosResponse, AxiosError} from "axios";

type ReferenceLabel = 'empty' | 'known' | 'unknown'

interface Thumb extends File {
  preview: string;
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
  config: Config,
  setConfig: React.Dispatch<React.SetStateAction<Config>>,
  setInProcessResult: React.Dispatch<React.SetStateAction<InProcessResult>>,
  result: Result,
  setResult: React.Dispatch<React.SetStateAction<Result>>,
  onlyComputeOrder: boolean,
}

// PhoneReferences Component
const PhoneReferences: React.FC<PhoneReferencesProps> = ({
  config,
  setConfig,
  setInProcessResult,
  result,
  setResult,
}) => {

  const [inputValue, setInputValue] = useState('');
  const [referenceLabel, setReferenceLabel] = useState<ReferenceLabel>('empty');
  const [smudgedPhoneImages, setSmudgedPhoneImages] = useState<Thumb[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false)

  const handleBuildNewStatistics = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files === null) {
      return
    }
    const formData = new FormData();
    formData.append("new_pin_length", config.pin_length.toString())
    formData.append("reference_file", event.target.files[0])
    api.post("api/build-statistics", formData)
      .then((response: AxiosResponse) => {
        if (response.status === 201) {
          displayStatus(response.data, 'success');
        }
      })
      .catch((err: AxiosError) => {
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
      formData.append('config', JSON.stringify(config))

      setIsProcessing(true)
      api.post("api/find-pin-code", formData)
        .then((response: AxiosResponse) => {
          setIsProcessing(false)
          if (response.status === 200) {
            const filename = response.data['filename'];
            if (result.data[filename]) {
              return
            }

            setInProcessResult(new InProcessResult())

            const data: Data = {
              reference: response.data['reference'],
              inferred_bboxes: response.data['inferred_bboxes'],
              refs_bboxes: response.data['ref_bboxes'],
              image: response.data['image'],
              pin_codes: response.data['pin_codes']
            };
            setResult(prevRes => ({
              data: {...prevRes.data, ...{[filename]: data}},
              current_source: filename,
              nb_step: prevRes.nb_step + 1,
              display: true
            }));

            displayStatus(`The image "${filename}" has been correctly processed`, 'success')
          } else if (response.status === 206) {

            setResult({
              ...result,
              display: false
            })
            const newInProcessResult: InProcessResult = {
              reference: inputValue,
              filename: response.data['filename'],
              image: response.data['image'],
              refs_bboxes: response.data['ref_bboxes'],
              inferred_bboxes: response.data['inferred_bboxes'],
              inferred_ciphers: response.data['inferred_ciphers'],
              expected_pin_length: config.pin_length
            }
            setInProcessResult(newInProcessResult)
          }
        })
        .catch((err: AxiosError) => {

          setIsProcessing(false)
          if (err.response && err.response.status === 422 && typeof err.response.data === 'string') {
            if (err.response.data.startsWith('No statistics')) {

              displayStatus(
                err.response.data,
                'warning',
                addPINLengthRef,
                {autoHideDuration: null, style: {whiteSpace: 'pre-line'}}
              )
            } else {
              displayStatus(err.response.data, 'warning');
            }
          }
        });
    });
  };

  const handleUpdatePINCode = () => {

    const formData = new FormData();
    formData.append("sequence", result.data[result.current_source].pin_codes[0])
    formData.append("config", JSON.stringify(config))
    setIsProcessing(true)

    api.post("api/update-pin-code", formData)
      .then((response: AxiosResponse) => {
        setIsProcessing(false)

        const newData: Data = result.data[result.current_source]

        newData.pin_codes = response.data['pin_codes']

        setResult(prevRes => ({
          data: {...prevRes.data, ...{[result.current_source]: newData}},
          current_source: result.current_source,
          nb_step: prevRes.nb_step,
          display: true
        }))
        displayStatus('The PIN code has been successfully updated', 'success')
        })
      .catch((err: AxiosError) => {
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
          const input = document.getElementById("addPINLengthRefInput")
          if (input) input.click()
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
      <CodeLengthSlider config={config} setConfig={setConfig}/>
      <ReferenceHandler
        inputValue={inputValue} setInputValue={setInputValue}
        referenceLabel={referenceLabel} setReferenceLabel={setReferenceLabel}
        config={config} setConfig={setConfig}
      />
      <SmudgedPhoneInput
        smudgedPhoneImages={smudgedPhoneImages} setSmudgedPhoneImages={setSmudgedPhoneImages}
      />
      <ConfigAndGuess config={config} setConfig={setConfig}/>
      <div style={{display: 'flex', alignItems: 'center', margin: '40px 0'}}>
        <Button
          variant="contained"
          onClick={() => {
            result.data[smudgedPhoneImages[0].name] ? handleUpdatePINCode() : handleUploadSmudgeTraces()
          }}
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
