import { useEffect, useMemo, useState } from 'react';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import api from "../api.js";
import Button from '@mui/material/Button';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { styled } from '@mui/material/styles';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import { useDropzone } from "react-dropzone";

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

const focusedStyle = { borderColor: '#2196f3' };
const acceptStyle = { borderColor: '#00e676', color: '#00e676' };
const rejectStyle = { borderColor: '#ff1744', color: '#ff1744' };

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

const imgStyle = { display: 'block', width: 'auto', height: '100%' };

// Utility function for displaying status
const displayStatus = (message, severity, setAlertMessage, setAlertSeverity, setAlertOpen) => {
  setAlertMessage(message);
  setAlertSeverity(severity);
  setAlertOpen(true);
};

// PhoneReferences Component
const PhoneReferences = ({ result, setResult, setCurrentResult, setNbStep }) => {
  const [phoneReferences, setPhoneReferences] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isNewReference, setIsNewReference] = useState(false);
  const [open, setOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertSeverity, setAlertSeverity] = useState('error');
  const [files, setFiles] = useState([]);

  useEffect(() => {
    loadReferences();
  }, []);

  const loadReferences = () => {
    api.get('/api/phone-references/get')
      .then(response => {
        setPhoneReferences(response.data.map(item => item.ref));
      })
      .catch(err => {
        console.error('There was an error loading the references!', err);
      });
  };

  const handleAddReference = (e) => {
    if (!inputValue) {
      displayStatus('Please enter a reference text.', 'error', setAlertMessage, setAlertSeverity, setAlertOpen);
      return;
    } else if (!isNewReference) {
      displayStatus('This reference already exists', 'error', setAlertMessage, setAlertSeverity, setAlertOpen);
      return;
    } else if (!e.target.files || e.target.files.length === 0) {
      displayStatus('Please select a reference image.', 'error', setAlertMessage, setAlertSeverity, setAlertOpen);
      return;
    }

    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('ref', inputValue);
    formData.append('phone', file);

    api.post("/api/phone-references/add", formData, { responseType: 'blob' })
      .then(response => {
        if (response.status === 201) {
          setPhoneReferences(prevReferences => [...prevReferences, { "ref": inputValue }]);
          displayStatus('Reference added successfully!', 'success', setAlertMessage, setAlertSeverity, setAlertOpen);
          const imageURL = URL.createObjectURL(response.data);
          setResult(imageURL);
        }
      })
      .catch(err => {
        if (err.response && err.response.status === 422) {
          displayStatus(`The image "${file.name}" does not appear to contain a phone`, 'error', setAlertMessage, setAlertSeverity, setAlertOpen);
        }
      });
  };

  const handleUploadSmudgeTraces = () => {
    if (!inputValue) {
      displayStatus('Please enter a reference text.', 'error', setAlertMessage, setAlertSeverity, setAlertOpen);
      return;
    } else if (isNewReference) {
      displayStatus('Please select an existing phone reference or add one.', 'error', setAlertMessage, setAlertSeverity, setAlertOpen);
      return;
    } else if (files.length === 0) {
      displayStatus('Please select at least a phone image.', 'error', setAlertMessage, setAlertSeverity, setAlertOpen);
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
            if (filename in result) return;

            const newRes = {
              [filename]: {
                'reference': response.data['reference'],
                'sequence': response.data['sequence'],
                'image': response.data['image'],
                'pin_codes': response.data['pin_codes']
              }
            };
            setResult(prevRes => ({ ...prevRes, ...newRes }));
            setNbStep(prevNbStep => prevNbStep + 1)
            setCurrentResult(filename);
          }
        })
        .catch(err => {
          if (err.response && err.response.status === 422) {
            displayStatus(`The image "${file.name}" does not appear to contain a phone`, 'error', setAlertMessage, setAlertSeverity, setAlertOpen);
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
        <img src={file.preview} style={imgStyle} onLoad={() => URL.revokeObjectURL(file.preview)} />
      </div>
    </div>
  ));

  return (
    <div>
      <div className="newReference">
        <Autocomplete
          disablePortal
          id="combo-box-demo"
          options={phoneReferences}
          sx={{ width: 300, height: 45 }}
          renderInput={(params) => <TextField {...params} label="Phone References" />}
          inputValue={inputValue}
          onInputChange={(event, newInputValue) => {
            setInputValue(newInputValue);
            setIsNewReference(!phoneReferences.includes(newInputValue) && newInputValue !== '');
          }}
          onOpen={() => setOpen(true)}
          onClose={() => setOpen(false)}
          open={open}
          freeSolo
        />
        {isNewReference && (
          <Button
            component="label"
            variant="contained"
            startIcon={<CloudUploadIcon />}
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
      <section className="container">
        <div {...getRootProps({ style })}>
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
      <Snackbar
        open={alertOpen}
        autoHideDuration={2000}
        onClose={() => setAlertOpen(false)}
      >
        <Alert onClose={() => setAlertOpen(false)} severity={alertSeverity} sx={{ width: '100%' }}>
          {alertMessage}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default PhoneReferences;
