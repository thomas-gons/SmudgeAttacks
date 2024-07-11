import Button from "@mui/material/Button";
import * as React from "react";

import {displayStatus} from "../Status";
import {VisuallyHiddenInput} from "./PhoneReferences";
import { styled } from '@mui/material/styles';
import Tooltip, { TooltipProps, tooltipClasses } from '@mui/material/Tooltip';
import LightTooltipHelper from '../LightTooltipHelper'

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

const HtmlTooltip = styled(({ className, ...props }: TooltipProps) => (
  <Tooltip {...props} classes={{ popper: className }} />
))(({ theme }) => ({
  [`& .${tooltipClasses.tooltip}`]: {
    backgroundColor: '#f5f5f9',
    color: 'rgba(0, 0, 0, 0.87)',
    maxWidth: 220,
    fontSize: theme.typography.pxToRem(12),
    border: '1px solid #dadde9',
  },
}));

const imgStyle = {display: 'block', width: 'auto', height: '100%'};

interface Thumb extends File {
  preview: string;
}

interface SmudgedPhoneInputProps {
  smudgedPhoneImages: Thumb[];
  setSmudgedPhoneImages: React.Dispatch<React.SetStateAction<Thumb[]>>;
}

const SmudgedPhoneInput: React.FC<SmudgedPhoneInputProps> = ({
  smudgedPhoneImages,
  setSmudgedPhoneImages,
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
              const nbFileLimit = 25
              let acceptedFiles: File[] = Array.from(event.target.files || [])
              if (acceptedFiles.length > nbFileLimit) {
                displayStatus("You can only select up to " + nbFileLimit + " files.", "error")
                acceptedFiles = acceptedFiles.slice(0, nbFileLimit)
              }
              setSmudgedPhoneImages(acceptedFiles.map(file => Object.assign(file, {
                preview: URL.createObjectURL(file),
              })));
            }}
          />
        </Button>
        <LightTooltipHelper
          title={
            <React.Fragment>
              <img src={"https://images.everydayhealth.com/images/diet-nutrition/apples-101-about-1440x810.jpg?sfvrsn=f86f2644_1"}/>
            </React.Fragment>
          }
          placement={"right-start"}
      >
      </LightTooltipHelper>
      <aside style={thumbsContainer}>
       {smudgedPhoneImages.map(image => (
        <div style={thumbElement} key={image.name}>
           <div style={thumbInner} onClick={() => {
             const url = URL.createObjectURL(image)
             window.open(url, '_blank')
           }}>
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