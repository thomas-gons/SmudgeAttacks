import Button from "@mui/material/Button";
import * as React from "react";

import {VisuallyHiddenInput, displayStatus} from "./PhoneReferences";
import Thumb from "./Thumb";


const SmudgedPhoneInput = (
  smudgedPhoneImages: File[],
  setSmudgedPhoneImages: React.Dispatch<React.SetStateAction<File[]>>,
  setOnlyComputeOrder: React.Dispatch<React.SetStateAction<boolean>>,
) => {

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
      {Thumb(smudgedPhoneImages)}
    </section>
  )
}

export default SmudgedPhoneInput;