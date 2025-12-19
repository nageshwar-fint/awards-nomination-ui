import { useAuth } from './AuthContext'
import { hasMinRole } from '../constants/roles'

export default function RequireRole({ minRole, children }) {
  const { user } = useAuth()
  if (!user) return null
  if (!hasMinRole(user.role, minRole)) return null
  return children
}
