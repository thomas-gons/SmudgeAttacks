import {closeSnackbar, enqueueSnackbar, MaterialDesignContent, SnackbarProvider} from "notistack";
import React from "react";
import {styled} from "@mui/material/styles";
import {Grow} from "@mui/material";


type Severity = 'default' | 'success' | 'info' | 'warning' | 'error';

export const displayStatus = (
  message: string | unknown,
  severity: Severity,
  extra_component: React.JSX.Element | null = null,
  options =  {}
) => {

  if (typeof message !== 'string') {
    console.log("Message is not a string " + message)
    return;
  }

  enqueueSnackbar({
    message,
    variant: severity,
    TransitionComponent: Grow,
    action: () => extra_component,
    ...options
  })
}

export const closeStatus = () => {
  closeSnackbar()
}

const Status = () => {
  const StyledMaterialDesignContent = styled(MaterialDesignContent)(() => ({
    '&.notistack-MuiContent-success': {
      'svg': {
        color: 'rgb(46, 125, 50)',
      },
      color: 'rgb(30, 70, 32)',
      backgroundColor: '#edf7ed'

    },
    '&.notistack-MuiContent-error': {
      'svg': {
        color: 'rgb(211, 47, 47)',
      },
      color: 'rgb(141,37,37)',
      backgroundColor: '#fdeded'
    },
    '&.notistack-MuiContent-info': {
      'svg': {
        color: 'rgb(2, 136, 209)',
      },
      color: 'rgb(1, 67, 97)',
      backgroundColor: '#e5f6fd'
    },
    '&.notistack-MuiContent-warning': {
      'svg': {
        color: 'rgb(237, 108, 2)',
      },
      color: 'rgb(102, 60, 0)',
      backgroundColor: '#fff4e5'
    }
  }));

  return (
    <SnackbarProvider
      autoHideDuration={2000}
      maxSnack={1}
      Components={{
        success: StyledMaterialDesignContent,
        error: StyledMaterialDesignContent,
        info: StyledMaterialDesignContent,
        warning: StyledMaterialDesignContent
      }}
    />
  )
}

export default Status;