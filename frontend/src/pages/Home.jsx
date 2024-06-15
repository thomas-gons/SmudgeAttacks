import "../styles/Home.css"
import PhoneReferences from "../components/PhoneReferences.jsx";
import Result from "../components/Result.jsx"
import Navbar from "../components/Navbar.jsx"
import React, {useState} from "react";



function Home() {
  const [result, setResult] = useState({});
  const [currentResult, setCurrentResult] = useState('')
  const [nbStep, setNbStep] = useState(0)

  return (
        <div>
            <Navbar />
            <div id="main">
              <div id={"left"}>
                <PhoneReferences
                  result={result}
                  setResult={setResult}
                  setCurrentResult={setCurrentResult}
                  setNbStep={setNbStep}
                />
              </div>
              <div id={"right"}>
                <Result
                  result={result}
                  currentResult={currentResult}
                  setCurrentResult={setCurrentResult}
                  nbStep={nbStep}
                />
              </div>
            </div>
        </div>
    )
}

export default Home;