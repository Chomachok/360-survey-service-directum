import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import SurveyCreate from './pages/SurveyCreate'
import SurveyEdit from './pages/SurveyEdit'
import QuestionBuilder from './pages/QuestionBuilder'
import Templates from './pages/Templates'
import SurveyTemplates from './pages/SurveyTemplates'
import RespondentTemplates from './pages/RespondentTemplates'
import Matrix from './pages/Matrix'
import PublicSurvey from './pages/PublicSurvey'
import Results from './pages/Results'
import ImportEmployees from './pages/ImportEmployees'
import LoginPage from './pages/LoginPage'
import Layout from './components/Layout'
import PublicLayout from './components/PublicLayout'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/survey/new" element={<SurveyCreate />} />
          <Route path="/survey/:id/edit" element={<SurveyEdit />} />
          <Route path="/survey/:id/questions" element={<QuestionBuilder />} />
          <Route path="/templates" element={<Templates />} />
          <Route path="/survey-templates" element={<SurveyTemplates />} />
          <Route path="/respondent-templates" element={<RespondentTemplates />} />
          <Route path="/survey/:id/matrix" element={<Matrix />} />
          <Route path="/survey/:id/results" element={<Results />} />
          <Route path="/import" element={<ImportEmployees />} />
        </Route>

        <Route element={<PublicLayout />}>
          <Route path="/survey/:token" element={<PublicSurvey />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App