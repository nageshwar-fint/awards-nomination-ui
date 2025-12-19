import { apiRequest } from './client'

export const listUsers = () =>
  apiRequest('/admin/users')

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
