

// const handleSubmit = async (e) => {

// e.preventDefault();

// try {

// const response = await fetch('/api/survey/create', {

// method: 'POST',

// headers: {

// 'Content-Type': 'application/json',

// },

// body: JSON.stringify({

// title,

// description,

// startDate,

// endDate,

// templateId,

// }),

// });

// if (!response.ok) throw new Error('Ошибка при создании');

// const result = await response.json();

// console.log('Опрос создан:', result);

// // Очищаем форму

// setTitle('');

// setDescription('');

// setStartDate('');

// setEndDate('');

// setTemplateId('');

// } catch (error) {

// console.error('Ошибка:', error);

// }

// };

export const handleSubmit = async (e) =>{
    console.log("📦 Данные опроса:", e);
    // console.log("Name: ", title);
    // console.log("Description: ", description);
    // console.log("StartDate: ", startDate);
    // console.log("EndDate: ", endDate);
    // console.log("TemplateId: ", templateId);
    // console.log("customQuestions: ", customQuestions);
}