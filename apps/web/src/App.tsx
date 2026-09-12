import { BrowserRouter, Route, Routes } from 'react-router-dom'
import InvitePage from './pages/InvitePage'
import PreCheckPage from './pages/PreCheckPage'
import ConsentPage from './pages/ConsentPage'
import InstructionsPage from './pages/InstructionsPage'
import AssessmentPage from './pages/AssessmentPage'
import SubmittedPage from './pages/SubmittedPage'
import AdminLoginPage from './pages/admin/AdminLoginPage'
import AdminDashboardPage from './pages/admin/AdminDashboardPage'
import AdminSessionDetailPage from './pages/admin/AdminSessionDetailPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<InvitePage />} />
        <Route path="/precheck" element={<PreCheckPage />} />
        <Route path="/consent" element={<ConsentPage />} />
        <Route path="/instructions" element={<InstructionsPage />} />
        <Route path="/assessment" element={<AssessmentPage />} />
        <Route path="/submitted" element={<SubmittedPage />} />

        <Route path="/admin" element={<AdminLoginPage />} />
        <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
        <Route path="/admin/sessions/:id" element={<AdminSessionDetailPage />} />
      </Routes>
    </BrowserRouter>
  )
}
