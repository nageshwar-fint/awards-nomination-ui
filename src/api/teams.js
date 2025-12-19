import { apiRequest } from './client'

export const listTeams = () =>
  apiRequest('/teams')

