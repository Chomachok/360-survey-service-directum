import React, { useState, useEffect, ChangeEvent } from 'react';

// 1. ТИПЫ
interface Subject {
  id: string;
  name: string;
}

interface Criterion {
  id: string;
  name: string;
}

type AnswersMap = Record<string, string>;

const SurveyMatrix: React.FC = () => {
  // 2. СТЕЙТЫ
  const [subjects, setSubjects] = useState<Subject[]>([
    { id: 'sub1', name: 'Кандидат А (Иван)' },
    { id: 'sub2', name: 'Кандидат Б (Мария)' },
  ]);
  
  const criteria: Criterion[] = [
    { id: 'crit1', name: 'Профессионализм' },
    { id: 'crit2', name: 'Коммуникабельность' },
    { id: 'crit3', name: 'Опыт работы' }
  ];

  const [answers, setAnswers] = useState<AnswersMap>({});
  const [newSubjectName, setNewSubjectName] = useState<string>('');

  // 3. ЗАГРУЗКА ИЗ LOCALSTORAGE
  useEffect(() => {
    try {
      const savedDraft = localStorage.getItem('survey_matrix_draft');
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        // Восстанавливаем и ответы, и список субъектов если они сохранялись
        if (parsed.answers) setAnswers(parsed.answers);
        if (parsed.subjects) setSubjects(parsed.subjects);
      }
    } catch (error) {
      console.error('Ошибка чтения черновика:', error);
    }
  }, []);

  // 4. ДОБАВЛЕНИЕ НОВОГО СУБЪЕКТА
  const handleAddSubject = (): void => {
    const trimmed = newSubjectName.trim();
    if (!trimmed) return;

    const newSubject: Subject = {
      id: `sub_${Date.now()}`, // Уникальный ID на основе времени
      name: trimmed
    };

    setSubjects(prev => [...prev, newSubject]);
    setNewSubjectName('');
  };

  // Обработка Enter в поле ввода
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddSubject();
    }
  };

  // 5. ОБНОВЛЕНИЕ ОТВЕТОВ
  const handleChange = (critId: string, subId: string, value: string): void => {
    const key = `${critId}_${subId}`;
    setAnswers(prev => ({ ...prev, [key]: value }));
  };

  // 6. СОХРАНЕНИЕ И ЭКСПОРТ
  const handleSubmit = (): void => {
    // Сохраняем и ответы, и текущий список субъектов
    const draftData = { answers, subjects };
    localStorage.setItem('survey_matrix_draft', JSON.stringify(draftData));
    
    console.log('MOCK API отправка:', draftData);
    
    const blob = new Blob([JSON.stringify(draftData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `survey_results_${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    alert('Данные сохранены и скачаны!');
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h2>Матрица оценки</h2>

      {/* БЛОК ДОБАВЛЕНИЯ ПОЛЬЗОВАТЕЛЯ */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Имя нового кандидата..."
          value={newSubjectName}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setNewSubjectName(e.target.value)}
          onKeyDown={handleKeyDown}
          style={{ padding: '8px 12px', fontSize: '14px', borderRadius: '4px', border: '1px solid #ccc', minWidth: '250px' }}
        />
        <button
          onClick={handleAddSubject}
          disabled={!newSubjectName.trim()}
          style={{
            padding: '8px 16px',
            fontSize: '14px',
            cursor: newSubjectName.trim() ? 'pointer' : 'not-allowed',
            backgroundColor: newSubjectName.trim() ? '#28a745' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '4px'
          }}
        >
          + Добавить кандидата
        </button>
      </div>
      
      <div style={{ overflowX: 'auto' }}>
        <table border={1} cellPadding={10} style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead style={{ backgroundColor: '#f4f4f4' }}>
            <tr>
              <th>Критерий \ Объект</th>
              {subjects.map(sub => (
                <th key={sub.id}>{sub.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {criteria.map(crit => (
              <tr key={crit.id}>
                <td style={{ fontWeight: 'bold', backgroundColor: '#f9f9f9' }}>{crit.name}</td>
                {subjects.map(sub => {
                  const key = `${crit.id}_${sub.id}`;
                  return (
                    <td key={key} style={{ textAlign: 'center' }}>
                      <select 
                        value={answers[key] || ''} 
                        onChange={(e: ChangeEvent<HTMLSelectElement>) => handleChange(crit.id, sub.id, e.target.value)}
                        style={{ padding: '5px', width: '100px' }}
                      >
                        <option value="">-- Выбрать --</option>
                        <option value="1">1 (Плохо)</option>
                        <option value="2">2</option>
                        <option value="3">3 (Удовл.)</option>
                        <option value="4">4</option>
                        <option value="5">5 (Отлично)</option>
                      </select>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button 
        onClick={handleSubmit} 
        style={{ marginTop: '20px', padding: '10px 20px', fontSize: '16px', cursor: 'pointer', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}
      >
        Сохранить результаты
      </button>
    </div>
  );
};

export default SurveyMatrix;