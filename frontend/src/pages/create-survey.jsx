import {createRoot} from "react-dom/client";
import {useState} from "react";
import {handleSubmit} from "../shared/api.jsx"
import SurveyMatrix from "../shared/create-survey-matrix.jsx"
import {SaveTemplate} from "../features/save-template.jsx"

function СreateSurvey(){
    const [title, setName] = useState("");
    const [description, setDescription] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [templateId, setTemplateId] = useState("");
    const [customQuestions, setQuestion] = useState([{questionText:"" , typeQuestion:"1", options:[""]}]);

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
    
    // Изменение конкретного элемента в массиве по его индексу
    const handleQuestionTextChange = (index, value) => {
        const newQuestion = [...customQuestions];
        newQuestion[index].questionText = value;
        setQuestion(newQuestion);
    };

    // Изменение конкретного элемента в массиве по его индексу
    const handleTypeQuestionChange = (index, value) => {
        const newQuestion = [...customQuestions];
        newQuestion[index].typeQuestion = value;
        setQuestion(newQuestion);
    };

    // Добавление нового пустого поля в массив
    const addQuestionField = () => {
        setQuestion([...customQuestions, {questionText:"" , typeQuestion:1, options:[""]}]);
    };

    // Удаление поля из массива
    const removeQuestionField = (index) => {
        const newQuestion = customQuestions.filter((_, i) => i !== index);
        setQuestion(newQuestion);
    };

    // Изменение конкретного элемента в массиве по его индексу
    const handleOptionChange = (i, j, value) => {
        const newQuestion = [...customQuestions];
        newQuestion[i].options[j] = value;
        setQuestion(newQuestion);
    };

    const addOptionField = (i) => {
        const newQuestion = [...customQuestions];
        newQuestion[i].options = [...customQuestions[i].options, ""];
        setQuestion(newQuestion);
    };

    const removeOptionField = (index, j) => {
        const updatedQuestions = [...customQuestions];
        updatedQuestions[index].options = updatedQuestions[index].options.filter((_, i) => i !== j);
        setQuestion(updatedQuestions);
    };

    const onSubmit = (e) => {
        e.preventDefault();
        const surveyData = {
        title,
        description,
        startDate,
        endDate,
        templateId: templateId ? Number(templateId) : null,
        questions: customQuestions,
        };
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

            <div>
                <label>Вопросы:</label>
                {customQuestions.map((quest, index) => (
                    <div key={index}>
                        <input 
                            type="text" 
                            value={quest.questionText} 
                            placeholder={`номер вопроса ${index + 1}`}
                            onChange={(e) => handleQuestionTextChange(index, e.target.value)} 
                        />
                        <input 
                            type="number" 
                            value={quest.typeQuestion} 
                            placeholder={`номер вопроса ${index + 1}`}
                            onChange={(e) => handleTypeQuestionChange(index, e.target.value)} 
                        />
                        {
                            quest.options.map((option, idoption) => (
                                <div  key={idoption}>
                                    <input
                                        type="text"
                                        value={option}
                                        onChange={(e) => handleOptionChange(index, idoption, e.target.value)}
                                    />

                                    {customQuestions[index].options.length > 1 && (
                                        <button type="button" onClick={() => removeOptionField(index, idoption)}>❌</button>
                                    )}
                                </div>
                            ))
                        }
                        <button type="button" onClick={() => addOptionField(index)}>+ Добавить вариант ответа</button>

                        {customQuestions.length > 1 && (
                            <button type="button" onClick={() => removeQuestionField(index)}>❌</button>
                        )}
                    </div>
                ))}
                <button type="button" onClick={addQuestionField}>+ Добавить вопрос</button>
            </div>
            
            <input type="submit" value="Отправить" />
            <button type="button" onClick={() => SaveTemplate(title, customQuestions)}>сохранить как шаблон</button>
        </form>
    );

}

createRoot(document.getElementById("nameSurvey")).render(<СreateSurvey />/*<SurveyMatrix />*/);