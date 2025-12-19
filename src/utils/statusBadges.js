/**
 * Status badge utilities for consistent styling
 */

export const getCycleStatusBadgeClass = (status) => {
  const classes = {
    DRAFT: 'bg-secondary',
    OPEN: 'bg-success',
    CLOSED: 'bg-warning',
    FINALIZED: 'bg-info'
  }
  return classes[status] || 'bg-secondary'
}

export const getNominationStatusBadgeClass = (status) => {
  const classes = {
    PENDING: 'bg-warning',
    APPROVED: 'bg-success',
    REJECTED: 'bg-danger'
  }
  return classes[status] || 'bg-secondary'
}

export const getApprovalActionBadgeClass = (action) => {
  const classes = {
    APPROVE: 'bg-success',
    REJECT: 'bg-danger'
  }
  return classes[action] || 'bg-secondary'
}

