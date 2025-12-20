const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

// Global logout handler - will be set by AuthContext
let globalLogoutHandler = null

export function setLogoutHandler(handler) {
  globalLogoutHandler = handler
}

/**
 * API request helper with error handling
 * Note: This function does NOT show toast notifications.
 * Components should handle errors and show toasts using handleError utility.
 */
export async function apiRequest(path, options = {}) {
  const token = localStorage.getItem('jwt_token')
  
  // Don't add Authorization header for login/register endpoints
  const isAuthEndpoint = path.includes('/auth/login') || path.includes('/auth/register')
  const shouldAddAuth = token && !isAuthEndpoint

  try {
    // Check if body is FormData - if so, don't set Content-Type (browser will set it with boundary)
    const isFormData = options.body instanceof FormData
    const headers = {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(shouldAddAuth ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
    
    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      
      // Handle 401 Unauthorized - token expired or invalid
      if (res.status === 401) {
        // Clear token and trigger automatic logout
        localStorage.removeItem('jwt_token')
        if (globalLogoutHandler) {
          // Pass true for redirectToLogin, true for showMessage
          globalLogoutHandler(true, true)
        } else {
          // Fallback: redirect to login if handler not set
          window.location.href = '/login'
        }
        const error = new Error('Your session has expired. Please login again.')
        error.status = 401
        error.data = err
        throw error
      }
      
      // Handle FastAPI validation errors (422)
      if (res.status === 422 && Array.isArray(err.detail)) {
        const validationErrors = err.detail.map(e => {
          const field = e.loc?.join('.') || 'field'
          return `${field}: ${e.msg}`
        }).join(', ')
        const error = new Error(`Validation error: ${validationErrors}`)
        error.status = res.status
        error.data = err
        throw error
      }
      
      // Handle standard error format
      const errorMessage = err.error?.message || err.detail || err.message || `API error (${res.status})`
      const error = new Error(errorMessage)
      error.status = res.status
      error.data = err
      throw error
    }

    if (res.status === 204) return null
    return res.json()
  } catch (error) {
    // Re-throw fetch errors (network errors) with a more user-friendly message
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      const networkError = new Error('Failed to fetch - Network error. Please check your connection.')
      networkError.status = 0
      networkError.data = { error: { message: 'Network error' } }
      throw networkError
    }
    throw error
  }
}
