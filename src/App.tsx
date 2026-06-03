import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import Navbar from './components/Navbar'
import LandingPage from './pages/LandingPage'
import LoginRegister from './pages/LoginRegister'
import RegisterRoleSelection from './pages/RegisterRoleSelection'
import RegisterCounselling from './pages/RegisterCounselling'
import RegisterStudying from './pages/RegisterStudying'
import CounsellingDashboard from './pages/CounsellingDashboard'
import StudyingDashboard from './pages/StudyingDashboard'
import CollegeDetailPage from './pages/CollegeDetailPage'
import SearchPage from './pages/SearchPage'
import MeetingPage from './pages/MeetingPage'
import ProfilePage from './pages/ProfilePage'
import Recommendations from './pages/Recommendations'
import ProtectedRoute from './components/ProtectedRoute'
// + add this import
import BranchDetailPage from './pages/BranchDetailPage'
import { AdminAuthProvider } from './contexts/AdminAuthContext'
import AdminLogin from './pages/admin/AdminLogin'
import AdminProtectedRoute from './components/admin/AdminProtectedRoute'
import AdminLayout from './components/admin/AdminLayout'
import AdminDashboardHome from './pages/admin/AdminDashboardHome'
import BranchInsightPage from './pages/admin/BranchInsightPage'
import CollegeStudentApproval from './pages/admin/CollegeStudentApproval'
import CollegeStudentDetail from './pages/admin/CollegeStudentDetail'
import AdminMeetingDashboard from './pages/admin/AdminMeetingDashboard'


function AppShell() {
  const location = useLocation()
  const isAdminRoute = location.pathname.startsWith('/admin')

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#111827]">
      {!isAdminRoute && <Navbar />}
      <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/auth" element={<LoginRegister />} />
            <Route path="/register" element={<RegisterRoleSelection />} />
            <Route path="/register/counselling" element={<RegisterCounselling />} />
            <Route path="/register/studying" element={<RegisterStudying />} />
            <Route
              path="/dashboard/counselling"
              element={
                <ProtectedRoute requiredType="counselling">
                  <CounsellingDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/studying"
              element={
                <ProtectedRoute requiredType="studying">
                  <StudyingDashboard />
                </ProtectedRoute>
              }
            />
            <Route path="/branches/:publicId" element={<BranchDetailPage />} />

            <Route path="/colleges/:publicId" element={<CollegeDetailPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route
              path="/recommendations"
              element={
                <ProtectedRoute requiredType="counselling">
                  <Recommendations />
                </ProtectedRoute>
              }
            />
            <Route
              path="/meetings"
              element={
                <ProtectedRoute>
                  <MeetingPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/login"
              element={
                <AdminAuthProvider>
                  <AdminLogin />
                </AdminAuthProvider>
              }
            />
            <Route
              path="/admin"
              element={
                <AdminAuthProvider>
                  <AdminProtectedRoute>
                    <AdminLayout />
                  </AdminProtectedRoute>
                </AdminAuthProvider>
              }
            >
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboardHome />} />
              <Route path="analytics/branch-insights" element={<BranchInsightPage />} />
              <Route path="students/approvals" element={<CollegeStudentApproval />} />
              <Route path="students/approvals/:studentId" element={<CollegeStudentDetail />} />
              <Route path="meetings" element={<AdminMeetingDashboard />} />
            </Route>
            <Route path="/admin/dashboard" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
    </div>
  )
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <AppShell />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App

