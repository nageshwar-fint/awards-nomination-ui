const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

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
    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(shouldAddAuth ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {})
      }
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      
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
