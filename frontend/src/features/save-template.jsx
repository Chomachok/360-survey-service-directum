//import {handleSaveTemplate} from "../shared/api.jsx"

export const handleSaveTemplate = async() => {}

export const SaveTemplate = (title, questions) => {
    const questionTexts = questions.map(question => question.questionText);

    const surveyTemplate = {
    title,
    questionTexts,
    };
    handleSaveTemplate(surveyTemplate);
};