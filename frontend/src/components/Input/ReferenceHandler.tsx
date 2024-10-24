import Autocomplete from "@mui/material/Autocomplete";
import {TextField, Button, Badge} from "@mui/material";
import CancelIcon from "@mui/icons-material/Cancel";
import CheckIcon from "@mui/icons-material/Check";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import RefreshIcon from '@mui/icons-material/Refresh';
import api from "../../api";
import React from "react";
import {closeStatus, displayStatus} from '../Status'
import {styled} from "@mui/material/styles";
import {Config} from "../../pages/Home";
import {AxiosError, AxiosResponse} from "axios";

type ReferenceLabel = 'empty' | 'known' | 'unknown'

// Styled Components
const VisuallyHiddenInput = styled('input')({
  clipPath: 'inset(50%)',
  height: 1,
  overflow: 'hidden',
  position: 'absolute',
  bottom: 0,
  left: 0,
  whiteSpace: 'nowrap',
  width: 1,
});


interface ReferenceHandlerProps {
  inputValue: string;
  setInputValue: React.Dispatch<React.SetStateAction<string>>;
  referenceLabel: ReferenceLabel;
  setReferenceLabel: React.Dispatch<React.SetStateAction<ReferenceLabel>>;
  config: Config;
  setConfig: React.Dispatch<React.SetStateAction<Config>>;
}


const ReferenceHandler: React.FC<ReferenceHandlerProps> = ({
  inputValue,
  setInputValue,
  referenceLabel,
  setReferenceLabel,
  config,
  setConfig
}) => {

  const [phoneReferences,
         setPhoneReferences] = React.useState<{ [ref: string]: number }>({});



  const loadReferences = () => {
    api.get('/api/phone-references')
      .then((response: AxiosResponse) => {
        const refs = response.data['refs']
        setPhoneReferences(refs.reduce(
          (acc: { [key: string]: number }, ref: {ref: string, id: number}) => {

            acc[ref.ref] = ref.id
          return acc;
        }, {} as { [key: string]: number }));
        const newOrderGuessingAlgorithms = response.data['order_guessing_algorithms'].reduce(
          (acc: {[algo: string] : boolean}, algorithm: string) => {
          acc[algorithm] = true
          return acc
        }, {});
        setConfig({
          ...config,
          order_guessing_algorithms: newOrderGuessingAlgorithms
        });
      })
      .catch((err: AxiosError) => {
        console.error('There was an error loading the references!', err);
      });
  };

  React.useEffect(() => {
    loadReferences();
  }, []);


  const handleAddReference = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      .then((response: AxiosResponse) => {
        if (response.status === 201) {
          setPhoneReferences(prevReferences => ({
            ...prevReferences,
            [response.data['ref']]: response.data['id']
          }));
          setInputValue("");
          setReferenceLabel("empty")
          displayStatus(response.data['ref'] + ' added successfully!', 'success');
        }
      })
      .catch((err: AxiosError) => {
        if (err.response && err.response.status === 422) {
          displayStatus(err.response.data, 'error');
        }
      });
  };

  const handleUpdateReference= (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files === null) {
      return
    }
    const formData = new FormData();
    formData.append('ref', inputValue);
    formData.append('phone', event.target.files[0]);

    api.put("/api/phone-references/" + phoneReferences[inputValue], formData)
      .then((response: AxiosResponse) => {
        if (response.status === 201) {
          setInputValue("");
          setReferenceLabel("empty")
          displayStatus(inputValue + ' reference updated successfully!', 'success');
        }
      })
  }

  const handleDeleteReference = () => {
    api.delete("/api/phone-references/" + phoneReferences[inputValue])
      .then((response: AxiosResponse) => {
        if (response.status === 201) {
          delete phoneReferences[inputValue];
          setPhoneReferences(phoneReferences)
          setInputValue("");
          setReferenceLabel("empty")
          displayStatus('Reference delete successfully!', 'success');
        }
      })
  }

  return (
    <div className="newReference" style={{marginTop: '10px'}}>
    <Autocomplete
      disablePortal
      id="combo-box-demo"
      options={Object.keys(phoneReferences)}
      sx={{width: 300, height: 45}}
      renderInput={(params) => <TextField {...params} label="Phone References"/>}
      inputValue={inputValue}
      onInputChange={(_, newInputValue) => {
        setInputValue(newInputValue);
        setReferenceLabel(Object.keys(phoneReferences).some(x => x === newInputValue) ? 'known' :
          newInputValue !== '' ? 'unknown' : 'empty');
      }}
      freeSolo
    />
    {referenceLabel === 'unknown' && (
     <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginLeft: '20px',
          padding: '0 10px',
          borderRadius: '5px',
          backgroundColor: '#1976d2',
        }}
      >
        <AddIcon
          sx={{
            color: "white",
          }}
          onClick={() => {
            const input = document.getElementById("addReference")
            console.log(input)
            if (input) input.click()
        }}
        />
         <VisuallyHiddenInput
            type="file"
            accept=".jpg, .jpeg, .png, .webp"
            id="addReference"
            onChange={(e) => {
              handleAddReference(e)
            }}
          />
      </div>
    )}
    {referenceLabel === 'known' && (
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginLeft: '20px',
          minWidth: '55px',
          padding: '0 10px',
          borderRadius: '5px',
          backgroundColor: '#1976d2',
        }}
      >
        <RefreshIcon
          sx={{color: "white  "}}
          onClick={() => {
            const input = document.getElementById("updateReference")
            console.log(input)
            if (input) input.click()
        }}
        />
         <VisuallyHiddenInput
            type="file"
            accept=".jpg, .jpeg, .png, .webp"
            id="updateReference"
            onChange={(e) => {
              handleUpdateReference(e)
            }}
          />
        <CloseIcon
          sx={{color: "white"}}
          onClick={() => {
            displayStatus('Do you really want to delete ' + inputValue, 'info',
              (<Button
                variant={"contained"}
                style={{
                  justifyContent: 'space-between',
                  backgroundColor: 'transparent', boxShadow: 'none'
                }}>
                <Badge
                  badgeContent={<CheckIcon/>}
                  onClick={() => {
                    handleDeleteReference()
                  }}
                >
                </Badge>
                <Badge
                  badgeContent={<CancelIcon/>}
                  onClick={closeStatus}
                >
                </Badge>
              </Button>), {autoHideDuration: null})
          }}
        />
      </div>
    )}
  </div>
  )
}

export default ReferenceHandler;