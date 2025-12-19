/**
 * Date formatting utilities
 */

export const formatDate = (dateString) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

export const formatDateTime = (dateString) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export const formatDateForInput = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  // Convert to local date format (YYYY-MM-DD) for date input
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const isDateInPast = (dateString) => {
  if (!dateString) return false
  return new Date(dateString) < new Date()
}

export const isDateInFuture = (dateString) => {
  if (!dateString) return false
  return new Date(dateString) > new Date()
}

