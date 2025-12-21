import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listCycles } from '../api/cycles'
import { listNominations, getNomination } from '../api/nominations'
import { approveNomination, rejectNomination } from '../api/approvals'
import { listCriteria } from '../api/criteria'
import { listUsers } from '../api/users'
import { useAuth } from '../auth/AuthContext'
import { formatDateTime } from '../utils/dateUtils'
import { getCycleStatusBadgeClass, getNominationStatusBadgeClass } from '../utils/statusBadges'
import { canCreateCycle } from '../utils/cyclePermissions'
import toast from 'react-hot-toast'
import { handleError } from '../utils/errorHandler'
import { 
  FiCalendar, 
  FiCheckCircle, 
  FiClock, 
  FiTrendingUp,
  FiArrowRight,
  FiRefreshCw,
  FiX
} from 'react-icons/fi'

export default function Dashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [cycles, setCycles] = useState([])
  const [nominations, setNominations] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedNomination, setSelectedNomination] = useState(null)
  const [showApprovalForm, setShowApprovalForm] = useState(false)
  const [actionType, setActionType] = useState(null) // 'approve' or 'reject'
  const [reason, setReason] = useState('')
  const [rating, setRating] = useState('')
  const [criteria, setCriteria] = useState([])
  const [nominationScores, setNominationScores] = useState([])
  const [criteriaReviews, setCriteriaReviews] = useState({}) // { criteriaId: { rating } }
  const [loadingNominationDetails, setLoadingNominationDetails] = useState(false)
  const [ratingErrors, setRatingErrors] = useState({}) // { criteriaId: errorMessage }
  const [users, setUsers] = useState([])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [cyclesData, nominationsData, usersData] = await Promise.all([
        listCycles().catch(() => []),
        listNominations({ limit: 10 }).catch(() => []),
        listUsers().catch(() => [])
      ])
      setCycles(cyclesData)
      setNominations(nominationsData)
      setUsers(usersData)
    } catch (err) {
      handleError(err, 'Failed to load dashboard data', 'dashboard-load')
    } finally {
      setLoading(false)
    }
  }

  const handleReviewNomination = async (nomination) => {
    // Only allow review for pending nominations if user is MANAGER or HR
    if (nomination.status !== 'PENDING' || (user?.role !== 'MANAGER' && user?.role !== 'HR')) {
      navigate(`/nominations/${nomination.id}`)
      return
    }

    setSelectedNomination(nomination)
    setShowApprovalForm(true)
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
        initialReviews[crit.id] = { rating: '' }
      })
      setCriteriaReviews(initialReviews)
    } catch (err) {
      handleError(err, 'Failed to load nomination details', `dashboard-approval-load-${nomination.id}`)
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
      const weight = parseFloat(crit.weight) || 0
      
      // If no rating entered, treat as 0
      let rating = 0
      if (review && review.rating !== '') {
        rating = parseFloat(review.rating) || 0
        
        // Clamp rating to valid range (0 to weight)
        if (rating < 0) rating = 0
        if (rating > weight) rating = weight
      }
      
      totalWeightedRating += rating
      totalWeight += weight
    })
    
    if (totalWeight === 0) return 0
    
    // Scale to 0-10
    return (totalWeightedRating / totalWeight) * 10
  }

  const handleCriteriaReviewChange = (criteriaId, field, value, validateOnBlur = false) => {
    // Validate rating if it's a rating field
    if (field === 'rating') {
      const crit = criteria.find(c => c.id === criteriaId)
      if (crit) {
        const weight = parseFloat(crit.weight) || 0
        const ratingValue = value === '' ? '' : parseFloat(value)
        
        // Check if value is empty (allow empty for now, will validate on submit)
        if (value === '') {
          setRatingErrors(prev => {
            const newErrors = { ...prev }
            delete newErrors[criteriaId]
            return newErrors
          })
        } else if (isNaN(ratingValue)) {
          // Invalid number
          setRatingErrors(prev => ({
            ...prev,
            [criteriaId]: 'Please enter a valid number'
          }))
          return // Don't update the value
        } else {
          // Clamp value to valid range immediately
          let clampedValue = ratingValue
          if (ratingValue < 0) {
            clampedValue = 0
            setRatingErrors(prev => ({
              ...prev,
              [criteriaId]: `Rating cannot be less than 0`
            }))
          } else if (ratingValue > weight) {
            clampedValue = weight
            setRatingErrors(prev => ({
              ...prev,
              [criteriaId]: `Rating cannot exceed ${weight} (criterion weight). Set to maximum.`
            }))
          } else {
            // Valid value - clear error
            setRatingErrors(prev => {
              const newErrors = { ...prev }
              delete newErrors[criteriaId]
              return newErrors
            })
          }
          
          // Use clamped value if it was out of range
          if (clampedValue !== ratingValue) {
            value = clampedValue.toString()
          }
        }
      }
    }
    
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
      setRating(calculatedRating.toFixed(2))
    }
  }

  const handleApproval = async () => {
    if (!selectedNomination || !actionType) return
    
    // Validate reason is mandatory
    if (!reason.trim()) {
      handleError('Please provide a reason', 'Please provide a reason', `dashboard-approval-reason-${selectedNomination.id}`)
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
          `dashboard-approval-criteria-${selectedNomination.id}`
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
              `dashboard-approval-rating-${crit.id}`
            )
            return
          }
        }
      }
      
      // Calculate and validate total rating
      const calculatedRating = calculateTotalRating()
      if (calculatedRating < 0 || calculatedRating > 10) {
        handleError('Total rating must be between 0 and 10', 'Total rating must be between 0 and 10', `dashboard-approval-total-${selectedNomination.id}`)
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
          const weight = parseFloat(crit.weight) || 0
          let rating = 0
          
          if (review && review.rating !== '') {
            rating = parseFloat(review.rating) || 0
            // Ensure rating is within bounds
            if (rating < 0) rating = 0
            if (rating > weight) rating = weight
          }
          
          return {
            criteria_id: crit.id,
            rating: rating
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
      setShowApprovalForm(false)
      setSelectedNomination(null)
      setActionType(null)
      setReason('')
      setRating('')
      setCriteriaReviews({})
      setCriteria([])
      setNominationScores([])
      setRatingErrors({})
      loadData()
    } catch (err) {
      handleError(err, `Failed to ${actionType} nomination`, `dashboard-approval-${actionType}-${selectedNomination.id}`)
    }
  }

  const handleCancelForm = () => {
    setShowApprovalForm(false)
    setSelectedNomination(null)
    setActionType(null)
    setReason('')
    setRating('')
    setCriteriaReviews({})
    setCriteria([])
    setNominationScores([])
    setRatingErrors({})
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

  const activeCycles = cycles.filter(c => c.status === 'OPEN')
  const draftCycles = cycles.filter(c => c.status === 'DRAFT')
  const pendingNominations = nominations.filter(n => n.status === 'PENDING')
  const approvedNominations = nominations.filter(n => n.status === 'APPROVED')
  const recentNominations = nominations.slice(0, 5)

  const statCards = [
    {
      title: 'Total Cycles',
      value: cycles.length,
      icon: FiCalendar,
      color: 'primary',
      bgColor: '#e3f2fd'
    },
    {
      title: 'Active Cycles',
      value: activeCycles.length,
      icon: FiCheckCircle,
      color: 'success',
      bgColor: '#e8f5e9'
    },
    {
      title: 'Draft Cycles',
      value: draftCycles.length,
      icon: FiClock,
      color: 'secondary',
      bgColor: '#f5f5f5'
    },
    {
      title: 'Pending Nominations',
      value: pendingNominations.length,
      icon: FiTrendingUp,
      color: 'warning',
      bgColor: '#fff3e0'
    }
  ]

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-loading">
          <FiRefreshCw className="spinning" size={32} />
          <p>Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Dashboard</h1>
          {user && (
            <p className="dashboard-subtitle">
              Welcome back, <strong>{user.name}</strong> • {user.role}
            </p>
          )}
        </div>
        <button
          className="btn btn-outline-primary"
          onClick={loadData}
          disabled={loading}
        >
          <FiRefreshCw className={loading ? 'spinning' : ''} />
          Refresh
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="dashboard-stats">
        {statCards.map((stat, index) => {
          const Icon = stat.icon
          return (
            <div key={index} className="stat-card">
              <div className="stat-card-icon" style={{ backgroundColor: stat.bgColor }}>
                <Icon size={24} className={`text-${stat.color}`} />
              </div>
              <div className="stat-card-content">
                <div className="stat-card-value">{stat.value}</div>
                <div className="stat-card-title">{stat.title}</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Main Content Grid */}
      <div className="dashboard-grid">
        {/* Active Cycles */}
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <h3>Active Cycles</h3>
            {activeCycles.length > 0 && (
              <button
                className="btn btn-sm btn-link"
                onClick={() => navigate('/cycles')}
              >
                View All <FiArrowRight />
              </button>
            )}
          </div>
          <div className="dashboard-card-body">
            {activeCycles.length > 0 ? (
              <div className="cycle-list">
                {activeCycles.map((cycle) => (
                  <div
                    key={cycle.id}
                    className="cycle-item"
                    onClick={() => navigate(`/cycles/${cycle.id}`)}
                  >
                    <div className="cycle-item-content">
                      <h5 className="cycle-item-name">{cycle.name}</h5>
                      <p className="cycle-item-dates">
                        {formatDateTime(cycle.start_at)} - {formatDateTime(cycle.end_at)}
                      </p>
                    </div>
                    <div className="cycle-item-badge">
                      <span className={`badge ${getCycleStatusBadgeClass(cycle.status)}`}>
                        {cycle.status}
                      </span>
                      <FiArrowRight className="ms-2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <FiCalendar size={48} className="text-muted mb-3" />
                <p className="text-muted">No active cycles at the moment</p>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => navigate('/cycles')}
                >
                  View All Cycles
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Recent Nominations */}
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <h3>Recent Nominations</h3>
            {recentNominations.length > 0 && (
              <button
                className="btn btn-sm btn-link"
                onClick={() => navigate('/approvals')}
              >
                View All <FiArrowRight />
              </button>
            )}
          </div>
          <div className="dashboard-card-body">
            {recentNominations.length > 0 ? (
              <div className="nominations-table">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Status</th>
                      <th>Submitted</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentNominations.map((nomination) => (
                      <tr key={nomination.id}>
                        <td>
                          <span className={`badge ${getNominationStatusBadgeClass(nomination.status)}`}>
                            {nomination.status}
                          </span>
                        </td>
                        <td>
                          <small className="text-muted">
                            {formatDateTime(nomination.submitted_at)}
                          </small>
                        </td>
                        <td>
                          {nomination.status === 'PENDING' && (user?.role === 'MANAGER' || user?.role === 'HR') ? (
                            <button
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => handleReviewNomination(nomination)}
                            >
                              Review
                            </button>
                          ) : (
                            <button
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => navigate(`/nominations/${nomination.id}`)}
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
            ) : (
              <div className="empty-state">
                <FiCheckCircle size={48} className="text-muted mb-3" />
                <p className="text-muted">No nominations yet</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      {user && canCreateCycle(user.role) && (
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <h3>Quick Actions</h3>
          </div>
          <div className="dashboard-card-body">
            <div className="quick-actions">
              <button
                className="btn btn-primary"
                onClick={() => navigate('/cycles')}
              >
                <FiCalendar className="me-2" />
                Create New Cycle
              </button>
              {pendingNominations.length > 0 && (user.role === 'MANAGER' || user.role === 'HR') && (
                <button
                  className="btn btn-warning"
                  onClick={() => navigate('/approvals')}
                >
                  <FiCheckCircle className="me-2" />
                  Review {pendingNominations.length} Pending
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {cycles.length === 0 && nominations.length === 0 && (
        <div className="dashboard-card">
          <div className="dashboard-card-body">
            <div className="empty-state">
              <FiCalendar size={64} className="text-muted mb-4" />
              <h4>Welcome to Awards System!</h4>
              <p className="text-muted mb-4">
                {user && canCreateCycle(user.role) 
                  ? 'Get started by creating your first nomination cycle.'
                  : 'You have read-only access. Contact your team lead or manager to create cycles.'}
              </p>
              {user && canCreateCycle(user.role) && (
                <button
                  className="btn btn-primary"
                  onClick={() => navigate('/cycles')}
                >
                  Create Cycle
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Approval Form Modal - Similar to Approvals tab */}
      {showApprovalForm && selectedNomination && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
          <div className="modal-dialog modal-lg modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  Review Nomination: {getUserName(selectedNomination, 'nominee')}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={handleCancelForm}
                  aria-label="Close"
                ></button>
              </div>
              <div className="modal-body">
                {loadingNominationDetails ? (
                  <div className="alert alert-info">Loading nomination details...</div>
                ) : (
                  <>
                    {/* Criteria Review Section */}
                    {actionType === 'approve' && criteria.length > 0 && (
                      <div className="mb-4">
                        <h6 className="mb-3">Review Criteria (Please provide rating for each criterion)</h6>
                        {criteria.map((crit) => {
                          const score = getCriteriaAnswer(crit.id)
                          const review = criteriaReviews[crit.id] || { rating: '' }
                          
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
                                  <div className="col-md-12 mb-2">
                                    <label className="form-label small">
                                      Your Rating (0 - {crit.weight}) *
                                    </label>
                                    <input
                                      type="number"
                                      min="0"
                                      max={crit.weight}
                                      step="0.01"
                                      className={`form-control form-control-sm ${ratingErrors[crit.id] ? 'is-invalid' : ''}`}
                                      placeholder={`0 - ${crit.weight}`}
                                      value={review.rating}
                                      onChange={(e) => handleCriteriaReviewChange(crit.id, 'rating', e.target.value)}
                                      onBlur={(e) => handleCriteriaReviewChange(crit.id, 'rating', e.target.value, true)}
                                      required
                                    />
                                    {ratingErrors[crit.id] && (
                                      <div className="invalid-feedback d-block">
                                        {ratingErrors[crit.id]}
                                      </div>
                                    )}
                                    <small className="form-text text-muted">
                                      Maximum allowed: {crit.weight}
                                    </small>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                        
                        {/* Calculated Total Rating */}
                        <div className="alert alert-info">
                          <strong>Calculated Total Rating:</strong> {rating ? `${parseFloat(rating).toFixed(2)} / 10` : '0.00 / 10 (no ratings entered yet)'}
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
          </div>
        </div>
      )}
    </div>
  )
}
