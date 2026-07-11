import {handleSaveTemplate} from "../shared/api.jsx"

export const SaveTemplate = (title, questions) => {
    const questionTexts = questions.map(question => question.questionText);

    const surveyTemplate = {
    title,
    questionTexts,
    };
    handleSaveTemplate(surveyTemplate);
};