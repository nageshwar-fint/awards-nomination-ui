import toast from 'react-hot-toast'

// Track active toast IDs with timestamps to prevent duplicates
const activeToasts = new Map() // Map<toastId, timestamp>
const CLEANUP_INTERVAL = 5000 // Clean up after 5 seconds

/**
 * Centralized error handler that prevents duplicate toast notifications
 * @param {Error|string} error - Error object or error message
 * @param {string} defaultMessage - Default message if error doesn't have one
 * @param {string} id - Optional unique ID to prevent duplicates for the same error
 */
export const handleError = (error, defaultMessage = 'An error occurred', id = null) => {
  // Extract error message
  let errorMessage = defaultMessage
  
  if (typeof error === 'string') {
    errorMessage = error
  } else if (error?.message) {
    errorMessage = error.message
  } else if (error?.data?.error?.message) {
    errorMessage = error.data.error.message
  } else if (error?.data?.detail) {
    errorMessage = error.data.detail
  }

  // Truncate very long messages to keep them compact (max 100 characters)
  const MAX_MESSAGE_LENGTH = 100
  if (errorMessage.length > MAX_MESSAGE_LENGTH) {
    errorMessage = errorMessage.substring(0, MAX_MESSAGE_LENGTH).trim() + '...'
  }

  // Create a stable, unique toast ID
  // If id is provided, use it; otherwise create one from the error message
  const toastId = id || `error-${errorMessage.substring(0, 30).replace(/[^a-zA-Z0-9]/g, '-')}`
  const now = Date.now()

  // Check if a toast with this ID was shown recently
  const lastShown = activeToasts.get(toastId)
  if (lastShown && (now - lastShown) < CLEANUP_INTERVAL) {
    return // Don't show duplicate - it was shown recently
  }

  // Mark this toast as shown
  activeToasts.set(toastId, now)

  // Dismiss any existing toast with the same ID first (safety check)
  toast.dismiss(toastId)

  // Show the toast with the stable ID
  // react-hot-toast will automatically prevent duplicates when using the same ID
  toast.error(errorMessage, {
    id: toastId,
    duration: 4000,
  })

  // Clean up the tracking after the toast duration
  setTimeout(() => {
    activeToasts.delete(toastId)
  }, CLEANUP_INTERVAL)
}

/**
 * Clear all tracked errors (useful for testing or reset)
 */
export const clearErrorTracking = () => {
  activeToasts.clear()
}
