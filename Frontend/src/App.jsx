import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { useAuthStore } from './store/auth'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'

// Pages
import Login from './pages/Login'
import Register from './pages/Register'
import ResetPassword from './pages/ResetPassword'
import Dashboard from './pages/Dashboard'
import Employees from './pages/Employees'
import Attendance from './pages/Attendance'
import Leaves from './pages/Leaves'
import Payroll from './pages/Payroll'
import Payslips from './pages/Payslips'
import PayslipDetail from './pages/PayslipDetail'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import UserSettings from './pages/UserSettings'
import Profile from './pages/Profile'
import ChangePassword from './pages/ChangePassword'
import NotFound from './pages/NotFound'

function App() {
  const { isAuthenticated } = useAuthStore()

  return (
    <BrowserRouter>
      <Toaster position="top-right" richColors />
      <Routes>
        <Route
          path="/login"
          element={
            isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />
          }
        />
        <Route
          path="/register"
          element={
            isAuthenticated ? <Navigate to="/dashboard" replace /> : <Register />
          }
        />
        <Route
          path="/reset-password"
          element={<ResetPassword />}
        />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="employees" element={<Employees />} />
          <Route path="attendance" element={<Attendance />} />
          <Route path="leaves" element={<Leaves />} />
          <Route path="payroll" element={<Payroll />} />
          <Route path="payslips" element={<Payslips />} />
          <Route path="payslips/:payslipId" element={<PayslipDetail />} />
          <Route path="payslips/payroll/:payrollId" element={<PayslipDetail />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<Settings />} />
          <Route path="user-settings" element={<UserSettings />} />
          <Route path="profile" element={<Profile />} />
          <Route path="change-password" element={<ChangePassword />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App

