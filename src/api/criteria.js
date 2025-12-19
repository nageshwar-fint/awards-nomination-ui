import { apiRequest } from './client'

export const listCriteria = (cycleId, activeOnly = false) =>
  apiRequest(`/cycles/${cycleId}/criteria${activeOnly ? '?active_only=true' : ''}`)

export const addCriteria = (cycleId, criteriaArray) =>
  apiRequest(`/cycles/${cycleId}/criteria`, {
    method: 'POST',
    body: JSON.stringify(criteriaArray)
  })

export const updateCriteria = (id, data) =>
  apiRequest(`/criteria/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  })

export const deleteCriteria = (id) =>
  apiRequest(`/criteria/${id}`, { method: 'DELETE' })
