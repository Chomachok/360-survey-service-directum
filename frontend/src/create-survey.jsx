import {createRoot} from "react-dom/client";
import {useState} from "react";

function СreateSurvey(){
    const [title, setName] = useState("");
    const [description, setDescription] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [templateId, setTemplateId] = useState("");
    const [customQuestions, setTemplateId] = useState("");

    function handleNameChange(event) {    
        setName(event.target.value);  
    }

    function handleDescriptionChange(event) {    
        setDescription(event.target.value);  
    }

    function handleStartDateChange(event) {    
        setStartDate(event.target.value);  
    }

    function handleEndDateChange(event) {    
        setEndDate(event.target.value);  
    }

    function handleTemplateId(event) {    
        setTemplateId(event.target.value);  
    }

    function handleSubmit(e) {
         e.preventDefault();
        console.log("Name: ", title);
        console.log("Description: ", description);
        console.log("StartDate: ", startDate);
        console.log("EndDate: ", endDate);
        console.log("TemplateId: ", templateId);
    }
    
    return (
        <form onSubmit={handleSubmit}>
            <p>
                <label>Имя:</label><br />
                <input type="text" value={title} onChange={handleNameChange} />
            </p>
            <p>
                <label>Описание:</label><br />
                <input type="text" value={description} onChange={handleDescriptionChange} />
            </p>
            <p>
                <label>Начало опроса:</label><br />   
                <input type="date" value={startDate} onChange={handleStartDateChange} />
            </p>
            <p>
                <label>Конец опроса:</label><br />   
                <input type="date" value={endDate} onChange={handleEndDateChange} />
            </p>
            <p>
                <label>ID шаблона:</label><br />   
                <input type="number" value={templateId} onChange={handleTemplateId} />
            </p>
            
            <input type="submit" value="Отправить" />
        </form>
    );

}

createRoot(document.getElementById("nameSurvey")).render(<СreateSurvey />)