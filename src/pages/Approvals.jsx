import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import ProtectedRoute from '../auth/ProtectedRoute'
import { useAuth } from '../auth/AuthContext'
import { listNominations } from '../api/nominations'
import { approveNomination, rejectNomination } from '../api/approvals'
import { listCycles } from '../api/cycles'
import { listUsers } from '../api/users'
import { getNominationStatusBadgeClass } from '../utils/statusBadges'
import { formatDateTime } from '../utils/dateUtils'
import { ROLES } from '../constants/roles'
import { handleError } from '../utils/errorHandler'

function ApprovalsContent() {
  const navigate = useNavigate()
  const [nominations, setNominations] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('PENDING') // PENDING, APPROVED, REJECTED, ALL
  const [cycles, setCycles] = useState([])
  const [users, setUsers] = useState([])
  const [selectedCycle, setSelectedCycle] = useState('')
  const [selectedNomination, setSelectedNomination] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [actionType, setActionType] = useState(null) // 'approve' or 'reject'
  const [reason, setReason] = useState('')
  const [rating, setRating] = useState('')

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, selectedCycle])

  const loadData = async () => {
    setLoading(true)
    try {
      // Load cycles and users for display
      const [cyclesData, usersData] = await Promise.all([
        listCycles().catch(() => []),
        listUsers().catch(() => [])
      ])
      setCycles(cyclesData)
      setUsers(usersData)

      // Load nominations
      const params = {
        status_filter: filter !== 'ALL' ? filter : undefined,
        cycle_id: selectedCycle || undefined
      }
      const nominationsData = await listNominations(params)
      setNominations(nominationsData)
    } catch (err) {
      handleError(err, 'Failed to load nominations', 'approvals-load')
    } finally {
      setLoading(false)
    }
  }

  const handleViewDetails = (nomination) => {
    setSelectedNomination(nomination)
    setShowForm(true)
    setActionType(null)
    setReason('')
    setRating('')
  }

  const handleActionClick = (action) => {
    setActionType(action)
  }

  const handleApproval = async () => {
    if (!selectedNomination || !actionType) return
    
    if (!reason.trim()) {
      handleError('Please provide a reason', 'Please provide a reason', `approval-reason-${selectedNomination.id}`)
      return
    }

    // Validate rating if provided (for approve action)
    if (actionType === 'approve' && rating !== '' && (parseFloat(rating) < 0 || parseFloat(rating) > 10)) {
      handleError('Rating must be between 0 and 10', 'Rating must be between 0 and 10', `approval-rating-${selectedNomination.id}`)
      return
    }

    try {
      const payload = {
        nomination_id: selectedNomination.id,
        reason: reason.trim()
      }
      
      // Add rating for approve action if provided
      if (actionType === 'approve' && rating !== '') {
        payload.rating = parseFloat(rating)
      }

      if (actionType === 'approve') {
        await approveNomination(payload)
      } else {
        await rejectNomination(payload)
      }

      toast.success(`Nomination ${actionType}d successfully`)
      setShowForm(false)
      setSelectedNomination(null)
      setActionType(null)
      setReason('')
      setRating('')
      loadData()
    } catch (err) {
      handleError(err, `Failed to ${actionType} nomination`, `approval-${actionType}-${selectedNomination.id}`)
    }
  }

  const handleCancelForm = () => {
    setShowForm(false)
    setSelectedNomination(null)
    setActionType(null)
    setReason('')
    setRating('')
  }

  const getUserName = (userId) => {
    const user = users.find(u => u.id === userId)
    return user ? user.name : userId
  }

  const getCycleName = (cycleId) => {
    const cycle = cycles.find(c => c.id === cycleId)
    return cycle ? cycle.name : cycleId
  }

  return (
    <div className="container mt-4">
      <h3>Approvals</h3>

        {/* Filters */}
        <div className="card card-body mb-3">
          <div className="row">
            <div className="col-md-4">
              <label className="form-label">Status Filter</label>
              <select
                className="form-select"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label">Cycle Filter</label>
              <select
                className="form-select"
                value={selectedCycle}
                onChange={(e) => setSelectedCycle(e.target.value)}
              >
                <option value="">All Cycles</option>
                {cycles.map(cycle => (
                  <option key={cycle.id} value={cycle.id}>
                    {cycle.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="alert alert-info">Loading nominations...</div>
        )}

        {/* Empty State */}
        {!loading && nominations.length === 0 && (
          <div className="alert alert-secondary">
            No nominations found with selected filters.
          </div>
        )}

        {/* Nominations List */}
        {!loading && nominations.length > 0 && (
          <div className="table-responsive">
            <table className="table table-bordered">
              <thead className="table-light">
                <tr>
                  <th>Nominee</th>
                  <th>Cycle</th>
                  <th>Submitted By</th>
                  <th>Status</th>
                  <th>Submitted At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {nominations.map((nomination) => (
                  <tr key={nomination.id}>
                    <td>{getUserName(nomination.nominee_user_id)}</td>
                    <td>
                      <a
                        href={`/cycles/${nomination.cycle_id}`}
                        onClick={(e) => {
                          e.preventDefault()
                          navigate(`/cycles/${nomination.cycle_id}`)
                        }}
                      >
                        {getCycleName(nomination.cycle_id)}
                      </a>
                    </td>
                    <td>{getUserName(nomination.submitted_by)}</td>
                    <td>
                      <span className={`badge ${getNominationStatusBadgeClass(nomination.status)}`}>
                        {nomination.status}
                      </span>
                    </td>
                    <td>{formatDateTime(nomination.submitted_at)}</td>
                    <td>
                      {showForm && selectedNomination?.id === nomination.id ? (
                        <div className="card card-body p-2" style={{ minWidth: '300px' }}>
                          {!actionType ? (
                            <div>
                              <div className="mb-2">
                                <button
                                  className="btn btn-sm btn-success me-2"
                                  onClick={() => handleActionClick('approve')}
                                  disabled={nomination.status !== 'PENDING'}
                                >
                                  Approve
                                </button>
                                <button
                                  className="btn btn-sm btn-danger"
                                  onClick={() => handleActionClick('reject')}
                                  disabled={nomination.status !== 'PENDING'}
                                >
                                  Reject
                                </button>
                              </div>
                              {nomination.status !== 'PENDING' && (
                                <small className="text-muted">This nomination is already {nomination.status.toLowerCase()}</small>
                              )}
                              <button
                                className="btn btn-sm btn-outline-secondary w-100 mt-2"
                                onClick={handleCancelForm}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div>
                              {actionType === 'approve' && (
                                <div className="mb-2">
                                  <label className="form-label small">
                                    Manager Rating (0-10) <small className="text-muted">(Optional)</small>
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    max="10"
                                    step="0.1"
                                    className="form-control form-control-sm"
                                    placeholder="Enter rating (0-10)"
                                    value={rating}
                                    onChange={(e) => setRating(e.target.value)}
                                  />
                                </div>
                              )}
                              <div className="mb-2">
                                <label className="form-label small">
                                  Reason for {actionType === 'approve' ? 'approval' : 'rejection'} *
                                </label>
                                <textarea
                                  className="form-control form-control-sm"
                                  rows="3"
                                  placeholder="Enter reason..."
                                  value={reason}
                                  onChange={(e) => setReason(e.target.value)}
                                />
                              </div>
                              <div className="btn-group w-100">
                                <button
                                  className={`btn btn-sm ${actionType === 'approve' ? 'btn-success' : 'btn-danger'}`}
                                  onClick={handleApproval}
                                >
                                  Confirm {actionType === 'approve' ? 'Approve' : 'Reject'}
                                </button>
                                <button
                                  className="btn btn-sm btn-secondary"
                                  onClick={() => {
                                    setActionType(null)
                                    setReason('')
                                    setRating('')
                                  }}
                                >
                                  Back
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <button
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => handleViewDetails(nomination)}
                        >
                          View
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </div>
  )
}

export default function Approvals() {
  const { user } = useAuth()
  
  // Check if user has required role
  if (!user || (user.role !== ROLES.MANAGER && user.role !== ROLES.HR)) {
    return (
      <div className="container mt-4">
        <div className="alert alert-danger">
          Access denied. Manager or HR role required.
        </div>
      </div>
    )
  }

  return (
    <ProtectedRoute>
      <ApprovalsContent />
    </ProtectedRoute>
  )
}

