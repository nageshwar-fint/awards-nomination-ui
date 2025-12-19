import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { jwtDecode } from 'jwt-decode'
import toast from 'react-hot-toast'
import { logout as apiLogout } from '../api/auth'
import { setLogoutHandler } from '../api/client'

const AuthContext = createContext(null)

/**
 * Check if a JWT token is expired
 */
function isTokenExpired(token) {
  if (!token) return true
  try {
    const decoded = jwtDecode(token)
    const currentTime = Date.now() / 1000 // Convert to seconds
    return decoded.exp < currentTime
  } catch {
    return true
  }
}

/**
 * Get token expiration time in milliseconds
 */
function getTokenExpirationTime(token) {
  if (!token) return null
  try {
    const decoded = jwtDecode(token)
    return decoded.exp * 1000 // Convert to milliseconds
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem('jwt_token')
    if (!token) return null
    try {
      if (isTokenExpired(token)) {
        // Token expired, clear it
        localStorage.removeItem('jwt_token')
        return null
      }
      return jwtDecode(token)
    } catch {
      return null
    }
  })

  const logout = useCallback(async (redirectToLogin = true, showMessage = false) => {
    try {
      // Call the logout API endpoint
      await apiLogout()
    } catch (err) {
      // Even if API call fails, still clear local storage
      console.error('Logout API call failed:', err)
    } finally {
      // Always clear local storage and user state
      localStorage.removeItem('jwt_token')
      setUser(null)
      if (redirectToLogin) {
        // Show message if session expired
        if (showMessage) {
          toast.error('Your session has expired. Please login again.', {
            duration: 3000,
            id: 'session-expired'
          })
          // Use a small delay to ensure toast is shown before redirect
          setTimeout(() => {
            // Use window.location for redirect since we're outside Router context
            window.location.href = '/login'
          }, 500)
        } else {
          window.location.href = '/login'
        }
      }
    }
  }, [])

  // Set up global logout handler for API client
  useEffect(() => {
    setLogoutHandler((redirectToLogin = true, showMessage = true) => logout(redirectToLogin, showMessage))
    return () => setLogoutHandler(null)
  }, [logout])

  // Check token expiration periodically and on mount
  useEffect(() => {
    const token = localStorage.getItem('jwt_token')
    if (!token) {
      if (user) {
        // User state exists but no token - clear user
        setUser(null)
      }
      return
    }

    // Check if token is expired
    if (isTokenExpired(token)) {
      // Token expired, logout automatically
      logout(true, true)
      return
    }

    // Set up periodic check (every 30 seconds)
    const checkInterval = setInterval(() => {
      const currentToken = localStorage.getItem('jwt_token')
      if (!currentToken || isTokenExpired(currentToken)) {
        logout(true, true)
        clearInterval(checkInterval)
      }
    }, 30000) // Check every 30 seconds

    // Set up expiration timer (logout right before token expires)
    const expirationTime = getTokenExpirationTime(token)
    if (expirationTime) {
      const timeUntilExpiration = expirationTime - Date.now()
      // Set timeout to logout 1 second before expiration
      const expirationTimeout = setTimeout(() => {
        logout(true, true)
      }, Math.max(0, timeUntilExpiration - 1000))

      return () => {
        clearInterval(checkInterval)
        clearTimeout(expirationTimeout)
      }
    }

    return () => clearInterval(checkInterval)
  }, [user, logout])

  const loginWithToken = useCallback((token) => {
    if (isTokenExpired(token)) {
      // Don't set expired token
      console.warn('Attempted to login with expired token')
      return
    }
    localStorage.setItem('jwt_token', token)
    try {
      setUser(jwtDecode(token))
    } catch {
      setUser(null)
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, loginWithToken, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
