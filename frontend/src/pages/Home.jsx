import "../styles/Home.css"
import PhoneReferences from "../components/PhoneReferences.jsx";
import Result from "../components/Result.jsx"
import Navbar from "../components/Navbar.jsx"
import {useState} from "react";



function Home() {
  const [result, setResult] = useState('');
  return (
        <div>
            <Navbar />
            <div id="main">
              <div id={"left"}>
                <PhoneReferences setResult={setResult}/>
              </div>
              <div id={"right"}>
                <Result result={result}/>
              </div>
            </div>
        </div>
    )
}

export default Home;