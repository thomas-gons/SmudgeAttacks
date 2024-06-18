import "../styles/Home.css"
import PhoneReferences from "../components/PhoneReferences";
import ResultComponent from "../components/Result.jsx"
import Navbar from "../components/Navbar.jsx"
import {useState} from "react";
import {SnackbarProvider} from "notistack";


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
  data: {[source: string] : Data},
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
          />
        </div>
      </div>

      {// @ts-ignore
        <SnackbarProvider
          autoHideDuration={2000}
          maxSnack={1}
        />
      }
    </div>
  )
}


export default Home;