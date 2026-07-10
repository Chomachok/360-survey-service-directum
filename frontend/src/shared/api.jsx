export const handleSubmit = async (formData, setFormData) => {
  // Если setFormData не передан, создаём пустую функцию
  const clearForm = setFormData || (() => {});
  
  try {
    console.log('Отправляемые данные:', formData);
    
    const response = await fetch('/api/Surveys/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Детали ошибки:', errorData);
      throw new Error(`Ошибка ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log('Опрос создан:', result);
    
    // Очищаем форму, если передана функция очистки
    clearForm({
      title: '',
      description: '',
      startDate: '',
      endDate: '',
      templateId: '',
    });
    
  } catch (error) {
    console.error('Ошибка:', error);
  }
};
