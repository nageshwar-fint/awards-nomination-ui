import { apiRequest } from './client'

export const listCycles = () => apiRequest('/cycles')

export const getCycle = (id) => apiRequest(`/cycles/${id}`)

export const createCycle = (data) =>
  apiRequest('/cycles', {
    method: 'POST',
    body: JSON.stringify(data)
  })

export const updateCycle = (id, data) =>
  apiRequest(`/cycles/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  })

export const deleteCycle = (id) =>
  apiRequest(`/cycles/${id}`, { method: 'DELETE' })
