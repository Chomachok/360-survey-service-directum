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

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/survey/new" element={<SurveyCreate />} />
          <Route path="/survey/:id/questions" element={<QuestionBuilder />} />
          <Route path="/templates" element={<Templates />} />
          <Route path="/survey/:id/matrix" element={<Matrix />} />
          <Route path="/survey/:id/results" element={<Results />} />
          <Route path="/survey/:token" element={<PublicSurvey />} />
          <Route path="/import" element={<ImportEmployees />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}

export default App