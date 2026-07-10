import {createRoot} from "react-dom/client";
import {useState} from "react";
import {handleSubmit} from "../shared/api.jsx"

function СreateSurvey(){
    const [title, setName] = useState("");
    const [description, setDescription] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [templateId, setTemplateId] = useState("");
    //const [customQuestions, setQuestion] = useState([{questionText:"" , typeQuestion:1, options:[]}]);

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

    // function handleTemplateId(event) {    
    //     setQuestions(event.target.value);  
    // }
    
    // // Изменение конкретного элемента в массиве по его индексу
    // const handleCustomQuestionsChange = (index, value) => {
    //     const newQuestion = [...customQuestions];
    //     newQuestion[index].questionText = value;
    //     setQuestion(newQuestion);
    // };

    // // Добавление нового пустого поля в массив
    // const addQuestionField = () => {
    //     setQuestion([...customQuestions, '']);
    // };

    // // Удаление поля из массива
    // const removeQuestionField = (index) => {
    //     const newQuestion = customQuestions.filter((_, i) => i !== index);
    //     setQuestion(newQuestion);
    // };

    // Отправка формы – собираем данные и вызываем функцию из API
    const onSubmit = (e) => {
        e.preventDefault();
        const surveyData = {
        title,
        description,
        startDate,
        endDate,
        templateId: templateId ? Number(templateId) : null,
        //questions: customQuestions,
        };
        // Вызов импортированной функции
        handleSubmit(surveyData);
    };

    return (
        <form onSubmit={onSubmit}>
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

            {/* <div>
                <label>Вопросы:</label>
                {customQuestions.map((questionText, index) => (
                    <div key={index}>
                        <input 
                            type="text" 
                            value={customQuestions.questionText} 
                            placeholder={`номер вопроса ${index + 1}`}
                            onChange={(e) => handleCustomQuestionsChange(index, e.target.value)} 
                        />
                        {customQuestions.length > 2 && (
                            <button type="button" onClick={() => removeQuestionField(index)}>❌</button>
                        )}
                    </div>
                ))}
                <button type="button" onClick={addQuestionField}>+ Добавить вопрос</button>
            </div> */}
            
            <input type="submit" value="Отправить" />
        </form>
    );

}

createRoot(document.getElementById("nameSurvey")).render(<СreateSurvey />)