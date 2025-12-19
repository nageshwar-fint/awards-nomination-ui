import { useState } from 'react'
import toast from 'react-hot-toast'
import { approveNomination, rejectNomination } from '../api/approvals'
import RequireRole from '../auth/RequireRole'
import { ROLES } from '../constants/roles'
import { handleError } from '../utils/errorHandler'

export default function ApprovalActions({ nominationId, onActionComplete }) {
  const [showReasonInput, setShowReasonInput] = useState(null) // 'approve' or 'reject'
  const [reason, setReason] = useState('')
  const [rating, setRating] = useState('') // Manager rating (0-10 scale)

  const act = async (action) => {
    if (!reason.trim()) {
      handleError('Please provide a reason', 'Please provide a reason', `approval-reason-${nominationId}`)
      return
    }

    // Validate rating if provided (for approve action)
    if (action === 'approve' && rating !== '' && (rating < 0 || rating > 10)) {
      handleError('Rating must be between 0 and 10', 'Rating must be between 0 and 10', `approval-rating-${nominationId}`)
      return
    }

    try {
      const api = action === 'approve' ? approveNomination : rejectNomination
      const payload = { 
        nomination_id: nominationId,
        reason: reason.trim()
      }
      
      // Add rating for approve action if provided
      if (action === 'approve' && rating !== '') {
        payload.rating = parseFloat(rating)
      }
      
      await api(payload)
      toast.success(`Nomination ${action}d successfully`)
      setReason('')
      setRating('')
      setShowReasonInput(null)
      if (onActionComplete) {
        onActionComplete()
      }
    } catch (err) {
      handleError(err, `Failed to ${action} nomination`, `approval-${action}-${nominationId}`)
    }
  }

  return (
    <RequireRole minRole={ROLES.MANAGER}>
      {!showReasonInput ? (
        <div>
          <button
            className="btn btn-success me-2"
            onClick={() => setShowReasonInput('approve')}
          >
            Approve
          </button>
          <button
            className="btn btn-danger"
            onClick={() => setShowReasonInput('reject')}
          >
            Reject
          </button>
        </div>
      ) : (
        <div>
          {showReasonInput === 'approve' && (
            <div className="mb-2">
              <label className="form-label">
                Manager Rating (0-10 scale) <small className="text-muted">(Optional)</small>
              </label>
              <input
                type="number"
                min="0"
                max="10"
                step="0.1"
                className="form-control"
                placeholder="Enter rating (0-10)"
                value={rating}
                onChange={(e) => setRating(e.target.value)}
              />
              <small className="form-text text-muted">
                Provide a rating from 0 to 10 for this nomination
              </small>
            </div>
          )}
          <div className="mb-2">
            <label className="form-label">
              Reason for {showReasonInput === 'approve' ? 'approval' : 'rejection'} *
            </label>
            <textarea
              className="form-control"
              rows="3"
              placeholder="Enter reason..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <div>
            <button
              className={`btn me-2 ${showReasonInput === 'approve' ? 'btn-success' : 'btn-danger'}`}
              onClick={() => act(showReasonInput)}
            >
              Confirm {showReasonInput === 'approve' ? 'Approve' : 'Reject'}
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => {
                setShowReasonInput(null)
                setReason('')
                setRating('')
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </RequireRole>
  )
}
