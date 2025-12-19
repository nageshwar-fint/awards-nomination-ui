import { apiRequest } from './client'

/**
 * List users for nomination purposes
 * Available to TEAM_LEAD, MANAGER, and HR roles
 */
export const listUsers = (params = {}) => {
  const queryParams = new URLSearchParams()
  if (params.status_filter) queryParams.append('status_filter', params.status_filter)
  if (params.search) queryParams.append('search', params.search)
  
  const queryString = queryParams.toString()
  return apiRequest(`/users${queryString ? `?${queryString}` : ''}`)
}

