import React, { useState, useEffect } from 'react';

const SurveyMatrix = () => {
  // 1. МОКИ ДАННЫХ
  const [subjects, setSubjects] = useState([
    { id: 'sub1', name: 'Кандидат А (Иван)' },
    { id: 'sub2', name: 'Кандидат Б (Мария)' },
    { id: 'sub3', name: 'Кандидат В (Сергей)' }
  ]); // СТОЛБЦЫ - кого оценивают

  const [respondents, setRespondents] = useState([
    { id: 'resp1', name: 'Эксперт 1 (Анна)' },
    { id: 'resp2', name: 'Эксперт 2 (Борис)' },
    { id: 'resp3', name: 'Эксперт 3 (Виктор)' }
  ]); // СТРОКИ - кто оценивает (респонденты)

  // 2. СТЕЙТ ОТВЕТОВ
  // Структура: { "resp1_sub1": true, "resp1_sub2": false, ... }
  // true = оценил, false = не оценил
  const [answers, setAnswers] = useState({});

  // Стейты для добавления новых элементов
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newRespondentName, setNewRespondentName] = useState('');

  // 3. Загрузка черновика из localStorage
  useEffect(() => {
    const saved = localStorage.getItem('survey_matrix_draft');
    if (saved) {
      const parsed = JSON.parse(saved);
      setAnswers(parsed.answers || {});
      if (parsed.subjects) setSubjects(parsed.subjects);
      if (parsed.respondents) setRespondents(parsed.respondents);
    }
  }, []);

  // Обработчик изменения чекбокса
  const handleChange = (respId, subId, checked) => {
    const key = `${respId}_${subId}`;
    setAnswers(prev => ({
      ...prev,
      [key]: checked
    }));
  };

  // Добавить нового кандидата (столбец)
  const addSubject = () => {
    if (!newSubjectName.trim()) {
      alert('Введите имя кандидата');
      return;
    }
    const newId = `sub${Date.now()}`;
    setSubjects(prev => [...prev, { id: newId, name: newSubjectName.trim() }]);
    setNewSubjectName('');
  };

  // Добавить нового респондента (строку)
  const addRespondent = () => {
    if (!newRespondentName.trim()) {
      alert('Введите имя респондента');
      return;
    }
    const newId = `resp${Date.now()}`;
    setRespondents(prev => [...prev, { id: newId, name: newRespondentName.trim() }]);
    setNewRespondentName('');
  };

  // Удалить кандидата
  const removeSubject = (id) => {
    if (confirm('Удалить этого кандидата и все его оценки?')) {
      setSubjects(prev => prev.filter(s => s.id !== id));
      // Удаляем все оценки этого кандидата
      setAnswers(prev => {
        const newAnswers = { ...prev };
        Object.keys(newAnswers).forEach(key => {
          if (key.endsWith(`_${id}`)) {
            delete newAnswers[key];
          }
        });
        return newAnswers;
      });
    }
  };

  // Удалить респондента
  const removeRespondent = (id) => {
    if (confirm('Удалить этого респондента и все его оценки?')) {
      setRespondents(prev => prev.filter(r => r.id !== id));
      // Удаляем все оценки этого респондента
      setAnswers(prev => {
        const newAnswers = { ...prev };
        Object.keys(newAnswers).forEach(key => {
          if (key.startsWith(`${id}_`)) {
            delete newAnswers[key];
          }
        });
        return newAnswers;
      });
    }
  };

  // Сохранение результатов
  const handleSubmit = () => {
    const data = {
      answers,
      subjects,
      respondents,
      exportedAt: new Date().toISOString()
    };

    // Сохраняем в localStorage
    localStorage.setItem('survey_matrix_draft', JSON.stringify(data));
    
    // Логируем
    console.log('Отправка на бэк:', data);
    
    // Скачиваем JSON-файл
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `survey_results_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    alert('Данные сохранены!');
  };

  // Подсчёт статистики
  const getStats = () => {
    const total = subjects.length * respondents.length;
    const evaluated = Object.values(answers).filter(v => v === true).length;
    const percentage = total > 0 ? Math.round((evaluated / total) * 100) : 0;
    return { total, evaluated, percentage };
  };

  const stats = getStats();

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '1200px', margin: '0 auto' }}>
      <h2 style={{ marginBottom: '20px' }}>📊 Матрица оценок экспертов</h2>
      
      {/* Панель управления */}
      <div style={{ 
        backgroundColor: '#f5f5f5', 
        padding: '15px', 
        borderRadius: '8px', 
        marginBottom: '20px',
        display: 'flex',
        gap: '20px',
        flexWrap: 'wrap',
        alignItems: 'flex-end'
      }}>
        {/* Добавление кандидата */}
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            👤 Добавить кандидата (столбец):
          </label>
          <input
            type="text"
            value={newSubjectName}
            onChange={(e) => setNewSubjectName(e.target.value)}
            placeholder="Имя кандидата"
            style={{ padding: '8px', width: '200px', marginRight: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
            onKeyPress={(e) => e.key === 'Enter' && addSubject()}
          />
          <button 
            onClick={addSubject}
            style={{ 
              padding: '8px 16px', 
              backgroundColor: '#28a745', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            + Добавить
          </button>
        </div>

        {/* Добавление респондента */}
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            🎯 Добавить эксперта (строку):
          </label>
          <input
            type="text"
            value={newRespondentName}
            onChange={(e) => setNewRespondentName(e.target.value)}
            placeholder="Имя эксперта"
            style={{ padding: '8px', width: '200px', marginRight: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
            onKeyPress={(e) => e.key === 'Enter' && addRespondent()}
          />
          <button 
            onClick={addRespondent}
            style={{ 
              padding: '8px 16px', 
              backgroundColor: '#17a2b8', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            + Добавить
          </button>
        </div>
      </div>

      {/* Статистика */}
      <div style={{ 
        marginBottom: '20px', 
        padding: '10px', 
        backgroundColor: '#e7f3ff',
        borderRadius: '4px',
        display: 'inline-block'
      }}>
        <strong>📈 Заполненность:</strong> {stats.evaluated} из {stats.total} ({stats.percentage}%)
      </div>

      {/* Таблица */}
      <div style={{ overflowX: 'auto', border: '1px solid #ddd', borderRadius: '8px' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: '600px' }}>
          <thead style={{ backgroundColor: '#4a4a4a', color: 'white' }}>
            <tr>
              <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>
                Эксперт ↓ \ Кандидат →
              </th>
              {subjects.map(sub => (
                <th key={sub.id} style={{ padding: '12px', border: '1px solid #ddd', position: 'relative' }}>
                  <div style={{ paddingRight: '25px' }}>{sub.name}</div>
                  <button
                    onClick={() => removeSubject(sub.id)}
                    style={{
                      position: 'absolute',
                      top: '50%',
                      right: '5px',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#ff6b6b',
                      cursor: 'pointer',
                      fontSize: '16px',
                      padding: '0 5px'
                    }}
                    title="Удалить кандидата"
                  >
                    ×
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {respondents.map((resp, index) => (
              <tr key={resp.id} style={{ backgroundColor: index % 2 === 0 ? '#fff' : '#f9f9f9' }}>
                <td style={{ 
                  padding: '12px', 
                  border: '1px solid #ddd', 
                  fontWeight: 'bold',
                  position: 'relative',
                  backgroundColor: '#f0f0f0'
                }}>
                  <div style={{ paddingRight: '25px' }}>{resp.name}</div>
                  <button
                    onClick={() => removeRespondent(resp.id)}
                    style={{
                      position: 'absolute',
                      top: '50%',
                      right: '5px',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#ff6b6b',
                      cursor: 'pointer',
                      fontSize: '16px',
                      padding: '0 5px'
                    }}
                    title="Удалить эксперта"
                  >
                    ×
                  </button>
                </td>
                {subjects.map(sub => {
                  const key = `${resp.id}_${sub.id}`;
                  const isEvaluated = answers[key] === true;
                  return (
                    <td key={key} style={{ 
                      padding: '12px', 
                      border: '1px solid #ddd', 
                      textAlign: 'center',
                      backgroundColor: isEvaluated ? '#d4edda' : 'white'
                    }}>
                      <label style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        gap: '8px',
                        cursor: 'pointer'
                      }}>
                        <input
                          type="checkbox"
                          checked={answers[key] || false}
                          onChange={(e) => handleChange(resp.id, sub.id, e.target.checked)}
                          style={{ 
                            width: '20px', 
                            height: '20px',
                            cursor: 'pointer'
                          }}
                        />
                        <span style={{ fontSize: '12px', color: isEvaluated ? '#155724' : '#666' }}>
                          {isEvaluated ? '✓ Оценил' : '○ Не оценил'}
                        </span>
                      </label>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Кнопки действий */}
      <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
        <button 
          onClick={handleSubmit}
          style={{ 
            padding: '12px 24px', 
            fontSize: '16px', 
            cursor: 'pointer', 
            backgroundColor: '#007bff', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            fontWeight: 'bold'
          }}
        >
          💾 Сохранить результаты
        </button>
        
        <button 
          onClick={() => {
            if (confirm('Очистить все оценки?')) {
              setAnswers({});
              localStorage.removeItem('survey_matrix_draft');
            }
          }}
          style={{ 
            padding: '12px 24px', 
            fontSize: '16px', 
            cursor: 'pointer', 
            backgroundColor: '#6c757d', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px'
          }}
        >
          🗑️ Очистить всё
        </button>
      </div>
    </div>
  );
};

export default SurveyMatrix;