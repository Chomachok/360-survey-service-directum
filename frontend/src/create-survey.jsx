import {createRoot} from "react-dom/client";
import {useState} from "react";

function СreateSurvey(){
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");

    function handleNameChange(event) {    
        setName(event.target.value);  
    }

    function handleDescriptionChange(event) {    
        setDescription(event.target.value);  
    }

    // обработчик отправки формы
    function handleSubmit(e) {
         e.preventDefault(); // блокируем стандартную отправку формы
        console.log("Name: ", name);
        console.log("Description: ", description);
    }
    
    return (
        <form onSubmit={handleSubmit}>
            <p>
                <label>Имя:</label><br />
                <input type="text" value={name} onChange={handleNameChange} />
            </p>
            <p>
                <label>Описание:</label><br />
                <input type="text" value={description} onChange={handleDescriptionChange} />
            </p>
            <input type="submit" value="Отправить" />
        </form>
    );

}

createRoot(document.getElementById("nameSurvey")).render(<СreateSurvey />)