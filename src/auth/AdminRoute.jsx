import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthContext'

export default function AdminRoute({ children }) {
  const { user } = useAuth()

  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'HR') return <Navigate to="/dashboard" replace />

  return children
}
