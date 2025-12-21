import { apiRequest } from './client'

export const listUsers = (params = {}) => {
  const queryParams = new URLSearchParams()
  if (params.skip) queryParams.append('skip', params.skip)
  if (params.limit) queryParams.append('limit', params.limit)
  if (params.role_filter) queryParams.append('role_filter', params.role_filter)
  if (params.status_filter) queryParams.append('status_filter', params.status_filter)
  if (params.team_id) queryParams.append('team_id', params.team_id)
  if (params.search) queryParams.append('search', params.search)
  
  const queryString = queryParams.toString()
  return apiRequest(`/admin/users${queryString ? `?${queryString}` : ''}`)
}

export const getUser = (id) =>
  apiRequest(`/admin/users/${id}`)

export const updateUser = (id, data) =>
  apiRequest(`/admin/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })

export const deleteUser = (id) =>
  apiRequest(`/admin/users/${id}`, {
    method: 'DELETE',
  })

export const activateUser = (id) =>
  apiRequest(`/admin/users/${id}/activate`, {
    method: 'POST',
  })

export const deactivateUser = (id) =>
  apiRequest(`/admin/users/${id}/deactivate`, {
    method: 'POST',
  })

export const createUser = (data) =>
  apiRequest('/admin/users', {
    method: 'POST',
    body: JSON.stringify(data),
  })

export const createUsersBulk = (file) => {
  const formData = new FormData()
  formData.append('file', file)
  
  // Don't pass headers: {} - let apiRequest handle it to ensure Authorization header is included
  return apiRequest('/admin/users/bulk', {
    method: 'POST',
    body: formData
  })
}
