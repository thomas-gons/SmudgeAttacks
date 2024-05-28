import "../styles/Home.css"
import PhoneReferences from "../components/PhoneReferences.jsx";
import Navbar from "../components/Navbar.jsx"



function Home() {
    return (
        <div>
            <Navbar />
            <div id={"left"}>
                <PhoneReferences />
            </div>
        </div>
    )
}

export default Home;