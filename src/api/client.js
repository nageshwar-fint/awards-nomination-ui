const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

export async function apiRequest(path, options = {}) {
  const token = localStorage.getItem('jwt_token')

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const errorMessage = err.error?.message || err.detail || err.message || 'API error'
    const error = new Error(errorMessage)
    error.status = res.status
    error.data = err
    throw error
  }

  if (res.status === 204) return null
  return res.json()
}
