import { apiRequest } from './client'

export const getRankings = (cycleId) =>
  apiRequest(`/cycles/${cycleId}/rankings`)

export const computeRankings = (cycleId) =>
  apiRequest(`/cycles/${cycleId}/rankings/compute`, { method: 'POST' })

export const finalizeCycle = (cycleId) =>
  apiRequest(`/cycles/${cycleId}/finalize`, { method: 'POST' })
