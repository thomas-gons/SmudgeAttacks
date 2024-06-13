import "../styles/Home.css"
import PhoneReferences from "../components/PhoneReferences.jsx";
import Result from "../components/Result.jsx"
import Navbar from "../components/Navbar.jsx"
import {useState} from "react";



function Home() {
  const [result, setResult] = useState('');
  const [pinCodes, setPinCodes] = useState([])
  return (
        <div>
            <Navbar />
            <div id="main">
              <div id={"left"}>
                <PhoneReferences setResult={setResult} setPinCodes={setPinCodes}/>
              </div>
              <div id={"right"}>
                <Result result={result} pinCodes={pinCodes}/>
              </div>
            </div>
        </div>
    )
}

export default Home;