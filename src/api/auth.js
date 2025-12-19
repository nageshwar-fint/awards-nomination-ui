import { apiRequest } from './client'

export const login = (data) =>
  apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify(data),
  })

export const registerUser = (data) =>
  apiRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  })

export const logout = () =>
  apiRequest('/auth/logout', {
    method: 'POST',
  })
