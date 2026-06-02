import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredType?: 'counselling' | 'studying'
}

const ProtectedRoute = ({ children, requiredType }: ProtectedRouteProps) => {
  const { isAuthenticated, user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#111827]">
        <div className="text-lg text-slate-800 dark:text-gray-100">Loading...</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />
  }

  if (requiredType && user?.type_of_student !== requiredType) {
    return <Navigate to="/" replace />
  }

  if (
    user?.type_of_student === 'studying' &&
    user.approval_status &&
    user.approval_status !== 'APPROVED'
  ) {
    return <Navigate to="/auth" replace state={{ approvalBlocked: true }} />
  }

  return <>{children}</>
}

export default ProtectedRoute

