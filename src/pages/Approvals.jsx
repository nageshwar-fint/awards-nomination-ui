import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import ProtectedRoute from '../auth/ProtectedRoute'
import { useAuth } from '../auth/AuthContext'
import { listNominations, getNomination } from '../api/nominations'
import { approveNomination, rejectNomination } from '../api/approvals'
import { listCycles } from '../api/cycles'
import { listUsers } from '../api/users'
import { listCriteria } from '../api/criteria'
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
  const [criteria, setCriteria] = useState([])
  const [nominationScores, setNominationScores] = useState([])
  const [criteriaReviews, setCriteriaReviews] = useState({}) // { criteriaId: { rating, comment } }
  const [loadingNominationDetails, setLoadingNominationDetails] = useState(false)

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

  const handleViewDetails = async (nomination) => {
    setSelectedNomination(nomination)
    setShowForm(true)
    setActionType(null)
    setReason('')
    setRating('')
    setCriteriaReviews({})
    
    // Load nomination details with criteria and scores
    setLoadingNominationDetails(true)
    try {
      const [nominationData, criteriaData] = await Promise.all([
        getNomination(nomination.id),
        listCriteria(nomination.cycle_id).catch(() => [])
      ])
      
      setCriteria(criteriaData.filter(c => c.is_active))
      setNominationScores(nominationData.scores || [])
      
      // Initialize criteria reviews with empty values
      const initialReviews = {}
      criteriaData.filter(c => c.is_active).forEach(crit => {
        initialReviews[crit.id] = { rating: '', comment: '' }
      })
      setCriteriaReviews(initialReviews)
    } catch (err) {
      handleError(err, 'Failed to load nomination details', `approval-load-details-${nomination.id}`)
    } finally {
      setLoadingNominationDetails(false)
    }
  }

  const handleActionClick = (action) => {
    setActionType(action)
  }

  const calculateTotalRating = () => {
    let totalWeightedRating = 0
    let totalWeight = 0
    
    criteria.forEach(crit => {
      const review = criteriaReviews[crit.id]
      if (review && review.rating !== '') {
        const rating = parseFloat(review.rating) || 0
        const weight = parseFloat(crit.weight) || 0
        
        // Validate rating is within criterion weight
        if (rating < 0 || rating > weight) {
          return null // Invalid rating
        }
        
        totalWeightedRating += rating
        totalWeight += weight
      }
    })
    
    if (totalWeight === 0) return null
    
    // Scale to 0-10
    return (totalWeightedRating / totalWeight) * 10
  }

  const handleCriteriaReviewChange = (criteriaId, field, value) => {
    setCriteriaReviews(prev => ({
      ...prev,
      [criteriaId]: {
        ...prev[criteriaId],
        [field]: value
      }
    }))
    
    // Auto-calculate total rating when criteria reviews change
    if (field === 'rating') {
      const calculatedRating = calculateTotalRating()
      if (calculatedRating !== null) {
        setRating(calculatedRating.toFixed(2))
      }
    }
  }

  const handleApproval = async () => {
    if (!selectedNomination || !actionType) return
    
    // Validate reason is mandatory
    if (!reason.trim()) {
      handleError('Please provide a reason', 'Please provide a reason', `approval-reason-${selectedNomination.id}`)
      return
    }

    // For approve action, validate all criteria reviews are completed
    if (actionType === 'approve') {
      const missingReviews = criteria.filter(crit => {
        const review = criteriaReviews[crit.id]
        return !review || !review.rating || review.rating === ''
      })
      
      if (missingReviews.length > 0) {
        handleError(
          'Please provide ratings for all criteria', 
          'Please provide ratings for all criteria', 
          `approval-criteria-${selectedNomination.id}`
        )
        return
      }
      
      // Validate all ratings are within their criterion weights
      for (const crit of criteria) {
        const review = criteriaReviews[crit.id]
        if (review && review.rating !== '') {
          const rating = parseFloat(review.rating)
          const weight = parseFloat(crit.weight)
          if (rating < 0 || rating > weight) {
            handleError(
              `Rating for "${crit.name}" must be between 0 and ${weight}`,
              `Rating for "${crit.name}" must be between 0 and ${weight}`,
              `approval-rating-${crit.id}`
            )
            return
          }
        }
      }
      
      // Calculate and validate total rating
      const calculatedRating = calculateTotalRating()
      if (calculatedRating === null) {
        handleError('Failed to calculate total rating', 'Failed to calculate total rating', `approval-calc-${selectedNomination.id}`)
        return
      }
      
      if (calculatedRating < 0 || calculatedRating > 10) {
        handleError('Total rating must be between 0 and 10', 'Total rating must be between 0 and 10', `approval-total-${selectedNomination.id}`)
        return
      }
    }

    try {
      const payload = {
        nomination_id: selectedNomination.id,
        reason: reason.trim()
      }
      
      // Add criteria reviews for approve action
      if (actionType === 'approve') {
        const reviews = criteria.map(crit => {
          const review = criteriaReviews[crit.id]
          return {
            criteria_id: crit.id,
            rating: parseFloat(review.rating),
            comment: review.comment || null
          }
        })
        payload.criteria_reviews = reviews
        
        // Add calculated total rating
        const calculatedRating = calculateTotalRating()
        payload.rating = calculatedRating
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
      setCriteriaReviews({})
      setCriteria([])
      setNominationScores([])
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
    setCriteriaReviews({})
    setCriteria([])
    setNominationScores([])
  }
  
  const getCriteriaAnswer = (criteriaId) => {
    return nominationScores.find(s => s.criteria_id === criteriaId)
  }
  
  const formatAnswer = (score) => {
    if (!score || !score.answer) return 'No answer provided'
    
    const answer = score.answer
    if (answer.text) {
      return answer.text
    }
    if (answer.selected) {
      return answer.selected
    }
    if (answer.selected_list && Array.isArray(answer.selected_list)) {
      return answer.selected_list.join(', ')
    }
    return 'No answer provided'
  }

  const getUserName = (nomination, field) => {
    // Use name from API response if available, otherwise fallback to lookup
    if (field === 'nominee' && nomination.nominee_name) {
      return nomination.nominee_name
    }
    if (field === 'submitted_by' && nomination.submitted_by_name) {
      return nomination.submitted_by_name
    }
    // Fallback to user lookup
    const userId = field === 'nominee' ? nomination.nominee_user_id : nomination.submitted_by
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
                    <td>{getUserName(nomination, 'nominee')}</td>
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
                    <td>{getUserName(nomination, 'submitted_by')}</td>
                    <td>
                      <span className={`badge ${getNominationStatusBadgeClass(nomination.status)}`}>
                        {nomination.status}
                      </span>
                    </td>
                    <td>{formatDateTime(nomination.submitted_at)}</td>
                    <td>
                      {showForm && selectedNomination?.id === nomination.id ? (
                        <button
                          className="btn btn-sm btn-outline-secondary"
                          onClick={handleCancelForm}
                        >
                          Close
                        </button>
                      ) : (
                        <button
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => handleViewDetails(nomination)}
                          disabled={nomination.status !== 'PENDING'}
                        >
                          Review
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Approval Form - Expanded View */}
        {showForm && selectedNomination && (
          <div className="card mt-4">
            <div className="card-header">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">Review Nomination: {getUserName(selectedNomination, 'nominee')}</h5>
                <button
                  className="btn btn-sm btn-outline-secondary"
                  onClick={handleCancelForm}
                >
                  Close
                </button>
              </div>
            </div>
            <div className="card-body">
              {loadingNominationDetails ? (
                <div className="alert alert-info">Loading nomination details...</div>
              ) : (
                <>
                  {/* Criteria Review Section */}
                  {actionType === 'approve' && criteria.length > 0 && (
                    <div className="mb-4">
                      <h6 className="mb-3">Review Criteria (Please provide rating and comment for each criterion)</h6>
                      {criteria.map((crit) => {
                        const score = getCriteriaAnswer(crit.id)
                        const review = criteriaReviews[crit.id] || { rating: '', comment: '' }
                        
                        return (
                          <div key={crit.id} className="card mb-3">
                            <div className="card-body">
                              <h6 className="mb-2">
                                {crit.name}
                                <span className="text-muted ms-2 small">(Weight: {crit.weight})</span>
                              </h6>
                              {crit.description && (
                                <p className="text-muted small mb-2">{crit.description}</p>
                              )}
                              
                              {/* Show nominee's answer */}
                              <div className="mb-3 p-2 bg-light rounded">
                                <strong>Nominee's Answer:</strong>
                                <div className="mt-1">
                                  {score ? (
                                    <div>
                                      {score.answer?.text && <p className="mb-0">{score.answer.text}</p>}
                                      {score.answer?.selected && (
                                        <span className="badge bg-info">{score.answer.selected}</span>
                                      )}
                                      {score.answer?.selected_list && Array.isArray(score.answer.selected_list) && (
                                        <div>
                                          {score.answer.selected_list.map((item, idx) => (
                                            <span key={idx} className="badge bg-info me-1">{item}</span>
                                          ))}
                                        </div>
                                      )}
                                      {score.answer?.image_url && (
                                        <div className="mt-2">
                                          <img src={score.answer.image_url} alt="Answer" style={{ maxWidth: '200px', maxHeight: '200px' }} />
                                        </div>
                                      )}
                                      {!score.answer && score.score && (
                                        <span className="badge bg-primary">Score: {score.score}</span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-muted">No answer provided</span>
                                  )}
                                </div>
                              </div>
                              
                              {/* Manager's review */}
                              <div className="row">
                                <div className="col-md-4 mb-2">
                                  <label className="form-label small">
                                    Your Rating (0 - {crit.weight}) *
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    max={crit.weight}
                                    step="0.01"
                                    className="form-control form-control-sm"
                                    placeholder={`0 - ${crit.weight}`}
                                    value={review.rating}
                                    onChange={(e) => handleCriteriaReviewChange(crit.id, 'rating', e.target.value)}
                                    required
                                  />
                                </div>
                                <div className="col-md-8 mb-2">
                                  <label className="form-label small">
                                    Your Comment
                                  </label>
                                  <textarea
                                    className="form-control form-control-sm"
                                    rows="2"
                                    placeholder="Enter your comment..."
                                    value={review.comment}
                                    onChange={(e) => handleCriteriaReviewChange(crit.id, 'comment', e.target.value)}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                      
                      {/* Calculated Total Rating */}
                      <div className="alert alert-info">
                        <strong>Calculated Total Rating:</strong> {rating ? `${parseFloat(rating).toFixed(2)} / 10` : 'Complete all criteria reviews to see total rating'}
                      </div>
                    </div>
                  )}
                  
                  {/* Action Buttons */}
                  {!actionType ? (
                    <div className="d-flex gap-2">
                      <button
                        className="btn btn-success"
                        onClick={() => handleActionClick('approve')}
                        disabled={selectedNomination.status !== 'PENDING'}
                      >
                        Approve
                      </button>
                      <button
                        className="btn btn-danger"
                        onClick={() => handleActionClick('reject')}
                        disabled={selectedNomination.status !== 'PENDING'}
                      >
                        Reject
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div className="mb-3">
                        <label className="form-label">
                          Overall Comments/Reason for {actionType === 'approve' ? 'approval' : 'rejection'} *
                        </label>
                        <textarea
                          className="form-control"
                          rows="4"
                          placeholder="Enter your overall comments and reason..."
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          required
                        />
                      </div>
                      
                      {actionType === 'approve' && (
                        <div className="mb-3">
                          <label className="form-label">
                            Overall Rating (Auto-calculated from criteria reviews) *
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="10"
                            step="0.01"
                            className="form-control"
                            value={rating}
                            readOnly
                            style={{ backgroundColor: '#f8f9fa' }}
                          />
                          <small className="text-muted">This is automatically calculated from your criteria reviews</small>
                        </div>
                      )}
                      
                      <div className="d-flex gap-2">
                        <button
                          className={`btn ${actionType === 'approve' ? 'btn-success' : 'btn-danger'}`}
                          onClick={handleApproval}
                          disabled={!reason.trim() || (actionType === 'approve' && !rating)}
                        >
                          Confirm {actionType === 'approve' ? 'Approve' : 'Reject'}
                        </button>
                        <button
                          className="btn btn-secondary"
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
                </>
              )}
            </div>
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

