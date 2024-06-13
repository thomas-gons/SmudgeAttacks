import {useEffect, useMemo, useState} from 'react';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import api from "../api.js";
import Button from '@mui/material/Button';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import {styled} from '@mui/material/styles';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import {useDropzone} from "react-dropzone";

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

const focusedStyle = {
  borderColor: '#2196f3'
};

const acceptStyle = {
  borderColor: '#00e676',
  color: '#00e676',
  transition: 'easy-out'
};

const rejectStyle = {
  borderColor: '#ff1744',
  color: '#ff1744',
  transition: 'ease-out'
};

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

const img = {
  display: 'block',
  width: 'auto',
  height: '100%'
};




const PhoneReferences = ( {setResult, setPinCodes }) => {
  const [phoneReferences, setPhoneReferences] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isNewReference, setIsNewReference] = useState(false)
  const [open, setOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertSeverity, setAlertSeverity] = useState('error');

  const displayStatus = (message, severity) => {
    setAlertMessage(message);
    setAlertSeverity(severity);
    setAlertOpen(true)
  }

  const loadReferences = () => {
    api.get('/api/phone-references/get')
      .then(response => {
        setPhoneReferences(response.data.map(item => item.ref));
        console.log(phoneReferences)
      })
      .catch(err => {
        console.error('There was an error loading the references!', err);
      });
  };

  useEffect(() => {
    loadReferences();
  }, []);



  const handlerAddReference = (e) => {
    if (!inputValue) {
      displayStatus('Please enter a reference text.', 'error')
      return;
    } else if (isNewReference === false) {
      displayStatus('This reference already exists', 'error')
      return
    } else if (!e.target.files || e.target.files.length === 0) {
      displayStatus('Please select a reference image.', 'error')
      return;
    }

    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('ref', inputValue);
    formData.append('phone', file);

    api.post("/api/phone-references/add", formData, {responseType: 'blob'})
      .then(response => {
        if (response.status === 201) {
          setPhoneReferences(prevReferences => [...prevReferences, {"ref": inputValue}]);
          displayStatus('Reference added successfully! ', 'success')
          const imageURL = URL.createObjectURL(response.data)
          setResult(imageURL)
        }
      })
      // eslint-disable-next-line no-unused-vars
      .catch(err => {
        if (err.response && err.response.status === 422) {
          console.log("The image \"" + file.name + "\" does not appear to contain a phone")
          displayStatus("The image \"" + file.name + "\" does not appear to contain a phone", "error")
        }
     });
  };

  const autocomplete = <Autocomplete
    disablePortal
    id="combo-box-demo"
    options={phoneReferences}
    sx={{width: 300, height: 45}}
    renderInput={(params) => <TextField {...params} label="Phone References"/>}
    inputValue={inputValue}
    onInputChange={(event, newInputValue) => {
        setInputValue(newInputValue);
        setIsNewReference(!phoneReferences.includes(newInputValue) && newInputValue !== '')
    }}
    onOpen={() => setOpen(true)}
    onClose={() => setOpen(false)}
    open={open}
    freeSolo
  />

  const uploadNewReference = (
    <>
      {isNewReference &&
        <Button
          component="label"
          role={undefined}
          variant="contained"
          tabIndex={-1}
          startIcon={<CloudUploadIcon/>}
          id={'addNewReference'}
        >
        Add new reference
        <VisuallyHiddenInput
          type="file"
          accept=".jpg, .jpeg, .png, .webp"
          onChange={handlerAddReference}/>
      </Button>}
    </>
  )

  const [files, setFiles] = useState([]);
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
  }), [
    isFocused,
    isDragAccept,
    isDragReject
  ]);

  const thumbs = files.map(file => (
    <div style={thumb} key={file.name}>
      <div style={thumbInner}>
        <img
          src={file.preview}
          style={img}
          // Revoke data uri after image is loaded
          onLoad={() => {
            URL.revokeObjectURL(file.preview)
          }}
        />
      </div>
    </div>
  ));


  const handlerUploadSmudgeTraces = () => {
     if (!inputValue) {
       displayStatus('Please enter a reference text.', "error")
       return;
     } else if (isNewReference === true) {
       displayStatus('Please select an existing phone reference or add one.', 'error')
       return;
     } else if (files.length === 0) {
       displayStatus('Please select at least a phone image.', 'error')
       return;
     }

     files.map(file => {
       const formData = new FormData()
       formData.append("ref", inputValue)
       formData.append('image', file)

       api.post("api/find-pin-code", formData)
           .then(response => {
            if (response.status === 201) {
              setResult(response.data['image'])
              setPinCodes(response.data['pincodes'])
            }
           })
           .catch((err) => {
             console.log(err)
             if (err.response && err.response.status === 422) {
               console.log("The image \"" + file.name + "\" does not appear to contain a phone")
               displayStatus("The image \"" + file.name + "\" does not appear to contain a phone", "error")
             }
           })
     })
  }

  const uploadSmudgeTraces = <Button
    component="label"
    role={undefined}
    variant="contained"
    tabIndex={-1}
    onClick={handlerUploadSmudgeTraces}
  >
    upload smudge traces
  </Button>

  useEffect(() => {
    // Make sure to revoke the data uris to avoid memory leaks, will run on unmount
    return () => files.forEach(file => URL.revokeObjectURL(file.preview));
  }, []);

  return (
      <div>
        <div className={"newReference"}>
          {autocomplete}
          {uploadNewReference}
        </div>
        <section className="container">
          <div {...getRootProps({style})}>
            <input {...getInputProps()} />
            <p>Drag and drop some files here, or click to select files</p>
          </div>
          <aside style={thumbsContainer}>
            {thumbs.map((thumb) => (
                // eslint-disable-next-line react/jsx-key
                <div>
                  {thumb}
                </div>
            ))}
          </aside>
        </section>
        {uploadSmudgeTraces}
        <Snackbar
            open={alertOpen}
            autoHideDuration={2000}
            onClose={() => setAlertOpen(false)}
        >
          <Alert onClose={() => setAlertOpen(false)} severity={alertSeverity} sx={{width: '100%'}}>
            {alertMessage}
          </Alert>
        </Snackbar>
      </div>
  );
};


export default PhoneReferences;
