import Button from "@mui/material/Button";
import * as React from "react";

import {displayStatus} from "../Status";
import {VisuallyHiddenInput} from "./PhoneReferences";


const thumbsContainer: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'row',
  flexWrap: 'wrap',
  marginTop: 16
};

const thumbElement: React.CSSProperties = {
  display: 'inline-flex',
  borderRadius: 2,
  border: '1px solid #eaeaea',
  marginBottom: 8,
  marginRight: 8,
  width: 100,
  height: 100,
  padding: 4,
};

const thumbInner: React.CSSProperties = {
  display: 'flex',
  minWidth: 0,
  overflow: 'hidden'
};

const imgStyle = {display: 'block', width: 'auto', height: '100%'};

interface Thumb extends File {
  preview: string;
}

interface SmudgedPhoneInputProps {
  smudgedPhoneImages: Thumb[];
  setSmudgedPhoneImages: React.Dispatch<React.SetStateAction<Thumb[]>>;
  setOnlyComputeOrder: React.Dispatch<React.SetStateAction<boolean>>;

}

const SmudgedPhoneInput: React.FC<SmudgedPhoneInputProps> = ({
  smudgedPhoneImages,
  setSmudgedPhoneImages,
  setOnlyComputeOrder
}) => {

  return (
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
          onChange={(
            event: React.ChangeEvent<HTMLInputElement>
          ) => {
            const nbFileLimit = 5
            let acceptedFiles: File[] = Array.from(event.target.files || [])
            if (acceptedFiles.length > nbFileLimit) {
              displayStatus("You can only select up to " + nbFileLimit + " files.", "error")
              acceptedFiles = acceptedFiles.slice(0, nbFileLimit)
            }
            setSmudgedPhoneImages(acceptedFiles.map(file => Object.assign(file, {
              preview: URL.createObjectURL(file),
            })));
            setOnlyComputeOrder(false)
          }}
        />
      </Button>
      <aside style={thumbsContainer}>
       {smudgedPhoneImages.map(image => (
        <div style={thumbElement} key={image.name}>
           <div style={thumbInner}>
             <img src={image.preview} alt={image.name} style={imgStyle} onLoad={() => URL.revokeObjectURL(image.preview)}/>
           </div>
         </div>
       ))
     }
     </aside>
    </section>
  )
}

export default SmudgedPhoneInput;