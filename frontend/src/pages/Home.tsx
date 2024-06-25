import "../styles/Home.css"
import PhoneReferences from "../components/Input/PhoneReferences";
import ResultComponent from "../components/Result.jsx"
import Navbar from "../components/Navbar.jsx"
import {useState} from "react";
import {MaterialDesignContent, SnackbarProvider} from "notistack";
import {styled} from "@mui/material/styles";


export interface DisplayState {
  message: string,
  severity: 'success' | 'info' | 'warning' | 'error',
  open: boolean
}

export interface Data {
  reference: string
  sequence: string
  image: string,
  pin_codes: string[]
}

export interface Result {
  data: { [source: string]: Data },
  currentSource: string,
  nbStep: number
}

function Home() {
  const [result, setResult] = useState<Result>({
    data: {},
    currentSource: '',
    nbStep: 0
  })

  const [displayState, setDisplayState] = useState<DisplayState>({
    message: "",
    severity: "success",
    open: false
  })

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
    <div>
      <Navbar/>
      <div id="main">
        <div id={"left"}>
          <PhoneReferences
            result={result}
            setResult={setResult}
            displayState={displayState}
            setDisplayState={setDisplayState}
          />
        </div>
        <div id={"right"}>
          <ResultComponent
            result={result}
            setResult={setResult}
            displayState={displayState}
            setDisplayState={setDisplayState}
          />
        </div>
      </div>

      {// @ts-ignore
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
      }
    </div>
  )
}


export default Home;