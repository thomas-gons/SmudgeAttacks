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

import {useDropzone} from "react-dropzone";
import {Grow} from "@mui/material";

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
const PhoneReferences = ({
                           result, setResult,
                         }) => {

  const [phoneReferences, setPhoneReferences] = useState<{ [ref: string]: number }>([]);
  const [inputValue, setInputValue] = useState('');
  const [referenceLabel, setReferenceLabel] = useState<ReferenceLabel>('empty');
  const [openAutocompletion, setOpenAutocompletion] = useState(false);
  const [isDeleting, setIsDeleting] = useState<Boolean>(true)
  const [files, setFiles] = useState([]);

  const displayStatus = (message, severity, action = null, options = {}) => {
    enqueueSnackbar({message, variant: severity, TransitionComponent: Grow, action, ...options})
  }

  useEffect(() => {
    loadReferences();
  }, []);

  const loadReferences = () => {
    api.get('/api/phone-references')
      .then(response => {
        setPhoneReferences(response.data.reduce((acc, reference) => {
          acc[reference.ref] = reference.id
          return acc;
        }, {} as { [key: string]: number }));
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
          displayStatus(`The image "${file.name}" does not appear to contain a phone`, 'error');
        }
      });
  };

  const handleUpdateReference = (e) => {
  }

  const handleDeleteReference = (e) => {
    console.log(phoneReferences)
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

      api.post("api/find-pin-code", formData)
        .then(response => {
          if (response.status === 201) {
            const filename = response.data['filename'];
            if (filename in Object.keys(result.data)) {
              console.log("already processed");
            }

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
            displayStatus(`The image "${file.name}" does not appear to contain a phone`, 'error');
          }
        });
    });
  };

  const {
    getRootProps,
    getInputProps,
    isFocused,
    isDragAccept,
    isDragReject
  } = useDropzone({
    accept: {
      'image/jpeg': ['.jpeg', '.jpg'],
      'image/png': ['.png'],
      'image/webp': ['.webp']
    },
    onDrop: acceptedFiles => {
      setFiles(acceptedFiles.map(file => Object.assign(file, {
        preview: URL.createObjectURL(file)
      })));
    }
  });

  const style = useMemo(() => ({
    ...baseStyle,
    ...(isFocused ? focusedStyle : {}),
    ...(isDragAccept ? acceptStyle : {}),
    ...(isDragReject ? rejectStyle : {})
  }), [isFocused, isDragAccept, isDragReject]);

  const thumbs = files.map(file => (
    <div style={thumb} key={file.name}>
      <div style={thumbInner}>
        <img src={file.preview} style={imgStyle} onLoad={() => URL.revokeObjectURL(file.preview)}/>
      </div>
    </div>
  ));

  return (
    <div>
      <div className="newReference">
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
            style={{marginLeft: "20px"}}
          >
            Add new reference
            <VisuallyHiddenInput
              type="file"
              accept=".jpg, .jpeg, .png, .webp"
              onChange={handleAddReference}
            />
          </Button>
        )}
      </div>
      {referenceLabel === 'known' && (
        <div style={{display: 'flex', marginTop: "15px"}}>
          {/*<Button*/}
          {/*  component="label"*/}
          {/*  variant="contained"*/}
          {/*> Update reference*/}
          {/*  <VisuallyHiddenInput*/}
          {/*    type="file"*/}
          {/*    accept=".jpg, .jpeg, .png, .webp"*/}
          {/*    onChange={handleUpdateReference}*/}
          {/*  />*/}
          {/*</Button>*/}
          <Button
            component="label"
            variant="contained"
            onClick={() => {
              displayStatus('Do you really want to delete ' + inputValue, 'info',
                (key) => (
                  <Button
                    variant={"contained"}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      backgroundColor: 'transparent', boxShadow: 'none'
                    }}>
                    <Badge
                      badgeContent={<CheckIcon color="rgb(2, 136, 209)"/>}
                      onClick={() => {handleDeleteReference(inputValue)}}
                      >
                    </Badge>
                    <Badge
                      badgeContent={<CancelIcon color="rgb(2, 136, 209)"/>}
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
        </div>
      )}
      <section className="container">
        <div {...getRootProps({style})}>
          <input {...getInputProps()} />
          <p>Drag and drop some files here, or click to select files</p>
        </div>
        <aside style={thumbsContainer}>
          {thumbs}
        </aside>
      </section>
      <Button
        variant="contained"
        onClick={handleUploadSmudgeTraces}
      >
        Upload smudge traces
      </Button>

    </div>
  );
};

export default PhoneReferences;
