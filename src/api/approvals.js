import { apiRequest } from './client'

export const approveNomination = (data) =>
  apiRequest('/approvals/approve', {
    method: 'POST',
    body: JSON.stringify(data)
  })

export const rejectNomination = (data) =>
  apiRequest('/approvals/reject', {
    method: 'POST',
    body: JSON.stringify(data)
  })

export const getApprovalHistory = (nominationId) =>
  apiRequest(`/nominations/${nominationId}/approvals`)
