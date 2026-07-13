  import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import SurveyCreate from './pages/SurveyCreate'
import QuestionBuilder from './pages/QuestionBuilder'
import Templates from './pages/Templates'
import Matrix from './pages/Matrix'
import PublicSurvey from './pages/PublicSurvey'
import Results from './pages/Results'
import ImportEmployees from './pages/ImportEmployees'
import Layout from './components/Layout'
import PublicLayout from './components/PublicLayout'
import SurveyEdit from './pages/SurveyEdit'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Защищённые маршруты (с админским Layout) */}
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/survey/new" element={<SurveyCreate />} />
          <Route path="/survey/:id/questions" element={<QuestionBuilder />} />
          <Route path="/templates" element={<Templates />} />
          <Route path="/survey/:id/matrix" element={<Matrix />} />
          <Route path="/survey/:id/results" element={<Results />} />
          <Route path="/import" element={<ImportEmployees />} />
          <Route path="/survey/:id/edit" element={<SurveyEdit />} />
        </Route>

        {/* Публичный маршрут (без админского Layout) */}
        <Route element={<PublicLayout />}>
          <Route path="/survey/:token" element={<PublicSurvey />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App