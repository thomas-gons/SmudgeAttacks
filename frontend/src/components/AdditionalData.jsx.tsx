import * as React from 'react';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import {Grid, IconButton} from "@mui/material";
import {useState} from "react";
import TextField from "@mui/material/TextField";
import {ArrowBack, ArrowForward} from "@mui/icons-material";

export default function AdditionalData() {
  const [open, setOpen] = React.useState(false);
  const [values, setValues] = useState(Array(6).fill(''));
  const toggleDrawer = (newOpen) => () => {
    setOpen(newOpen);
  };

  const handleChange = (index) => (event) => {
    const newValues = [...values];
    newValues[index] = event.target.value;
    setValues(newValues);
  };


  const DrawerList = (
    <Box sx={{width: 300, height: '100%'}} role="presentation">
      <div style={{display: 'flex', height: '100%', marginLeft: '10px'}}>
        <div>
      <IconButton
          onClick={toggleDrawer(!open)}
          style={{
            top: '50%',
          }}
        >
          <ArrowForward
            sx={{
              background: "rgb(250, 250, 250)",
              padding: "4px",
              borderRadius: 10
            }}
          />
        </IconButton>
        </div>
        <form
          style={{boxShadow: 'none', display: 'flex', flexDirection: 'column', margin: 0}}>
          {values.map((value, index) => (
              <TextField
                type="number"
                inputProps={{min: 0, max: 9}}
                value={value}
                onChange={handleChange(index)}
                fullWidth
              />
          ))}
      </form>
      </div>
    </Box>
  );

  return (
    <div>
      <React.Fragment key='right'>
        <Drawer
          anchor={"right"}
          open={open}
          onClose={toggleDrawer(false)}>
          {DrawerList}

        </Drawer>
        <IconButton
          onClick={toggleDrawer(!open)}
          style={{
            position: 'absolute',
            right: 25,
            visibility: ((open) ? 'hidden': 'visible'),
            top: '50%',
          }}
        >
          <ArrowBack
            sx={{
              background: "rgb(250, 250, 250)",
              padding: "4px",
              borderRadius: 10
            }}
          />
        </IconButton>
      </React.Fragment>
    </div>
  );
}