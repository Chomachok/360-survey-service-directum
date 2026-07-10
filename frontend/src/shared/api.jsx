export const handleSubmit = async (e, formData, setFormData) => {
  // Проверяем, что e - это событие
  if (e && typeof e.preventDefault === 'function') {
    e.preventDefault();
  }
  
  try {
    const response = await fetch('/api/survey/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData),
    });
    
    if (!response.ok) throw new Error('Ошибка при создании');
    
    const result = await response.json();
    console.log('Опрос создан:', result);
    
    // Очищаем форму
    setFormData({
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