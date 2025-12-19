import { createContext, useContext, useState } from 'react'
import { jwtDecode } from 'jwt-decode'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem('jwt_token')
    if (!token) return null
    try {
      return jwtDecode(token)
    } catch {
      return null
    }
  })

  const loginWithToken = (token) => {
    localStorage.setItem('jwt_token', token)
    setUser(jwtDecode(token))
  }

  const logout = () => {
    localStorage.removeItem('jwt_token')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loginWithToken, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
