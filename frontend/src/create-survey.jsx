import {createRoot} from "react-dom/client";
import {useState} from "react";


function createSurvey(){
    const [name, setName] = useState("Tom");

    function handleNameChange(event) {    
        setName(event.target.value);  
    }

    return (
        <div>
            <h3>Имя: {name}</h3>
            <div>
                <p>Имя: <input type="text" value={name} onChange={handleNameChange} /></p>
            </div>
        </div>
    );

}

createRoot(document.getElementById("name")).render(<createSurvey/>)