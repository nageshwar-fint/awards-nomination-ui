import { apiRequest } from './client'

export const listNominations = (params = {}) => {
  const queryParams = new URLSearchParams()
  if (params.cycle_id) queryParams.append('cycle_id', params.cycle_id)
  if (params.nominee_user_id) queryParams.append('nominee_user_id', params.nominee_user_id)
  if (params.submitted_by) queryParams.append('submitted_by', params.submitted_by)
  if (params.status_filter) queryParams.append('status_filter', params.status_filter)
  if (params.skip) queryParams.append('skip', params.skip)
  if (params.limit) queryParams.append('limit', params.limit)
  
  const queryString = queryParams.toString()
  return apiRequest(`/nominations${queryString ? `?${queryString}` : ''}`)
}

export const getNomination = (id) =>
  apiRequest(`/nominations/${id}`)

export const submitNomination = (data) =>
  apiRequest('/nominations', {
    method: 'POST',
    body: JSON.stringify(data)
  })

export const getNominationApprovals = (nominationId) =>
  apiRequest(`/nominations/${nominationId}/approvals`)

export const revertNomination = (nominationId) =>
  apiRequest(`/nominations/${nominationId}`, {
    method: 'DELETE'
  })
