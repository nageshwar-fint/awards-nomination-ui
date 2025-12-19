import { useState } from 'react'
import toast from 'react-hot-toast'
import { approveNomination, rejectNomination } from '../api/approvals'
import RequireRole from '../auth/RequireRole'
import { ROLES } from '../constants/roles'

export default function ApprovalActions({ nominationId, onActionComplete }) {
  const [showReasonInput, setShowReasonInput] = useState(null) // 'approve' or 'reject'
  const [reason, setReason] = useState('')

  const act = async (action) => {
    if (!reason.trim()) {
      toast.error('Please provide a reason')
      return
    }

    try {
      const api = action === 'approve' ? approveNomination : rejectNomination
      await api({ 
        nomination_id: nominationId,
        reason: reason.trim()
      })
      toast.success(`Nomination ${action}d successfully`)
      setReason('')
      setShowReasonInput(null)
      if (onActionComplete) {
        onActionComplete()
      }
    } catch (err) {
      toast.error(err.message || `Failed to ${action} nomination`)
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
